/**
 * Loader oficial e integrador dos arquivos XSD v1.01 da NFS-e Nacional.
 *
 * Carrega e resolve os 4 schemas oficiais vendored:
 * - DPS_v1.01.xsd (raiz: declara <xs:element name="DPS" type="TCDPS">)
 * - tiposComplexos_v1.01.xsd (TCDPS, TCInfDPS, TCEmitenteDPS, TCTomadorDPS, etc.)
 * - tiposSimples_v1.01.xsd (TSIdDPS, TVerNFSe, TAmb, TSDateTimeUTC, TSData, TSCNPJ, etc.)
 * - xmldsig-core-schema.xsd (Signature, SignedInfo, SignatureValue, KeyInfo, etc.)
 *
 * Suporta tanto Vite/Browser (import raw de texto) quanto Node/SSR/Scripts (leitura de arquivos locais).
 */

// Importações raw de texto para empacotamento Vite/Browser (zero I/O de rede/disco no cliente)
import dpsXsdText from '../schemas/nfse/v1.01/DPS_v1.01.xsd?raw'
import tiposComplexosXsdText from '../schemas/nfse/v1.01/tiposComplexos_v1.01.xsd?raw'
import tiposSimplesXsdText from '../schemas/nfse/v1.01/tiposSimples_v1.01.xsd?raw'
import xmldsigXsdText from '../schemas/nfse/v1.01/xmldsig-core-schema.xsd?raw'

export interface XsdSchemaSource {
  filename: string
  targetNamespace: string
  content: string
}

export interface XsdSimpleTypeDefinition {
  name: string
  baseType: string
  pattern?: RegExp
  minLength?: number
  maxLength?: number
  enumerations?: string[]
  whiteSpace?: string
}

export interface XsdElementDefinition {
  name: string
  type?: string
  ref?: string
  minOccurs: number
  maxOccurs: number // Infinity para unbounded
}

export interface XsdComplexTypeDefinition {
  name: string
  sequence: XsdElementDefinition[]
  attributes: { name: string; type: string; use: 'required' | 'optional' }[]
}

export interface XsdModel {
  targetNamespace: string
  rootElementName: string
  rootElementType: string
  simpleTypes: Map<string, XsdSimpleTypeDefinition>
  complexTypes: Map<string, XsdComplexTypeDefinition>
  rawSchemas: XsdSchemaSource[]
}

let cachedModel: XsdModel | null = null

/**
 * Lê o conteúdo de um arquivo XSD nos schemas vendored de forma compatível com Node ou Vite.
 */
export function getOfficialXsdTexts(): {
  dps: string
  tiposComplexos: string
  tiposSimples: string
  xmldsig: string
} {
  return {
    dps: dpsXsdText,
    tiposComplexos: tiposComplexosXsdText,
    tiposSimples: tiposSimplesXsdText,
    xmldsig: xmldsigXsdText,
  }
}

/**
 * Helper simples para extração de atributos XML por regex sem depender de DOM externo.
 */
function getAttr(tag: string, attrName: string): string | undefined {
  const match = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'))
  return match ? match[1] : undefined
}

/**
 * Constrói o modelo unificado de tipos XSD a partir do parsing dos 4 arquivos XSD oficiais.
 */
export function buildOfficialXsdModel(): XsdModel {
  if (cachedModel) {
    return cachedModel
  }

  const { dps, tiposComplexos, tiposSimples, xmldsig } = getOfficialXsdTexts()

  const rawSchemas: XsdSchemaSource[] = [
    {
      filename: 'DPS_v1.01.xsd',
      targetNamespace: 'http://www.sped.fazenda.gov.br/nfse',
      content: dps,
    },
    {
      filename: 'tiposComplexos_v1.01.xsd',
      targetNamespace: 'http://www.sped.fazenda.gov.br/nfse',
      content: tiposComplexos,
    },
    {
      filename: 'tiposSimples_v1.01.xsd',
      targetNamespace: 'http://www.sped.fazenda.gov.br/nfse',
      content: tiposSimples,
    },
    {
      filename: 'xmldsig-core-schema.xsd',
      targetNamespace: 'http://www.w3.org/2000/09/xmldsig#',
      content: xmldsig,
    },
  ]

  const simpleTypes = new Map<string, XsdSimpleTypeDefinition>()
  const complexTypes = new Map<string, XsdComplexTypeDefinition>()

  // Extrai <xs:simpleType name="..."> dos schemas oficiais
  const allXsd = [tiposSimples, tiposComplexos, dps, xmldsig].join('\n')
  const simpleTypeRegex = /<xs:simpleType\s+name=["']([^"']+)["'][\s\S]*?<\/xs:simpleType>/g
  let stMatch: RegExpExecArray | null

  while ((stMatch = simpleTypeRegex.exec(allXsd)) !== null) {
    const block = stMatch[0]
    const name = stMatch[1]
    const baseMatch = block.match(/<xs:restriction\s+base=["']([^"']+)["']/)
    const baseType = baseMatch ? baseMatch[1] : 'xs:string'

    const patternMatch = block.match(/<xs:pattern\s+value=["']([^"']+)["']/)
    const minLenMatch = block.match(/<xs:minLength\s+value=["']([^"']+)["']/)
    const maxLenMatch = block.match(/<xs:maxLength\s+value=["']([^"']+)["']/)

    const enums: string[] = []
    const enumRegex = /<xs:enumeration\s+value=["']([^"']+)["']/g
    let eMatch: RegExpExecArray | null
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

  // Extrai <xs:complexType name="..."> dos schemas oficiais
  const complexTypeRegex = /<xs:complexType\s+name=["']([^"']+)["'][\s\S]*?<\/xs:complexType>/g
  let ctMatch: RegExpExecArray | null

  while ((ctMatch = complexTypeRegex.exec(allXsd)) !== null) {
    const block = ctMatch[0]
    const name = ctMatch[1]

    const sequence: XsdElementDefinition[] = []
    const elRegex = /<xs:element\s+([^>]+?)(?:\/>|>[\s\S]*?<\/xs:element>)/g
    let elMatch: RegExpExecArray | null
    while ((elMatch = elRegex.exec(block)) !== null) {
      const attrs = elMatch[1]
      const elName = getAttr(attrs, 'name') || ''
      const elRef = getAttr(attrs, 'ref')
      const elType = getAttr(attrs, 'type')
      const minO = getAttr(attrs, 'minOccurs')
      const maxO = getAttr(attrs, 'maxOccurs')

      if (elName || elRef) {
        sequence.push({
          name: elName || elRef?.replace(/^.*:/, '') || '',
          ref: elRef,
          type: elType,
          minOccurs: minO !== undefined ? parseInt(minO, 10) : 1,
          maxOccurs: maxO === 'unbounded' ? Infinity : maxO !== undefined ? parseInt(maxO, 10) : 1,
        })
      }
    }

    const attributes: { name: string; type: string; use: 'required' | 'optional' }[] = []
    const attrRegex = /<xs:attribute\s+([^>]+?)\/?>/g
    let aMatch: RegExpExecArray | null
    while ((aMatch = attrRegex.exec(block)) !== null) {
      const aAttrs = aMatch[1]
      const aName = getAttr(aAttrs, 'name')
      const aType = getAttr(aAttrs, 'type') || 'xs:string'
      const aUse = getAttr(aAttrs, 'use') === 'required' ? 'required' : 'optional'
      if (aName) {
        attributes.push({ name: aName, type: aType, use: aUse })
      }
    }

    complexTypes.set(name, {
      name,
      sequence,
      attributes,
    })
  }

  // Raiz declarada em DPS_v1.01.xsd
  const rootElementMatch = dps.match(/<xs:element\s+name=["']([^"']+)["']\s+type=["']([^"']+)["']/)
  const rootElementName = rootElementMatch ? rootElementMatch[1] : 'DPS'
  const rootElementType = rootElementMatch ? rootElementMatch[2] : 'TCDPS'

  cachedModel = {
    targetNamespace: 'http://www.sped.fazenda.gov.br/nfse',
    rootElementName,
    rootElementType,
    simpleTypes,
    complexTypes,
    rawSchemas,
  }

  return cachedModel
}
