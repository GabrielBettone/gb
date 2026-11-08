/**
 * Exclusive XML Canonicalization (W3C: http://www.w3.org/2001/10/xml-exc-c14n#)
 * Implementação própria, sem dependências, compatível com XMLDSig / NFS-e Nacional.
 *
 * Diferença essencial para a DPS: o subdocumento assinado (infDPS) usa o
 * namespace PADRÃO herdado do elemento raiz <DPS xmlns="http://www.sped.fazenda.gov.br/nfse">.
 * No exc-C14N, a declaração herdada e visivelmente utilizada é EMITIDA no
 * elemento raiz do subdocumento (xmlns="..."), e NÃO é repetida nos
 * descendentes (declaração idêntica já no escopo canônico é redundante).
 * O C14N 1.0 antigo (cópia cega de todo o escopo) produzia serialização
 * diferente da esperada pelo verificador da SEFIN — por isso exc-C14N real.
 *
 * Regras implementadas (exc-C14N, sem InclusiveNamespaces PrefixList):
 * 1. Só são emitidos os namespaces VISIVELMENTE UTILIZADOS no subdocumento:
 *    prefixo do nome do elemento, prefixos de atributos e o namespace padrão
 *    (para elementos sem prefixo).
 * 2. Declaração idêntica já emitida por ancestral canônico NÃO é repetida;
 *    redeclaração com URI diferente é emitida no ponto de uso.
 * 3. Namespaces precedem atributos comuns; namespaces ordenados por prefixo
 *    (byte order), atributos ordenados por nome qualificado.
 * 4. Texto: & < > escapados e CR -> &#xD;. Atributos: também &quot; &#x9; &#xA;.
 * 5. Comentários e instruções de processamento são omitidos.
 */

export const EXC_C14N_ALGORITHM = 'http://www.w3.org/2001/10/xml-exc-c14n#'

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#xD;')
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;')
}

/** Divide "prefix:local" em ['prefix','local']; sem prefixo retorna ['','local']. */
function splitQName(qname: string): [string, string] {
  const i = qname.indexOf(':')
  if (i === -1) return ['', qname]
  return [qname.slice(0, i), qname.slice(i + 1)]
}

/** Declarações de namespace do PRÓPRIO elemento (xmlns e xmlns:*). */
function ownNsDeclarations(el: Element): Map<string, string> {
  const own = new Map<string, string>()
  for (const attr of Array.from(el.attributes || [])) {
    if (attr.name === 'xmlns') own.set('', attr.value)
    else if (attr.name.startsWith('xmlns:')) own.set(attr.name.slice(6), attr.value)
  }
  return own
}

/** Escopo de namespaces herdado dos ANCESTRAIS (da raiz para o pai do nó). */
function inheritedScope(node: Node): Map<string, string> {
  const chain: Element[] = []
  let cur: Node | null = node.parentNode
  while (cur) {
    if (cur.nodeType === 1) chain.push(cur as Element)
    cur = cur.parentNode
  }
  const scope = new Map<string, string>()
  for (let i = chain.length - 1; i >= 0; i--) {
    for (const [p, uri] of ownNsDeclarations(chain[i])) scope.set(p, uri)
  }
  return scope
}

/** Prefixos de namespace utilizados por UM elemento: seu nome e seus atributos. */
function prefixesUsedHere(el: Element): Set<string> {
  const used = new Set<string>()
  const [prefix] = splitQName(el.nodeName)
  if (prefix !== 'xml') used.add(prefix) // '' = namespace padrão
  for (const attr of Array.from(el.attributes || [])) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue
    const [attrPrefix] = splitQName(attr.name)
    if (attrPrefix && attrPrefix !== 'xml') used.add(attrPrefix)
  }
  return used
}

/** Escopo de namespaces efetivo para o elemento (herdados + próprios). */
function effectiveScope(el: Element, inherited: Map<string, string>): Map<string, string> {
  const scope = new Map<string, string>(inherited)
  for (const [p, uri] of ownNsDeclarations(el)) scope.set(p, uri)
  return scope
}

/**
 * Canonicaliza um elemento conforme exc-C14N.
 * @param scope     escopo de namespaces efetivo (herdados + declarações próprias)
 * @param emitted   prefixos -> URIs já emitidos por ancestrais canônicos
 */
function canonicalizeElement(
  el: Element,
  scope: Map<string, string>,
  emitted: Map<string, string>,
): string {
  const own = ownNsDeclarations(el)

  // 1) Declarações a emitir NESTE elemento: apenas os namespaces utilizados
  //    aqui (nome do elemento + atributos) que ainda não estão no escopo
  //    canônico com a mesma URI.
  const toEmit: Array<[string, string]> = []
  const emittedHere = new Map<string, string>(emitted)
  for (const p of prefixesUsedHere(el)) {
    const uri = own.has(p) ? own.get(p)! : scope.get(p)
    if (uri === undefined) continue
    if (emittedHere.get(p) !== uri) {
      toEmit.push([p, uri])
      emittedHere.set(p, uri)
    }
  }

  // 2) Tag de abertura com o nome qualificado original
  let out = '<' + el.nodeName

  // Namespaces ordenados por prefixo (byte order), ANTES dos atributos comuns
  toEmit.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  for (const [p, uri] of toEmit) {
    out += p === '' ? ` xmlns="${escapeAttr(uri)}"` : ` xmlns:${p}="${escapeAttr(uri)}"`
  }

  // 3) Atributos comuns ordenados lexicograficamente por nome qualificado
  const attrs = Array.from(el.attributes || [])
    .filter((a) => a.name !== 'xmlns' && !a.name.startsWith('xmlns:'))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const attr of attrs) {
    out += ` ${attr.name}="${escapeAttr(attr.value)}"`
  }
  out += '>'

  // 4) Filhos (com o escopo atualizado pelas declarações emitidas/redeclaradas)
  const childScope = new Map<string, string>(scope)
  for (const [p, uri] of toEmit) childScope.set(p, uri)
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 1) {
      out += canonicalizeElement(child as Element, childScope, emittedHere)
    } else if (child.nodeType === 3 || child.nodeType === 4) {
      // Text e CDATA são serializados como texto escapado (C14N)
      out += escapeText(child.nodeValue || '')
    }
    // comentários e PIs são omitidos
  }

  out += `</${el.nodeName}>`
  return out
}

/**
 * Canonicaliza um subdocumento (elemento raiz e descendentes) conforme
 * Exclusive C14N, incluindo as declarações de namespace herdadas dos
 * ancestrais quando visivelmente utilizadas dentro do subdocumento.
 */
export function c14nExclusive(node: Node): string {
  if (node.nodeType !== 1) return ''
  const el = node as Element
  const inherited = inheritedScope(node)
  const scope = effectiveScope(el, inherited)
  return canonicalizeElement(el, scope, new Map<string, string>())
}
