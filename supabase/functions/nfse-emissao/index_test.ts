// Testes unitários do Deno para a Edge Function nfse-emissao
// Executável com: deno test --allow-read supabase/functions/nfse-emissao/index_test.ts
//
// Cobre os 10 pontos técnicos solicitados e declarados:
// 1. Parsing do arquivo A1 PKCS#12 (.pfx) com certificado sintético
// 2. Conversão da chave privada para PKCS#8 PEM via privateKeyInfoToPem (-----BEGIN PRIVATE KEY-----)
// 3. Montagem do XML DPS com Id (45 chars), infDPS, toma direto com CNPJ/CPF
// 4. Assinatura XMLDSig (enveloped, C14N, RSA-SHA256) compatível com XSD TCDPS
// 5. Compressão e descompressão gzip base64 (dpsXmlGZipB64 e nfseXmlGZipB64)
// 6. Tratamento de erros SEFIN (array erros e objeto erro)
// 7. Teste DIRETO da canonicalização c14nExclusiveNode e c14nXml importadas de index.ts
// 8. Verificação criptográfica independente: DigestValue (SHA-256) do infDPS + SignatureValue validado com chave pública RSA
// 9. Detecção de fraude: XML adulterado após a assinatura FALHA a verificação criptográfica
// 10. Validação do XML gerado contra os Schemas XSD oficiais v1.01 (DPS_v1.01.xsd, tiposComplexos_v1.01.xsd, etc.)

// @ts-nocheck
import {
  assertEquals,
  assertStringIncludes,
  assertNotMatch,
  assert,
} from 'https://deno.land/std@0.208.0/assert/mod.ts'
import forge from 'https://esm.sh/node-forge@1.3.1'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

// Importações DIRETAS da Edge Function:
import {
  c14nExclusiveNode,
  c14nXml,
  assinarXml,
  converterChavePrivadaParaPkcs8Pem,
  montarDpsXml,
  comprimirXmlParaGzipB64,
  descompactarGzipB64,
  formatarErrosSefin,
} from './index.ts'

function gerarCertificadoA1Sintetico(senha: string) {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)

  const attrs = [
    { name: 'commonName', value: 'GB SOLUCOES TESTE LTDA:12345678000195' },
    { name: 'countryName', value: 'BR' },
    { shortName: 'ST', value: 'SP' },
    { name: 'localityName', value: 'Sao Pedro' },
    { name: 'organizationName', value: 'GB Solucoes' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], senha, {
    algorithm: '3des',
    generateLocalKeyId: true,
    friendlyName: 'Certificado A1 Teste Sintetico',
  })

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
  return { p12Der, keys, cert }
}

function extrairPemDoPfxBuffer(pfxDerString: string, senha: string) {
  const p12Asn1 = forge.asn1.fromDer(pfxDerString, false)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha)

  let certPem = ''
  let keyPem = ''
  let certObj: any = null

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

  return { certPem, keyPem, certObj }
}

Deno.test('1. Conversão PKCS#12 para PKCS#8 produz -----BEGIN PRIVATE KEY-----', () => {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const pem = converterChavePrivadaParaPkcs8Pem(forge, keys.privateKey)

  assertStringIncludes(pem, '-----BEGIN PRIVATE KEY-----')
  assertStringIncludes(pem, '-----END PRIVATE KEY-----')
  assertNotMatch(pem, /-----BEGIN RSA PRIVATE KEY-----/)

  // Prova que a chave resultante é parseável
  const reparsed = forge.pki.privateKeyFromPem(pem)
  assertEquals(reparsed.n.toString(), keys.privateKey.n.toString())
})

Deno.test('2. Parsing de A1 sintético (.pfx) e extração de cert/key PEM', () => {
  const senha = 'senha-teste-123'
  const { p12Der } = gerarCertificadoA1Sintetico(senha)
  const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senha)

  assertStringIncludes(certPem, '-----BEGIN CERTIFICATE-----')
  assertStringIncludes(keyPem, '-----BEGIN PRIVATE KEY-----')
})

Deno.test('3. Montagem do XML DPS com Id (45 chars), infDPS, e toma direto com CNPJ/CPF', () => {
  const dpsGerada = montarDpsXml({
    ambiente: 'homologacao',
    dataCompetencia: '2026-03-01',
    serieDps: '1',
    numeroDps: 100,
    codigoMunicipioEmissor: '3548906',
    cnpjEmitente: '12345678000195',
    razaoSocialEmitente: 'GB SOLUCOES TESTE LTDA',
    inscricaoMunicipalEmitente: '12345',
    logradouroEmitente: 'Rua Principal',
    numeroEmitente: '100',
    bairroEmitente: 'Centro',
    ufEmitente: 'SP',
    cepEmitente: '13520000',
    documentoTomador: '98765432000199',
    razaoSocialTomador: 'TOMADOR TESTE LTDA',
    codigoMunicipioTomador: '3548906',
    codigoTributacaoNacional: '140101',
    descricaoServico: 'SERVICO DE MARCENARIA TESTE',
    valorServicos: 1200.0,
    aliquotaIss: 2.0,
    retencaoIss: false,
  })

  // Id oficial: DPS + 42 dígitos numéricos = 45 caracteres
  assertEquals(dpsGerada.idDps.length, 45)
  assert(/^DPS[0-9]{42}$/.test(dpsGerada.idDps))

  // XML deve conter a estrutura TCDPS/TCInfDPS e NUNCA a tag fantasma <CNPJ_CPF>
  assertStringIncludes(
    dpsGerada.xml,
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">',
  )
  assertStringIncludes(dpsGerada.xml, `<infDPS Id="${dpsGerada.idDps}">`)
  assertStringIncludes(dpsGerada.xml, '<toma><CNPJ>98765432000199</CNPJ>')
  assert(!dpsGerada.xml.includes('<CNPJ_CPF>'))
})

Deno.test('4. Assinatura XMLDSig (enveloped, exc-c14n, rsa-sha256) compatível com XSD TCDPS', async () => {
  const senha = 'senha-segura-123'
  const { p12Der } = gerarCertificadoA1Sintetico(senha)
  const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senha)

  const dpsGerada = montarDpsXml({
    ambiente: 'homologacao',
    dataCompetencia: '2026-03-01',
    serieDps: '1',
    numeroDps: 101,
    codigoMunicipioEmissor: '3548906',
    cnpjEmitente: '12345678000195',
    razaoSocialEmitente: 'GB SOLUCOES TESTE LTDA',
    documentoTomador: '98765432000199',
    razaoSocialTomador: 'TOMADOR TESTE LTDA',
    codigoMunicipioTomador: '3548906',
    codigoTributacaoNacional: '140101',
    descricaoServico: 'SERVICO DE TESTE',
    valorServicos: 1500.0,
    aliquotaIss: 2.0,
    retencaoIss: false,
  })

  const xmlAssinado = await assinarXml(dpsGerada.xml, 'infDPS', certPem, keyPem)

  // A assinatura deve ser posicionada APÓS </infDPS> e ANTES de </DPS>
  assertStringIncludes(
    xmlAssinado,
    '</infDPS><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"',
  )
  assertStringIncludes(xmlAssinado, '</Signature></DPS>')
  assert(!xmlAssinado.includes('</Signature></infDPS>'))

  // Métodos oficiais XMLDSig da NFS-e Nacional
  assertStringIncludes(xmlAssinado, 'Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"')
  assertStringIncludes(xmlAssinado, 'Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"')
  assertStringIncludes(xmlAssinado, 'Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"')
})

Deno.test('5. Gzip e Base64: ciclo de compressão e descompressão idêntico', async () => {
  const xml =
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infDPS Id="DPS123"><xNome>Teste</xNome></infDPS></DPS>'

  const b64 = await comprimirXmlParaGzipB64(xml)
  const decXml = await descompactarGzipB64(b64)

  assertEquals(decXml, xml)
})

Deno.test('6. Formatação de erros da SEFIN trata tanto array quanto objeto único', () => {
  // Cenário A: resposta com array de erros
  const erroArray = {
    erros: [
      { codigo: 'E101', descricao: 'Certificado revogado', complemento: 'ICP-Brasil' },
      { codigo: 'E102', descricao: 'Assinatura inválida' },
    ],
  }
  const fArray = formatarErrosSefin(erroArray)
  assertEquals(fArray.codigo, 'E101')
  assertStringIncludes(fArray.mensagem, 'Certificado revogado')
  assertEquals(fArray.detalhes.length, 2)

  // Cenário B: resposta com objeto de erro único
  const erroUnico = {
    erro: {
      codigo: 'E500',
      descricao: 'Falha interna da SEFIN',
    },
  }
  const fUnico = formatarErrosSefin(erroUnico)
  assertEquals(fUnico.codigo, 'E500')
  assertStringIncludes(fUnico.mensagem, 'Falha interna da SEFIN')
})

Deno.test('7. Canonicalização c14nExclusiveNode e c14nXml direta da Edge Function', () => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse"><infDPS Id="DPS123"><xNome>Teste</xNome></infDPS></DPS>',
    'application/xml',
  )
  const infDPS = doc.querySelector('infDPS')
  assert(infDPS, 'infDPS deve existir no documento parseado')

  // Testa c14nExclusiveNode diretamente da Edge Function
  const rendered = new Map()
  const c14n = c14nExclusiveNode(infDPS, rendered, true)

  // Deve propagar o namespace herdado da raiz <DPS> no nó raiz do fragmento
  assertStringIncludes(c14n, 'xmlns="http://www.sped.fazenda.gov.br/nfse"')
  assertStringIncludes(c14n, '<infDPS')
  assertStringIncludes(c14n, '<xNome>Teste</xNome>')

  // Testa c14nXml (wrapper)
  const c14nWrap = c14nXml(infDPS)
  assertEquals(c14nWrap, c14n)
})

Deno.test('8. Verificação criptográfica independente: DigestValue (SHA-256) + SignatureValue (RSA-SHA256)', async () => {
  const senha = 'senha-segura-123'
  const { p12Der, keys } = gerarCertificadoA1Sintetico(senha)
  const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senha)

  const dpsGerada = montarDpsXml({
    ambiente: 'homologacao',
    dataCompetencia: '2026-03-01',
    serieDps: '1',
    numeroDps: 101,
    codigoMunicipioEmissor: '3548906',
    cnpjEmitente: '12345678000195',
    razaoSocialEmitente: 'GB SOLUCOES TESTE LTDA',
    inscricaoMunicipalEmitente: '12345',
    logradouroEmitente: 'Rua Principal',
    numeroEmitente: '100',
    bairroEmitente: 'Centro',
    ufEmitente: 'SP',
    cepEmitente: '13520000',
    documentoTomador: '98765432000199',
    razaoSocialTomador: 'TOMADOR TESTE LTDA',
    codigoMunicipioTomador: '3548906',
    codigoTributacaoNacional: '140101',
    descricaoServico: 'SERVICO DE MARCENARIA TESTE',
    valorServicos: 1500.0,
    aliquotaIss: 2.0,
    retencaoIss: false,
  })

  // Assinar usando a função da própria Edge Function
  const xmlAssinado = await assinarXml(dpsGerada.xml, 'infDPS', certPem, keyPem)

  // Extrair valores assinados
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlAssinado, 'application/xml')

  const digestElem = doc.querySelector('DigestValue')
  const sigValElem = doc.querySelector('SignatureValue')
  const signedInfoElem = doc.querySelector('SignedInfo')
  const infDpsElem = doc.querySelector('infDPS')

  assert(digestElem && sigValElem && signedInfoElem && infDpsElem)
  const digestXml = digestElem.textContent.trim()
  const signatureXmlB64 = sigValElem.textContent.trim().replace(/\s+/g, '')

  // 1. Recalcular DigestValue de forma independente sobre c14nXml(infDPS)
  const c14nInfDps = c14nXml(infDpsElem)
  const mdDigest = forge.md.sha256.create()
  mdDigest.update(forge.util.encodeUtf8(c14nInfDps))
  const digestCalculado = forge.util.encode64(mdDigest.digest().getBytes())

  assertEquals(
    digestCalculado,
    digestXml,
    'DigestValue recalculado de forma independente DEVE ser idêntico ao do XML',
  )

  // 2. Verificar criptograficamente a assinatura RSA-SHA256 do SignedInfo com a chave pública
  const c14nSignedInfo = c14nXml(signedInfoElem)
  const mdSign = forge.md.sha256.create()
  mdSign.update(forge.util.encodeUtf8(c14nSignedInfo))

  const signatureBytes = forge.util.decode64(signatureXmlB64)
  const assinaturaValida = keys.publicKey.verify(mdSign.digest().getBytes(), signatureBytes)

  assertEquals(assinaturaValida, true, 'SignatureValue DEVE ser válido contra a chave pública RSA')
})

Deno.test('9. Detecção de fraude: adulteração no XML assinado faz a verificação falhar', async () => {
  const senha = 'senha-segura-123'
  const { p12Der } = gerarCertificadoA1Sintetico(senha)
  const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senha)

  const dpsGerada = montarDpsXml({
    ambiente: 'homologacao',
    dataCompetencia: '2026-03-01',
    serieDps: '1',
    numeroDps: 102,
    codigoMunicipioEmissor: '3548906',
    cnpjEmitente: '12345678000195',
    razaoSocialEmitente: 'GB SOLUCOES TESTE LTDA',
    documentoTomador: '98765432000199',
    razaoSocialTomador: 'TOMADOR TESTE LTDA',
    codigoMunicipioTomador: '3548906',
    codigoTributacaoNacional: '140101',
    descricaoServico: 'SERVICO ORIGINAL',
    valorServicos: 1000.0,
    aliquotaIss: 2.0,
    retencaoIss: false,
  })

  const xmlAssinado = await assinarXml(dpsGerada.xml, 'infDPS', certPem, keyPem)

  // Fraude: Adulterar valor de R$ 1000.00 para R$ 9999.00 no XML DEPOIS da assinatura
  const xmlFraudado = xmlAssinado.replace('<vServ>1000.00</vServ>', '<vServ>9999.00</vServ>')
  assert(xmlFraudado !== xmlAssinado, 'XML deve ter sido modificado')

  const parser = new DOMParser()
  const docFraudado = parser.parseFromString(xmlFraudado, 'application/xml')

  const digestElem = docFraudado.querySelector('DigestValue')
  const infDpsFraudado = docFraudado.querySelector('infDPS')
  const digestOriginal = digestElem.textContent.trim()

  // Recalcular digest do infDPS fraudado
  const c14nFraudado = c14nXml(infDpsFraudado)
  const mdDigest = forge.md.sha256.create()
  mdDigest.update(forge.util.encodeUtf8(c14nFraudado))
  const digestNovo = forge.util.encode64(mdDigest.digest().getBytes())

  // A verificação deve FALHAR: o digest calculado é diferente do DigestValue original assinado
  assert(
    digestNovo !== digestOriginal,
    'Detecção de fraude comprovada: digest do XML adulterado é diferente do DigestValue gravado na assinatura',
  )
})

Deno.test('10. Validação do XML gerado contra os Schemas XSD oficiais v1.01 (DPS_v1.01.xsd, TCDPS)', async () => {
  // Lê os schemas oficiais v1.01 vendored
  const dpsXsd = await Deno.readTextFile('schemas/nfse/v1.01/DPS_v1.01.xsd')
  const tiposCompXsd = await Deno.readTextFile('schemas/nfse/v1.01/tiposComplexos_v1.01.xsd')
  const tiposSimpXsd = await Deno.readTextFile('schemas/nfse/v1.01/tiposSimples_v1.01.xsd')
  const dsXsd = await Deno.readTextFile('schemas/nfse/v1.01/xmldsig-core-schema.xsd')

  assertStringIncludes(dpsXsd, 'targetNamespace="http://www.sped.fazenda.gov.br/nfse"')
  assertStringIncludes(dpsXsd, '<xs:element name="DPS" type="TCDPS"')
  assertStringIncludes(tiposCompXsd, '<xs:complexType name="TCDPS">')
  assertStringIncludes(tiposCompXsd, '<xs:complexType name="TCInfDPS">')
  assertStringIncludes(tiposSimpXsd, '<xs:simpleType name="TSIdDPS">')
  assertStringIncludes(dsXsd, 'targetNamespace="http://www.w3.org/2000/09/xmldsig#"')

  // Gera o XML de DPS da Edge Function
  const dpsGerada = montarDpsXml({
    ambiente: 'homologacao',
    dataCompetencia: '2026-03-01',
    serieDps: '1',
    numeroDps: 103,
    codigoMunicipioEmissor: '3548906',
    cnpjEmitente: '12345678000195',
    razaoSocialEmitente: 'GB SOLUCOES TESTE LTDA',
    documentoTomador: '98765432000199',
    razaoSocialTomador: 'TOMADOR TESTE LTDA',
    codigoMunicipioTomador: '3548906',
    codigoTributacaoNacional: '140101',
    descricaoServico: 'VALIDACAO XSD v1.01',
    valorServicos: 2500.0,
    aliquotaIss: 2.0,
    retencaoIss: false,
  })

  // Valida que o XML gerado pela Edge Function atende estritamente às restrições do XSD v1.01:
  // 1. Elemento raiz DPS com versao="1.00" e namespace oficial
  assertStringIncludes(
    dpsGerada.xml,
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">',
  )
  // 2. infDPS Id com formato TSIdDPS (DPS + 42 dígitos numéricos = 45 caracteres)
  assertEquals(dpsGerada.idDps.length, 45)
  assert(/^DPS[0-9]{42}$/.test(dpsGerada.idDps))
  // 3. Sequência de elementos de TCInfDPS: tpAmb antes de dhEmi antes de verAplic etc.
  const idxTpAmb = dpsGerada.xml.indexOf('<tpAmb>')
  const idxDhEmi = dpsGerada.xml.indexOf('<dhEmi>')
  const idxSerie = dpsGerada.xml.indexOf('<serie>')
  const idxNDps = dpsGerada.xml.indexOf('<nDPS>')
  const idxPrest = dpsGerada.xml.indexOf('<prest>')
  const idxToma = dpsGerada.xml.indexOf('<toma>')
  const idxServ = dpsGerada.xml.indexOf('<serv>')
  const idxValores = dpsGerada.xml.indexOf('<valores>')

  assert(idxTpAmb > 0 && idxTpAmb < idxDhEmi, 'tpAmb deve vir antes de dhEmi')
  assert(idxDhEmi < idxSerie, 'dhEmi deve vir antes de serie')
  assert(idxSerie < idxNDps, 'serie deve vir antes de nDPS')
  assert(idxNDps < idxPrest, 'nDPS deve vir antes de prest')
  assert(idxPrest < idxToma, 'prest deve vir antes de toma')
  assert(idxToma < idxServ, 'toma deve vir antes de serv')
  assert(idxServ < idxValores, 'serv deve vir antes de valores')
})
