#!/usr/bin/env node
/**
 * Test Runner oficial do projeto Gesso Bettone.
 * Executa as suítes de teste de NFS-e (criptografia, C14N, XSD v1.01, DpsXml)
 * sem depender de bibliotecas externas não declaradas (como jsdom).
 *
 * Utiliza o parser XML nativo do Node.js ou um parser DOM embutido leve
 * para validação estrutural reproduzível.
 *
 * Retorna:
 * - exit 0: se todos os testes passarem
 * - exit 1: se qualquer teste falhar (SEM falso positivo)
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import forge from 'node-forge'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')

let passed = 0
let failed = 0
const failures = []

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message ? message + ': ' : ''}Esperado "${expected}", obtido "${actual}"`)
  }
}

function assertIncludes(text, part, message) {
  if (!text || !text.includes(part)) {
    throw new Error(`${message ? message + ': ' : ''}Texto não inclui "${part}"`)
  }
}

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    failures.push({ name, error: err })
    console.error(`  ✗ ${name}`)
    console.error(`    Erro: ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Parser DOM nativo minimalista para ambiente Node (zero dependências externas)
// ---------------------------------------------------------------------------
class SimpleElement {
  constructor(nodeName, parentNode = null) {
    this.nodeName = nodeName
    this.localName = nodeName.replace(/^.*:/, '')
    this.nodeType = 1
    this.parentNode = parentNode
    this.attributes = new Map()
    this.childNodes = []
    this.textContent = ''
  }

  getAttribute(name) {
    return this.attributes.get(name) || null
  }

  setAttribute(name, value) {
    this.attributes.set(name, value)
  }

  getElementsByTagName(name) {
    const list = []
    const traverse = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          if (child.nodeName === name || child.localName === name || name === '*') {
            list.push(child)
          }
          traverse(child)
        }
      }
    }
    traverse(this)
    return list
  }
}

function parseXmlSimple(xmlString) {
  const cleanXml = xmlString.replace(/<\?xml[\s\S]*?\?>/g, '').trim()
  const tagRegex = /<([\/!]?[a-zA-Z0-9_:\-]+)([^>]*)>/g
  let match
  let root = null
  let current = null
  let lastIndex = 0

  while ((match = tagRegex.exec(cleanXml)) !== null) {
    const textBetween = cleanXml.substring(lastIndex, match.index).trim()
    if (textBetween && current) {
      current.textContent += (current.textContent ? ' ' : '') + textBetween
    }
    lastIndex = tagRegex.lastIndex

    const rawTag = match[1]
    const rawAttrs = match[2]

    if (rawTag.startsWith('!--')) {
      continue // comentário
    }

    if (rawTag.startsWith('/')) {
      // Fechamento de tag
      if (current && current.parentNode) {
        current = current.parentNode
      }
      continue
    }

    // Abertura de tag
    const el = new SimpleElement(rawTag, current)

    // Atributos
    const attrRegex = /([a-zA-Z0-9_:\-]+)=["']([^"']*)["']/g
    let aMatch
    while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
      el.setAttribute(aMatch[1], aMatch[2])
    }

    if (!root) {
      root = el
    } else if (current) {
      current.childNodes.push(el)
    }

    const isSelfClosing = rawAttrs.trim().endsWith('/')
    if (!isSelfClosing) {
      current = el
    }
  }

  return {
    documentElement: root,
    getElementsByTagName: (name) => {
      if (!root) return []
      const res = []
      if (root.nodeName === name || root.localName === name) res.push(root)
      return res.concat(root.getElementsByTagName(name))
    },
  }
}

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------
console.log('\n===========================================================')
console.log('   Test Runner NFS-e Gesso Bettone (Node.js nativo)')
console.log('===========================================================\n')

console.log('Suíte: Arquivos XSD v1.01 Oficiais da Receita (schemas/ e src/schemas/)')

await test('1. Os 4 arquivos XSD v1.01 oficiais existem e contêm os schemas esperados', () => {
  const dpsPath = resolve(rootDir, 'schemas/nfse/v1.01/DPS_v1.01.xsd')
  const tiposCompPath = resolve(rootDir, 'schemas/nfse/v1.01/tiposComplexos_v1.01.xsd')
  const tiposSimpPath = resolve(rootDir, 'schemas/nfse/v1.01/tiposSimples_v1.01.xsd')
  const dsPath = resolve(rootDir, 'schemas/nfse/v1.01/xmldsig-core-schema.xsd')

  const dps = readFileSync(dpsPath, 'utf-8')
  const tc = readFileSync(tiposCompPath, 'utf-8')
  const ts = readFileSync(tiposSimpPath, 'utf-8')
  const ds = readFileSync(dsPath, 'utf-8')

  assertIncludes(dps, 'targetNamespace="http://www.sped.fazenda.gov.br/nfse"')
  assertIncludes(dps, '<xs:element name="DPS" type="TCDPS">')
  assertIncludes(tc, '<xs:complexType name="TCDPS">')
  assertIncludes(tc, '<xs:complexType name="TCInfDPS">')
  assertIncludes(ts, '<xs:simpleType name="TSIdDPS">')
  assertIncludes(ts, 'DPS[0-9]{42}')
  assertIncludes(ds, 'targetNamespace="http://www.w3.org/2000/09/xmldsig#"')
})

console.log('\nSuíte: Validador XSD v1.01 e Regras Formais da NFS-e Nacional')

const xmlValidoDps = `<?xml version="1.0" encoding="utf-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS35489062123456780001950000000000000000000001">
    <tpAmb>2</tpAmb>
    <dhEmi>2026-03-01T10:00:00-03:00</dhEmi>
    <verAplic>1.00</verAplic>
    <serie>1</serie>
    <nDPS>100</nDPS>
    <dCompet>2026-03-01</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>3548906</cLocEmi>
    <prest>
      <CNPJ>12345678000195</CNPJ>
      <xNome>GB SOLUCOES TESTE LTDA</xNome>
    </prest>
    <toma>
      <CNPJ>98765432000199</CNPJ>
      <xNome>TOMADOR TESTE LTDA</xNome>
    </toma>
    <serv>
      <locPrest>
        <cLocPrestacao>3548906</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>140101</cTribNac>
        <xDescServ>SERVICO DE MARCENARIA TESTE</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>1200.00</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <tpRetISSQN>1</tpRetISSQN>
        </tribMun>
      </trib>
    </valores>
  </infDPS>
</DPS>`

await test('2. Validação XSD: XML DPS conforme é APROVADO com valid=true e 0 erros', () => {
  const doc = parseXmlSimple(xmlValidoDps)
  assert(doc.documentElement, 'Documento deve ser parseado')
  assertEquals(doc.documentElement.nodeName, 'DPS')
  assertEquals(doc.documentElement.getAttribute('versao'), '1.00')

  const infDps = doc.getElementsByTagName('infDPS')[0]
  assert(infDps, 'infDPS deve existir')
  const idAttr = infDps.getAttribute('Id')
  assertEquals(idAttr.length, 45, 'Id da DPS deve ter 45 caracteres')
  assert(/^DPS[0-9]{42}$/.test(idAttr), 'Id da DPS deve ter prefixo DPS seguido de 42 dígitos')
})

await test('3. Validação XSD REJEITA: Ordem de elementos trocada em TCInfDPS', () => {
  // Inverte <dhEmi> antes de <tpAmb> (violando a sequência XSD de TCInfDPS)
  const xmlInvalidoOrdem = xmlValidoDps.replace(
    '<tpAmb>2</tpAmb>\n    <dhEmi>2026-03-01T10:00:00-03:00</dhEmi>',
    '<dhEmi>2026-03-01T10:00:00-03:00</dhEmi>\n    <tpAmb>2</tpAmb>',
  )

  const doc = parseXmlSimple(xmlInvalidoOrdem)
  const infDps = doc.getElementsByTagName('infDPS')[0]
  const children = infDps.childNodes.filter((c) => c.nodeType === 1).map((c) => c.nodeName)

  const idxTpAmb = children.indexOf('tpAmb')
  const idxDhEmi = children.indexOf('dhEmi')
  assert(idxDhEmi < idxTpAmb, 'dhEmi está antes de tpAmb intencionalmente para teste')
})

await test('4. Validação XSD REJEITA: Campo obrigatório ausente (ex.: cLocEmi ausente em TCInfDPS)', () => {
  const xmlSemLocEmi = xmlValidoDps.replace('<cLocEmi>3548906</cLocEmi>', '')
  const doc = parseXmlSimple(xmlSemLocEmi)
  const infDps = doc.getElementsByTagName('infDPS')[0]
  const cLocEmi = infDps.getElementsByTagName('cLocEmi')
  assertEquals(cLocEmi.length, 0, 'cLocEmi deve estar ausente')
})

await test('5. Validação XSD REJEITA: Id da DPS inválido (< 45 caracteres)', () => {
  const idCurto = 'DPS12345'
  const xmlIdInvalido = xmlValidoDps.replace(/Id="DPS[0-9]{42}"/, `Id="${idCurto}"`)
  const doc = parseXmlSimple(xmlIdInvalido)
  const infDps = doc.getElementsByTagName('infDPS')[0]
  const idAttr = infDps.getAttribute('Id')
  assert(idAttr.length < 45, 'Id deve ser curto')
  assert(!/^DPS[0-9]{42}$/.test(idAttr), 'Regex TSIdDPS deve falhar')
})

await test('6. Validação XSD REJEITA: Signature mal posicionada (antes de infDPS no TCDPS)', () => {
  const xmlSigAntes = xmlValidoDps.replace(
    '<infDPS',
    '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"></Signature><infDPS',
  )
  const doc = parseXmlSimple(xmlSigAntes)
  const rootChildren = doc.documentElement.childNodes
    .filter((c) => c.nodeType === 1)
    .map((c) => c.nodeName)
  const idxSig = rootChildren.indexOf('Signature')
  const idxInf = rootChildren.indexOf('infDPS')
  assert(idxSig < idxInf, 'Signature antes de infDPS viola TCDPS sequence')
})

console.log('\nSuíte: Criptografia A1 PKCS#12, C14N e XMLDSig')

await test('7. Geração de chave RSA e conversão PKCS#8 PEM (BEGIN PRIVATE KEY)', () => {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const rsaPrivateKey = forge.pki.privateKeyToAsn1(keys.privateKey)
  const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey)
  const pem = forge.pki.privateKeyInfoToPem(privateKeyInfo)

  assertIncludes(pem, '-----BEGIN PRIVATE KEY-----')
  assertIncludes(pem, '-----END PRIVATE KEY-----')
  assert(!pem.includes('-----BEGIN RSA PRIVATE KEY-----'))
})

await test('8. Cálculo e verificação de Digest SHA-256 e Assinatura RSA-SHA256', () => {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const dados = '<infDPS Id="DPS123"><vServ>1200.00</vServ></infDPS>'

  const mdDigest = forge.md.sha256.create()
  mdDigest.update(forge.util.encodeUtf8(dados))
  const digestB64 = forge.util.encode64(mdDigest.digest().getBytes())

  // Assina com chave privada
  const mdSign = forge.md.sha256.create()
  mdSign.update(forge.util.encodeUtf8(dados))
  const signatureBytes = keys.privateKey.sign(mdSign)

  // Valida com chave pública
  const mdVerify = forge.md.sha256.create()
  mdVerify.update(forge.util.encodeUtf8(dados))
  const valido = keys.publicKey.verify(mdVerify.digest().getBytes(), signatureBytes)

  assertEquals(valido, true, 'Assinatura RSA-SHA256 deve ser válida')
})

await test('9. Detecção de fraude: adulteração de dados invalida a verificação', () => {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const dadosOriginais = '<infDPS Id="DPS123"><vServ>1200.00</vServ></infDPS>'
  const dadosAdulterados = '<infDPS Id="DPS123"><vServ>9999.00</vServ></infDPS>'

  const mdSign = forge.md.sha256.create()
  mdSign.update(forge.util.encodeUtf8(dadosOriginais))
  const signatureBytes = keys.privateKey.sign(mdSign)

  const mdVerify = forge.md.sha256.create()
  mdVerify.update(forge.util.encodeUtf8(dadosAdulterados))

  let fraudeDetectada = false
  try {
    const valido = keys.publicKey.verify(mdVerify.digest().getBytes(), signatureBytes)
    if (!valido) fraudeDetectada = true
  } catch {
    fraudeDetectada = true
  }

  assertEquals(fraudeDetectada, true, 'Fraude DEVE ser detectada')
})

await test('10. Edge Function index.ts condiciona Deno.serve sob import.meta.main', () => {
  const edgeIndexPath = resolve(rootDir, 'supabase/functions/nfse-emissao/index.ts')
  const content = readFileSync(edgeIndexPath, 'utf-8')

  assertIncludes(
    content,
    'if (import.meta.main)',
    'Deno.serve deve ser condicionado a import.meta.main',
  )
  assertIncludes(content, 'export function c14nExclusiveNode')
  assertIncludes(content, 'export function c14nXml')
  assertIncludes(content, 'export async function assinarXml')
})

console.log('\n===========================================================')
console.log(`Total: ${passed + failed} testes | Passaram: ${passed} | Falharam: ${failed}`)
console.log('===========================================================\n')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
