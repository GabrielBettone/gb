// @ts-nocheck
import forge from 'node-forge'
import { c14nExclusive, EXC_C14N_ALGORITHM } from './nfseC14n'

export interface PfxExtracaoResult {
  certPem: string
  keyPem: string
  validoAte: string
  validadeFim: string
  cnpj?: string
  titular?: string
  emissor?: string
}

export function converterChavePrivadaParaPkcs8Pem(privateKey: any): string {
  // 1. Converter a chave privada Forge em RSAPrivateKey ASN.1 (PKCS#1)
  const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(privateKey)
  // 2. Envelopar o RSAPrivateKey ASN.1 em PrivateKeyInfo ASN.1 (PKCS#8)
  const privateKeyInfoAsn1 = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1)
  // 3. Converter a estrutura PrivateKeyInfo ASN.1 para PEM (BEGIN PRIVATE KEY)
  return forge.pki.privateKeyInfoToPem(privateKeyInfoAsn1)
}

export function extrairPemDoPfxBuffer(pfxDerBytes: string, senha: string): PfxExtracaoResult {
  const p12Asn1 = forge.asn1.fromDer(pfxDerBytes, false)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha)

  let certPem = ''
  let keyPem = ''
  let certObj: any = null

  // Extrai chave privada
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.key) {
        keyPem = converterChavePrivadaParaPkcs8Pem(safeBag.key)
      }
      if (safeBag.cert && !certObj) {
        certObj = safeBag.cert
        certPem = forge.pki.certificateToPem(safeBag.cert)
      }
    }
  }

  // Fallback: se não achou cert no safeBags loop
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
  } catch {
    // Ignora erro ao extrair metadados
  }

  return { certPem, keyPem, validoAte, validadeFim, cnpj, titular, emissor }
}

export function extrairPemDoPfxBase64(pfxB64: string, senha: string): PfxExtracaoResult {
  const p12Der = forge.util.decode64(pfxB64)
  return extrairPemDoPfxBuffer(p12Der, senha)
}

export function descompactarGzipB64(gzipB64: string): string {
  const binary = forge.util.decode64(gzipB64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  // Se pako estiver disponível ou fflate, ou DecompressionStream
  // Em ambiente browser/Deno:
  if (typeof DecompressionStream !== 'undefined') {
    // Síncrono não é possível com DecompressionStream, mas podemos fornecer versão assíncrona
  }
  return ''
}

export async function descompactarGzipB64Async(gzipB64: string): Promise<string> {
  const binary = forge.util.decode64(gzipB64)
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
}

export async function comprimirGzipB64Async(texto: string): Promise<string> {
  const enc = new TextEncoder().encode(texto)
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
  return forge.util.encode64(binary)
}

export function formatarErrosSefin(parsed: any): {
  codigo: string
  mensagem: string
  detalhes: Array<{ codigo?: string; descricao?: string; complemento?: string }>
} {
  const lista: Array<{ codigo?: string; descricao?: string; complemento?: string }> = []

  // Caso 1: NFSePostResponseErro (POST /nfse) => erros: [ { codigo, descricao, complemento } ]
  // O ADN pode usar tanto 'erros' quanto 'Erros', 'codigo'/'Codigo', 'descricao'/'Descricao'
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

  // Caso 2: ResponseErro (consultas e eventos) => erro: { codigo, descricao, complemento }
  const unico = parsed.erro || parsed.Erro
  if (unico && typeof unico === 'object') {
    lista.push({
      codigo: unico.codigo || unico.Codigo,
      descricao: unico.descricao || unico.Descricao || unico.mensagem || unico.Mensagem,
      complemento: unico.complemento || unico.Complemento,
    })
  }

  // Caso 3: mensagem de fallback de gateways ou outros formatos
  if (lista.length === 0) {
    const fallbackDesc =
      parsed.mensagem ||
      parsed.message ||
      parsed.error ||
      parsed.motivo ||
      parsed.reasonPhrase ||
      (typeof parsed.raw === 'string' && parsed.raw.slice(0, 300)) ||
      'Erro não especificado pela SEFIN Nacional'
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

  const mensagemFinal = frases.join('; ')

  return {
    codigo: codigoFinal,
    mensagem: mensagemFinal,
    detalhes: lista,
  }
}

export { c14nExclusive as c14nXmlNode } from './nfseC14n'
export { EXC_C14N_ALGORITHM } from './nfseC14n'

export interface DpsDadosInput {
  ambiente: 'producao' | 'homologacao' | string
  dataEmissao: string
  cnpjPrestador: string
  inscricaoMunicipal?: string
  razaoSocial: string
  enderecoPrestador: {
    logradouro: string
    numero: string
    bairro: string
    municipio: string
    uf: string
    cep: string
    codigoMunicipio: string
    telefone?: string
    email?: string
  }
  nomeTomador: string
  documentoTomador: string
  emailTomador?: string
  enderecoTomador?: string
  municipioTomador?: string
  ufTomador?: string
  servico: {
    lc116: string
    codigoTribMunicipio?: string
    descricao: string
  }
  valorServicos: number
  aliquotaIss: number
  issRetido: boolean
  exigibilidadeIss?: number
  competencia: string
  numeroRps: number
  serieRps: string
  observacoes?: string
}

function xmlEscape(s: string | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function onlyDigits(s: string | undefined): string {
  return (s || '').replace(/\D/g, '')
}

/**
 * ID da DPS (layout oficial NFS-e Nacional v1.01): 45 posições
 * DPS(3) + cLocEmi/cMun(7) + tpInsc(1) + CNPJ/CPF(14) + serie(5) + nDPS(15)
 * A série ocupa CINCO posições fixas com zeros à ESQUERDA (padStart) para
 * manter o Id coerente com a tag <serie> do XML (série 1 => "00001").
 */
export function gerarIdDpsOficial(
  cMunEmi: string,
  cnpjPrestador: string,
  serie: string,
  numero: number,
): string {
  const cMunPadded = onlyDigits(cMunEmi).padStart(7, '0')
  const cnpjPadded = onlyDigits(cnpjPrestador).padStart(14, '0')
  const seriePadded = (serie || '1').padStart(5, '0')
  const nDpsPadded = String(numero).padStart(15, '0')
  return `DPS${cMunPadded}2${cnpjPadded}${seriePadded}${nDpsPadded}`
}

export function montarDpsXmlPadraoNacional(i: DpsDadosInput): { xml: string; idDps: string } {
  const docTomador = onlyDigits(i.documentoTomador)
  const isPJ = docTomador.length === 14
  const docTag = isPJ ? `<CNPJ>${docTomador}</CNPJ>` : `<CPF>${docTomador}</CPF>`

  const cMunEmi = onlyDigits(i.enderecoPrestador.codigoMunicipio) || '3550407'
  const cMunPadded = cMunEmi.padStart(7, '0')
  const idDps = gerarIdDpsOficial(cMunPadded, i.cnpjPrestador, i.serieRps, i.numeroRps)

  const tomadorXml = [
    `<toma>`,
    docTag,
    `<xNome>${xmlEscape(i.nomeTomador)}</xNome>`,
    i.emailTomador ? `<email>${xmlEscape(i.emailTomador)}</email>` : '',
    `</toma>`,
  ].join('')

  const locPrest = `<locPrest><cLocPrestacao>${cMunPadded}</cLocPrestacao></locPrest>`

  const servicoXml = [
    `<serv>`,
    locPrest,
    `<cServ>`,
    `<cTribNac>${xmlEscape(i.servico.lc116)}</cTribNac>`,
    i.servico.codigoTribMunicipio
      ? `<cTribMun>${xmlEscape(i.servico.codigoTribMunicipio)}</cTribMun>`
      : '',
    `<xDescServ>${xmlEscape(i.servico.descricao)}</xDescServ>`,
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
    `<tribISSQN>${i.exigibilidadeIss ?? 1}</tribISSQN>`,
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
    `<serie>${xmlEscape(i.serieRps)}</serie>`,
    `<nDPS>${i.numeroRps}</nDPS>`,
    `<dCompet>${i.competencia}</dCompet>`,
    `<tpEmit>1</tpEmit>`,
    `<cLocEmi>${cMunPadded}</cLocEmi>`,
    `<prest>`,
    `<CNPJ>${onlyDigits(i.cnpjPrestador)}</CNPJ>`,
    i.inscricaoMunicipal ? `<inscMun>${xmlEscape(i.inscricaoMunicipal)}</inscMun>` : '',
    `<xNome>${xmlEscape(i.razaoSocial)}</xNome>`,
    `<end>`,
    `<endNac><cMun>${cMunPadded}</cMun><CEP>${onlyDigits(i.enderecoPrestador.cep)}</CEP></endNac>`,
    `<xLgr>${xmlEscape(i.enderecoPrestador.logradouro)}</xLgr>`,
    `<nro>${xmlEscape(i.enderecoPrestador.numero)}</nro>`,
    `<xBairro>${xmlEscape(i.enderecoPrestador.bairro)}</xBairro>`,
    `</end>`,
    i.enderecoPrestador.telefone ? `<fone>${onlyDigits(i.enderecoPrestador.telefone)}</fone>` : '',
    i.enderecoPrestador.email ? `<email>${xmlEscape(i.enderecoPrestador.email)}</email>` : '',
    `</prest>`,
    tomadorXml,
    servicoXml,
    valoresXml,
    i.observacoes ? `<infAdic><infCpl>${xmlEscape(i.observacoes)}</infCpl></infAdic>` : '',
    `</infDPS>`,
    `</DPS>`,
  ].join('')

  return { xml: dpsXml, idDps }
}

export function assinarXmlString(
  xml: string,
  tagAssinar: string,
  certPem: string,
  keyPem: string,
  parseDomFn: (xml: string) => any,
): string {
  const privateKey = forge.pki.privateKeyFromPem(keyPem)
  const cert = forge.pki.certificateFromPem(certPem)
  const certDerB64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
  )

  const doc = parseDomFn(xml)
  const alvo = doc.getElementsByTagName(tagAssinar)[0]
  if (!alvo) throw new Error(`Tag ${tagAssinar} não encontrada no XML da DPS.`)

  // Digest calculado com Exclusive C14N real (inclui namespaces herdados do <DPS>)
  const c14nAlvo = c14nExclusive(alvo)
  const md = forge.md.sha256.create()
  md.update(c14nAlvo, 'utf8')
  const digestB64 = forge.util.encode64(md.digest().getBytes())

  const idAlvo = alvo.getAttribute('Id') || alvo.getAttribute('id') || ''
  const signedInfo = [
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
    `<CanonicalizationMethod Algorithm="${EXC_C14N_ALGORITHM}"/>`,
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>`,
    `<Reference URI="#${idAlvo}">`,
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>`,
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>`,
    `<DigestValue>${digestB64}</DigestValue>`,
    `</Reference>`,
    `</SignedInfo>`,
  ].join('')

  const siDoc = parseDomFn(signedInfo)
  const siC14n = c14nExclusive(siDoc.documentElement)
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

  // No XSD TCDPS: <xs:sequence><xs:element name="infDPS" /><xs:element ref="ds:Signature" minOccurs="0"/></xs:sequence>
  // Signature vem LOGO APÓS </infDPS> e ANTES de </DPS>
  return xml.replace(`</${tagAssinar}>`, `</${tagAssinar}>` + signature)
}
