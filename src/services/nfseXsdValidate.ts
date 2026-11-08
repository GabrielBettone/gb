/**
 * Validador de conformidade XSD NFS-e Nacional v1.01 (DPS / TCDPS / TCInfDPS).
 *
 * Baseado estritamente nas especificações e esquemas XSD oficiais da SEFIN Nacional:
 * - DPS_v1.01.xsd
 * - tiposComplexos_v1.01.xsd (TCDPS, TCInfDPS, TCEmitenteDPS, etc.)
 * - tiposSimples_v1.01.xsd (TSIdDPS, TSData, TSDateTimeUTC, TSSerieDPS, etc.)
 *
 * Valida:
 * 1. Well-formedness XML e namespace padrão da NFS-e Nacional (http://www.sped.fazenda.gov.br/nfse)
 * 2. Elemento raiz DPS e atributo versao="1.00"
 * 3. Ordem exata dos elementos filhos em <DPS> e <infDPS> (xs:sequence)
 * 4. Presença de campos obrigatórios e cardinalidade
 * 5. Tipos simples, padrões de Regex (TSIdDPS, TSDateTimeUTC, TSData, CNPJ, CPF, cMun)
 * 6. Estrutura de assinatura ds:Signature se presente (após infDPS e antes de /DPS)
 */

export interface XsdValidationError {
  path: string
  message: string
  code: string
}

export interface XsdValidationResult {
  valid: boolean
  errors: XsdValidationError[]
  // Aliases em português para compatibilidade de API
  valido: boolean
  erros: XsdValidationError[]
}

const NFSE_NAMESPACE = 'http://www.sped.fazenda.gov.br/nfse'

// Ordem estrita de elementos em <DPS> conforme TCDPS
const DPS_SEQUENCE = ['infDPS', 'Signature']

// Ordem estrita de elementos em <infDPS> conforme TCInfDPS (v1.01)
// <xs:sequence>
//   tpAmb (1)
//   dhEmi (1)
//   verAplic (1)
//   serie (1)
//   nDPS (1)
//   dCompet (1)
//   tpEmit (1)
//   cLocEmi (1)
//   prest (1)
//   toma (0..1)
//   interm (0..1)
//   serv (1)
//   valores (1)
//   infAdic (0..1)
// </xs:sequence>
const INF_DPS_SEQUENCE = [
  'tpAmb',
  'dhEmi',
  'verAplic',
  'serie',
  'nDPS',
  'dCompet',
  'tpEmit',
  'cLocEmi',
  'prest',
  'toma',
  'interm',
  'serv',
  'valores',
  'infAdic',
]

// Ordem em <prest>
const PREST_SEQUENCE = ['CNPJ', 'CPF', 'inscMun', 'xNome', 'xFant', 'end', 'fone', 'email']

// Ordem em <toma>
const TOMA_SEQUENCE = ['CNPJ', 'CPF', 'NIF', 'cNaoNIF', 'xNome', 'end', 'fone', 'email']

// Ordem em <serv>
const SERV_SEQUENCE = ['locPrest', 'cServ']

// Ordem em <cServ>
const CSERV_SEQUENCE = ['cTribNac', 'cTribMun', 'xDescServ']

// Ordem em <valores>
const VALORES_SEQUENCE = ['vServPrest', 'trib']

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

function checkSequenceOrder(
  parentEl: Element,
  expectedSequence: string[],
  path: string,
  errors: XsdValidationError[],
) {
  const children = getChildElements(parentEl)
  let lastIndex = -1

  for (const child of children) {
    const name = child.localName || child.nodeName
    const seqIndex = expectedSequence.indexOf(name)

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
}

/**
 * Valida o XML da DPS contra as regras do schema XSD NFS-e Nacional v1.01.
 */
export function validarDpsXmlContraXsd(
  xml: string,
  parseDomFn?: (xml: string) => Document,
): XsdValidationResult {
  const errors: XsdValidationError[] = []

  let doc: Document
  try {
    if (parseDomFn) {
      doc = parseDomFn(xml)
    } else if (typeof DOMParser !== 'undefined') {
      doc = new DOMParser().parseFromString(xml, 'application/xml')
    } else {
      // Fallback Node/JSDOM se aplicável
      // Em ambiente de teste Vitest/browser o DOMParser global sempre existe
      throw new Error('DOMParser não disponível no ambiente para validar XML.')
    }
  } catch (err: any) {
    const errList = [
      {
        path: '/',
        message: `XML malformado: ${err?.message || 'Falha no parsing'}`,
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

  // Verifica se o parser reportou erro de documento XML inválido
  const parserError = doc.getElementsByTagName('parsererror')
  if (parserError && parserError.length > 0) {
    const errList = [
      {
        path: '/',
        message: `Erro de sintaxe XML: ${parserError[0].textContent?.trim() || 'XML inválido'}`,
        code: 'PARSER_ERROR',
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
  if (!root || root.nodeName !== 'DPS') {
    errors.push({
      path: '/',
      message: `Elemento raiz esperado é <DPS>, recebido: <${root?.nodeName || 'nenhum'}>`,
      code: 'INVALID_ROOT',
    })
    return { valid: false, errors, valido: false, erros: errors }
  }

  // Namespace oficial
  const rootNs = root.getAttribute('xmlns')
  if (rootNs !== NFSE_NAMESPACE) {
    errors.push({
      path: '/DPS',
      message: `Namespace raiz xmlns inválido: esperado "${NFSE_NAMESPACE}", encontrado "${rootNs || ''}"`,
      code: 'INVALID_NAMESPACE',
    })
  }

  // Atributo versao
  const versao = root.getAttribute('versao')
  if (!versao || versao !== '1.00') {
    errors.push({
      path: '/DPS/@versao',
      message: `Atributo @versao obrigatório em <DPS> com valor "1.00" (encontrado: "${versao || ''}")`,
      code: 'INVALID_VERSION',
    })
  }

  // Sequência e elementos de DPS
  checkSequenceOrder(root, DPS_SEQUENCE, '/DPS', errors)

  const infDpsList = root.getElementsByTagName('infDPS')
  if (infDpsList.length === 0) {
    errors.push({
      path: '/DPS/infDPS',
      message: 'Elemento obrigatório <infDPS> não encontrado em <DPS>',
      code: 'MISSING_MANDATORY_ELEMENT',
    })
    return { valid: false, errors, valido: false, erros: errors }
  }
  if (infDpsList.length > 1) {
    errors.push({
      path: '/DPS/infDPS',
      message: 'Elemento <infDPS> deve ter cardinalidade 1',
      code: 'MAX_OCCURS_VIOLATION',
    })
  }

  const infDps = infDpsList[0]

  // Atributo Id de infDPS (TSIdDPS: "DPS" + cMun(7) + tpInsc(1) + Insc(14) + serie(5) + nDPS(15) = 45 chars)
  const idAttr = infDps.getAttribute('Id')
  if (!idAttr) {
    errors.push({
      path: '/DPS/infDPS/@Id',
      message: 'Atributo obrigatório @Id ausente em <infDPS>',
      code: 'MISSING_ATTRIBUTE',
    })
  } else {
    if (!/^DPS[0-9]{42}$/.test(idAttr) || idAttr.length !== 45) {
      errors.push({
        path: '/DPS/infDPS/@Id',
        message: `Atributo @Id="${idAttr}" não cumpre a restrição TSIdDPS (45 caracteres: ^DPS[0-9]{42}$)`,
        code: 'INVALID_ID_FORMAT',
      })
    }
  }

  // Valida ordem dos filhos de infDPS
  checkSequenceOrder(infDps, INF_DPS_SEQUENCE, '/DPS/infDPS', errors)

  // Valida campos obrigatórios em infDPS
  const requiredInfDps = [
    'tpAmb',
    'dhEmi',
    'verAplic',
    'serie',
    'nDPS',
    'dCompet',
    'tpEmit',
    'cLocEmi',
    'prest',
    'serv',
    'valores',
  ]

  for (const tag of requiredInfDps) {
    const el = infDps.getElementsByTagName(tag)
    if (!el || el.length === 0) {
      errors.push({
        path: `/DPS/infDPS/${tag}`,
        message: `Elemento obrigatório <${tag}> ausente em <infDPS>`,
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    }
  }

  // Valida tipos e padrões
  const tpAmbEl = infDps.getElementsByTagName('tpAmb')[0]
  if (tpAmbEl && !['1', '2'].includes(tpAmbEl.textContent || '')) {
    errors.push({
      path: '/DPS/infDPS/tpAmb',
      message: `tpAmb deve ser "1" (Produção) ou "2" (Homologação). Valor atual: "${tpAmbEl.textContent}"`,
      code: 'INVALID_ENUM',
    })
  }

  const dhEmiEl = infDps.getElementsByTagName('dhEmi')[0]
  if (dhEmiEl) {
    const dh = dhEmiEl.textContent || ''
    // AAAA-MM-DDThh:mm:ss com timezone
    const rDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?$/
    if (!rDateTime.test(dh)) {
      errors.push({
        path: '/DPS/infDPS/dhEmi',
        message: `dhEmi deve seguir formato UTC ISO-8601 (ex: 2026-03-24T12:00:00-03:00). Valor: "${dh}"`,
        code: 'INVALID_DATE_TIME',
      })
    }
  }

  const serieEl = infDps.getElementsByTagName('serie')[0]
  if (serieEl) {
    const s = serieEl.textContent || ''
    if (s.length < 1 || s.length > 5) {
      errors.push({
        path: '/DPS/infDPS/serie',
        message: `serie (TSSerieDPS) deve ter entre 1 e 5 caracteres. Encontrado: "${s}"`,
        code: 'INVALID_LENGTH',
      })
    }
  }

  const nDpsEl = infDps.getElementsByTagName('nDPS')[0]
  if (nDpsEl) {
    const n = nDpsEl.textContent || ''
    if (!/^[0-9]{1,15}$/.test(n) || Number(n) <= 0) {
      errors.push({
        path: '/DPS/infDPS/nDPS',
        message: `nDPS deve ser numérico positivo com até 15 dígitos. Encontrado: "${n}"`,
        code: 'INVALID_PATTERN',
      })
    }
  }

  const dCompetEl = infDps.getElementsByTagName('dCompet')[0]
  if (dCompetEl) {
    const d = dCompetEl.textContent || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      errors.push({
        path: '/DPS/infDPS/dCompet',
        message: `dCompet deve ter formato AAAA-MM-DD. Encontrado: "${d}"`,
        code: 'INVALID_DATE',
      })
    }
  }

  const cLocEmiEl = infDps.getElementsByTagName('cLocEmi')[0]
  if (cLocEmiEl) {
    const c = cLocEmiEl.textContent || ''
    if (!/^[0-9]{7}$/.test(c)) {
      errors.push({
        path: '/DPS/infDPS/cLocEmi',
        message: `cLocEmi (código IBGE) deve ter exatamente 7 dígitos numéricos. Encontrado: "${c}"`,
        code: 'INVALID_IBGE_CODE',
      })
    }
  }

  // Validações do Prestador
  const prestEl = infDps.getElementsByTagName('prest')[0]
  if (prestEl) {
    checkSequenceOrder(prestEl, PREST_SEQUENCE, '/DPS/infDPS/prest', errors)
    const cnpjPrest = prestEl.getElementsByTagName('CNPJ')[0]
    const cpfPrest = prestEl.getElementsByTagName('CPF')[0]
    if (!cnpjPrest && !cpfPrest) {
      errors.push({
        path: '/DPS/infDPS/prest',
        message: 'Prestador deve ter CNPJ ou CPF informado',
        code: 'MISSING_PREST_IDENTIFIER',
      })
    }
    if (cnpjPrest && !/^[0-9]{14}$/.test(cnpjPrest.textContent || '')) {
      errors.push({
        path: '/DPS/infDPS/prest/CNPJ',
        message: `CNPJ do prestador deve conter 14 dígitos. Encontrado: "${cnpjPrest.textContent}"`,
        code: 'INVALID_CNPJ',
      })
    }
  }

  // Validações do Tomador se presente
  const tomaEl = infDps.getElementsByTagName('toma')[0]
  if (tomaEl) {
    checkSequenceOrder(tomaEl, TOMA_SEQUENCE, '/DPS/infDPS/toma', errors)
    const cnpjToma = tomaEl.getElementsByTagName('CNPJ')[0]
    const cpfToma = tomaEl.getElementsByTagName('CPF')[0]
    if (cnpjToma && !/^[0-9]{14}$/.test(cnpjToma.textContent || '')) {
      errors.push({
        path: '/DPS/infDPS/toma/CNPJ',
        message: `CNPJ do tomador deve conter 14 dígitos. Encontrado: "${cnpjToma.textContent}"`,
        code: 'INVALID_CNPJ',
      })
    }
    if (cpfToma && !/^[0-9]{11}$/.test(cpfToma.textContent || '')) {
      errors.push({
        path: '/DPS/infDPS/toma/CPF',
        message: `CPF do tomador deve conter 11 dígitos. Encontrado: "${cpfToma.textContent}"`,
        code: 'INVALID_CPF',
      })
    }
  }

  // Validações de Serv
  const servEl = infDps.getElementsByTagName('serv')[0]
  if (servEl) {
    checkSequenceOrder(servEl, SERV_SEQUENCE, '/DPS/infDPS/serv', errors)
    const cServ = servEl.getElementsByTagName('cServ')[0]
    if (cServ) {
      checkSequenceOrder(cServ, CSERV_SEQUENCE, '/DPS/infDPS/serv/cServ', errors)
      const cTribNac = cServ.getElementsByTagName('cTribNac')[0]
      if (!cTribNac || !cTribNac.textContent?.trim()) {
        errors.push({
          path: '/DPS/infDPS/serv/cServ/cTribNac',
          message: 'Código de tributação nacional (cTribNac) é obrigatório',
          code: 'MISSING_TRIB_NAC',
        })
      }
    } else {
      errors.push({
        path: '/DPS/infDPS/serv/cServ',
        message: 'Grupo <cServ> é obrigatório em <serv>',
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    }
  }

  // Validações de Valores
  const valoresEl = infDps.getElementsByTagName('valores')[0]
  if (valoresEl) {
    checkSequenceOrder(valoresEl, VALORES_SEQUENCE, '/DPS/infDPS/valores', errors)
    const vServ = valoresEl.getElementsByTagName('vServ')[0]
    if (!vServ) {
      errors.push({
        path: '/DPS/infDPS/valores/vServPrest/vServ',
        message: 'vServ é obrigatório em valores',
        code: 'MISSING_MANDATORY_ELEMENT',
      })
    }
  }

  // Se houver Signature, valida posição conforme TCDPS
  const sigList = root.getElementsByTagName('Signature')
  if (sigList.length > 0) {
    const sig = sigList[0]
    // Deve ser filha direta de DPS
    if (sig.parentNode !== root) {
      errors.push({
        path: '/DPS/Signature',
        message:
          'Elemento <Signature> deve ser filho direto de <DPS> e não aninhado dentro de <infDPS>',
        code: 'SIGNATURE_WRONG_PARENT',
      })
    }
    // Deve vir após infDPS
    const rootChildren = getChildElements(root)
    const infIndex = rootChildren.indexOf(infDps)
    const sigIndex = rootChildren.indexOf(sig)
    if (sigIndex < infIndex) {
      errors.push({
        path: '/DPS/Signature',
        message: '<Signature> deve vir após </infDPS>',
        code: 'SIGNATURE_BEFORE_INFDPS',
      })
    }
  }

  const valid = errors.length === 0
  return {
    valid,
    errors,
    valido: valid,
    erros: errors,
  }
}

/**
 * Alias com nomenclatura em português compatível com testes e integrações.
 */
export const validateDpsXmlAgainstXsd = validarDpsXmlContraXsd
