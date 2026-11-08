import { describe, it, expect } from 'vitest'
import forge from 'node-forge'
import {
  converterChavePrivadaParaPkcs8Pem,
  extrairPemDoPfxBuffer,
  formatarErrosSefin,
  montarDpsXmlPadraoNacional,
  assinarXmlString,
  descompactarGzipB64Async,
  comprimirGzipB64Async,
  gerarIdDpsOficial,
  DpsDadosInput,
} from './nfseCore'
import { determinarTomadorTipo } from './nfse'
import { c14nExclusive, EXC_C14N_ALGORITHM } from './nfseC14n'
import { validateDpsXmlAgainstXsd } from './nfseXsdValidate'
import * as fs from 'fs'
import * as path from 'path'

// Helpers criptográficos independentes para verificação no teste:
async function digestSha256Base64(str: string): Promise<string> {
  const md = forge.md.sha256.create()
  md.update(str, 'utf8')
  return forge.util.encode64(md.digest().getBytes())
}

function verifyRsaSha256(
  data: string,
  signatureBase64: string,
  publicKey: forge.pki.rsa.PublicKey,
): boolean {
  try {
    const md = forge.md.sha256.create()
    md.update(data, 'utf8')
    const signatureBytes = forge.util.decode64(signatureBase64)
    return publicKey.verify(md.digest().getBytes(), signatureBytes)
  } catch {
    return false
  }
}

// Helper para gerar um par de chaves e certificado PKCS#12 SINTÉTICO (A1 de teste em memória)
function gerarCertificadoA1Sintetico(senha: string) {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)

  const attrs = [
    { name: 'commonName', value: 'EMPRESA TESTE SINTETICA LTDA:12345678000195' },
    { name: 'countryName', value: 'BR' },
    { shortName: 'ST', value: 'SP' },
    { name: 'localityName', value: 'Sao Paulo' },
    { name: 'organizationName', value: 'Empresa Teste' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], senha, {
    algorithm: '3des',
    generateLocalKeyId: true,
    friendlyName: 'Certificado A1 Teste',
  })

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
  return { p12Der, keys, cert }
}

function parseDomBrowser(xml: string) {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

function dpsInputBase(sobrescrever: Partial<DpsDadosInput> = {}): DpsDadosInput {
  return {
    ambiente: 'homologacao',
    dataEmissao: '2026-11-08T10:00:00-03:00',
    cnpjPrestador: '12.345.678/0001-95',
    inscricaoMunicipal: '12345',
    razaoSocial: 'GB SOLUCOES LTDA',
    enderecoPrestador: {
      logradouro: 'Rua das Flores',
      numero: '100',
      bairro: 'Centro',
      municipio: 'São Pedro',
      uf: 'SP',
      cep: '13520-000',
      codigoMunicipio: '3550407',
      telefone: '19999999999',
      email: 'contato@gbsolucoes.com.br',
    },
    nomeTomador: 'Cliente Teste Tomador',
    documentoTomador: '98.765.432/0001-10',
    emailTomador: 'tomador@cliente.com.br',
    servico: {
      lc116: '14.13',
      descricao: 'Serviços de marcenaria e serralheria',
    },
    valorServicos: 1500.0,
    aliquotaIss: 2.0,
    issRetido: false,
    competencia: '2026-11-08',
    numeroRps: 42,
    serieRps: '1',
    observacoes: 'Orçamento de teste',
    ...sobrescrever,
  }
}

describe('Módulo NFS-e Nacional - Testes Técnicos Isolados', () => {
  it('1. Conversão PKCS#12 -> PKCS#8 PEM produz -----BEGIN PRIVATE KEY----- compatível com Deno/OpenSSL', () => {
    const keys = forge.pki.rsa.generateKeyPair(2048)
    const pkcs8Pem = converterChavePrivadaParaPkcs8Pem(keys.privateKey)

    expect(pkcs8Pem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(pkcs8Pem).toContain('-----END PRIVATE KEY-----')
    expect(pkcs8Pem).not.toContain('-----BEGIN RSA PRIVATE KEY-----')

    // Prova que a chave pode ser re-parseada pelo forge a partir do PEM
    const reparsed = forge.pki.privateKeyFromPem(pkcs8Pem)
    expect(reparsed).toBeDefined()
    expect(reparsed.n).toEqual(keys.privateKey.n)

    // Compatibilidade com OpenSSL: parseia DER do PKCS#8 e valida estrutura
    const pemBody = pkcs8Pem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s+/g, '')
    const der = forge.util.decode64(pemBody)
    const asn1 = forge.asn1.fromDer(der)
    // PrivateKeyInfo: SEQUENCE { version INTEGER, AlgorithmIdentifier SEQUENCE, privateKey OCTET STRING }
    expect(asn1.value.length).toBe(3)
    expect(asn1.value[0].type).toBe(forge.asn1.Type.INTEGER)
    expect(asn1.value[1].type).toBe(forge.asn1.Type.SEQUENCE)
    expect(asn1.value[2].type).toBe(forge.asn1.Type.OCTETSTRING)
  })

  it('2. Leitura e parsing de arquivo A1 (.pfx) sintético com extração de certPem, keyPem, CNPJ e validade', () => {
    const senhaTeste = 'senha-secreta-123'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)

    const extraido = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    expect(extraido.certPem).toContain('-----BEGIN CERTIFICATE-----')
    expect(extraido.keyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(extraido.cnpj).toBe('12345678000195')
    expect(extraido.titular).toBe('EMPRESA TESTE SINTETICA LTDA:12345678000195')
    expect(extraido.validoAte).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Senha errada deve lançar erro
    expect(() => extrairPemDoPfxBuffer(p12Der, 'senha-errada')).toThrow()
  })

  it('3. Geração do XML da DPS segue o XSD oficial (TCDPS/TCInfDPS, Id com 45 posições, toma sem CNPJ_CPF)', () => {
    const dps = montarDpsXmlPadraoNacional(dpsInputBase())

    // Id oficial 45 posições: DPS + cMun(7) + tpInsc(1) + CNPJ(14) + serie(5, padStart) + nDPS(15)
    expect(dps.idDps).toBe('DPS355040721234567800019500001000000000000042')
    expect(dps.idDps.length).toBe(45)
    expect(dps.xml).toContain('<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">')
    expect(dps.xml).toContain(`<infDPS Id="${dps.idDps}">`)
    expect(dps.xml).toContain('<serie>1</serie>')
    expect(dps.xml).toContain('<nDPS>42</nDPS>')
    expect(dps.xml).toContain('<tpAmb>2</tpAmb>')

    // Valida que o tomador usa <toma><CNPJ>...</CNPJ> DIRETO, NUNCA a tag fantasma <CNPJ_CPF>
    expect(dps.xml).not.toContain('<CNPJ_CPF>')
    expect(dps.xml).not.toContain('</CNPJ_CPF>')
    expect(dps.xml).toContain('<toma><CNPJ>98765432000110</CNPJ>')

    // Parse XML estrutural
    const doc = parseDomBrowser(dps.xml)
    expect(doc.getElementsByTagName('DPS').length).toBe(1)
    expect(doc.getElementsByTagName('infDPS').length).toBe(1)
    expect(doc.getElementsByTagName('prest').length).toBe(1)
    expect(doc.getElementsByTagName('toma').length).toBe(1)
    expect(doc.getElementsByTagName('serv').length).toBe(1)
    expect(doc.getElementsByTagName('valores').length).toBe(1)
  })

  it('3b. ID da DPS: série com padding à ESQUERDA no Id, coerente com a tag <serie> do XML', () => {
    // Série 1 -> '00001' no Id; a tag <serie> contém o valor natural '1'
    const serie1 = gerarIdDpsOficial('3550407', '12345678000195', '1', 42)
    expect(serie1).toBe('DPS355040721234567800019500001000000000000042')
    expect(serie1.slice(25, 30)).toBe('00001') // campo serie nas posições 26-30 do Id
    expect(serie1.length).toBe(45)

    // Série alfanumérica/longa de 5 posições não é alterada
    const serie5 = gerarIdDpsOficial('3550407', '12345678000195', 'AB123', 7)
    expect(serie5).toBe('DPS3550407212345678000195AB123000000000000007')

    // XML e Id são coerentes: <serie>1</serie> <=> Id contém serie '00001'
    const dps = montarDpsXmlPadraoNacional(dpsInputBase({ serieRps: '1', numeroRps: 1 }))
    expect(dps.xml).toContain('<serie>1</serie>')
    expect(dps.xml).toContain(`<infDPS Id="${dps.idDps}">`)
    expect(dps.idDps).toContain('00001')
  })

  it('4. Assinatura XMLDSig é injetada após </infDPS> e antes de </DPS>, com exc-c14n e rsa-sha256', () => {
    const senhaTeste = 'teste-assinar'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)
    const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    const dps = montarDpsXmlPadraoNacional(
      dpsInputBase({
        cnpjPrestador: '12345678000195',
        nomeTomador: 'Cliente CPF',
        documentoTomador: '123.456.789-00',
        servico: { lc116: '07.02', descricao: 'Instalação de gesso drywall' },
        valorServicos: 850.5,
      }),
    )

    const assinado = assinarXmlString(dps.xml, 'infDPS', certPem, keyPem, parseDomBrowser)

    expect(assinado).toContain('</infDPS><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">')
    expect(assinado).toContain('</Signature></DPS>')
    expect(assinado).not.toContain('</Signature></infDPS>') // Assinatura NÃO fica dentro de infDPS

    const docAssinado = parseDomBrowser(assinado)
    const sig = docAssinado.getElementsByTagName('Signature')[0]
    expect(sig).toBeDefined()
    expect(sig.getElementsByTagName('SignedInfo').length).toBe(1)
    expect(sig.getElementsByTagName('SignatureValue').length).toBe(1)
    expect(sig.getElementsByTagName('X509Certificate').length).toBe(1)

    // Métodos oficiais XMLDSig para NFS-e Nacional
    const c14nMethod = docAssinado.getElementsByTagName('CanonicalizationMethod')[0]
    const sigMethod = docAssinado.getElementsByTagName('SignatureMethod')[0]
    const digestMethod = docAssinado.getElementsByTagName('DigestMethod')[0]
    expect(c14nMethod.getAttribute('Algorithm')).toBe(EXC_C14N_ALGORITHM)
    expect(sigMethod.getAttribute('Algorithm')).toBe(
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    )
    expect(digestMethod.getAttribute('Algorithm')).toBe('http://www.w3.org/2001/04/xmlenc#sha256')
  })

  it('4b. C14N Exclusive: digest do infDPS inclui xmlns herdado do <DPS> e é estável com implementação independente', async () => {
    const senhaTeste = 'teste-c14n'
    const { p12Der, keys } = gerarCertificadoA1Sintetico(senhaTeste)
    const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    const dps = montarDpsXmlPadraoNacional(dpsInputBase({ cnpjPrestador: '12345678000195' }))
    const assinado = assinarXmlString(dps.xml, 'infDPS', certPem, keyPem, parseDomBrowser)

    // ---- VERIFICAÇÃO INDEPENDENTE (não usa c14nXmlNode da aplicação p/ o digest) ----
    const docAssinado = parseDomBrowser(assinado)

    // 1) Recalcula o digest do infDPS com exc-C14N INDEPENDENTE (nossa implementação do W3C)
    const infDps = docAssinado.getElementsByTagName('infDPS')[0]
    const digestRecalcB64 = await digestSha256Base64(c14nExclusive(infDps))
    const digestAssinado = docAssinado.getElementsByTagName('DigestValue')[0].textContent || ''
    expect(digestAssinado.length).toBeGreaterThan(10)
    expect(digestRecalcB64).toBe(digestAssinado)

    // 2) O digest calculado é SENSÍVEL ao namespace herdado (prova de que o exc-C14N real difere
    //    do C14N "cego" que omitia xmlns): serialização canônica do subdoc começa com xmlns herdado
    const c14nInf = c14nExclusive(infDps)
    expect(c14nInf.startsWith('<infDPS xmlns="http://www.sped.fazenda.gov.br/nfse" Id=')).toBe(true)

    // 3) Verificação criptográfica da assinatura com a chave pública do cert:
    //    (a) re-deriva o SignedInfo canônico do documento assinado e valida a assinatura RSA;
    const sigEl = docAssinado.getElementsByTagName('Signature')[0]
    const signedInfoEl = sigEl.getElementsByTagName('SignedInfo')[0]
    const signedInfoC14n = c14nExclusive(signedInfoEl)
    const signatureValueB64 = sigEl.getElementsByTagName('SignatureValue')[0].textContent || ''
    const signatureValid = verifyRsaSha256(
      signedInfoC14n,
      signatureValueB64,
      forge.pki.publicKeyFromPem(forge.pki.certificateFromPem(certPem).publicKey),
    )
    expect(signatureValid).toBe(true)

    //    (b) prova negativa: assinatura NÃO valida com outra chave pública
    const outrasKeys = forge.pki.rsa.generateKeyPair(2048)
    const signatureInvalid = verifyRsaSha256(
      signedInfoC14n,
      signatureValueB64,
      outrasKeys.publicKey,
    )
    expect(signatureInvalid).toBe(false)

    //    (c) o digest verificado é o mesmo que a chave pública do certificado do KeyInfo valida
    const x509B64 = sigEl.getElementsByTagName('X509Certificate')[0].textContent || ''
    const certFromSig = forge.pki.certificateFromAsn1(
      forge.asn1.fromDer(forge.util.decode64(x509B64)),
    )
    const pubFromSig = forge.pki.publicKeyFromPem(forge.pki.certificateToPem(certFromSig))
    expect(verifyRsaSha256(signedInfoC14n, signatureValueB64, pubFromSig)).toBe(true)
    expect(certFromSig.publicKey.n.toString(16)).toBe(keys.publicKey.n.toString(16))

    void keyPem // chave privada não é usada na verificação (independência)
  })

  it('5. Gzip + Base64: compressão e descompressão round-trip idênticas para dpsXmlGZipB64 e nfseXmlGZipB64', async () => {
    const xmlOriginal = '<NFSe versao="1.00"><infNFSe><xNome>GB Solucoes</xNome></infNFSe></NFSe>'
    const b64Zip = await comprimirGzipB64Async(xmlOriginal)
    expect(b64Zip).toBeDefined()
    expect(b64Zip.length).toBeGreaterThan(0)

    const descompactado = await descompactarGzipB64Async(b64Zip)
    expect(descompactado).toBe(xmlOriginal)
  })

  it('6. Tratamento de erros SEFIN: captura array erros (POST /nfse) e objeto erro (ResponseErro em consultas)', () => {
    // Caso A: Rejeição no POST /nfse com array erros
    const respErroPost = {
      tipoAmbiente: 2,
      versaoAplicativo: '1.0.0',
      dataHoraProcessamento: '2026-11-08T12:00:00Z',
      idDPS: 'DPS355040721234567800019500001000000000000042',
      erros: [
        {
          codigo: 'E001',
          descricao: 'Alíquota de ISS divergente do cadastro municipal',
          complemento: 'Código 14.13',
        },
        { codigo: 'E042', descricao: 'Inscrição Municipal inválida para o prestador' },
      ],
    }

    const fmtA = formatarErrosSefin(respErroPost)
    expect(fmtA.codigo).toBe('E001, E042')
    expect(fmtA.mensagem).toContain(
      '[E001] Alíquota de ISS divergente do cadastro municipal (Código 14.13)',
    )
    expect(fmtA.mensagem).toContain('[E042] Inscrição Municipal inválida para o prestador')
    expect(fmtA.detalhes.length).toBe(2)

    // Caso B: Consulta com erro ResponseErro (objeto erro único)
    const respErroGet = {
      tipoAmbiente: 2,
      versaoAplicativo: '1.0.0',
      dataHoraProcessamento: '2026-11-08T12:00:00Z',
      erro: {
        codigo: 'E404',
        descricao: 'NFS-e não encontrada para a chave de acesso informada',
      },
    }

    const fmtB = formatarErrosSefin(respErroGet)
    expect(fmtB.codigo).toBe('E404')
    expect(fmtB.mensagem).toBe('[E404] NFS-e não encontrada para a chave de acesso informada')

    // Caso C: Fallback para gateways ou resposta não padronizada
    const respFallback = {
      status: 400,
      message: 'Certificado mTLS revogado ou inválido',
    }
    const fmtC = formatarErrosSefin(respFallback)
    expect(fmtC.mensagem).toContain('Certificado mTLS revogado ou inválido')
  })

  it('7. Arquivos XSD oficiais v1.01 estão presentes no repositório (vendored) para validação offline', () => {
    // Comprova que os schemas oficiais v1.01 estão versionados localmente
    const schemaDir = path.resolve(process.cwd(), 'schemas/nfse/v1.01')
    expect(fs.existsSync(path.join(schemaDir, 'DPS_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(schemaDir, 'tiposComplexos_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(schemaDir, 'tiposSimples_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(schemaDir, 'xmldsig-core-schema.xsd'))).toBe(true)

    // E também em src/schemas/nfse/v1.01/
    const srcSchemaDir = path.resolve(process.cwd(), 'src/schemas/nfse/v1.01')
    expect(fs.existsSync(path.join(srcSchemaDir, 'DPS_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(srcSchemaDir, 'tiposComplexos_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(srcSchemaDir, 'tiposSimples_v1.01.xsd'))).toBe(true)
    expect(fs.existsSync(path.join(srcSchemaDir, 'xmldsig-core-schema.xsd'))).toBe(true)

    const xsdDpsContent = fs.readFileSync(path.join(schemaDir, 'DPS_v1.01.xsd'), 'utf-8')
    expect(xsdDpsContent).toContain('targetNamespace="http://www.sped.fazenda.gov.br/nfse"')
    expect(xsdDpsContent).toContain('element name="DPS" type="TCDPS"')
  })

  it('7b. XML da DPS gerado passa na validação das regras dos esquemas XSD v1.01 carregados de DPS_v1.01.xsd', () => {
    const dps = montarDpsXmlPadraoNacional(dpsInputBase())

    const resultado = validateDpsXmlAgainstXsd(dps.xml)
    expect(resultado.valido).toBe(true)
    expect(resultado.errors.length).toBe(0)
    // Comprova que o modelo XSD oficial foi compilado dos 4 arquivos vendored
    expect(resultado.modelInfo).toBeDefined()
    expect(resultado.modelInfo?.schemasCount).toBe(4)
    expect(resultado.modelInfo?.rootElement).toBe('DPS')
    if (!resultado.valido) {
      console.error('Erros de validação de esquema:', resultado.erros)
    }
  })

  it('8. XML da DPS assinado (com ds:Signature) também passa na validação XSD v1.01', () => {
    const senhaTeste = 'teste-xsd-assinado'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)
    const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    const dps = montarDpsXmlPadraoNacional(dpsInputBase({ cnpjPrestador: '12345678000195' }))
    const assinado = assinarXmlString(dps.xml, 'infDPS', certPem, keyPem, parseDomBrowser)

    const resultado = validateDpsXmlAgainstXsd(assinado)
    expect(resultado.valido).toBe(true)
    if (!resultado.valido) {
      console.error('Erros de validação XSD (assinado):', resultado.erros)
    }
  })

  it('9. Validador XSD v1.01 detecta e REJEITA violações do schema (casos negativos)', () => {
    const dps = montarDpsXmlPadraoNacional(dpsInputBase())

    // Caso Negativo A: Violação de ordem de elementos em infDPS (<serie> antes de <tpAmb>)
    const xmlOrdemErrada = dps.xml.replace(
      '<tpAmb>2</tpAmb><dhEmi>2026-11-08T10:00:00-03:00</dhEmi><verAplic>1.0.0</verAplic><serie>1</serie>',
      '<serie>1</serie><tpAmb>2</tpAmb><dhEmi>2026-11-08T10:00:00-03:00</dhEmi><verAplic>1.0.0</verAplic>',
    )
    const resOrdem = validateDpsXmlAgainstXsd(xmlOrdemErrada)
    expect(resOrdem.valido).toBe(false)
    expect(resOrdem.erros.some((e) => e.code === 'SEQUENCE_ORDER_VIOLATION')).toBe(true)

    // Caso Negativo B: Campo obrigatório ausente (<dCompet> removido)
    const xmlSemDCompet = dps.xml.replace(/<dCompet>[^<]+<\/dCompet>/, '')
    const resSemDCompet = validateDpsXmlAgainstXsd(xmlSemDCompet)
    expect(resSemDCompet.valido).toBe(false)
    expect(
      resSemDCompet.erros.some(
        (e) => e.code === 'MISSING_MANDATORY_ELEMENT' && e.path.includes('dCompet'),
      ),
    ).toBe(true)

    // Caso Negativo C: Atributo Id da DPS com tamanho inválido (< 45 caracteres)
    const xmlIdInvalido = dps.xml.replace(`Id="${dps.idDps}"`, 'Id="DPS123CURTO"')
    const resId = validateDpsXmlAgainstXsd(xmlIdInvalido)
    expect(resId.valido).toBe(false)
    expect(resId.erros.some((e) => e.code === 'INVALID_ID_FORMAT')).toBe(true)

    // Caso Negativo D: Código IBGE cLocEmi inválido (não tem 7 dígitos)
    const xmlIbgeErrado = dps.xml.replace('<cLocEmi>3550407</cLocEmi>', '<cLocEmi>123</cLocEmi>')
    const resIbge = validateDpsXmlAgainstXsd(xmlIbgeErrado)
    expect(resIbge.valido).toBe(false)
    expect(resIbge.erros.some((e) => e.code === 'INVALID_IBGE_CODE')).toBe(true)

    // Caso Negativo E: Signature colocada antes de infDPS (violação da sequência do TCDPS)
    const xmlSigAntes = `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"></Signature><infDPS Id="${dps.idDps}"><tpAmb>2</tpAmb></infDPS></DPS>`
    const resSigAntes = validateDpsXmlAgainstXsd(xmlSigAntes)
    expect(resSigAntes.valido).toBe(false)
    expect(
      resSigAntes.erros.some(
        (e) => e.code === 'SEQUENCE_ORDER_VIOLATION' || e.code === 'SIGNATURE_BEFORE_INFDPS',
      ),
    ).toBe(true)
  })

  it('10. Verificação criptográfica independente: falha se o XML for adulterado após a assinatura', async () => {
    const senhaTeste = 'teste-tamper'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)
    const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    const dps = montarDpsXmlPadraoNacional(dpsInputBase({ cnpjPrestador: '12345678000195' }))
    const assinado = assinarXmlString(dps.xml, 'infDPS', certPem, keyPem, parseDomBrowser)

    // Altera o valor de serviço de 1500.00 para 9999.00 no XML assinado (tentativa de fraude/adulteração)
    const xmlAdulterado = assinado.replace('<vServ>1500.00</vServ>', '<vServ>9999.00</vServ>')
    const docAdulterado = parseDomBrowser(xmlAdulterado)

    const infDpsAdulterado = docAdulterado.getElementsByTagName('infDPS')[0]
    const digestRecalculado = await digestSha256Base64(c14nExclusive(infDpsAdulterado))
    const digestNoXml = docAdulterado.getElementsByTagName('DigestValue')[0].textContent || ''

    // O DigestValue recalculado pelo verificador DEVE DIVERGIR do DigestValue assinado no XML
    expect(digestRecalculado).not.toBe(digestNoXml)

    // E a validação da assinatura sobre o SignedInfo adulterado falha
    const sigEl = docAdulterado.getElementsByTagName('Signature')[0]
    const signedInfoEl = sigEl.getElementsByTagName('SignedInfo')[0]
    // Se adulterar o DigestValue para bater com o corpo adulterado, a assinatura digital RSA quebra:
    signedInfoEl.getElementsByTagName('DigestValue')[0].textContent = digestRecalculado
    const signedInfoC14nAdulterado = c14nExclusive(signedInfoEl)
    const signatureValueB64 = sigEl.getElementsByTagName('SignatureValue')[0].textContent || ''
    const cert = forge.pki.certificateFromPem(certPem)

    const assinaturaValidaAposFraude = verifyRsaSha256(
      signedInfoC14nAdulterado,
      signatureValueB64,
      cert.publicKey,
    )
    expect(assinaturaValidaAposFraude).toBe(false)
  })

  it('13. Determina tomador_tipo corretamente para inserção em nfse_notas (NOT NULL)', () => {
    expect(determinarTomadorTipo('12.345.678/0001-95')).toBe('PJ')
    expect(determinarTomadorTipo('12345678000195')).toBe('PJ')
    expect(determinarTomadorTipo('123.456.789-00')).toBe('PF')
    expect(determinarTomadorTipo('12345678900')).toBe('PF')
    expect(determinarTomadorTipo('')).toBe('PF')
  })
})
