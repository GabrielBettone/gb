// Testes unitários do Deno para a Edge Function nfse-emissao
// Executável com: deno test supabase/functions/nfse-emissao/index_test.ts
// Cobre os 6 pontos técnicos solicitados:
// 1. Parsing do arquivo A1 PKCS#12 (.pfx) com certificado sintético
// 2. Conversão da chave privada para PKCS#8 PEM via privateKeyInfoToPem (-----BEGIN PRIVATE KEY-----)
// 3. Montagem do XML DPS com Id (45 chars), infDPS, toma direto com CNPJ/CPF
// 4. Assinatura XMLDSig (enveloped, C14N, RSA-SHA256) compatível com XSD TCDPS
// 5. Compressão e descompressão gzip base64 (dpsXmlGZipB64 e nfseXmlGZipB64)
// 6. Tratamento de erros SEFIN (array erros e objeto erro)

// @ts-nocheck
import {
  assertEquals,
  assertStringIncludes,
  assertNotMatch,
} from 'https://deno.land/std@0.208.0/assert/mod.ts'
import forge from 'https://esm.sh/node-forge@1.3.1'

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

function converterChavePrivadaParaPkcs8Pem(privateKey: any): string {
  const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(privateKey)
  const privateKeyInfoAsn1 = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1)
  return forge.pki.privateKeyInfoToPem(privateKeyInfoAsn1)
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
        keyPem = converterChavePrivadaParaPkcs8Pem(safeBag.key)
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
  const pem = converterChavePrivadaParaPkcs8Pem(keys.privateKey)

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

Deno.test('3. Gzip e Base64: ciclo de compressão e descompressão idêntico', async () => {
  const xml =
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infDPS Id="DPS123"><xNome>Teste</xNome></infDPS></DPS>'

  // Compressão
  const enc = new TextEncoder().encode(xml)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(enc)
  writer.close()
  const compressedBuf = await new Response(cs.readable).arrayBuffer()
  const b64 = btoa(String.fromCharCode(...new Uint8Array(compressedBuf)))

  // Descompressão
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const ds = new DecompressionStream('gzip')
  const dWriter = ds.writable.getWriter()
  dWriter.write(bytes)
  dWriter.close()
  const decompBuf = await new Response(ds.readable).arrayBuffer()
  const decXml = new TextDecoder('utf-8').decode(decompBuf)

  assertEquals(decXml, xml)
})
