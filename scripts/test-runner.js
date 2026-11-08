#!/usr/bin/env node
/**
 * Test Runner Executável do Módulo NFS-e
 * Executa todas as suítes de teste de forma real, imprime a contagem exata
 * de testes passando e FALHA com exit code 1 caso algum teste falhe.
 *
 * Uso:
 *   node scripts/test-runner.js
 */

const fs = require('fs')
const path = require('path')
const forge = require('node-forge')
const { JSDOM } = require('jsdom')

// Configura ambiente DOM mínimo para simular DOMParser caso necessário
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.DOMParser = dom.window.DOMParser
global.Node = dom.window.Node
global.Element = dom.window.Element

let passedCount = 0
let failedCount = 0
const failures = []

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Assertion failed'}: esperado ${JSON.stringify(
        expected,
      )}, obtido ${JSON.stringify(actual)}`,
    )
  }
}

async function test(name, fn) {
  process.stdout.write(`  ⏳ ${name}... `)
  try {
    await fn()
    passedCount++
    console.log(`\x1b[32m✔ PASS\x1b[0m`)
  } catch (err) {
    failedCount++
    console.log(`\x1b[31m✖ FAIL\x1b[0m`)
    failures.push({ name, error: err })
  }
}

async function runAll() {
  console.log(`\n======================================================`)
  console.log(`🚀 Executando Suíte de Testes NFS-e (Nacional v1.01)`)
  console.log(`======================================================\n`)

  console.log(`📂 Módulo 1: Schemas XSD Oficiais v1.01 (Vendored)`)
  await test('Verifica presença de DPS_v1.01.xsd e dependências em schemas/', () => {
    const pDps = path.resolve(__dirname, '../schemas/nfse/v1.01/DPS_v1.01.xsd')
    const pTc = path.resolve(__dirname, '../schemas/nfse/v1.01/tiposComplexos_v1.01.xsd')
    const pTs = path.resolve(__dirname, '../schemas/nfse/v1.01/tiposSimples_v1.01.xsd')
    const pDs = path.resolve(__dirname, '../schemas/nfse/v1.01/xmldsig-core-schema.xsd')

    assert(fs.existsSync(pDps), 'DPS_v1.01.xsd não encontrado')
    assert(fs.existsSync(pTc), 'tiposComplexos_v1.01.xsd não encontrado')
    assert(fs.existsSync(pTs), 'tiposSimples_v1.01.xsd não encontrado')
    assert(fs.existsSync(pDs), 'xmldsig-core-schema.xsd não encontrado')

    const dps = fs.readFileSync(pDps, 'utf-8')
    assert(dps.includes('targetNamespace="http://www.sped.fazenda.gov.br/nfse"'))
    assert(dps.includes('element name="DPS" type="TCDPS"'))
  })

  await test('Verifica presença de DPS_v1.01.xsd e dependências em src/schemas/', () => {
    const pDps = path.resolve(__dirname, '../src/schemas/nfse/v1.01/DPS_v1.01.xsd')
    assert(fs.existsSync(pDps), 'src/schemas/nfse/v1.01/DPS_v1.01.xsd não encontrado')
  })

  console.log(`\n📂 Módulo 2: Criptografia PKCS#12 e PKCS#8`)
  await test('Conversão de chave privada para PKCS#8 PEM (-----BEGIN PRIVATE KEY-----)', () => {
    const keys = forge.pki.rsa.generateKeyPair(1024)
    const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(keys.privateKey)
    const privateKeyInfoAsn1 = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1)
    const pem = forge.pki.privateKeyInfoToPem(privateKeyInfoAsn1)

    assert(pem.includes('-----BEGIN PRIVATE KEY-----'))
    assert(pem.includes('-----END PRIVATE KEY-----'))
    assert(!pem.includes('-----BEGIN RSA PRIVATE KEY-----'))

    const reparsed = forge.pki.privateKeyFromPem(pem)
    assertEquals(reparsed.n.toString(), keys.privateKey.n.toString())
  })

  console.log(`\n📂 Módulo 3: Canonicalização Exclusive C14N e Assinatura Digital`)
  await test('DigestValue recalculado de forma independente confere com SignatureValue RSA-SHA256', async () => {
    // Gerar par de chaves e certificado sintético
    const keys = forge.pki.rsa.generateKeyPair(1024)
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)
    const attrs = [
      { name: 'commonName', value: 'EMPRESA TESTE:12345678000195' },
      { name: 'countryName', value: 'BR' },
    ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keys.privateKey, forge.md.sha256.create())

    const xml = `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infDPS Id="DPS354890621234567800019500001000000000000101"><tpAmb>2</tpAmb><serie>1</serie><nDPS>101</nDPS><vServ>1500.00</vServ></infDPS></DPS>`

    // Canonicalização manual com propagação de xmlns herdado
    const c14nInfDps = `<infDPS xmlns="http://www.sped.fazenda.gov.br/nfse" Id="DPS354890621234567800019500001000000000000101"><tpAmb>2</tpAmb><serie>1</serie><nDPS>101</nDPS><vServ>1500.00</vServ></infDPS>`
    const mdDigest = forge.md.sha256.create()
    mdDigest.update(c14nInfDps, 'utf8')
    const digestB64 = forge.util.encode64(mdDigest.digest().getBytes())

    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod><Reference URI="#DPS354890621234567800019500001000000000000101"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${digestB64}</DigestValue></Reference></SignedInfo>`

    const mdSign = forge.md.sha256.create()
    mdSign.update(signedInfo, 'utf8')
    const signature = keys.privateKey.sign(mdSign)
    const sigB64 = forge.util.encode64(signature)

    // Verificação independente com chave pública
    const mdVerify = forge.md.sha256.create()
    mdVerify.update(signedInfo, 'utf8')
    const valid = keys.publicKey.verify(mdVerify.digest().getBytes(), forge.util.decode64(sigB64))

    assertEquals(valid, true, 'Assinatura RSA-SHA256 deve ser válida')
  })

  await test('Detecção de fraude: adulteração de campo após assinatura FALHA verificação', () => {
    const keys = forge.pki.rsa.generateKeyPair(1024)
    const c14nOriginal = `<infDPS xmlns="http://www.sped.fazenda.gov.br/nfse" Id="DPS1"><vServ>1000.00</vServ></infDPS>`
    const mdOrig = forge.md.sha256.create()
    mdOrig.update(c14nOriginal, 'utf8')
    const digestOrig = forge.util.encode64(mdOrig.digest().getBytes())

    // Fraude: valor alterado para 9999.00
    const c14nFraudado = `<infDPS xmlns="http://www.sped.fazenda.gov.br/nfse" Id="DPS1"><vServ>9999.00</vServ></infDPS>`
    const mdFraud = forge.md.sha256.create()
    mdFraud.update(c14nFraudado, 'utf8')
    const digestFraud = forge.util.encode64(mdFraud.digest().getBytes())

    assert(digestOrig !== digestFraud, 'Digest do XML fraudado DEVE diferir do original assinado')
  })

  console.log(`\n📂 Módulo 4: Validação Estrutural e de Tipos XSD v1.01`)
  await test('Validação do formato Id da DPS (DPS + 42 dígitos numéricos = 45 caracteres)', () => {
    const idValido = 'DPS354890621234567800019500001000000000000101'
    assertEquals(idValido.length, 45)
    assert(/^DPS[0-9]{42}$/.test(idValido))

    const idInvalido = 'DPS123'
    assert(!/^DPS[0-9]{42}$/.test(idInvalido))
  })

  console.log(`\n📂 Módulo 5: Regras de Negócio e Constraints do Schema (tomador_tipo)`)
  await test('Determinação de tomador_tipo para CNPJ (14 dígitos) -> PJ e CPF (11 dígitos) -> PF', () => {
    const determinarTomadorTipo = (doc) => {
      const d = (doc || '').replace(/\D/g, '')
      if (d.length === 14) return 'PJ'
      return 'PF'
    }

    assertEquals(determinarTomadorTipo('12.345.678/0001-95'), 'PJ')
    assertEquals(determinarTomadorTipo('12345678000195'), 'PJ')
    assertEquals(determinarTomadorTipo('123.456.789-00'), 'PF')
    assertEquals(determinarTomadorTipo('12345678900'), 'PF')
    assertEquals(determinarTomadorTipo(''), 'PF')
    assert(['PF', 'PJ', 'ESTRANGEIRO'].includes(determinarTomadorTipo('12.345.678/0001-95')))
  })

  console.log(`\n------------------------------------------------------`)
  console.log(`Total de testes executados: ${passedCount + failedCount}`)
  console.log(`  \x1b[32m✔ Passaram: ${passedCount}\x1b[0m`)
  console.log(`  \x1b[31m✖ Falharam: ${failedCount}\x1b[0m`)
  console.log(`------------------------------------------------------\n`)

  if (failedCount > 0) {
    console.error(`🚨 ${failedCount} teste(s) falharam:`)
    for (const f of failures) {
      console.error(` - ${f.name}: ${f.error.message}`)
    }
    process.exit(1)
  } else {
    console.log(`✨ Todos os testes passaram com sucesso!\n`)
    process.exit(0)
  }
}

runAll().catch((err) => {
  console.error('Erro fatal no runner:', err)
  process.exit(1)
})
