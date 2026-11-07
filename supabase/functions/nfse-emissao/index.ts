// Supabase Edge Function: nfse-emissao
//
// Envia uma DPS (Declaração de Prestação de Serviços) ao SISTEMA NACIONAL
// NFS-e da Receita Federal (https://api.nfse.gov.br), autenticando com
// mTLS (certificado A1 e-CNPJ) e assinando o XML com XMLDSig (enveloped).
//
// Toda a criptografia (PKCS12 -> PKCS8, assinatura RSA-SHA256, mTLS)
// acontece AQUI no servidor — nunca no cliente e nunca no PocketBase.
//
// Rotas (path após /nfse-emissao):
//   POST /enviar    body: { nota_id }          -> assina DPS, envia, grava retorno
//   POST /consultar body: { nota_id }          -> consulta pelo protocolo/número
//   GET  /xml/:id                              -> devolve XML da DPS/NFS-e
//   POST /certificado  body: { pfx_base64, nome_arquivo, senha, valido_ate }
//                                             -> valida .pfx, cifra a senha,
//                                                grava em Storage + nfse_certificado
//   GET  /certificado/status                   -> existe? validade? (sem dados sensíveis)
//
// Segredos (supabase secrets set):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injetados automaticamente)
//   NFSE_CERT_PASSWORD_KEY  -> chave simétrica para cifrar a senha do .pfx
//
// ATENÇÃO: a senha do certificado NUNCA é logada nem retornada ao cliente.
// Em caso de falha (ambiente sem suporte a mTLS, certificado vencido, erro de
// schema), devolve { error: "..." } com status 4xx/5xx — JAMAIS finge sucesso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PASSWORD_KEY = Deno.env.get('NFSE_CERT_PASSWORD_KEY') || ''

const API_BASE: Record<string, string> = {
  homologacao: 'https://api.nfse.gov.br/homologacao',
  producao: 'https://api.nfse.gov.br',
}

// ---------------------------------------------------------------------------
// Utilidades de resposta
// ---------------------------------------------------------------------------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function erro(mensagem: string, status = 400): Response {
  return json({ error: mensagem }, status)
}

// ---------------------------------------------------------------------------
// Criptografia da senha do certificado (AES-256-GCM via WebCrypto)
// ---------------------------------------------------------------------------
async function cifraSenha(senha: string): Promise<{ c: string; iv: string; tag: string }> {
  const raw = new TextEncoder().encode(PASSWORD_KEY)
  if (raw.length < 32) throw new Error('NFSE_CERT_PASSWORD_KEY precisa ter 32+ caracteres.')
  const key = await crypto.subtle.importKey('raw', raw.slice(0, 32), 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  // WebCrypto anexa a tag ao ciphertext; guardamos separado por compatibilidade de schema.
  const enc = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(senha)),
  )
  const tag = enc.slice(enc.length - 16)
  const ct = enc.slice(0, enc.length - 16)
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
  return { c: b64(ct), iv: b64(iv), tag: b64(tag) }
}

async function decifraSenha(c: string, iv: string, tag: string): Promise<string> {
  const raw = new TextEncoder().encode(PASSWORD_KEY)
  const key = await crypto.subtle.importKey('raw', raw.slice(0, 32), 'AES-GCM', false, ['decrypt'])
  const ct = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
  const ivU = Uint8Array.from(atob(iv), (ch) => ch.charCodeAt(0))
  const tagU = Uint8Array.from(atob(tag), (ch) => ch.charCodeAt(0))
  const joined = new Uint8Array(ct.length + tagU.length)
  joined.set(ct)
  joined.set(tagU, ct.length)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivU }, key, joined)
  return new TextDecoder().decode(dec)
}

// ---------------------------------------------------------------------------
// PKCS12 -> PEM (certificado X.509 + chave privada PKCS8), via node-forge
// ---------------------------------------------------------------------------
let forgeCache: typeof import('npm:node-forge@1.3.1') | null = null
async function getForge() {
  if (!forgeCache) forgeCache = await import('npm:node-forge@1.3.1')
  return forgeCache
}

async function extrairPemDoPfx(pfxBase64: string, senha: string) {
  const forge = await getForge()
  const der = forge.util.decode64(pfxBase64)
  const p12 = forge.pkcs12.pkcs12FromAsn1(der, senha)
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert
  const keyItem =
    keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0]
  if (!cert || !keyItem)
    throw new Error(
      'Não foi possível extrair certificado e/ou chave privada do .pfx (senha incorreta ou arquivo inválido).',
    )
  const certPem = forge.pki.certificateToPem(cert)
  // Converte a chave para PKCS8 PEM ("-----BEGIN PRIVATE KEY-----"), exigido pelo Deno mTLS.
  const rsaKey = keyItem.key as forge.pki.rsa.PrivateKey
  const pkcs8Der = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(rsaKey))
  const keyPem = forge.pki.privateKeyToPem(pkcs8Der)
  const validade = cert.validity.notAfter
  return {
    certPem,
    keyPem,
    validoAte: `${validade.getFullYear()}-${String(validade.getMonth() + 1).padStart(2, '0')}-${String(validade.getDate()).padStart(2, '0')}`,
    cnpj: (cert.subject.getField('CN')?.value || '').replace(/\D/g, ''),
  }
}

// ---------------------------------------------------------------------------
// XMLDSig: assinatura enveloped RSA-SHA256 com C14N exclusiva do elemento <rps>
// (implementação direta, sem dependências extras além de node-forge p/ RSA)
// ---------------------------------------------------------------------------
function c14nXml(el: Element): string {
  // O DPS é gerado por nós com atributos simples e sem namespaces redundantes:
  // serialização canônica reduz-se a ordenar atributos e escapar texto.
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const attrs = Array.from(el.attributes)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ` ${a.name}="${esc(a.value)}"`)
    .join('')
  const childXml = Array.from(el.childNodes)
    .map((n) => {
      if (n.nodeType === Node.TEXT_NODE) return esc(n.nodeValue || '')
      if (n.nodeType === Node.ELEMENT_NODE) return c14nXml(n as Element)
      return ''
    })
    .join('')
  return `<${el.tagName}${attrs}>${childXml}</${el.tagName}>`
}

function xmlEsc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function assinarXml(
  xml: string,
  tagAssinar: string,
  certPem: string,
  keyPem: string,
): Promise<string> {
  const forge = await getForge()
  const privateKey = forge.pki.privateKeyFromPem(keyPem)
  const cert = forge.pki.certificateFromPem(certPem)
  const certDerB64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
  )

  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const alvo = doc.getElementsByTagName(tagAssinar)[0]
  if (!alvo) throw new Error(`Tag ${tagAssinar} não encontrada no XML da DPS.`)

  const digestB64 = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c14nXml(alvo))),
      ),
    ),
  )

  const now = new Date()
  const signedInfo = [
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
    `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>`,
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>`,
    `<Reference URI="#${alvo.getAttribute('id') || ''}">`,
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>`,
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>`,
    `<DigestValue>${digestB64}</DigestValue>`,
    `</Reference>`,
    `</SignedInfo>`,
  ].join('')

  const siDoc = new DOMParser().parseFromString(signedInfo, 'application/xml')
  const siC14n = c14nXml(siDoc.documentElement)
  const signatureValueB64 = forge.util.encode64(
    privateKey.sign(forge.md.sha256.create().update(siC14n, 'utf8')),
  )

  const signature = [
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">`,
    signedInfo.replace(' xmlns="http://www.w3.org/2000/09/xmldsig#"', ''),
    `<SignatureValue>${signatureValueB64}</SignatureValue>`,
    `<KeyInfo><X509Data><X509Certificate>${certDerB64}</X509Certificate></X509Data></KeyInfo>`,
    `</Signature>`,
  ].join('')

  return xml.replace(`</${tagAssinar}>`, signature + `</${tagAssinar}>`)
}

// ---------------------------------------------------------------------------
// Geração do XML da DPS (padrão nacional NFS-e / meus pedidos da LC 116)
// ---------------------------------------------------------------------------
interface DpsInput {
  ambiente: string
  dataEmissao: string
  cnpjPrestador: string
  inscricaoMunicipal: string
  razaoSocial: string
  enderecoPrestador: {
    logradouro: string
    numero: string
    bairro: string
    municipio: string
    uf: string
    cep: string
    codigoMunicipio: string
    telefone: string
    email: string
  }
  nomeTomador: string
  documentoTomador: string
  emailTomador?: string
  enderecoTomador?: string
  municipioTomador?: string
  ufTomador?: string
  servico: { lc116: string; codigoTribMunicipio?: string; descricao: string }
  valorServicos: number
  aliquotaIss: number
  issRetido: boolean
  exigibilidadeIss: number
  competencia: string
  numeroRps: number
  serieRps: string
  observacoes?: string
}

function onlyDigits(s: string | undefined): string {
  return (s || '').replace(/\D/g, '')
}

function montarDpsXml(i: DpsInput): string {
  const docTomador = onlyDigits(i.documentoTomador)
  const isPJ = docTomador.length === 14
  const docTag = isPJ ? `<CNPJ>${docTomador}</CNPJ>` : `<CPF>${docTomador}</CPF>`

  const tomadorXml = [
    `<tomador>`,
    `<CPF_CNPJ>${docTag}</CPF_CNPJ>`,
    `<NomeRazaoSocial>${xmlEsc(i.nomeTomador)}</NomeRazaoSocial>`,
    i.emailTomador ? `<e-mail>${xmlEsc(i.emailTomador)}</e-mail>` : '',
    `</tomador>`,
  ].join('')

  const locPrest = i.issRetido
    ? `<municipioIncidencia><CodigoMunicipioIBGE>${xmlEsc(i.enderecoPrestador.codigoMunicipio)}</CodigoMunicipioIBGE></municipioIncidencia>`
    : `<municipioIncidencia><CodigoMunicipioIBGE>${xmlEsc(i.enderecoPrestador.codigoMunicipio)}</CodigoMunicipioIBGE></municipioIncidencia>`

  const servicoXml = [
    `<servico>`,
    `<locPrest>${locPrest}</locPrest>`,
    `<cServico>`,
    `<cTribNac>${xmlEsc(i.servico.lc116)}</cTribNac>`,
    i.servico.codigoTribMunicipio
      ? `<cTribMun>${xmlEsc(i.servico.codigoTribMunicipio)}</cTribMun>`
      : '',
    `<xDescServ>${xmlEsc(i.servico.descricao)}</xDescServ>`,
    `</cServico>`,
    `</servico>`,
  ].join('')

  const valoresXml = [
    `<valores>`,
    `<vServPrest>`,
    `<vServ>${i.valorServicos.toFixed(2)}</vServ>`,
    `</vServPrest>`,
    `<trib>`,
    `<tribMun>`,
    `<tribISSQN>1</tribISSQN>`,
    i.issRetido
      ? `<pAliq>${i.aliquotaIss.toFixed(2)}</pAliq>`
      : `<pAliq>${i.aliquotaIss.toFixed(2)}</pAliq>`,
    `</tribMun>`,
    `</trib>`,
    `</valores>`,
  ].join('')

  const dpsXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">`,
    `<infDPS Id="DPS${i.numeroRps}${i.serieRps}">`,
    `<tpAmb>${i.ambiente === 'producao' ? '1' : '2'}</tpAmb>`,
    `<dhEmi>${i.dataEmissao}</dhEmi>`,
    `<verAplic>GB001</verAplic>`,
    `<serie>${xmlEsc(i.serieRps)}</serie>`,
    `<nDPS>${i.numeroRps}</nDPS>`,
    `<dCompet>${i.competencia}</dCompet>`,
    `<tpEmit>1</tpEmit>`,
    `<cLocEmi>${xmlEsc(i.enderecoPrestador.codigoMunicipio)}</cLocEmi>`,
    `<prest>`,
    `<CNPJ>${onlyDigits(i.cnpjPrestador)}</CNPJ>`,
    i.inscricaoMunicipal ? `<inscMun>${xmlEsc(i.inscricaoMunicipal)}</inscMun>` : '',
    `<xNome>${xmlEsc(i.razaoSocial)}</xNome>`,
    `<endereco>`,
    `<endNac><cMun>${xmlEsc(i.enderecoPrestador.codigoMunicipio)}</cMun><CEP>${onlyDigits(i.enderecoPrestador.cep)}</CEP></endNac>`,
    `<xLgr>${xmlEsc(i.enderecoPrestador.logradouro)}</xLgr>`,
    `<nro>${xmlEsc(i.enderecoPrestador.numero)}</nro>`,
    `<xBairro>${xmlEsc(i.enderecoPrestador.bairro)}</xBairro>`,
    `</endereco>`,
    `<fone>${onlyDigits(i.enderecoPrestador.telefone)}</fone>`,
    `<email>${xmlEsc(i.enderecoPrestador.email)}</email>`,
    `</prest>`,
    tomadorXml,
    servicoXml,
    valoresXml,
    i.observacoes ? `<infAdic><obs>${xmlEsc(i.observacoes)}</obs></infAdic>` : '',
    `</infDPS>`,
    `</DPS>`,
  ].join('')

  return dpsXml
}

// ---------------------------------------------------------------------------
// Acesso ao Supabase (service role) — leitura/escrita das tabelas NFS-e
// ---------------------------------------------------------------------------
function supa() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function obterCertificado(supaClient: ReturnType<typeof createClient>) {
  const { data, error } = await supaClient
    .from('nfse_certificado')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('Falha ao ler certificado: ' + error.message)
  return data as {
    arquivo_path: string
    senha_cifrada: string
    senha_iv: string
    senha_tag: string
  } | null
}

async function baixarPfx(
  supaClient: ReturnType<typeof createClient>,
  path: string,
): Promise<string> {
  const { data, error } = await supaClient.storage.from('nfse_certificados').download(path)
  if (error || !data)
    throw new Error('Falha ao baixar .pfx do Storage: ' + (error?.message || 'arquivo ausente'))
  const buf = new Uint8Array(await data.arrayBuffer())
  let s = ''
  for (let k = 0; k < buf.length; k++) s += String.fromCharCode(buf[k])
  return btoa(s)
}

async function configurarMtls(certPem: string, keyPem: string): Promise<HttpClient> {
  // Deno moderno aceita createHttpClient; versões antigas sem suporte devolvem erro
  // claro abaixo (nunca simular envio sem mTLS).
  const client = Deno.createHttpClient({
    caCerts: [certPem],
    key: keyPem,
    cert: certPem,
  })
  return client as HttpClient
}

// ---------------------------------------------------------------------------
// Envio da DPS ao sistema nacional
// ---------------------------------------------------------------------------
async function enviarDps(
  nota: Record<string, any>,
  emitente: Record<string, any>,
  servico: Record<string, any>,
  config: Record<string, any>,
) {
  const supaClient = supa()
  const cert = await obterCertificado(supaClient)
  if (!cert)
    throw new Error(
      "Certificado A1 não cadastrado. Envie o .pfx na aba 'Certificado e sistema nacional'.",
    )

  const senha = await decifraSenha(cert.senha_cifrada, cert.senha_iv, cert.senha_tag)
  const pfxB64 = await baixarPfx(supaClient, cert.arquivo_path)
  const { certPem, keyPem } = await extrairPemDoPfx(pfxB64, senha)

  const dpsXml = montarDpsXml({
    ambiente: nota.ambiente,
    dataEmissao: nota.data_emissao_dps,
    cnpjPrestador: emitente.cnpj,
    inscricaoMunicipal: emitente.inscricao_municipal,
    razaoSocial: emitente.razao_social,
    enderecoPrestador: {
      logradouro: emitente.logradouro || '',
      numero: emitente.numero || 'S/N',
      bairro: emitente.bairro || '',
      municipio: emitente.municipio || '',
      uf: emitente.uf || '',
      cep: emitente.cep || '',
      codigoMunicipio: config.municipio_incidencia_ibge,
      telefone: emitente.telefone || '',
      email: emitente.email || '',
    },
    nomeTomador: nota.tomador_nome,
    documentoTomador: nota.tomador_documento,
    emailTomador: nota.tomador_email,
    municipioTomador: nota.tomador_municipio,
    ufTomador: nota.tomador_uf,
    servico: {
      lc116: nota.codigo_lc116,
      codigoTribMunicipio: nota.codigo_tributario_municipio,
      descricao: nota.descricao_servico,
    },
    valorServicos: Number(nota.valor_servicos),
    aliquotaIss: Number(nota.aliquota_iss),
    issRetido: Boolean(nota.iss_retido),
    exigibilidadeIss: nota.exigibilidade_iss ?? 1,
    competencia: nota.data_competencia,
    numeroRps: Number(nota.numero_rps),
    serieRps: nota.serie_rps || '1',
    observacoes: nota.observacoes,
  })

  const xmlAssinado = await assinarXml(dpsXml, 'infDPS', certPem, keyPem)
  await supaClient
    .from('nfse_notas')
    .update({ xml_dps: xmlAssinado, status: 'enviando' })
    .eq('id', nota.id)

  const client = await configurarMtls(certPem, keyPem)
  const url = `${API_BASE[nota.ambiente]}/dps`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      client,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // O sistema nacional aceita o XML da DPS em JSON empacotado (campo "xml").
      body: JSON.stringify({ xml: xmlAssinado }),
    })
    const txt = await resp.text()
    let parsed: any = {}
    try {
      parsed = JSON.parse(txt)
    } catch {
      parsed = { raw: txt }
    }

    if (!resp.ok) {
      const msg =
        parsed.message ||
        parsed.error ||
        parsed.reasonPhrase ||
        `Falha no envio (HTTP ${resp.status})`
      const retorno = {
        status: 'rejeitada' as const,
        mensagem_erro: msg,
        protocolo: parsed.numeroProtocolo || parsed.protocolo || '',
      }
      await supaClient.from('nfse_notas').update(retorno).eq('id', nota.id)
      return { ok: false, erro: msg }
    }

    // Sucesso: autorizada
    const retorno = {
      status: 'autorizada' as const,
      protocolo: parsed.numeroProtocolo || parsed.protocolo || '',
      numero_nfse: String(parsed.numeroAcesso || parsed.numero || ''),
      data_autorizacao: parsed.dataEmissao
        ? new Date(parsed.dataEmissao).toISOString()
        : new Date().toISOString(),
      xml_nfse: parsed.xml || null,
      mensagem_erro: null,
    }
    await supaClient.from('nfse_notas').update(retorno).eq('id', nota.id)
    return { ok: true, retorno }
  } catch (e: any) {
    const msg = e?.message || String(e)
    await supaClient
      .from('nfse_notas')
      .update({ status: 'erro', mensagem_erro: msg })
      .eq('id', nota.id)
    return { ok: false, erro: msg }
  } finally {
    client.close()
  }
}

// ---------------------------------------------------------------------------
// Consulta da nota no sistema nacional
// ---------------------------------------------------------------------------
async function consultarDps(nota: Record<string, any>) {
  const supaClient = supa()
  const cert = await obterCertificado(supaClient)
  if (!cert) throw new Error('Certificado A1 não cadastrado.')
  const senha = await decifraSenha(cert.senha_cifrada, cert.senha_iv, cert.senha_tag)
  const pfxB64 = await baixarPfx(supaClient, cert.arquivo_path)
  const { certPem, keyPem } = await extrairPemDoPfx(pfxB64, senha)

  const client = await configurarMtls(certPem, keyPem)
  const url = nota.numero_nfse
    ? `${API_BASE[nota.ambiente]}/nfse/${encodeURIComponent(nota.numero_nfse)}`
    : `${API_BASE[nota.ambiente]}/dps/protocolo/${encodeURIComponent(nota.protocolo)}`
  try {
    const resp = await fetch(url, { client, headers: { Accept: 'application/json' } })
    const txt = await resp.text()
    let parsed: any = {}
    try {
      parsed = JSON.parse(txt)
    } catch {
      parsed = { raw: txt }
    }
    if (!resp.ok) {
      const msg = parsed.message || parsed.error || `Falha na consulta (HTTP ${resp.status})`
      return { ok: false, erro: msg }
    }
    const update: Record<string, unknown> = {
      status: parsed.status === 'cancelada' ? 'cancelada' : 'autorizada',
      numero_nfse: String(parsed.numeroAcesso || parsed.numero || nota.numero_nfse || ''),
      xml_nfse: parsed.xml || nota.xml_nfse || null,
      data_autorizacao: parsed.dataEmissao
        ? new Date(parsed.dataEmissao).toISOString()
        : nota.data_autorizacao,
    }
    await supaClient.from('nfse_notas').update(update).eq('id', nota.id)
    return { ok: true, retorno: update }
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) }
  } finally {
    client.close()
  }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, '')
  const idx = path.indexOf('/nfse-emissao')
  const route = idx >= 0 ? path.substring(idx + '/nfse-emissao'.length) : path

  const supaClient = supa()

  // ---- CORS básico (chamado pelo painel) ----
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      },
    })
  }

  try {
    // POST /certificado
    if (route === '/certificado' && req.method === 'POST') {
      const body = await req.json()
      const pfxBase64: string = body.pfx_base64 || ''
      const senha: string = body.senha || ''
      if (!pfxBase64 || !senha) return erro('Envie o arquivo .pfx e a senha.')
      if (!PASSWORD_KEY)
        return erro('Segredo NFSE_CERT_PASSWORD_KEY não configurado no Supabase.', 500)

      // Valida o .pfx ANTES de gravar (senha correta, certificado legível)
      const { validoAte, cnpj } = await extrairPemDoPfx(pfxBase64, senha)
      const path = `certificados/${Date.now()}-${(body.nome_arquivo || 'certificado.pfx').replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: upErr } = await supaClient.storage.from('nfse_certificados').upload(
        path,
        Uint8Array.from(atob(pfxBase64), (ch) => ch.charCodeAt(0)),
        {
          contentType: 'application/x-pkcs12',
          upsert: true,
        },
      )
      if (upErr) return erro('Falha ao gravar .pfx no Storage: ' + upErr.message, 500)

      const cif = await cifraSenha(senha)
      await supaClient.from('nfse_certificado').update({ ativo: false }).eq('ativo', true)
      const { error: insErr } = await supaClient.from('nfse_certificado').insert({
        arquivo_path: path,
        nome_arquivo: body.nome_arquivo || 'certificado.pfx',
        senha_cifrada: cif.c,
        senha_iv: cif.iv,
        senha_tag: cif.tag,
        valido_ate: body.valido_ate || validoAte,
        cnpj_certificado: cnpj || null,
        ativo: true,
      })
      if (insErr) return erro('Falha ao gravar registro do certificado: ' + insErr.message, 500)

      return json({ ok: true, valido_ate: body.valido_ate || validoAte })
    }

    // GET /certificado/status
    if (route === '/certificado/status' && req.method === 'GET') {
      const { data } = await supaClient
        .from('nfse_certificado')
        .select('nome_arquivo, valido_ate, created_at, ativo')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return json({ existe: Boolean(data), ...(data || {}) })
    }

    // POST /enviar
    if (route === '/enviar' && req.method === 'POST') {
      const { nota_id } = await req.json()
      if (!nota_id) return erro('nota_id obrigatório.')

      const { data: nota, error: nErr } = await supaClient
        .from('nfse_notas')
        .select('*')
        .eq('id', nota_id)
        .maybeSingle()
      if (nErr || !nota) return erro('Nota não encontrada.', 404)

      const { data: emitente } = await supaClient
        .from('nfse_emitente')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (!emitente) return erro('Emitente não configurado.', 400)
      const { data: servico } = nota.servico
        ? await supaClient.from('nfse_servicos').select('*').eq('id', nota.servico).maybeSingle()
        : { data: null }
      const { data: config } = await supaClient
        .from('nfse_config')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (!config) return erro('Configurações do NFS-e não encontradas.', 400)

      const result = await enviarDps(nota, emitente, servico as any, config)
      return result.ok
        ? json({ ok: true, retorno: result.retorno })
        : erro(result.erro || 'Falha no envio.', 422)
    }

    // POST /consultar
    if (route === '/consultar' && req.method === 'POST') {
      const { nota_id } = await req.json()
      if (!nota_id) return erro('nota_id obrigatório.')
      const { data: nota } = await supaClient
        .from('nfse_notas')
        .select('*')
        .eq('id', nota_id)
        .maybeSingle()
      if (!nota) return erro('Nota não encontrada.', 404)
      const result = await consultarDps(nota)
      return result.ok
        ? json({ ok: true, retorno: result.retorno })
        : erro(result.erro || 'Falha na consulta.', 422)
    }

    // GET /xml/:id
    if (route.startsWith('/xml/') && req.method === 'GET') {
      const notaId = route.split('/')[2]
      const { data: nota } = await supaClient
        .from('nfse_notas')
        .select('xml_dps, xml_nfse')
        .eq('id', notaId)
        .maybeSingle()
      if (!nota) return erro('Nota não encontrada.', 404)
      return json({ xml_dps: nota.xml_dps || '', xml_nfse: nota.xml_nfse || '' })
    }

    return erro('Rota não encontrada: ' + route, 404)
  } catch (e: any) {
    return erro(e?.message || String(e), 500)
  }
})
