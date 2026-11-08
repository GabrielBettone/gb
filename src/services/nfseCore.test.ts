import { describe, it, expect } from 'vitest'
import forge from 'node-forge'
import {
  converterChavePrivadaParaPkcs8Pem,
  extrairPemDoPfxBuffer,
  formatarErrosSefin,
  montarDpsXmlPadraoNacional,
  assinarXmlString,
  descompactarGzipB64Async,
  comprimirGzipB64Async,
  gerarIdDpsOficial,
} from './nfseCore'

// Helper para gerar um par de chaves e certificado PKCS#12 SINTÉTICO (A1 de teste em memória)
function gerarCertificadoA1Sintetico(senha: string) {
  // Gera par de chaves RSA de 1024 bits para teste rápido
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)

  const attrs = [
    { name: 'commonName', value: 'EMPRESA TESTE SINTETICA LTDA:12345678000195' },
    { name: 'countryName', value: 'BR' },
    { shortName: 'ST', value: 'SP' },
    { name: 'localityName', value: 'Sao Paulo' },
    { name: 'organizationName', value: 'Empresa Teste' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], senha, {
    algorithm: '3des',
    generateLocalKeyId: true,
    friendlyName: 'Certificado A1 Teste',
  })

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
  return { p12Der, keys, cert }
}

function parseDomBrowser(xml: string) {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

describe('Módulo NFS-e Nacional - Testes Técnicos Isolados', () => {
  it('1. Conversão PKCS#12 -> PKCS#8 PEM produz -----BEGIN PRIVATE KEY----- compatível com Deno/OpenSSL', () => {
    const keys = forge.pki.rsa.generateKeyPair(1024)
    const pkcs8Pem = converterChavePrivadaParaPkcs8Pem(keys.privateKey)

    expect(pkcs8Pem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(pkcs8Pem).toContain('-----END PRIVATE KEY-----')
    expect(pkcs8Pem).not.toContain('-----BEGIN RSA PRIVATE KEY-----')

    // Prova que a chave pode ser re-parseada pelo forge a partir do PEM
    const reparsed = forge.pki.privateKeyFromPem(pkcs8Pem)
    expect(reparsed).toBeDefined()
    expect(reparsed.n).toEqual(keys.privateKey.n)
  })

  it('2. Leitura e parsing de arquivo A1 (.pfx) sintético com extração de certPem, keyPem, CNPJ e validade', () => {
    const senhaTeste = 'senha-secreta-123'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)

    const extraido = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    expect(extraido.certPem).toContain('-----BEGIN CERTIFICATE-----')
    expect(extraido.keyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(extraido.cnpj).toBe('12345678000195')
    expect(extraido.titular).toBe('EMPRESA TESTE SINTETICA LTDA:12345678000195')
    expect(extraido.validoAte).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Senha errada deve lançar erro
    expect(() => extrairPemDoPfxBuffer(p12Der, 'senha-errada')).toThrow()
  })

  it('3. Geração do XML da DPS segue o XSD oficial (TCDPS/TCInfDPS, Id com 42 posições, toma sem CNPJ_CPF)', () => {
    const dps = montarDpsXmlPadraoNacional({
      ambiente: 'homologacao',
      dataEmissao: '2026-11-08T10:00:00-03:00',
      cnpjPrestador: '12.345.678/0001-95',
      inscricaoMunicipal: '12345',
      razaoSocial: 'GB SOLUCOES LTDA',
      enderecoPrestador: {
        logradouro: 'Rua das Flores',
        numero: '100',
        bairro: 'Centro',
        municipio: 'São Pedro',
        uf: 'SP',
        cep: '13520-000',
        codigoMunicipio: '3550407',
        telefone: '19999999999',
        email: 'contato@gbsolucoes.com.br',
      },
      nomeTomador: 'Cliente Teste Tomador',
      documentoTomador: '98.765.432/0001-10',
      emailTomador: 'tomador@cliente.com.br',
      servico: {
        lc116: '14.13',
        descricao: 'Serviços de marcenaria e serralheria',
      },
      valorServicos: 1500.0,
      aliquotaIss: 2.0,
      issRetido: false,
      competencia: '2026-11-08',
      numeroRps: 42,
      serieRps: '1',
      observacoes: 'Orçamento de teste',
    })

    expect(dps.idDps).toBe('DPS355040721234567800019510000000000000000042')
    expect(dps.idDps.length).toBe(45) // DPS (3) + 7 + 1 + 14 + 5 + 15 = 45 posições oficiais
    expect(dps.xml).toContain('<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">')
    expect(dps.xml).toContain(`<infDPS Id="${dps.idDps}">`)
    expect(dps.xml).toContain('<tpAmb>2</tpAmb>')

    // Valida que o tomador usa <toma><CNPJ>...</CNPJ> DIRETO, NUNCA a tag fantasma <CNPJ_CPF>
    expect(dps.xml).not.toContain('<CNPJ_CPF>')
    expect(dps.xml).not.toContain('</CNPJ_CPF>')
    expect(dps.xml).toContain('<toma><CNPJ>98765432000110</CNPJ>')

    // Parse XML estrutural
    const doc = parseDomBrowser(dps.xml)
    expect(doc.getElementsByTagName('DPS').length).toBe(1)
    expect(doc.getElementsByTagName('infDPS').length).toBe(1)
    expect(doc.getElementsByTagName('prest').length).toBe(1)
    expect(doc.getElementsByTagName('toma').length).toBe(1)
    expect(doc.getElementsByTagName('serv').length).toBe(1)
    expect(doc.getElementsByTagName('valores').length).toBe(1)
  })

  it('4. Assinatura XMLDSig (enveloped, C14N, RSA-SHA256) é injetada após </infDPS> e antes de </DPS>', () => {
    const senhaTeste = 'teste-assinar'
    const { p12Der } = gerarCertificadoA1Sintetico(senhaTeste)
    const { certPem, keyPem } = extrairPemDoPfxBuffer(p12Der, senhaTeste)

    const dps = montarDpsXmlPadraoNacional({
      ambiente: 'homologacao',
      dataEmissao: '2026-11-08T10:00:00-03:00',
      cnpjPrestador: '12345678000195',
      razaoSocial: 'GB SOLUCOES LTDA',
      enderecoPrestador: {
        logradouro: 'Rua A',
        numero: '1',
        bairro: 'Bairro B',
        municipio: 'São Pedro',
        uf: 'SP',
        cep: '13520000',
        codigoMunicipio: '3550407',
      },
      nomeTomador: 'Cliente CPF',
      documentoTomador: '123.456.789-00',
      servico: {
        lc116: '07.02',
        descricao: 'Instalação de gesso drywall',
      },
      valorServicos: 850.5,
      aliquotaIss: 2.0,
      issRetido: false,
      competencia: '2026-11-08',
      numeroRps: 1,
      serieRps: '1',
    })

    const assinado = assinarXmlString(dps.xml, 'infDPS', certPem, keyPem, parseDomBrowser)

    expect(assinado).toContain('</infDPS><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">')
    expect(assinado).toContain('</Signature></DPS>')
    expect(assinado).not.toContain('</Signature></infDPS>') // Assinatura NÃO fica dentro de infDPS

    const docAssinado = parseDomBrowser(assinado)
    const sig = docAssinado.getElementsByTagName('Signature')[0]
    expect(sig).toBeDefined()
    expect(sig.getElementsByTagName('SignedInfo').length).toBe(1)
    expect(sig.getElementsByTagName('SignatureValue').length).toBe(1)
    expect(sig.getElementsByTagName('X509Certificate').length).toBe(1)
    expect(sig.getElementsByTagName('DigestValue')[0].textContent?.length).toBeGreaterThan(10)
  })

  it('5. Gzip + Base64: compressão e descompressão round-trip idênticas para dpsXmlGZipB64 e nfseXmlGZipB64', async () => {
    const xmlOriginal = '<NFSe versao="1.00"><infNFSe><xNome>GB Solucoes</xNome></infNFSe></NFSe>'
    const b64Zip = await comprimirGzipB64Async(xmlOriginal)
    expect(b64Zip).toBeDefined()
    expect(b64Zip.length).toBeGreaterThan(0)

    const descompactado = await descompactarGzipB64Async(b64Zip)
    expect(descompactado).toBe(xmlOriginal)
  })

  it('6. Tratamento de erros SEFIN: captura array erros (POST /nfse) e objeto erro (ResponseErro em consultas)', () => {
    // Caso A: Rejeição no POST /nfse com array erros
    const respErroPost = {
      tipoAmbiente: 2,
      versaoAplicativo: '1.0.0',
      dataHoraProcessamento: '2026-11-08T12:00:00Z',
      idDPS: 'DPS355040721234567800019510000000000000000042',
      erros: [
        {
          codigo: 'E001',
          descricao: 'Alíquota de ISS divergente do cadastro municipal',
          complemento: 'Código 14.13',
        },
        { codigo: 'E042', descricao: 'Inscrição Municipal inválida para o prestador' },
      ],
    }

    const fmtA = formatarErrosSefin(respErroPost)
    expect(fmtA.codigo).toBe('E001, E042')
    expect(fmtA.mensagem).toContain(
      '[E001] Alíquota de ISS divergente do cadastro municipal (Código 14.13)',
    )
    expect(fmtA.mensagem).toContain('[E042] Inscrição Municipal inválida para o prestador')
    expect(fmtA.detalhes.length).toBe(2)

    // Caso B: Consulta com erro ResponseErro (objeto erro único)
    const respErroGet = {
      tipoAmbiente: 2,
      versaoAplicativo: '1.0.0',
      dataHoraProcessamento: '2026-11-08T12:00:00Z',
      erro: {
        codigo: 'E404',
        descricao: 'NFS-e não encontrada para a chave de acesso informada',
      },
    }

    const fmtB = formatarErrosSefin(respErroGet)
    expect(fmtB.codigo).toBe('E404')
    expect(fmtB.mensagem).toBe('[E404] NFS-e não encontrada para a chave de acesso informada')

    // Caso C: Fallback para gateways ou resposta não padronizada
    const respFallback = {
      status: 400,
      message: 'Certificado mTLS revogado ou inválido',
    }
    const fmtC = formatarErrosSefin(respFallback)
    expect(fmtC.mensagem).toContain('Certificado mTLS revogado ou inválido')
  })
})
