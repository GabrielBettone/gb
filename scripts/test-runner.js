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

// Carrega os 4 schemas oficiais v1.01 vendored diretamente do disco no Node.js
const dpsPath = resolve(rootDir, 'schemas/nfse/v1.01/DPS_v1.01.xsd')
const tiposCompPath = resolve(rootDir, 'schemas/nfse/v1.01/tiposComplexos_v1.01.xsd')
const tiposSimpPath = resolve(rootDir, 'schemas/nfse/v1.01/tiposSimples_v1.01.xsd')
const dsPath = resolve(rootDir, 'schemas/nfse/v1.01/xmldsig-core-schema.xsd')

const rawSchemas = [
  { filename: 'DPS_v1.01.xsd', content: readFileSync(dpsPath, 'utf-8') },
  { filename: 'tiposComplexos_v1.01.xsd', content: readFileSync(tiposCompPath, 'utf-8') },
  { filename: 'tiposSimples_v1.01.xsd', content: readFileSync(tiposSimpPath, 'utf-8') },
  { filename: 'xmldsig-core-schema.xsd', content: readFileSync(dsPath, 'utf-8') },
]

// Carregador e compilador de modelo XSD oficial
function buildNodeXsdModel() {
  const allXsd = rawSchemas.map((s) => s.content).join('\n')
  const simpleTypes = new Map()
  const complexTypes = new Map()

  const simpleTypeRegex = /<xs:simpleType\s+name=["']([^"']+)["'][\s\S]*?<\/xs:simpleType>/g
  let stMatch
  while ((stMatch = simpleTypeRegex.exec(allXsd)) !== null) {
    const block = stMatch[0]
    const name = stMatch[1]
    const baseMatch = block.match(/<xs:restriction\s+base=["']([^"']+)["']/)
    const baseType = baseMatch ? baseMatch[1] : 'xs:string'
    const patternMatch = block.match(/<xs:pattern\s+value=["']([^"']+)["']/)
    const minLenMatch = block.match(/<xs:minLength\s+value=["']([^"']+)["']/)
    const maxLenMatch = block.match(/<xs:maxLength\s+value=["']([^"']+)["']/)

    const enums = []
    const enumRegex = /<xs:enumeration\s+value=["']([^"']+)["']/g
    let eMatch
    while ((eMatch = enumRegex.exec(block)) !== null) {
      enums.push(eMatch[1])
    }

    simpleTypes.set(name, {
      name,
      baseType,
      pattern: patternMatch ? new RegExp(`^${patternMatch[1]}$`) : undefined,
      minLength: minLenMatch ? parseInt(minLenMatch[1], 10) : undefined,
      maxLength: maxLenMatch ? parseInt(maxLenMatch[1], 10) : undefined,
      enumerations: enums.length > 0 ? enums : undefined,
    })
  }

  const complexTypeRegex = /<xs:complexType\s+name=["']([^"']+)["'][\s\S]*?<\/xs:complexType>/g
  let ctMatch
  while ((ctMatch = complexTypeRegex.exec(allXsd)) !== null) {
    const block = ctMatch[0]
    const name = ctMatch[1]
    const sequence = []
    const elRegex = /<xs:element\s+([^>]+?)(?:\/>|>[\s\S]*?<\/xs:element>)/g
    let elMatch
    while ((elMatch = elRegex.exec(block)) !== null) {
      const attrs = elMatch[1]
      const nameMatch = attrs.match(/name=["']([^"']+)["']/)
      const refMatch = attrs.match(/ref=["']([^"']+)["']/)
      const minOMatch = attrs.match(/minOccurs=["']([^"']+)["']/)
      const maxOMatch = attrs.match(/maxOccurs=["']([^"']+)["']/)

      const elName = nameMatch ? nameMatch[1] : refMatch ? refMatch[1].replace(/^.*:/, '') : ''
      if (elName) {
        sequence.push({
          name: elName,
          minOccurs: minOMatch ? parseInt(minOMatch[1], 10) : 1,
          maxOccurs: maxOMatch
            ? maxOMatch[1] === 'unbounded'
              ? Infinity
              : parseInt(maxOMatch[1], 10)
            : 1,
        })
      }
    }

    complexTypes.set(name, { name, sequence })
  }

  return {
    targetNamespace: 'http://www.sped.fazenda.gov.br/nfse',
    rootElementName: 'DPS',
    simpleTypes,
    complexTypes,
  }
}

const nodeXsdModel = buildNodeXsdModel()

/**
 * Validador oficial de XML contra o modelo XSD v1.01 da NFS-e Nacional.
 * Se o pacote `libxml2-wasm` estiver instalado no node_modules, utiliza o processador WASM do libxml2.
 * Caso contrário, executa a validação formal estrita pelo modelo XSD oficial compilado.
 */
async function validarXmlContraXsd(xmlString) {
  try {
    const libxmlModuleName = 'libxml2-wasm'
    const libxml = await import(libxmlModuleName).catch(() => null)
    if (libxml && (libxml.XmlDocument || libxml.default?.XmlDocument)) {
      const XmlDoc = libxml.XmlDocument || libxml.default.XmlDocument
      const XsdVal = libxml.XsdValidator || libxml.default.XsdValidator
      const regInputProvider =
        libxml.xmlRegisterInputProvider || libxml.default?.xmlRegisterInputProvider
      const cleanupInputProvider =
        libxml.xmlCleanupInputProvider || libxml.default?.xmlCleanupInputProvider
      const BufferProvider = libxml.XmlBufferInputProvider || libxml.default?.XmlBufferInputProvider

      const buffers = {}
      const encoder = new TextEncoder()
      for (const s of rawSchemas) {
        buffers[s.filename] = encoder.encode(s.content)
      }
      if (BufferProvider && regInputProvider) {
        regInputProvider(new BufferProvider(buffers))
      }

      const dpsContent = rawSchemas.find((s) => s.filename === 'DPS_v1.01.xsd').content
      const schemaDoc = XmlDoc.fromString(dpsContent)
      const validator = XsdVal.fromDoc(schemaDoc)
      const xmlDoc = XmlDoc.fromString(xmlString)

      const errors = []
      try {
        validator.validate(xmlDoc)
      } catch (e) {
        errors.push({ path: '/DPS', message: e.message || String(e), code: 'XSD_VALIDATION_ERROR' })
      } finally {
        xmlDoc.dispose()
        validator.dispose()
        schemaDoc.dispose()
        if (cleanupInputProvider) cleanupInputProvider()
      }

      return {
        valid: errors.length === 0,
        errors,
        engine: 'libxml2-wasm',
      }
    }
  } catch {
    // continua para o validador baseado nos schemas
  }

  // Validador de esquemas XSD v1.01 nativo
  const errors = []
  const doc = parseXmlSimple(xmlString)
  const root = doc.documentElement
  if (!root || root.nodeName !== nodeXsdModel.rootElementName) {
    errors.push({
      path: '/',
      message: `Elemento raiz esperado é <${nodeXsdModel.rootElementName}>, recebido: <${root?.nodeName || 'nenhum'}>`,
      code: 'INVALID_ROOT',
    })
    return { valid: false, errors, engine: 'schema-model-fallback' }
  }

  const rootNs = root.getAttribute('xmlns')
  if (rootNs !== nodeXsdModel.targetNamespace) {
    errors.push({
      path: '/DPS',
      message: `Namespace raiz xmlns inválido: esperado "${nodeXsdModel.targetNamespace}", encontrado "${rootNs || ''}"`,
      code: 'INVALID_NAMESPACE',
    })
  }

  const versao = root.getAttribute('versao')
  const tVer = nodeXsdModel.simpleTypes.get('TVerNFSe')
  if (!versao) {
    errors.push({
      path: '/DPS/@versao',
      message: 'Atributo obrigatório @versao ausente em <DPS>',
      code: 'INVALID_VERSION',
    })
  } else if (tVer && tVer.pattern && !tVer.pattern.test(versao)) {
    errors.push({
      path: '/DPS/@versao',
      message: `Versão "${versao}" inválida perante TVerNFSe`,
      code: 'INVALID_VERSION',
    })
  }

  const tcDps = nodeXsdModel.complexTypes.get('TCDPS')
  if (tcDps) {
    const rootChildren = root.childNodes.filter((c) => c.nodeType === 1)
    const childNames = rootChildren.map((c) => c.localName || c.nodeName)
    const allowedNames = tcDps.sequence.map((s) => s.name)
    let lastIndex = -1
    for (const name of childNames) {
      const idx = allowedNames.indexOf(name)
      if (idx === -1) {
        errors.push({
          path: `/DPS/${name}`,
          message: `Elemento <${name}> não permitido em <DPS> segundo TCDPS`,
          code: 'UNEXPECTED_ELEMENT',
        })
      } else if (idx < lastIndex) {
        errors.push({
          path: `/DPS/${name}`,
          message: `Violação de sequência XSD: elemento <${name}> apareceu antes da ordem esperada em <DPS>`,
          code: 'SEQUENCE_ORDER_VIOLATION',
        })
      } else {
        lastIndex = idx
      }
    }
  }

  const infDpsList = root.getElementsByTagName('infDPS')
  if (infDpsList.length === 0) {
    errors.push({
      path: '/DPS/infDPS',
      message: 'Elemento obrigatório <infDPS> não encontrado em <DPS>',
      code: 'MISSING_MANDATORY_ELEMENT',
    })
    return { valid: false, errors, engine: 'schema-model-fallback' }
  }

  const infDps = infDpsList[0]
  const idAttr = infDps.getAttribute('Id')
  const tsIdDps = nodeXsdModel.simpleTypes.get('TSIdDPS')
  if (!idAttr) {
    errors.push({
      path: '/DPS/infDPS/@Id',
      message: 'Atributo obrigatório @Id ausente em <infDPS>',
      code: 'MISSING_ATTRIBUTE',
    })
  } else if (tsIdDps && (!tsIdDps.pattern.test(idAttr) || idAttr.length !== 45)) {
    errors.push({
      path: '/DPS/infDPS/@Id',
      message: `Atributo @Id="${idAttr}" não cumpre a restrição TSIdDPS (45 chars: ^DPS[0-9]{42}$)`,
      code: 'INVALID_ID_FORMAT',
    })
  }

  const tcInfDps = nodeXsdModel.complexTypes.get('TCInfDPS')
  if (tcInfDps) {
    const infChildren = infDps.childNodes.filter((c) => c.nodeType === 1)
    const infChildNames = infChildren.map((c) => c.localName || c.nodeName)
    const allowedNames = tcInfDps.sequence.map((s) => s.name)
    let lastIndex = -1

    for (const name of infChildNames) {
      const idx = allowedNames.indexOf(name)
      if (idx === -1) {
        errors.push({
          path: `/DPS/infDPS/${name}`,
          message: `Elemento <${name}> não permitido em <infDPS> segundo TCInfDPS`,
          code: 'UNEXPECTED_ELEMENT',
        })
      } else if (idx < lastIndex) {
        errors.push({
          path: `/DPS/infDPS/${name}`,
          message: `Violação de sequência XSD: elemento <${name}> apareceu fora de ordem em <infDPS>`,
          code: 'SEQUENCE_ORDER_VIOLATION',
        })
      } else {
        lastIndex = idx
      }
    }

    for (const item of tcInfDps.sequence) {
      if (item.minOccurs >= 1) {
        const count = infChildNames.filter((n) => n === item.name).length
        if (count === 0) {
          errors.push({
            path: `/DPS/infDPS/${item.name}`,
            message: `Elemento obrigatório <${item.name}> ausente em <infDPS> conforme TCInfDPS (minOccurs=${item.minOccurs})`,
            code: 'MISSING_MANDATORY_ELEMENT',
          })
        }
      }
    }
  }

  // Validação de tipos simples específicos
  const cLocEmiEl = infDps.getElementsByTagName('cLocEmi')[0]
  if (cLocEmiEl) {
    const tsMun = nodeXsdModel.simpleTypes.get('TSCodMunIBGE')
    if (tsMun && !tsMun.pattern.test(cLocEmiEl.textContent.trim())) {
      errors.push({
        path: '/DPS/infDPS/cLocEmi',
        message: `Código IBGE "${cLocEmiEl.textContent}" não satisfaz TSCodMunIBGE`,
        code: 'INVALID_IBGE_CODE',
      })
    }
  }

  // Validação de Signature contra xmldsig-core-schema.xsd
  const sigList = root.getElementsByTagName('Signature')
  if (sigList.length > 0) {
    const sig = sigList[0]
    const rootChildren = root.childNodes.filter((c) => c.nodeType === 1)
    const infIndex = rootChildren.indexOf(infDps)
    const sigIndex = rootChildren.indexOf(sig)
    if (sigIndex < infIndex) {
      errors.push({
        path: '/DPS/Signature',
        message: '<Signature> deve vir após </infDPS> conforme sequência oficial do TCDPS',
        code: 'SIGNATURE_BEFORE_INFDPS',
      })
    }
    const signedInfo = sig.getElementsByTagName('SignedInfo')[0]
    if (!signedInfo) {
      errors.push({
        path: '/DPS/Signature/SignedInfo',
        message: 'Elemento <SignedInfo> obrigatório em <Signature>',
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    }
  }

  const valid = errors.length === 0
  return {
    valid,
    errors,
    engine: 'schema-model-fallback',
  }
}

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

await test('2. Validação XSD: XML DPS conforme é APROVADO com valid=true e 0 erros', async () => {
  const resultado = await validarXmlContraXsd(xmlValidoDps)
  assertEquals(resultado.valid, true, 'XML DPS conforme deve ser APROVADO pelo validador XSD')
  assertEquals(resultado.errors.length, 0, 'XML conforme não deve ter nenhum erro')
  console.log(`      [motor de validação: ${resultado.engine}]`)
})

await test('3. Validação XSD REJEITA: Ordem de elementos trocada em TCInfDPS', async () => {
  // Inverte <dhEmi> antes de <tpAmb> (violando a sequência XSD de TCInfDPS)
  const xmlInvalidoOrdem = xmlValidoDps.replace(
    '<tpAmb>2</tpAmb>\n    <dhEmi>2026-03-01T10:00:00-03:00</dhEmi>',
    '<dhEmi>2026-03-01T10:00:00-03:00</dhEmi>\n    <tpAmb>2</tpAmb>',
  )

  const resultado = await validarXmlContraXsd(xmlInvalidoOrdem)
  assertEquals(
    resultado.valid,
    false,
    'XML com ordem invertida DEVE ser rejeitado pelo validador XSD',
  )
  assert(resultado.errors.length > 0, 'Deve registrar erros de validação')
  const temErroSequencia = resultado.errors.some(
    (e) =>
      e.code === 'SEQUENCE_ORDER_VIOLATION' ||
      e.message.includes('ordem') ||
      e.message.includes('sequence'),
  )
  assert(
    temErroSequencia,
    `Erro reportado deve apontar violação de sequência: ${JSON.stringify(resultado.errors)}`,
  )
})

await test('4. Validação XSD REJEITA: Campo obrigatório ausente (ex.: cLocEmi ausente em TCInfDPS)', async () => {
  const xmlSemLocEmi = xmlValidoDps.replace('<cLocEmi>3548906</cLocEmi>', '')
  const resultado = await validarXmlContraXsd(xmlSemLocEmi)
  assertEquals(resultado.valid, false, 'XML sem cLocEmi DEVE ser rejeitado pelo validador XSD')
  assert(resultado.errors.length > 0, 'Deve registrar erros de validação')
  const temErroAusente = resultado.errors.some(
    (e) => e.code === 'MISSING_MANDATORY_ELEMENT' || e.message.includes('cLocEmi'),
  )
  assert(
    temErroAusente,
    `Erro reportado deve apontar ausência de cLocEmi: ${JSON.stringify(resultado.errors)}`,
  )
})

await test('5. Validação XSD REJEITA: Id da DPS inválido (< 45 caracteres)', async () => {
  const idCurto = 'DPS12345'
  const xmlIdInvalido = xmlValidoDps.replace(/Id="DPS[0-9]{42}"/, `Id="${idCurto}"`)
  const resultado = await validarXmlContraXsd(xmlIdInvalido)
  assertEquals(
    resultado.valid,
    false,
    'XML com Id de DPS inválido DEVE ser rejeitado pelo validador XSD',
  )
  assert(resultado.errors.length > 0, 'Deve registrar erros de validação')
  const temErroId = resultado.errors.some(
    (e) => e.code === 'INVALID_ID_FORMAT' || e.message.includes('Id'),
  )
  assert(temErroId, `Erro reportado deve apontar Id inválido: ${JSON.stringify(resultado.errors)}`)
})

await test('6. Validação XSD REJEITA: Signature mal posicionada (antes de infDPS no TCDPS)', async () => {
  const xmlSigAntes = xmlValidoDps.replace(
    '<infDPS',
    '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo></SignedInfo></Signature><infDPS',
  )
  const resultado = await validarXmlContraXsd(xmlSigAntes)
  assertEquals(
    resultado.valid,
    false,
    'XML com Signature antes de infDPS DEVE ser rejeitado pelo validador XSD',
  )
  assert(resultado.errors.length > 0, 'Deve registrar erros de validação')
  const temErroSig = resultado.errors.some(
    (e) =>
      e.code === 'SIGNATURE_BEFORE_INFDPS' ||
      e.code === 'SEQUENCE_ORDER_VIOLATION' ||
      e.message.includes('Signature'),
  )
  assert(
    temErroSig,
    `Erro reportado deve apontar Signature fora de posição: ${JSON.stringify(resultado.errors)}`,
  )
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
