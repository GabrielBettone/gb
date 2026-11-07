/// <reference path="../../pb_data/types.d.ts" />
/**
 * Módulo NFS-e — integração DIRETA com o NFS-e Nacional (Receita Federal).
 *
 * Camada ÚNICA de envio. Tudo aqui roda 100% no servidor:
 *  - monta a DPS (XML do padrão NFS-e Nacional, layout ABRASF 2.04-style tags),
 *  - assina em XMLDSig com a chave privada do certificado A1,
 *  - envia via HTTPS com mTLS (certificado cliente e-CNPJ A1) aos endpoints
 *    /nfse (produção) e /nfse-h (homologação) de api-nfse.sefin.receita.federal.gov.br,
 *  - interpreta o retorno (protocolo, número da nota, status, XML autorizado).
 *
 * SUPORTE DE PLATAFORMA (honesto): o Goja VM do PocketBase não expõe
 * client-certificate (mTLS) nem RSA PrivateKey para XMLDSig real. A chamada
 * HTTPS de verdade acontece via $http.send sem client cert quando possível
 * (ver suporteMtls()), e o resultado é um erro de ambiente CLARO — nunca uma
 * emissão fingida. Quando mTLS não é suportado, o módulo grava o RPS + DPS
 * XML (não assinado) e marca a nota como erro_envio com a mensagem exata.
 */

const NFSE_API_BASE = 'https://api-nfse.sefin.receita.federal.gov.br'
const NFSE_PATH_HOMOLOGACAO = '/nfse-h'
const NFSE_PATH_PROD = '/nfse'

// ---------- Helpers de cifra da senha do certificado ----------
function nfseChaveCifra() {
  const segredo = $os.getenv('NFSE_SENHA_SECRETA') || $os.getenv('PB_SECRET_KEY') || ''
  if (!segredo) {
    throw new BadRequestError(
      'Defina a variável de ambiente NFSE_SENHA_SECRETA no painel para armazenar a senha do certificado.',
    )
  }
  return segredo
}

function nfseChaveBytes() {
  const key = CryptoSHA256(nfseChaveCifra())
  const bytes = []
  for (let i = 0; i < key.length; i += 2) {
    bytes.push(parseInt(key.substring(i, i + 2), 16))
  }
  return bytes
}

// Cifra reversível XOR + base64, executada SOMENTE no servidor.
// A senha nunca trafega nem fica em texto plano; a chave vem do env do painel.
function nfseCifrar(senha) {
  if (!senha) return ''
  const bytes = nfseChaveBytes()
  let out = ''
  for (let i = 0; i < senha.length; i++) {
    out += String.fromCharCode(senha.charCodeAt(i) ^ bytes[i % bytes.length])
  }
  return 'v1:' + base64Encode(out)
}

function nfseDecifrar(armazenado) {
  if (!armazenado || armazenado.indexOf('v1:') !== 0) return ''
  const dados = base64Decode(armazenado.substring(3))
  const bytes = nfseChaveBytes()
  let out = ''

// ---------- Suporte de plataforma ----------
function nfseSuporteMtls() {
  // $http.send do PocketBase (Goja) não permite client certificate configurável
  // (sem options de pfx/key/cert). Sem mTLS real, a API do NFS-e Nacional rejeita.
  return false
}
=======

// ---------- Suporte de plataforma ----------
function nfseSuporteMtls() {
  // $http.send do PocketBase (Goja) não permite client certificate configurável
  // (sem options de pfx/key/cert). Sem mTLS real, a API do NFS-e Nacional rejeita.
  return false
}

// ---------- Montagem da DPS ----------
function nfseSomenteDigitos(v) {
  return String(v || '').replace(/\D+/g, '')
}

function nfseFormatarData(iso) {
  const s = String(iso || '').slice(0, 10)
  return s
}

function nfseXmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function nfseConstruirDps(dados) {
  const e = dados.emitente
  const t = dados.tomador
  const serv = dados.servico
  const esc = nfseXmlEscape
  const tag = (nome, valor) => (valor ? `<${nome}>${esc(valor)}</${nome}>` : '')

  const docTomador = nfseSomenteDigitos(t.documento)
  const isCnpj = docTomador.length === 14
  const isCpf = docTomador.length === 11

  let xml = '<?xml version="1.0" encoding="UTF-8"?>'
  xml += '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">'
  xml += `<infDPS Id="DPS${dados.numero_rps}${e.cnpjSomenteDigitos}">`
  xml += tag('tpAmb', dados.ambiente === 'producao' ? '1' : '2')
  xml += tag('dhEmi', dados.data_emissao_dps)
  xml += tag('verAplic', 'GBT1')
  xml += tag('serie', dados.serie_rps || '00001')
  xml += tag('nDPS', String(dados.numero_rps))
  xml += tag('dCompet', nfseFormatarData(dados.data_competencia))
  xml += tag('tpEmit', '1') // 1 = prestador pessoa jurídica
  xml += '<prest>'
  xml += tag('CNPJ', nfseSomenteDigitos(e.cnpj))
  xml += tag('IM', e.inscricao_municipal)
  xml += '<xLocEmi>' + esc(e.municipio) + '</xLocEmi>'
  xml += '<UFEmi>' + esc(e.uf) + '</UFEmi>'
  xml += '</prest>'
  if (docTomador) {
    xml += '<tomador>'
    if (isCnpj) xml += tag('CNPJ', docTomador)
    else if (isCpf) xml += tag('CPF', docTomador)
    xml += tag('xNome', t.nome)
    xml += tag('end', t.endereco)
    xml += tag('xLoc', t.municipio)
    xml += tag('CEP', nfseSomenteDigitos(t.cep))
    xml += tag('email', t.email)
    xml += '</tomador>'
  }
  xml += '<serv>'
  xml += '<locPrest>'
  xml += tag('cLocPrestacao', dados.codigo_ibge_municipio_incidencia)
  xml += '</locPrest>'
  xml += '<cServ>'
  xml += tag('cTribNac', serv.codigo_lc116)
  xml += tag('xDescServ', serv.descricao)
  xml += '</cServ>'
  xml += '</serv>'
  xml += '<values>'
  xml += tag('vServPrest', serv.valor)
  xml += tag('tribISSQN', '1') // 1 = operação tributável no município
  xml += tag('tpRetISSQN', dados.iss_retido ? '1' : '2')
  xml += '</values>'
  xml += '</infDPS>'
  xml += '</DPS>'
  return xml
}

// ---------- Assinatura XMLDSig (quando a plataforma suportar) ----------
function nfseAssinarDps(_xmlDps, _certBase64, _senhaCifrada) {
  // Requer RSA-SHA256 com a PrivateKey do A1 — indisponível na VM Goja hoje.
  // A camada de serviço retorna erro claro; o XML volta não assinado.
  throw new BadRequestError(
    'Assinatura XMLDSig com certificado A1 não é suportada pelo runtime do backend desta plataforma (Goja/PocketBase). ' +
      'A nota fica registrada como RPS com a DPS montada; para o envio real ao NFS-e Nacional, ' +
      'esta chamada precisa rodar onde haja suporte a mTLS + assinatura RSA (ex.: serviço Node/Go dedicado).',
  )
}

// ---------- Envio / consulta ----------
function nfseUrl(ambiente, caminho) {
  const base = NFSE_API_BASE
  const prefixo = ambiente === 'producao' ? NFSE_PATH_PROD : NFSE_PATH_HOMOLOGACAO
  return base + prefixo + caminho
}

function nfseEnviarParaNacional(ambiente, xmlDpsAssinado, _cert) {
  if (!nfseSuporteMtls()) {
    throw new BadRequestError(
      'Envio real bloqueado: o backend desta plataforma não suporta mTLS com certificado cliente ' +
        '(exigência do NFS-e Nacional). Nenhum envio simulado foi feito.',
    )
  }
  // Caminho de execução real (mantido documentado; alcançável se o runtime passar a expor mTLS):
  const res = $http.send({
    url: nfseUrl(ambiente, '/nfse'),
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
    },
    body: xmlDpsAssinado,
    // Quando o runtime suportar: tls: { pfx: cert.der, passphrase: senha }
  })
  return res
}

function nfseInterpretarResposta(_ambiente, body) {
  const texto = typeof body === 'string' ? body : JSON.stringify(body)
  const pegar = (t) => {
    const m = texto.match(new RegExp('<' + t + '>([^<]*)</' + t + '>'))
    return m ? m[1] : ''
  }
  return {
    protocolo: pegar('nProt') || pegar('protocolo') || pegar('numeroProtocolo'),
    numero_nfse: pegar('nNFSe') || pegar('numero') || pegar('numeroNFSe'),
    data_emissao: pegar('dhProc') || pegar('dataEmissao'),
    status: pegar('situacao') || pegar('status'),
    descricao_erro: pegar('mensagem') || pegar('xMotivo'),
    xml: texto,
  }
}

// ---------- Exportações para os routes ----------
module.exports = {
  NFSE_API_BASE,
  suporteMtls: nfseSuporteMtls,
  construirDps: nfseConstruirDps,
  assinarDps: nfseAssinarDps,
  enviar: nfseEnviarParaNacional,
  interpretarResposta: nfseInterpretarResposta,
  url: nfseUrl,
}
