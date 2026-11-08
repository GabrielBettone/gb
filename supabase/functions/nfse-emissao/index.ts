// @ts-nocheck
// Edge Function Supabase: nfse-emissao
// Integração DIRETA com a API SEFIN Nacional (sem gateway intermediário)
// Padrão NFS-e Nacional / DPS / XMLDSig / mTLS / LC 116 / AES-GCM
//
// REGRAS OBRIGATÓRIAS:
// - Ambiente em HOMOLOGAÇÃO
// - Secret NFSE_CERT_PASSWORD_KEY preservada (NÃO alterar/regenerar)
// - Validação interna de autenticação/admin (validarUsuarioAdmin) obrigatória em todos os endpoints
// - Compatível com deploy --no-verify-jwt
// - Conversão PKCS#12 -> PKCS#8 via privateKeyInfoToPem (Deno mTLS / OpenSSL)
// - Tratamento SEFIN: idDps, chaveAcesso, descompactação gzip de nfseXmlGZipB64
// - Consultas oficiais apenas: GET /dps/{id} e GET /nfse/{chaveAcesso}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Node-forge bundle ESM
let _forge: any = null
async function getForge() {
  if (!_forge) {
    const mod = await import('https://esm.sh/node-forge@1.3.1')
    _forge = mod.default || mod
  }
  return _forge
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const PASSWORD_KEY = Deno.env.get('NFSE_CERT_PASSWORD_KEY') || ''

// Endpoints oficiais da API SEFIN Nacional (Emissor Público / ADN)
const API_BASE: Record<string, string> = {
  homologacao: 'https://hom-sefin.nfse.gov.br/SefinNacional',
  producao: 'https://sefin.nfse.gov.br/SefinNacional',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function erro(mensagem: string, status = 400, detalhes?: unknown) {
  return json({ ok: false, error: mensagem, detalhes }, status)
}

// ---------------------------------------------------------------------------
// Validação de Autenticação e Autorização Administrativa
// ---------------------------------------------------------------------------
async function validarUsuarioAdmin(
  req: Request,
  supaClient: ReturnType<typeof createClient>,
): Promise<{ ok: boolean; status?: number; erro?: string; user?: any }> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      erro: 'Cabeçalho Authorization não fornecido. Faça login para acessar o módulo NFS-e.',
    }
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { ok: false, status: 401, erro: 'Token JWT ausente.' }
  }

  const { data: userData, error: authError } = await supaClient.auth.getUser(token)
  if (authError || !userData?.user) {
    return {
      ok: false,
      status: 401,
      erro: 'Sessão inválida ou expirada. Faça login novamente.',
    }
  }

  const user = userData.user
  const { data: profile, error: profError } = await supaClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profError) {
    return {
      ok: false,
      status: 500,
      erro: 'Erro ao verificar permissões de acesso: ' + profError.message,
    }
  }

  const role = (profile?.role || '').toLowerCase()
  if (role !== 'admin' && role !== 'administrador') {
    return {
      ok: false,
      status: 403,
      erro: 'Acesso negado: apenas administradores podem emitir ou gerenciar NFS-e.',
    }
  }

  return { ok: true, user }
}

// ---------------------------------------------------------------------------
// Criptografia AES-GCM da senha do certificado A1
// ---------------------------------------------------------------------------
async function derivaChave(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const rawKey = enc.encode(PASSWORD_KEY.padEnd(32, '0').slice(0, 32))
  return await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

async function cifraSenha(senha: string): Promise<{ c: string; iv: string; tag: string }> {
  const key = await derivaChave()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    enc.encode(senha),
  )
  const cipherBytes = new Uint8Array(cipherBuffer)
  const tagLength = 16
  const dataLength = cipherBytes.length - tagLength
  const ciphertext = cipherBytes.slice(0, dataLength)
  const tag = cipherBytes.slice(dataLength)

  return {
    c: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...tag)),
  }
}

async function decifraSenha(cB64: string, ivB64: string, tagB64: string): Promise<string> {
  const key = await derivaChave()
  const cBytes = Uint8Array.from(atob(cB64), (ch) => ch.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(ivB64), (ch) => ch.charCodeAt(0))
  const tagBytes = Uint8Array.from(atob(tagB64), (ch) => ch.charCodeAt(0))
  const combined = new Uint8Array(cBytes.length + tagBytes.length)
  combined.set(cBytes, 0)
  combined.set(tagBytes, cBytes.length)

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes, tagLength: 128 },
    key,
    combined,
  )
  return new TextDecoder().decode(plain)
}

// ---------------------------------------------------------------------------
// Conversão de Chave Privada PKCS#12 para PKCS#8 PEM
// Regra técnica: wrapRsaPrivateKey() retorna ASN.1 PrivateKeyInfo (PKCS#8).
// Deve-se chamar privateKeyInfoToPem() e NÃO privateKeyToPem().
// O PEM resultante inicia com '-----BEGIN PRIVATE KEY-----' (padrão OpenSSL / Deno mTLS).
// ---------------------------------------------------------------------------
export function converterChavePrivadaParaPkcs8Pem(forge: any, privateKey: any): string {
  // 1. Converter chave privada Forge para RSAPrivateKey ASN.1 (PKCS#1)
  const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(privateKey)
  // 2. Envelopar o RSAPrivateKey ASN.1 em PrivateKeyInfo ASN.1 (PKCS#8)
  const privateKeyInfoAsn1 = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1)
  // 3. Converter a estrutura PrivateKeyInfo ASN.1 para PEM
  return forge.pki.privateKeyInfoToPem(privateKeyInfoAsn1)
}

// ---------------------------------------------------------------------------
// Extração de PEM e metadados do PFX (PKCS#12)
// ---------------------------------------------------------------------------
export async function extrairPemDoPfx(pfxBase64: string, senha: string) {
  const forge = await getForge()
  const p12Der = forge.util.decode64(pfxBase64)
  const p12Asn1 = forge.asn1.fromDer(p12Der, false)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha)

  let certPem = ''
  let keyPem = ''
  let certObj: any = null

  // Itera safeContents procurando certs e private key
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.key) {
        keyPem = converterChavePrivadaParaPkcs8Pem(forge, safeBag.key)
      }
      if (safeBag.cert && !certObj) {
        certObj = safeBag.cert
        certPem = forge.pki.certificateToPem(safeBag.cert)
      }
    }
  }

  // Fallback para getBags
  if (!certObj) {
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const bag = certBags?.[forge.pki.oids.certBag]?.[0]
    if (bag?.cert) {
      certObj = bag.cert
      certPem = forge.pki.certificateToPem(bag.cert)
    }
  }

  if (!certPem || !keyPem) {
    throw new Error(
      'Certificado (.pfx) inválido ou senha incorreta: chave privada ou certificado não encontrados.',
    )
  }

  const validadeFim = certObj.validity?.notAfter ? certObj.validity.notAfter.toISOString() : ''
  const validoAte = validadeFim ? validadeFim.slice(0, 10) : ''

  let cnpj: string | undefined
  let titular: string | undefined
  let emissor: string | undefined

  try {
    const cnAttr = certObj.subject?.attributes?.find(
      (a: any) => a.name === 'commonName' || a.shortName === 'CN',
    )
    titular = cnAttr?.value
    if (titular) {
      const match = titular.match(/:(\d{14})$/) || titular.match(/\b(\d{14})\b/)
      if (match) cnpj = match[1]
    }
    const issuerAttr = certObj.issuer?.attributes?.find(
      (a: any) => a.name === 'commonName' || a.shortName === 'CN',
    )
    emissor = issuerAttr?.value
  } catch (_) {
    // Ignora erro de parsing de subject
  }

  return { certPem, keyPem, validoAte, validadeFim, cnpj, titular, emissor }
}

// ---------------------------------------------------------------------------
// C14N e Assinatura Digital XMLDSig (enveloped, C14N, RSA-SHA256)
// Regra do schema XSD oficial TCDPS:
// <xs:complexType name="TCDPS">
//   <xs:sequence>
//     <xs:element name="infDPS" type="TCInfDPS"/>
//     <xs:element ref="ds:Signature" minOccurs="0"/>
//   </xs:sequence>
//   <xs:attribute name="versao" type="TVerNFSe" use="required"/>
// </xs:complexType>
// O elemento <Signature> deve vir IMEDIATAMENTE APÓS </infDPS> e ANTES de </DPS>.
// ---------------------------------------------------------------------------
// Canonicalização Exclusive XML Canonicalization (exc-c14n#) real
// No subdocumento assinado (infDPS), o namespace xmlns="http://www.sped.fazenda.gov.br/nfse"
// herdado do elemento pai <DPS> DEVE ser emitido no elemento raiz do fragmento
// para que o digest calculado seja idêntico ao do verificador da SEFIN Nacional.
export function c14nExclusiveNode(
  node: Node,
  renderedNamespaces: Map<string, string>,
  isRootOfFragment: boolean = false,
): string {
  if (node.nodeType === 3) {
    // Text node
    return (node.nodeValue || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r/g, '&#xD;')
  }

  if (node.nodeType === 1) {
    // Element node
    const el = node as Element
    const currentScopeNamespaces = new Map(renderedNamespaces)
    const nsToRender: Array<{ prefix: string; uri: string }> = []
    const normalAttrs: Array<{ name: string; value: string }> = []

    // Coleta atributos definidos diretamente no elemento
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'xmlns') {
        const prefix = ''
        const uri = attr.value
        if (currentScopeNamespaces.get(prefix) !== uri) {
          nsToRender.push({ prefix, uri })
          currentScopeNamespaces.set(prefix, uri)
        }
      } else if (attr.name.startsWith('xmlns:')) {
        const prefix = attr.name.slice(6)
        const uri = attr.value
        if (currentScopeNamespaces.get(prefix) !== uri) {
          nsToRender.push({ prefix, uri })
          currentScopeNamespaces.set(prefix, uri)
        }
      } else {
        normalAttrs.push({ name: attr.name, value: attr.value })
      }
    }

    // Se for o nó raiz do fragmento canônico e não declarou seu próprio default namespace,
    // herda o namespace ativo do elemento pai mais próximo na árvore DOM original
    if (isRootOfFragment && !currentScopeNamespaces.has('')) {
      let cur = el.parentElement
      while (cur) {
        const parentDefaultNs = cur.getAttribute('xmlns')
        if (parentDefaultNs) {
          nsToRender.push({ prefix: '', uri: parentDefaultNs })
          currentScopeNamespaces.set('', parentDefaultNs)
          break
        }
        cur = cur.parentElement
      }
    }

    // Ordenação canônica conforme W3C exc-c14n:
    // 1) Namespaces: default xmlns primeiro, depois prefixados por prefix
    nsToRender.sort((a, b) => {
      if (a.prefix === '' && b.prefix !== '') return -1
      if (a.prefix !== '' && b.prefix === '') return 1
      return a.prefix.localeCompare(b.prefix)
    })

    // 2) Atributos normais ordenados lexicograficamente por nome
    normalAttrs.sort((a, b) => a.name.localeCompare(b.name))

    let out = '<' + el.nodeName

    for (const ns of nsToRender) {
      const attrName = ns.prefix ? `xmlns:${ns.prefix}` : 'xmlns'
      out += ` ${attrName}="${escapeAttr(ns.uri)}"`
    }

    for (const attr of normalAttrs) {
      out += ` ${attr.name}="${escapeAttr(attr.value)}"`
    }

    out += '>'

    for (const child of Array.from(el.childNodes)) {
      out += c14nExclusiveNode(child, currentScopeNamespaces, false)
    }

    out += `</${el.nodeName}>`
    return out
  }

  return ''
}

function escapeAttr(val: string): string {
  return (val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;')
}

export function c14nXml(node: Node): string {
  return c14nExclusiveNode(node, new Map(), true)
}

function xmlEsc(s: string | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function assinarXml(
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

  const idAlvo = alvo.getAttribute('Id') || alvo.getAttribute('id') || ''
  const signedInfo = [
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
    `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>`,
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>`,
    `<Reference URI="#${idAlvo}">`,
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

  // Em conformidade com o XSD TCDPS: a Signature é filha de DPS e irmã de infDPS, posicionada logo após </infDPS>
  return xml.replace(`</${tagAssinar}>`, `</${tagAssinar}>` + signature)
}

// ---------------------------------------------------------------------------
// Gzip + Base64 (compressão e descompressão de payloads SEFIN)
// ---------------------------------------------------------------------------
export async function comprimirXmlParaGzipB64(xml: string): Promise<string> {
  const enc = new TextEncoder().encode(xml)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(enc)
  writer.close()
  const compressedBuf = await new Response(cs.readable).arrayBuffer()
  const bytes = new Uint8Array(compressedBuf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function descompactarGzipB64(gzipB64: string): Promise<string> {
  if (!gzipB64 || typeof gzipB64 !== 'string') return ''
  try {
    const binary = atob(gzipB64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const ds = new DecompressionStream('gzip')
    const writer = ds.writable.getWriter()
    writer.write(bytes)
    writer.close()
    const decompressed = await new Response(ds.readable).arrayBuffer()
    return new TextDecoder('utf-8').decode(decompressed)
  } catch (err) {
    console.error('Falha ao descompactar nfseXmlGZipB64:', err)
    return ''
  }
}

// ---------------------------------------------------------------------------
// Parser de Erros da SEFIN (NFSePostResponseErro e ResponseErro)
// ---------------------------------------------------------------------------
export function formatarErrosSefin(parsed: any): {
  codigo: string
  mensagem: string
  detalhes: Array<{ codigo?: string; descricao?: string; complemento?: string }>
} {
  const lista: Array<{ codigo?: string; descricao?: string; complemento?: string }> = []

  // NFSePostResponseErro (POST /nfse) => erros: [ { codigo, descricao, complemento } ]
  const arr = parsed.erros || parsed.Erros
  if (Array.isArray(arr) && arr.length > 0) {
    for (const item of arr) {
      if (typeof item === 'string') {
        lista.push({ descricao: item })
      } else if (item && typeof item === 'object') {
        lista.push({
          codigo: item.codigo || item.Codigo,
          descricao: item.descricao || item.Descricao || item.mensagem || item.Mensagem,
          complemento: item.complemento || item.Complemento,
        })
      }
    }
  }

  // ResponseErro (consultas e eventos) => erro: { codigo, descricao, complemento }
  const unico = parsed.erro || parsed.Erro
  if (unico && typeof unico === 'object') {
    lista.push({
      codigo: unico.codigo || unico.Codigo,
      descricao: unico.descricao || unico.Descricao || unico.mensagem || unico.Mensagem,
      complemento: unico.complemento || unico.Complemento,
    })
  }

  if (lista.length === 0) {
    const fallbackDesc =
      parsed.mensagem ||
      parsed.message ||
      parsed.error ||
      parsed.motivo ||
      parsed.reasonPhrase ||
      (typeof parsed.raw === 'string' && parsed.raw.slice(0, 300)) ||
      'Rejeição não especificada pela SEFIN Nacional'
    lista.push({
      codigo: parsed.codigo ? String(parsed.codigo) : undefined,
      descricao: String(fallbackDesc),
    })
  }

  const codigos = lista.map((e) => e.codigo).filter(Boolean)
  const codigoFinal =
    codigos.length > 0 ? codigos.join(', ') : String(parsed.codigo || 'ERRO_SEFIN')

  const frases = lista.map((e) => {
    let s = ''
    if (e.codigo) s += `[${e.codigo}] `
    s += e.descricao || 'Erro'
    if (e.complemento) s += ` (${e.complemento})`
    return s
  })

  return {
    codigo: codigoFinal,
    mensagem: frases.join('; '),
    detalhes: lista,
  }
}

// ---------------------------------------------------------------------------
// Geração do XML da DPS (padrão nacional NFS-e / LC 116 / infDPS v1.00)
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

export function montarDpsXml(i: DpsInput): { xml: string; idDps: string } {
  const docTomador = onlyDigits(i.documentoTomador)
  const isPJ = docTomador.length === 14
  // XSD TCInfoPessoa: xs:choice de CNPJ ou CPF diretamente sob <toma>, sem tag fantasma <CNPJ_CPF>
  const docTag = isPJ ? `<CNPJ>${docTomador}</CNPJ>` : `<CPF>${docTomador}</CPF>`

  const cMunEmi = onlyDigits(i.enderecoPrestador.codigoMunicipio) || '3550407'
  const cMunPadded = cMunEmi.padStart(7, '0')
  const cnpjPadded = onlyDigits(i.cnpjPrestador).padStart(14, '0')
  // Regra oficial TSIdDPS (45 caracteres): DPS + cMun(7) + tpInsc(1=CNPJ) + CNPJ(14) + serie(5 com zeros à esquerda) + nDPS(15 com zeros à esquerda)
  const seriePadded = (i.serieRps || '1').padStart(5, '0')
  const nDpsPadded = String(i.numeroRps).padStart(15, '0')

  // Identificador da DPS oficial (45 caracteres): DPS + cMun(7) + tpInsc(1=CNPJ) + CNPJ(14) + serie(5) + nDPS(15)
  const idDps = `DPS${cMunPadded}2${cnpjPadded}${seriePadded}${nDpsPadded}`

  const tomadorXml = [
    `<toma>`,
    docTag,
    `<xNome>${xmlEsc(i.nomeTomador)}</xNome>`,
    i.emailTomador ? `<email>${xmlEsc(i.emailTomador)}</email>` : '',
    `</toma>`,
  ].join('')

  const locPrest = `<locPrest><cLocPrestacao>${cMunPadded}</cLocPrestacao></locPrest>`

  const servicoXml = [
    `<serv>`,
    locPrest,
    `<cServ>`,
    `<cTribNac>${xmlEsc(i.servico.lc116)}</cTribNac>`,
    i.servico.codigoTribMunicipio
      ? `<cTribMun>${xmlEsc(i.servico.codigoTribMunicipio)}</cTribMun>`
      : '',
    `<xDescServ>${xmlEsc(i.servico.descricao)}</xDescServ>`,
    `</cServ>`,
    `</serv>`,
  ].join('')

  const valoresXml = [
    `<valores>`,
    `<vServPrest>`,
    `<vServ>${i.valorServicos.toFixed(2)}</vServ>`,
    `</vServPrest>`,
    `<trib>`,
    `<tribMun>`,
    `<tribISSQN>${i.exigibilidadeIss || 1}</tribISSQN>`,
    `<tpRetISSQN>${i.issRetido ? '1' : '2'}</tpRetISSQN>`,
    `<pAliq>${i.aliquotaIss.toFixed(2)}</pAliq>`,
    `</tribMun>`,
    `</trib>`,
    `</valores>`,
  ].join('')

  const dpsXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">`,
    `<infDPS Id="${idDps}">`,
    `<tpAmb>${i.ambiente === 'producao' ? '1' : '2'}</tpAmb>`,
    `<dhEmi>${i.dataEmissao}</dhEmi>`,
    `<verAplic>GB001</verAplic>`,
    `<serie>${xmlEsc(i.serieRps)}</serie>`,
    `<nDPS>${i.numeroRps}</nDPS>`,
    `<dCompet>${i.competencia}</dCompet>`,
    `<tpEmit>1</tpEmit>`,
    `<cLocEmi>${cMunPadded}</cLocEmi>`,
    `<prest>`,
    `<CNPJ>${onlyDigits(i.cnpjPrestador)}</CNPJ>`,
    i.inscricaoMunicipal ? `<inscMun>${xmlEsc(i.inscricaoMunicipal)}</inscMun>` : '',
    `<xNome>${xmlEsc(i.razaoSocial)}</xNome>`,
    `<end>`,
    `<endNac><cMun>${cMunPadded}</cMun><CEP>${onlyDigits(i.enderecoPrestador.cep)}</CEP></endNac>`,
    `<xLgr>${xmlEsc(i.enderecoPrestador.logradouro)}</xLgr>`,
    `<nro>${xmlEsc(i.enderecoPrestador.numero)}</nro>`,
    `<xBairro>${xmlEsc(i.enderecoPrestador.bairro)}</xBairro>`,
    `</end>`,
    i.enderecoPrestador.telefone ? `<fone>${onlyDigits(i.enderecoPrestador.telefone)}</fone>` : '',
    i.enderecoPrestador.email ? `<email>${xmlEsc(i.enderecoPrestador.email)}</email>` : '',
    `</prest>`,
    tomadorXml,
    servicoXml,
    valoresXml,
    i.observacoes ? `<infAdic><infCpl>${xmlEsc(i.observacoes)}</infCpl></infAdic>` : '',
    `</infDPS>`,
    `</DPS>`,
  ].join('')

  return { xml: dpsXml, idDps }
}

// ---------------------------------------------------------------------------
// Acesso ao Supabase (service role)
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
  if (error) throw new Error('Falha ao ler certificado no banco: ' + error.message)
  if (!data) return null

  const arquivoPath = data.storage_path || data.arquivo_path
  return {
    ...data,
    arquivo_path: arquivoPath,
  } as {
    arquivo_path: string
    senha_cifrada: string
    senha_iv?: string
    senha_tag?: string
  }
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

async function configurarMtls(certPem: string, keyPem: string): Promise<any> {
  if (typeof (Deno as any).createHttpClient !== 'function') {
    throw new Error('Ambiente Deno sem suporte a createHttpClient para mTLS com a Receita Federal.')
  }
  return (Deno as any).createHttpClient({
    caCerts: [certPem],
    key: keyPem,
    cert: certPem,
  })
}

// ---------------------------------------------------------------------------
// Envio da DPS ao sistema nacional (POST /nfse)
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

  if (!cert.senha_iv || !cert.senha_tag) {
    throw new Error(
      'Certificado com formato de cifragem legado. Reinstale o .pfx na aba Certificado.',
    )
  }

  const senha = await decifraSenha(cert.senha_cifrada, cert.senha_iv, cert.senha_tag)
  const pfxB64 = await baixarPfx(supaClient, cert.arquivo_path)
  const { certPem, keyPem } = await extrairPemDoPfx(pfxB64, senha)

  const agoraIso = new Date().toISOString()
  const dataEmissaoDps =
    nota.data_emissao_dps ||
    nota.data_emissao ||
    new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 19)

  const dataCompetencia =
    nota.data_competencia ||
    (nota.data_emissao ? String(nota.data_emissao).slice(0, 10) : agoraIso.slice(0, 10))

  const codigoMunicipio =
    config.municipio_incidencia_ibge ||
    config.codigo_municipio_padrao ||
    emitente.codigo_municipio_ibge ||
    '3550407'

  const codigoLc116 =
    nota.codigo_lc116 || nota.servico_codigo_lc116 || servico?.codigo_lc116 || '14.13'

  const descricaoServico =
    nota.descricao_servico ||
    nota.discriminacao_servicos ||
    servico?.descricao ||
    servico?.nome ||
    'Serviços prestados'

  const { xml: dpsXml, idDps } = montarDpsXml({
    ambiente: nota.ambiente || 'homologacao',
    dataEmissao: dataEmissaoDps,
    cnpjPrestador: emitente.cnpj,
    inscricaoMunicipal: emitente.inscricao_municipal || '',
    razaoSocial: emitente.razao_social,
    enderecoPrestador: {
      logradouro: emitente.logradouro || '',
      numero: emitente.numero || 'S/N',
      bairro: emitente.bairro || '',
      municipio: emitente.municipio || 'São Pedro',
      uf: emitente.uf || 'SP',
      cep: emitente.cep || '',
      codigoMunicipio,
      telefone: emitente.telefone || '',
      email: emitente.email || '',
    },
    nomeTomador: nota.tomador_nome,
    documentoTomador: nota.tomador_documento,
    emailTomador: nota.tomador_email,
    municipioTomador: nota.tomador_municipio,
    ufTomador: nota.tomador_uf,
    servico: {
      lc116: codigoLc116,
      codigoTribMunicipio: nota.codigo_tributario_municipio || '',
      descricao: descricaoServico,
    },
    valorServicos: Number(nota.valor_servicos),
    aliquotaIss: Number(nota.aliquota_iss || 2.0),
    issRetido: Boolean(nota.iss_retido),
    exigibilidadeIss: nota.exigibilidade_iss ?? 1,
    competencia: dataCompetencia,
    numeroRps: Number(nota.numero_rps),
    serieRps: nota.serie_rps || '1',
    observacoes: nota.observacoes || '',
  })

  const xmlAssinado = await assinarXml(dpsXml, 'infDPS', certPem, keyPem)

  // Grava id_dps e XML assinado com status 'enviando'
  const { error: updErr } = await supaClient
    .from('nfse_notas')
    .update({
      id_dps: idDps,
      xml_dps: xmlAssinado,
      xml_distribuicao: xmlAssinado,
      status: 'enviando',
      updated_at: new Date().toISOString(),
    })
    .eq('id', nota.id)

  if (updErr) {
    throw new Error('Falha ao atualizar nota para status enviando: ' + updErr.message)
  }

  // Prepara payload oficial SEFIN: dpsXmlGZipB64
  const dpsXmlGZipB64 = await comprimirXmlParaGzipB64(xmlAssinado)

  const client = await configurarMtls(certPem, keyPem)
  const ambiente = nota.ambiente || 'homologacao'
  const urlSefin = `${API_BASE[ambiente]}/nfse`

  try {
    const resp = await fetch(urlSefin, {
      method: 'POST',
      client,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        dpsXmlGZipB64,
      }),
    })

    const txt = await resp.text()
    let parsed: any = {}
    try {
      parsed = JSON.parse(txt)
    } catch {
      parsed = { raw: txt }
    }

    // HTTP != 201 ou resposta de erro SEFIN
    if (!resp.ok) {
      const { codigo, mensagem, detalhes } = formatarErrosSefin(parsed)
      const protocolo = parsed.numeroProtocolo || parsed.protocolo || ''
      const retorno = {
        status: 'rejeitada' as const,
        mensagem_erro: mensagem,
        mensagem_retorno: mensagem,
        protocolo,
        codigo_retorno: codigo,
        payload_retorno: parsed,
        updated_at: new Date().toISOString(),
      }

      const { error: errUpdate } = await supaClient
        .from('nfse_notas')
        .update(retorno)
        .eq('id', nota.id)
      if (errUpdate) {
        throw new Error(
          `Nota rejeitada pela Receita (${mensagem}), mas falhou ao gravar retorno no banco: ${errUpdate.message}`,
        )
      }
      return { ok: false, erro: mensagem, detalhes }
    }

    // Sucesso HTTP 201 (NFSePostResponseSucesso)
    // Campos oficiais: idDps, chaveAcesso, dataHoraProcessamento, nfseXmlGZipB64
    const idDpsRetorno = parsed.idDps || parsed.idDPS || idDps
    const chaveAcesso = String(parsed.chaveAcesso || parsed.chave || '')
    const dataHoraProcessamento = parsed.dataHoraProcessamento || parsed.dataEmissao
    const dataAutorizacao = dataHoraProcessamento
      ? new Date(dataHoraProcessamento).toISOString()
      : new Date().toISOString()

    // Descompacta XML retornado pela SEFIN (gzip base64)
    let xmlNfseDescompactado: string | null = null
    const gzipB64 = parsed.nfseXmlGZipB64 || parsed.xmlGZipB64
    if (gzipB64) {
      xmlNfseDescompactado = await descompactarGzipB64(gzipB64)
    } else if (parsed.xml || parsed.nfseXml) {
      xmlNfseDescompactado = parsed.xml || parsed.nfseXml
    }

    const protocolo = parsed.numeroProtocolo || parsed.protocolo || ''
    // Extrai número da nota a partir da chaveAcesso (posições 32 a 44 conforme layout) ou campo explícito
    let numeroNfse = String(
      parsed.numeroNfse || parsed.numeroNFSe || parsed.numeroAcesso || parsed.numero || '',
    )
    if (!numeroNfse && chaveAcesso && chaveAcesso.length === 50) {
      numeroNfse = String(parseInt(chaveAcesso.slice(31, 44), 10) || '')
    }

    const retorno = {
      status: 'autorizada' as const,
      id_dps: idDpsRetorno,
      protocolo,
      numero_nfse: numeroNfse,
      chave_acesso: chaveAcesso,
      codigo_verificacao: parsed.codigoVerificacao || null,
      data_autorizacao: dataAutorizacao,
      xml_nfse: xmlNfseDescompactado,
      xml_distribuicao: xmlNfseDescompactado || xmlAssinado,
      link_danfse: parsed.linkDanfse || parsed.linkImpressao || null,
      mensagem_erro: null,
      mensagem_retorno: 'NFS-e autorizada com sucesso pela SEFIN Nacional',
      codigo_retorno: '100',
      payload_retorno: parsed,
      updated_at: new Date().toISOString(),
    }

    const { error: okUpdateErr } = await supaClient
      .from('nfse_notas')
      .update(retorno)
      .eq('id', nota.id)
    if (okUpdateErr) {
      throw new Error(
        'Nota autorizada na Receita, mas falhou ao gravar no banco: ' + okUpdateErr.message,
      )
    }

    return { ok: true, retorno }
  } catch (e: any) {
    const msg = e?.message || String(e)
    const { error: erroGravar } = await supaClient
      .from('nfse_notas')
      .update({
        status: 'erro',
        mensagem_erro: msg,
        mensagem_retorno: msg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nota.id)

    if (erroGravar) {
      return {
        ok: false,
        erro: `${msg} (Aviso: falhou também ao registrar erro na tabela nfse_notas: ${erroGravar.message})`,
      }
    }
    return { ok: false, erro: msg }
  } finally {
    try {
      client?.close?.()
    } catch (_) {
      // Ignora erro de fechamento
    }
  }
}

// ---------------------------------------------------------------------------
// Consulta da nota no sistema nacional
// Documentação oficial da SEFIN Nacional:
// - GET /nfse/{chaveAcesso} — Consulta NFS-e pela chave de acesso (50 caracteres)
// - GET /dps/{id} — Recupera chave de acesso e dados pelo identificador da DPS (45 caracteres)
// NÃO utilizar /dps/protocolo/ nem consultar por número da nota (não suportados na API nacional)
// ---------------------------------------------------------------------------
async function consultarDps(nota: Record<string, any>) {
  const supaClient = supa()
  const cert = await obterCertificado(supaClient)
  if (!cert) throw new Error('Certificado A1 não cadastrado.')
  if (!cert.senha_iv || !cert.senha_tag) {
    throw new Error('Certificado com cifragem legada. Reinstale o .pfx.')
  }
  const senha = await decifraSenha(cert.senha_cifrada, cert.senha_iv, cert.senha_tag)
  const pfxB64 = await baixarPfx(supaClient, cert.arquivo_path)
  const { certPem, keyPem } = await extrairPemDoPfx(pfxB64, senha)

  const client = await configurarMtls(certPem, keyPem)
  const ambiente = nota.ambiente || 'homologacao'

  // Determina endpoint oficial com base nos identificadores vigentes
  let url = ''
  let tipoConsulta: 'chave' | 'dps' = 'chave'

  if (nota.chave_acesso && String(nota.chave_acesso).trim().length === 50) {
    tipoConsulta = 'chave'
    url = `${API_BASE[ambiente]}/nfse/${encodeURIComponent(String(nota.chave_acesso).trim())}`
  } else if (nota.id_dps) {
    tipoConsulta = 'dps'
    url = `${API_BASE[ambiente]}/dps/${encodeURIComponent(String(nota.id_dps).trim())}`
  } else {
    // Se não tiver chave nem id_dps gravado, tentar reconstruir o id_dps padrão
    throw new Error(
      'Não é possível consultar a NFS-e: a nota não possui chave_acesso (50 dígitos) nem id_dps registrado. Envie a DPS para obter os identificadores oficiais.',
    )
  }

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
      const { mensagem } = formatarErrosSefin(parsed)
      return { ok: false, erro: mensagem }
    }

    // Em GET /dps/{id}, a resposta pode conter chaveAcesso ou NFSe
    const chaveAcesso = String(parsed.chaveAcesso || parsed.chave || nota.chave_acesso || '')
    const idDps = String(parsed.idDps || parsed.idDPS || nota.id_dps || '')

    // Descompacta XML se fornecido em gzip
    let xmlNfseDescompactado = nota.xml_nfse || null
    const gzipB64 = parsed.nfseXmlGZipB64 || parsed.xmlGZipB64
    if (gzipB64) {
      xmlNfseDescompactado = await descompactarGzipB64(gzipB64)
    } else if (parsed.xml || parsed.nfseXml) {
      xmlNfseDescompactado = parsed.xml || parsed.nfseXml
    }

    const novoStatus = parsed.status === 'cancelada' ? 'cancelada' : 'autorizada'
    let numeroNfse = String(
      parsed.numeroNfse ||
        parsed.numeroNFSe ||
        parsed.numeroAcesso ||
        parsed.numero ||
        nota.numero_nfse ||
        '',
    )
    if (!numeroNfse && chaveAcesso && chaveAcesso.length === 50) {
      numeroNfse = String(parseInt(chaveAcesso.slice(31, 44), 10) || '')
    }

    const update: Record<string, unknown> = {
      status: novoStatus,
      id_dps: idDps || null,
      chave_acesso: chaveAcesso || null,
      numero_nfse: numeroNfse || null,
      xml_nfse: xmlNfseDescompactado,
      xml_distribuicao: xmlNfseDescompactado || nota.xml_distribuicao || null,
      link_danfse: parsed.linkDanfse || parsed.linkImpressao || nota.link_danfse || null,
      data_autorizacao:
        parsed.dataHoraProcessamento || parsed.dataEmissao
          ? new Date(parsed.dataHoraProcessamento || parsed.dataEmissao).toISOString()
          : nota.data_autorizacao,
      payload_retorno: parsed,
      updated_at: new Date().toISOString(),
    }

    const { error: errUpd } = await supaClient.from('nfse_notas').update(update).eq('id', nota.id)
    if (errUpd) {
      throw new Error(
        'Consulta bem sucedida na Receita, mas falhou ao atualizar o banco: ' + errUpd.message,
      )
    }

    return { ok: true, retorno: update }
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) }
  } finally {
    try {
      client?.close?.()
    } catch (_) {
      // Ignora erro de fechamento
    }
  }
}

// ---------------------------------------------------------------------------
// Handler principal (executado apenas quando index.ts é o script de entrada principal,
// NUNCA durante 'deno test' ou importações de teste)
// ---------------------------------------------------------------------------
if (import.meta.main) {
  Deno.serve(async (req) => {
    const url = new URL(req.url)
    const path = url.pathname.replace(/\/+$/, '')
    const idx = path.indexOf('/nfse-emissao')
    const route = idx >= 0 ? path.substring(idx + '/nfse-emissao'.length) : path

    // ---- CORS preflight ----
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const supaClient = supa()

    // ---- Segurança obrigatória: exige JWT de usuário Supabase válido + privilégio administrativo ----
    const authCheck = await validarUsuarioAdmin(req, supaClient)
    if (!authCheck.ok) {
      return erro(
        authCheck.erro || 'Não autorizado: token de usuário inválido.',
        authCheck.status || 401,
      )
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

        // Valida o .pfx ANTES de gravar (senha correta, certificado legível, chave extraível para PKCS#8)
        const { validoAte, validadeFim, cnpj, titular, emissor } = await extrairPemDoPfx(
          pfxBase64,
          senha,
        )
        const nomeArquivo = (body.nome_arquivo || 'certificado.pfx').replace(
          /[^a-zA-Z0-9._-]/g,
          '_',
        )
        const storagePath = `certificados/${Date.now()}-${nomeArquivo}`

        // Upload do arquivo para o bucket privado 'nfse_certificados'
        const { error: upErr } = await supaClient.storage.from('nfse_certificados').upload(
          storagePath,
          Uint8Array.from(atob(pfxBase64), (ch) => ch.charCodeAt(0)),
          {
            contentType: 'application/x-pkcs12',
            upsert: true,
          },
        )
        if (upErr) return erro('Falha ao gravar .pfx no Storage: ' + upErr.message, 500)

        const cif = await cifraSenha(senha)

        // Desativa certificados ativos anteriores para manter integridade
        await supaClient.from('nfse_certificado').update({ ativo: false }).eq('ativo', true)

        // UPSERT atômico no registro 'default': evita conflito de múltiplos certificados
        const { error: insErr } = await supaClient.from('nfse_certificado').upsert(
          {
            id: 'default',
            storage_path: storagePath,
            arquivo_path: storagePath,
            nome_arquivo: body.nome_arquivo || 'certificado.pfx',
            senha_cifrada: cif.c,
            senha_iv: cif.iv,
            senha_tag: cif.tag,
            valido_ate: body.valido_ate || validoAte,
            validade_fim: validadeFim,
            cnpj_certificado: cnpj || null,
            titular: titular || null,
            emissor: emissor || null,
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
        if (insErr) return erro('Falha ao gravar registro do certificado: ' + insErr.message, 500)

        return json({ ok: true, valido_ate: body.valido_ate || validoAte, titular, emissor })
      }

      // GET /certificado/status
      if (route === '/certificado/status' && req.method === 'GET') {
        const { data } = await supaClient
          .from('nfse_certificado')
          .select(
            'nome_arquivo, valido_ate, validade_fim, titular, emissor, cnpj_certificado, created_at, ativo',
          )
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const validoAte =
          data?.valido_ate ||
          (data?.validade_fim ? String(data.validade_fim).slice(0, 10) : undefined)
        const vencido = data?.validade_fim
          ? new Date(data.validade_fim).getTime() < Date.now()
          : false
        return json({
          existe: Boolean(data),
          instalado: Boolean(data),
          vencido,
          valido_ate: validoAte,
          ...(data || {}),
        })
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
          : erro(result.erro || 'Falha no envio.', 422, result.detalhes)
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
          .select('xml_dps, xml_nfse, xml_distribuicao')
          .eq('id', notaId)
          .maybeSingle()
        if (!nota) return erro('Nota não encontrada.', 404)
        return json({
          xml_dps: nota.xml_dps || nota.xml_distribuicao || '',
          xml_nfse: nota.xml_nfse || '',
        })
      }

      return erro('Rota não encontrada: ' + route, 404)
    } catch (e: any) {
      return erro(e?.message || String(e), 500)
    }
  })
}
