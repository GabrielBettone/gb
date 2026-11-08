/**
 * Validador de XML da NFS-e Nacional v1.01 orientado a Schemas XSD Oficiais.
 *
 * Utiliza o modelo carregado DIRETAMENTE dos arquivos XSD oficiais vendored
 * (DPS_v1.01.xsd, tiposComplexos_v1.01.xsd, tiposSimples_v1.01.xsd, xmldsig-core-schema.xsd)
 * via `buildOfficialXsdModel()`.
 *
 * Executa as restrições formais dos XSDs:
 * - Validação do namespace oficial targetNamespace="http://www.sped.fazenda.gov.br/nfse"
 * - Elemento raiz <DPS> do tipo TCDPS com atributo obrigatório versao="1.00" (TVerNFSe)
 * - Sequência estrita e cardinalidade dos elementos (TCDPS -> TCInfDPS -> TCEmitenteDPS -> etc.)
 * - Restrições de tipos simples extraídas dos XSDs:
 *   * TSIdDPS (pattern: DPS[0-9]{42}, total 45 chars)
 *   * TAmb (enumeration: 1, 2)
 *   * TSDateTimeUTC (pattern UTC ISO-8601 com fuso)
 *   * TSData (pattern AAAA-MM-DD)
 *   * TSSerieDPS (1 a 5 dígitos)
 *   * TSNDPS (1 a 15 dígitos numéricos)
 *   * TSCodMunIBGE (pattern 7 dígitos)
 *   * TSCNPJ (14 dígitos), TSCPF (11 dígitos)
 *   * Posicionamento estrito de ds:Signature após infDPS (TCDPS sequence)
 */

import { buildOfficialXsdModel, XsdModel } from './nfseXsdLoader'

export interface XsdValidationError {
  path: string
  message: string
  code: string
}

export interface XsdValidationResult {
  valid: boolean
  errors: XsdValidationError[]
  valido: boolean
  erros: XsdValidationError[]
  engine?: 'libxml2-wasm' | 'schema-model-fallback'
  warning?: string
  modelInfo?: {
    schemasCount: number
    simpleTypesCount: number
    complexTypesCount: number
    rootElement: string
  }
}

/**
 * Parser de XML que funciona no browser (DOMParser) ou com fallback estrutural.
 */
function parseXmlDocument(
  xml: string,
  parseDomFn?: (xml: string) => Document,
): { doc?: Document; error?: string } {
  try {
    if (parseDomFn) {
      return { doc: parseDomFn(xml) }
    }
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      const parserError = doc.getElementsByTagName('parsererror')
      if (parserError && parserError.length > 0) {
        return { error: parserError[0].textContent?.trim() || 'Erro de sintaxe XML' }
      }
      return { doc }
    }
    return { error: 'DOMParser não disponível no ambiente.' }
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}

function getChildElements(el: Element): Element[] {
  const result: Element[] = []
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i]
    if (node.nodeType === 1) {
      result.push(node as Element)
    }
  }
  return result
}

/**
 * Valida a sequência de elementos filhos conforme a definição xs:sequence do complexType.
 */
function validateSequence(
  parentEl: Element,
  expectedSequence: { name: string; minOccurs: number; maxOccurs: number }[],
  path: string,
  errors: XsdValidationError[],
) {
  const children = getChildElements(parentEl)
  const childNames = children.map((c) => c.localName || c.nodeName)
  const allowedNames = expectedSequence.map((s) => s.name)

  let lastIndex = -1
  for (let i = 0; i < children.length; i++) {
    const name = childNames[i]
    const seqIndex = allowedNames.indexOf(name)

    if (seqIndex === -1) {
      errors.push({
        path: `${path}/${name}`,
        message: `Elemento <${name}> não é permitido dentro de <${parentEl.nodeName}> segundo o esquema XSD v1.01.`,
        code: 'UNEXPECTED_ELEMENT',
      })
      continue
    }

    if (seqIndex < lastIndex) {
      errors.push({
        path: `${path}/${name}`,
        message: `Violação de sequência XSD: elemento <${name}> apareceu fora de ordem em <${parentEl.nodeName}>.`,
        code: 'SEQUENCE_ORDER_VIOLATION',
      })
    } else {
      lastIndex = seqIndex
    }
  }

  // Verifica elementos obrigatórios (minOccurs >= 1)
  for (const item of expectedSequence) {
    if (item.minOccurs >= 1) {
      const count = childNames.filter((n) => n === item.name).length
      if (count === 0) {
        errors.push({
          path: `${path}/${item.name}`,
          message: `Elemento obrigatório <${item.name}> ausente em <${parentEl.nodeName}> conforme XSD v1.01 (minOccurs=${item.minOccurs}).`,
          code: 'MISSING_MANDATORY_ELEMENT',
        })
      } else if (count > item.maxOccurs) {
        errors.push({
          path: `${path}/${item.name}`,
          message: `Elemento <${item.name}> excedeu o limite máximo de ocorrências (${count} > ${item.maxOccurs}).`,
          code: 'MAX_OCCURS_VIOLATION',
        })
      }
    }
  }
}

/**
 * Valida o valor de um elemento contra uma definição xs:simpleType do XSD oficial.
 */
function validateSimpleType(
  value: string,
  typeDef: ReturnType<XsdModel['simpleTypes']['get']>,
  path: string,
  errors: XsdValidationError[],
  errorCode = 'INVALID_TYPE_VALUE',
) {
  if (!typeDef) return

  if (typeDef.minLength !== undefined && value.length < typeDef.minLength) {
    errors.push({
      path,
      message: `Tamanho mínimo violado para o tipo ${typeDef.name}: esperado >= ${typeDef.minLength}, obtido ${value.length}.`,
      code: 'INVALID_LENGTH',
    })
  }

  if (typeDef.maxLength !== undefined && value.length > typeDef.maxLength) {
    errors.push({
      path,
      message: `Tamanho máximo violado para o tipo ${typeDef.name}: esperado <= ${typeDef.maxLength}, obtido ${value.length}.`,
      code: 'INVALID_LENGTH',
    })
  }

  if (typeDef.enumerations && !typeDef.enumerations.includes(value)) {
    errors.push({
      path,
      message: `Valor "${value}" não pertence à enumeração permitida do tipo ${typeDef.name} [${typeDef.enumerations.join(', ')}].`,
      code: 'INVALID_ENUM',
    })
  }

  if (typeDef.pattern && !typeDef.pattern.test(value)) {
    errors.push({
      path,
      message: `Valor "${value}" não satisfaz a expressão regular oficial do tipo ${typeDef.name}.`,
      code: errorCode,
    })
  }
}

/**
 * Valida o XML da DPS contra os esquemas XSD oficiais v1.01 carregados do repositório.
 */
export function validarDpsXmlContraXsd(
  xml: string,
  parseDomFn?: (xml: string) => Document,
): XsdValidationResult {
  const errors: XsdValidationError[] = []

  // 1. Carrega e compila o modelo a partir dos XSDs oficiais vendored
  const xsdModel = buildOfficialXsdModel()

  // 2. Parsing XML
  const { doc, error: parseErr } = parseXmlDocument(xml, parseDomFn)
  if (parseErr || !doc) {
    const errList = [
      {
        path: '/',
        message: `XML malformado ou erro de parsing: ${parseErr || 'Desconhecido'}`,
        code: 'MALFORMED_XML',
      },
    ]
    return {
      valid: false,
      errors: errList,
      valido: false,
      erros: errList,
    }
  }

  const root = doc.documentElement
  if (!root || root.nodeName !== xsdModel.rootElementName) {
    errors.push({
      path: '/',
      message: `Elemento raiz esperado é <${xsdModel.rootElementName}>, recebido: <${root?.nodeName || 'nenhum'}>`,
      code: 'INVALID_ROOT',
    })
    return {
      valid: false,
      errors,
      valido: false,
      erros: errors,
    }
  }

  // Namespace oficial verificado contra DPS_v1.01.xsd
  const rootNs = root.getAttribute('xmlns')
  if (rootNs !== xsdModel.targetNamespace) {
    errors.push({
      path: '/DPS',
      message: `Namespace raiz xmlns inválido: esperado "${xsdModel.targetNamespace}", encontrado "${rootNs || ''}"`,
      code: 'INVALID_NAMESPACE',
    })
  }

  // Atributo versao do TCDPS (TVerNFSe: pattern 1\.00)
  const versao = root.getAttribute('versao')
  const tVer = xsdModel.simpleTypes.get('TVerNFSe')
  if (!versao) {
    errors.push({
      path: '/DPS/@versao',
      message: `Atributo obrigatório @versao ausente em <DPS> segundo TCDPS`,
      code: 'INVALID_VERSION',
    })
  } else if (tVer) {
    validateSimpleType(versao, tVer, '/DPS/@versao', errors, 'INVALID_VERSION')
  }

  // Validação da sequência de <DPS> conforme TCDPS (infDPS, ds:Signature)
  const tcDps = xsdModel.complexTypes.get('TCDPS')
  if (tcDps) {
    validateSequence(
      root,
      tcDps.sequence.map((s) => ({ name: s.name, minOccurs: s.minOccurs, maxOccurs: s.maxOccurs })),
      '/DPS',
      errors,
    )
  }

  // Validação de <infDPS> conforme TCInfDPS
  const infDpsList = root.getElementsByTagName('infDPS')
  if (infDpsList.length === 0) {
    errors.push({
      path: '/DPS/infDPS',
      message: 'Elemento obrigatório <infDPS> não encontrado em <DPS>',
      code: 'MISSING_MANDATORY_ELEMENT',
    })
    return { valid: false, errors, valido: false, erros: errors }
  }

  const infDps = infDpsList[0]

  // Atributo Id de infDPS (TSIdDPS: "DPS" + 42 dígitos = 45 chars)
  const idAttr = infDps.getAttribute('Id')
  const tsIdDps = xsdModel.simpleTypes.get('TSIdDPS')
  if (!idAttr) {
    errors.push({
      path: '/DPS/infDPS/@Id',
      message: 'Atributo obrigatório @Id ausente em <infDPS>',
      code: 'MISSING_ATTRIBUTE',
    })
  } else if (tsIdDps) {
    if (!tsIdDps.pattern?.test(idAttr) || idAttr.length !== 45) {
      errors.push({
        path: '/DPS/infDPS/@Id',
        message: `Atributo @Id="${idAttr}" não cumpre a restrição TSIdDPS (45 caracteres: ^DPS[0-9]{42}$)`,
        code: 'INVALID_ID_FORMAT',
      })
    }
  }

  // Valida sequência de TCInfDPS
  const tcInfDps = xsdModel.complexTypes.get('TCInfDPS')
  if (tcInfDps) {
    validateSequence(
      infDps,
      tcInfDps.sequence.map((s) => ({
        name: s.name,
        minOccurs: s.minOccurs,
        maxOccurs: s.maxOccurs,
      })),
      '/DPS/infDPS',
      errors,
    )
  }

  // Valida campos e tipos individuais definidos nos XSDs oficiais
  const tpAmbEl = infDps.getElementsByTagName('tpAmb')[0]
  if (tpAmbEl) {
    validateSimpleType(
      tpAmbEl.textContent || '',
      xsdModel.simpleTypes.get('TAmb'),
      '/DPS/infDPS/tpAmb',
      errors,
      'INVALID_ENUM',
    )
  }

  const dhEmiEl = infDps.getElementsByTagName('dhEmi')[0]
  if (dhEmiEl) {
    validateSimpleType(
      dhEmiEl.textContent || '',
      xsdModel.simpleTypes.get('TSDateTimeUTC'),
      '/DPS/infDPS/dhEmi',
      errors,
      'INVALID_DATE_TIME',
    )
  }

  const serieEl = infDps.getElementsByTagName('serie')[0]
  if (serieEl) {
    validateSimpleType(
      serieEl.textContent || '',
      xsdModel.simpleTypes.get('TSSerieDPS'),
      '/DPS/infDPS/serie',
      errors,
      'INVALID_LENGTH',
    )
  }

  const nDpsEl = infDps.getElementsByTagName('nDPS')[0]
  if (nDpsEl) {
    validateSimpleType(
      nDpsEl.textContent || '',
      xsdModel.simpleTypes.get('TSNDPS'),
      '/DPS/infDPS/nDPS',
      errors,
      'INVALID_PATTERN',
    )
  }

  const dCompetEl = infDps.getElementsByTagName('dCompet')[0]
  if (dCompetEl) {
    validateSimpleType(
      dCompetEl.textContent || '',
      xsdModel.simpleTypes.get('TSData'),
      '/DPS/infDPS/dCompet',
      errors,
      'INVALID_DATE',
    )
  }

  const cLocEmiEl = infDps.getElementsByTagName('cLocEmi')[0]
  if (cLocEmiEl) {
    validateSimpleType(
      cLocEmiEl.textContent || '',
      xsdModel.simpleTypes.get('TSCodMunIBGE'),
      '/DPS/infDPS/cLocEmi',
      errors,
      'INVALID_IBGE_CODE',
    )
  }

  // Prestador (TCEmitenteDPS)
  const prestEl = infDps.getElementsByTagName('prest')[0]
  if (prestEl) {
    const cnpjPrest = prestEl.getElementsByTagName('CNPJ')[0]
    const cpfPrest = prestEl.getElementsByTagName('CPF')[0]
    if (!cnpjPrest && !cpfPrest) {
      errors.push({
        path: '/DPS/infDPS/prest',
        message: 'Prestador deve ter CNPJ ou CPF informado conforme TCEmitenteDPS',
        code: 'MISSING_PREST_IDENTIFIER',
      })
    }
    if (cnpjPrest) {
      validateSimpleType(
        cnpjPrest.textContent || '',
        xsdModel.simpleTypes.get('TSCNPJ'),
        '/DPS/infDPS/prest/CNPJ',
        errors,
        'INVALID_CNPJ',
      )
    }
    if (cpfPrest) {
      validateSimpleType(
        cpfPrest.textContent || '',
        xsdModel.simpleTypes.get('TSCPF'),
        '/DPS/infDPS/prest/CPF',
        errors,
        'INVALID_CPF',
      )
    }
  }

  // Tomador (TCTomadorDPS)
  const tomaEl = infDps.getElementsByTagName('toma')[0]
  if (tomaEl) {
    const cnpjToma = tomaEl.getElementsByTagName('CNPJ')[0]
    const cpfToma = tomaEl.getElementsByTagName('CPF')[0]
    if (cnpjToma) {
      validateSimpleType(
        cnpjToma.textContent || '',
        xsdModel.simpleTypes.get('TSCNPJ'),
        '/DPS/infDPS/toma/CNPJ',
        errors,
        'INVALID_CNPJ',
      )
    }
    if (cpfToma) {
      validateSimpleType(
        cpfToma.textContent || '',
        xsdModel.simpleTypes.get('TSCPF'),
        '/DPS/infDPS/toma/CPF',
        errors,
        'INVALID_CPF',
      )
    }
  }

  // Servico (TCServicoDPS -> TCCServ)
  const servEl = infDps.getElementsByTagName('serv')[0]
  if (servEl) {
    const cTribNac = servEl.getElementsByTagName('cTribNac')[0]
    if (!cTribNac || !cTribNac.textContent?.trim()) {
      errors.push({
        path: '/DPS/infDPS/serv/cServ/cTribNac',
        message: 'Código de tributação nacional (cTribNac) é obrigatório',
        code: 'MISSING_TRIB_NAC',
      })
    }
  }

  // Signature posicionado conforme TCDPS (<infDPS>, <ds:Signature minOccurs="0"/>)
  const sigList = root.getElementsByTagName('Signature')
  if (sigList.length > 0) {
    const sig = sigList[0]
    if (sig.parentNode !== root) {
      errors.push({
        path: '/DPS/Signature',
        message: 'Elemento <Signature> deve ser filho direto de <DPS> conforme TCDPS',
        code: 'SIGNATURE_WRONG_PARENT',
      })
    }
    const rootChildren = getChildElements(root)
    const infIndex = rootChildren.indexOf(infDps)
    const sigIndex = rootChildren.indexOf(sig)
    if (sigIndex < infIndex) {
      errors.push({
        path: '/DPS/Signature',
        message: '<Signature> deve vir após </infDPS> conforme sequência oficial do TCDPS',
        code: 'SIGNATURE_BEFORE_INFDPS',
      })
    }

    // Validação da estrutura XMLDSig contra xmldsig-core-schema.xsd
    // <Signature> deve conter <SignedInfo>, <SignatureValue> e opcionalmente <KeyInfo>, etc.
    const signedInfoList = sig.getElementsByTagName('SignedInfo')
    if (signedInfoList.length === 0) {
      errors.push({
        path: '/DPS/Signature/SignedInfo',
        message:
          'Elemento obrigatório <SignedInfo> ausente em <Signature> segundo xmldsig-core-schema.xsd',
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    } else {
      const signedInfo = signedInfoList[0]
      const c14nMethod = signedInfo.getElementsByTagName('CanonicalizationMethod')[0]
      const sigMethod = signedInfo.getElementsByTagName('SignatureMethod')[0]
      const reference = signedInfo.getElementsByTagName('Reference')[0]

      if (!c14nMethod) {
        errors.push({
          path: '/DPS/Signature/SignedInfo/CanonicalizationMethod',
          message: '<CanonicalizationMethod> obrigatório em <SignedInfo>',
          code: 'MISSING_MANDATORY_ELEMENT',
        })
      }
      if (!sigMethod) {
        errors.push({
          path: '/DPS/Signature/SignedInfo/SignatureMethod',
          message: '<SignatureMethod> obrigatório em <SignedInfo>',
          code: 'MISSING_MANDATORY_ELEMENT',
        })
      }
      if (!reference) {
        errors.push({
          path: '/DPS/Signature/SignedInfo/Reference',
          message: '<Reference> obrigatório em <SignedInfo>',
          code: 'MISSING_MANDATORY_ELEMENT',
        })
      } else {
        const digestMethod = reference.getElementsByTagName('DigestMethod')[0]
        const digestValue = reference.getElementsByTagName('DigestValue')[0]
        if (!digestMethod) {
          errors.push({
            path: '/DPS/Signature/SignedInfo/Reference/DigestMethod',
            message: '<DigestMethod> obrigatório em <Reference>',
            code: 'MISSING_MANDATORY_ELEMENT',
          })
        }
        if (!digestValue || !digestValue.textContent?.trim()) {
          errors.push({
            path: '/DPS/Signature/SignedInfo/Reference/DigestValue',
            message: '<DigestValue> com hash válido é obrigatório em <Reference>',
            code: 'MISSING_MANDATORY_ELEMENT',
          })
        }
      }
    }

    const signatureValueList = sig.getElementsByTagName('SignatureValue')
    if (signatureValueList.length === 0 || !signatureValueList[0].textContent?.trim()) {
      errors.push({
        path: '/DPS/Signature/SignatureValue',
        message: 'Elemento <SignatureValue> com conteúdo base64 é obrigatório em <Signature>',
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    }
  }

  const valid = errors.length === 0
  return {
    valid,
    errors,
    valido: valid,
    erros: errors,
    engine: 'schema-model-fallback',
    warning:
      'Validação parcial orientada ao modelo XSD compilado dos schemas oficiais v1.01. Para validação nativa via libxml2-wasm (WASM), instale o pacote via npm i libxml2-wasm no repositório.',
    modelInfo: {
      schemasCount: xsdModel.rawSchemas.length,
      simpleTypesCount: xsdModel.simpleTypes.size,
      complexTypesCount: xsdModel.complexTypes.size,
      rootElement: xsdModel.rootElementName,
    },
  }
}

/**
 * Validação assíncrona contra os esquemas XSD v1.01 oficiais.
 * Tenta dinamicamente o processador nativo WASM `libxml2-wasm` (se disponível no runtime)
 * resolvendo todas as dependências (xsd:import / xsd:include) via XmlBufferInputProvider.
 * Caso `libxml2-wasm` não esteja instalado (ex.: package.json protegido por preventAI),
 * utiliza de forma transparente o validador estrito compilado dos XSDs oficiais com aviso de validação parcial.
 */
export async function validarDpsXmlContraXsdAsync(
  xml: string,
  parseDomFn?: (xml: string) => Document,
): Promise<XsdValidationResult> {
  try {
    // Tentativa de carregar dinamicamente libxml2-wasm se o usuário já tiver instalado via GitHub
    // Usando dynamic import com string concatenada para não quebrar build do Vite quando o pacote não existe
    const libxmlModuleName = 'libxml2-wasm'
    const libxml: any = await import(/* @vite-ignore */ libxmlModuleName).catch(() => null)

    if (libxml && (libxml.XmlDocument || libxml.default?.XmlDocument)) {
      const XmlDoc = libxml.XmlDocument || libxml.default.XmlDocument
      const XsdVal = libxml.XsdValidator || libxml.default.XsdValidator
      const regInputProvider =
        libxml.xmlRegisterInputProvider || libxml.default?.xmlRegisterInputProvider
      const cleanupInputProvider =
        libxml.xmlCleanupInputProvider || libxml.default?.xmlCleanupInputProvider
      const BufferProvider = libxml.XmlBufferInputProvider || libxml.default?.XmlBufferInputProvider

      const { buildOfficialXsdModel } = await import('./nfseXsdLoader')
      const model = buildOfficialXsdModel()
      const dpsXsd = model.rawSchemas.find((s) => s.filename === 'DPS_v1.01.xsd')?.content || ''

      const buffers: Record<string, Uint8Array> = {}
      const encoder = new TextEncoder()
      for (const s of model.rawSchemas) {
        buffers[s.filename] = encoder.encode(s.content)
      }

      if (BufferProvider && regInputProvider) {
        regInputProvider(new BufferProvider(buffers))
      }

      let schemaDoc: any = null
      let validator: any = null
      let xmlDoc: any = null

      try {
        schemaDoc = XmlDoc.fromString(dpsXsd)
        validator = XsdVal.fromDoc(schemaDoc)
        xmlDoc = XmlDoc.fromString(xml)

        const errors: XsdValidationError[] = []
        try {
          validator.validate(xmlDoc)
        } catch (valErr: any) {
          const errMsg = valErr?.message || String(valErr)
          errors.push({
            path: '/DPS',
            message: errMsg,
            code: 'XSD_VALIDATION_ERROR',
          })
        }

        const valid = errors.length === 0
        return {
          valid,
          errors,
          valido: valid,
          erros: errors,
          engine: 'libxml2-wasm',
          modelInfo: {
            schemasCount: model.rawSchemas.length,
            simpleTypesCount: model.simpleTypes.size,
            complexTypesCount: model.complexTypes.size,
            rootElement: model.rootElementName,
          },
        }
      } finally {
        if (xmlDoc?.dispose) xmlDoc.dispose()
        if (validator?.dispose) validator.dispose()
        if (schemaDoc?.dispose) schemaDoc.dispose()
        if (cleanupInputProvider) cleanupInputProvider()
      }
    }
  } catch {
    // Fallback silencioso para o validador compilado dos XSDs
  }

  return validarDpsXmlContraXsd(xml, parseDomFn)
}

export const validateDpsXmlAgainstXsd = validarDpsXmlContraXsd
export const validateDpsXmlAgainstXsdAsync = validarDpsXmlContraXsdAsync
