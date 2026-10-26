import type { Orcamento, OrcamentoConfiguracao } from '@/types'
import { parseItens, parseItensPorLocal } from '@/services/orcamentos'
import { parseCompromisso } from '@/services/orcamentoModulo'
import { obterConfiguracoes as obterConfiguracoesSite } from '@/services/site'
import { formatarCondicoesPrazo } from '@/services/orcamentoCondicoes'
import logoSvgDefault from '@/assets/logo-6927a.svg'
import logoPngFallback from '@/assets/logo-gesso-bettone-eb5aa.png'

/**
 * Resolve uma URL para endereço absoluto no navegador.
 */
function toAbsoluteUrl(url: string): string {
  if (!url) return ''
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

/**
 * Converte uma URL de imagem (SVG, PNG, JPG, WebP) em base64 Data URL,
 * aguardando o carregamento antes de retornar para garantir exibição imediata e confiável no popup/impressão.
 */
async function carregarImagemDataUrl(url: string): Promise<string> {
  const absUrl = toAbsoluteUrl(url)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 300
        canvas.height = img.naturalHeight || img.height || 100
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(absUrl)
          return
        }
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } catch {
        // Se houver restrição de tainted canvas (CORS), resolve com a URL absoluta já carregada com sucesso
        resolve(absUrl)
      }
    }
    img.onerror = (e) => reject(e)
    img.src = absUrl
  })
}

/**
 * Resolve o logotipo oficial para o cabeçalho do orçamento:
 * 1. Usa config.logo_url (se configurado);
 * 2. Se falhar ou não houver, usa SVG oficial importado pelo Vite;
 * 3. Fallback final garantido com PNG oficial logo-gesso-bettone-eb5aa.png.
 */
async function resolverLogoDataUrl(config?: OrcamentoConfiguracao | null): Promise<string> {
  const fallbackPngAbs = toAbsoluteUrl(logoPngFallback)
  const defaultSvgAbs = toAbsoluteUrl(logoSvgDefault)

  // 1. Tentar logo customizado da configuração se houver
  if (config?.logo_url && config.logo_url.trim()) {
    try {
      const dataUrl = await carregarImagemDataUrl(config.logo_url.trim())
      if (dataUrl) return dataUrl
    } catch (err) {
      console.warn('Falha ao carregar logo configurado, aplicando fallback:', err)
    }
  }

  // 2. Tentar SVG oficial
  try {
    const dataUrl = await carregarImagemDataUrl(defaultSvgAbs)
    if (dataUrl) return dataUrl
  } catch {
    // se o canvas/navegador não renderizar SVG via canvas, tenta o PNG oficial
  }

  // 3. Fallback oficial PNG garantido
  try {
    const dataUrl = await carregarImagemDataUrl(fallbackPngAbs)
    if (dataUrl) return dataUrl
  } catch {
    /* fallback para URL absoluta direta */
  }

  return fallbackPngAbs
}

export async function imprimirOrcamentoPDF(
  orcamento: Orcamento,
  config?: OrcamentoConfiguracao | null,
): Promise<void> {
  // Carrega e valida o logotipo ANTES de renderizar o HTML da janela
  const logoDataUrl = await resolverLogoDataUrl(config)
  const pngFallbackAbs = toAbsoluteUrl(logoPngFallback)

  const janela = window.open('', '_blank', 'width=900,height=1000')
  if (!janela) {
    alert('Por favor, permita pop-ups para gerar e imprimir o PDF do orçamento.')
    return
  }

  const itens = parseItens(orcamento.itens)
  const itensPorLocal = parseItensPorLocal(orcamento.itens_por_local)
  const compromisso = config?.nosso_compromisso
    ? parseCompromisso(config.nosso_compromisso)
    : [
        'Utilização de matérias-primas e gesso de alta pureza certificados pelas normas ABNT',
        'Mão de obra altamente qualificada com experiência de mais de 15 anos no mercado',
        'Cumprimento rigoroso do cronograma de início e entrega acordado',
        'Garantia estrutural de 5 anos sobre os serviços executados',
        'Limpeza completa da obra ao término de cada etapa de instalação',
      ]

  const formatData = (d?: string) => {
    if (!d) return 'A definir'
    const dateObj = new Date(d)
    return isNaN(dateObj.getTime())
      ? d
      : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatMoeda = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  // Se não foi passado config ou se faltam dados, tenta carregar as configurações do site
  let siteConfig: any = null
  try {
    siteConfig = await obterConfiguracoesSite()
  } catch {
    /* fallback local */
  }

  // Resolução dos dados da empresa
  const nomeFantasiaBase = siteConfig?.nome_site || config?.nome_fantasia || 'Gesso Bettone'
  const razaoSocialCadastrada =
    siteConfig?.razao_social ||
    config?.razao_social ||
    'Gesso Bettone Comércio e Instalações Eireli'
  const cnpjCadastrado = siteConfig?.cnpj || config?.cnpj || '53.242.055/0001-74'
  const emailEmpresa = siteConfig?.email_contato || config?.email || 'contato@gessobettone.com.br'
  const telefoneEmpresa = siteConfig?.whatsapp_principal || config?.telefone || '(19) 99767-1189'
  const enderecoEmpresa = config?.endereco || 'Rua Valentim Amaral, 412 - Centro'
  const cidadeEmpresa = config?.cidade || 'São Pedro/SP'

  // Regra de Exibir CNPJ:
  // Se orcamento.exibir_cnpj estiver explicitamente definido (true/false), tem prioridade.
  // Caso contrário, usa config.exibir_cnpj_padrao ou siteConfig.exibir_cnpj_pdf (default true).
  const exibirCnpj =
    orcamento.exibir_cnpj !== undefined && orcamento.exibir_cnpj !== null
      ? Boolean(orcamento.exibir_cnpj)
      : config?.exibir_cnpj_padrao !== undefined
        ? Boolean(config.exibir_cnpj_padrao)
        : siteConfig?.exibir_cnpj_pdf !== undefined
          ? Boolean(siteConfig.exibir_cnpj_pdf)
          : true

  // Regra verbatim do usuário:
  // "Se exibir cnpj estiver ativo, puxa razão social em todo lugar que esteja Gesso Bettone + numero cnpj + email + whatsapp"
  // "Se estiver inativo, exibe como Gesso Bettone + email + whatsapp" (sem cnpj em lugar nenhum)
  const nomeExibicao = exibirCnpj ? razaoSocialCadastrada || nomeFantasiaBase : nomeFantasiaBase

  const valorTotal = orcamento.valor_total || 0
  const valorAVista = orcamento.valor_a_vista || valorTotal
  const valorAPrazo = orcamento.valor_a_prazo || valorTotal
  const metodoObj = orcamento.expand?.metodo_pagamento
  const percentualDescAVista = metodoObj?.desconto_a_vista || 0

  // Condições calculadas com valores reais, sem menção a desconto ou nomes internos do método
  const condicoesMetodo = formatarCondicoesPrazo(metodoObj, valorAPrazo)

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento ${orcamento.numero} — ${nomeExibicao}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Petit+Formal+Script&family=Tenor+Sans&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #2C3E50;
      background: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 2px solid #2C3E50;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 52px;
      height: 52px;
      background-color: #2C3E50;
      color: #D4AF37;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Tenor Sans', serif;
      font-weight: bold;
      font-size: 22px;
      letter-spacing: -0.5px;
      border: 1px solid #D4AF37;
      box-shadow: 0 2px 4px rgba(44, 62, 80, 0.15);
    }
    .brand-title {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 20pt;
      font-weight: 700;
      color: #2C3E50;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      font-size: 8.5pt;
      color: #616F7D;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-number {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 15pt;
      font-weight: 700;
      color: #2C3E50;
    }
    .doc-date {
      font-size: 8.5pt;
      color: #616F7D;
      margin-top: 2px;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 14px;
      margin-bottom: 14px;
    }
    .card-info {
      background: #f8fafc;
      border: 1px solid #DEE4EA;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .card-title {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #2C3E50;
      border-bottom: 1px solid #DEE4EA;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .card-item {
      font-size: 9pt;
      color: #4A5568;
      margin-bottom: 3px;
    }
    .card-item strong {
      color: #2C3E50;
    }

    /* Tabela de Itens */
    .table-container {
      margin-top: 14px;
    }
    .section-title {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 11pt;
      font-weight: 700;
      color: #2C3E50;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 14px;
      background: #D4AF37;
      border-radius: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    th {
      background-color: #2C3E50;
      color: #ffffff;
      font-family: 'Tenor Sans', Georgia, serif;
      font-weight: 600;
      text-align: left;
      padding: 7px 10px;
      font-size: 8.5pt;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #DEE4EA;
      color: #2C3E50;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background-color: #fcfdfe;
    }
    .item-desc {
      font-weight: 600;
      color: #2C3E50;
    }
    .item-detalhe {
      font-size: 8pt;
      color: #616F7D;
      margin-top: 2px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }

    /* Valores e Pagamentos Lado a Lado */
    .pricing-box {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .price-card {
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #DEE4EA;
    }
    .price-card.a-vista {
      background: #F0F5F2;
      border-color: #2C3E50;
    }
    .price-card.a-prazo {
      background: #f8fafc;
      border-color: #DEE4EA;
    }
    .price-card-title {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .price-card.a-vista .price-card-title {
      color: #1C4E3D;
    }
    .price-card.a-prazo .price-card-title {
      color: #2C3E50;
    }
    .price-value {
      font-family: 'Tenor Sans', Georgia, serif;
      font-size: 16pt;
      font-weight: 700;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .price-card.a-vista .price-value {
      color: #1C4E3D;
    }
    .price-card.a-prazo .price-value {
      color: #2C3E50;
    }
    .price-conditions {
      font-size: 8pt;
      color: #616F7D;
      line-height: 1.4;
    }

    /* Nosso Compromisso */
    .compromisso-box {
      margin-top: 14px;
      background: #ffffff;
      border: 1px solid #DEE4EA;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .compromisso-list {
      list-style: none;
      margin-top: 6px;
    }
    .compromisso-list li {
      font-size: 8.5pt;
      color: #4A5568;
      margin-bottom: 4px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .compromisso-list li::before {
      content: '✓';
      color: #D4AF37;
      font-weight: bold;
    }

    /* Assinatura */
    .footer-sign {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 14px;
      border-top: 1px solid #DEE4EA;
    }
    .sign-brand {
      font-family: 'Petit Formal Script', cursive;
      font-size: 18pt;
      color: #2C3E50;
    }
    .sign-line {
      width: 220px;
      border-top: 1px solid #2C3E50;
      text-align: center;
      padding-top: 4px;
      font-size: 8pt;
      color: #616F7D;
    }

    .no-print-bar {
      background: #2C3E50;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .btn-imprimir {
      background: #D4AF37;
      color: #2C3E50;
      font-weight: bold;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 13px; font-weight: 600;">
      Visualização de Impressão / Salvar em PDF — Orçamento ${orcamento.numero}
    </div>
    <button class="btn-imprimir" onclick="window.print()">
      🖨️ Imprimir / Salvar PDF
    </button>
  </div>

  <div style="padding: 16px 20px;">
    <!-- HEADER -->
    <div class="header">
      <div class="logo-container">
        <div class="logo-badge" style="background: transparent; border: none; box-shadow: none; width: auto; height: auto; display: flex; align-items: center;">
          <img
            src="${logoDataUrl}"
            alt="${nomeExibicao}"
            style="height: 58px; max-width: 180px; object-fit: contain; display: block;"
            onerror="if (this.src !== '${pngFallbackAbs}') { this.src = '${pngFallbackAbs}'; }"
          />
        </div>
        <div>
          <h1 class="brand-title">${nomeExibicao}</h1>
          <p class="brand-sub">Comércio & Instalações de Gesso, Drywall e Acabamentos Finos</p>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-number">${orcamento.numero}</div>
        <div class="doc-date">Emissão: ${formatData(orcamento.created)}</div>
        <div class="doc-date">Validade da proposta: ${formatData(orcamento.validade)}</div>
      </div>
    </div>

    <!-- DADOS DA EMPRESA & DADOS DO CLIENTE -->
    <div class="grid-info">
      <div class="card-info">
        <div class="card-title">Dados da Empresa Emissora</div>
        <div class="card-item"><strong>${exibirCnpj ? 'Razão Social' : 'Empresa'}:</strong> ${nomeExibicao}</div>
        ${exibirCnpj && cnpjCadastrado ? `<div class="card-item"><strong>CNPJ:</strong> ${cnpjCadastrado}</div>` : ''}
        <div class="card-item"><strong>Telefone / WhatsApp:</strong> ${telefoneEmpresa}</div>
        <div class="card-item"><strong>E-mail:</strong> ${emailEmpresa}</div>
        <div class="card-item"><strong>Endereço:</strong> ${enderecoEmpresa} — ${cidadeEmpresa}</div>
      </div>

      <div class="card-info">
        <div class="card-title">Dados do Cliente / Local da Obra</div>
        <div class="card-item"><strong>Cliente:</strong> ${orcamento.cliente}</div>
        ${orcamento.expand?.cliente_cadastrado?.documento ? `<div class="card-item"><strong>CPF/CNPJ:</strong> ${orcamento.expand.cliente_cadastrado.documento}</div>` : ''}
        <div class="card-item"><strong>Contato:</strong> ${orcamento.contato || orcamento.expand?.cliente_cadastrado?.whatsapp || 'Não informado'}</div>
        <div class="card-item"><strong>Cidade / Local:</strong> ${orcamento.cidade || orcamento.expand?.cliente_cadastrado?.cidade || 'São Pedro'}</div>
        ${orcamento.expand?.cliente_cadastrado?.endereco ? `<div class="card-item"><strong>Endereço Obra:</strong> ${orcamento.expand.cliente_cadastrado.endereco}</div>` : ''}
        ${orcamento.expand?.grupo?.nome ? `<div class="card-item"><strong>Tabela Aplicada:</strong> ${orcamento.expand.grupo.nome}</div>` : ''}
      </div>
    </div>

    <!-- TABELA DE ITENS POR LOCAL / AMBIENTE -->
    ${
      itensPorLocal.length > 0
        ? `
    <div class="table-container">
      <div class="section-title">Detalhamento por Ambiente / Local</div>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Local</th>
            <th style="width: 38%;">Serviço / Descrição</th>
            <th class="text-center" style="width: 12%;">Metragem</th>
            <th class="text-right" style="width: 14%;">Valor</th>
            <th class="text-right" style="width: 14%;">Total Linha</th>
          </tr>
        </thead>
        <tbody>
          ${itensPorLocal
            .map(
              (loc) => `
            <tr>
              <td><strong style="color: #2C3E50;">${loc.local}</strong></td>
              <td><div class="item-desc">${loc.servico}</div></td>
              <td class="text-center">${loc.metragem} m²</td>
              <td class="text-right">${formatMoeda(loc.valor)}</td>
              <td class="text-right" style="font-weight: 700; color: #2C3E50;">${formatMoeda(loc.total)}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- TABELA DE SERVIÇOS & ITENS GERAIS -->
    ${
      itens.length > 0
        ? `
    <div class="table-container">
      <div class="section-title">Itens e Serviços Gerais</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Descrição do Serviço</th>
            <th class="text-center" style="width: 15%;">Quantidade</th>
            <th class="text-right" style="width: 15%;">Valor Unit.</th>
            <th class="text-right" style="width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map(
              (it) => `
            <tr>
              <td>
                <div class="item-desc">${it.descricao}</div>
                ${it.largura && it.comprimento ? `<div class="item-detalhe">Dimensões: ${it.largura}m × ${it.comprimento}m = ${(it.largura * it.comprimento).toFixed(2)} m²</div>` : ''}
              </td>
              <td class="text-center">${it.quantidade} ${it.unidade || 'un'}</td>
              <td class="text-right">${formatMoeda(it.valor_unitario)}</td>
              <td class="text-right" style="font-weight: 700;">${formatMoeda(it.valor_total)}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- VALOR À VISTA E A PRAZO LADO A LADO -->
    <div class="pricing-box">
      <div class="price-card a-vista">
        <div class="price-card-title">VALOR À VISTA${percentualDescAVista > 0 ? ` (COM ${percentualDescAVista}% DE DESCONTO)` : ''}</div>
        <div class="price-value">${formatMoeda(valorAVista)}</div>
        <div class="price-conditions">
          ${
            valorAPrazo > valorAVista
              ? `Economia de ${formatMoeda(valorAPrazo - valorAVista)} para pagamento no PIX / Transferência imediata.`
              : 'Quitação no ato do fechamento / início da obra via PIX ou transferência imediata.'
          }
        </div>
      </div>

      <div class="price-card a-prazo">
        <div class="price-card-title">VALOR A PRAZO</div>
        <div class="price-value">${formatMoeda(valorAPrazo)}</div>
        <div class="price-conditions">
          ${condicoesMetodo.length > 0 ? condicoesMetodo.join('<br/>') : 'Parcelamento conforme acordado com a equipe comercial.'}
        </div>
      </div>
    </div>

    <!-- CRONOGRAMA & OBSERVAÇÕES -->
    ${
      orcamento.data_inicio_prevista || orcamento.data_fim_prevista || orcamento.observacoes
        ? `
      <div class="card-info" style="margin-top: 14px;">
        <div class="card-title">Cronograma & Observações Técnicas</div>
        ${orcamento.data_inicio_prevista ? `<div class="card-item"><strong>Previsão de Início:</strong> ${formatData(orcamento.data_inicio_prevista)}</div>` : ''}
        ${orcamento.data_fim_prevista ? `<div class="card-item"><strong>Previsão de Conclusão:</strong> ${formatData(orcamento.data_fim_prevista)}</div>` : ''}
        ${orcamento.observacoes ? `<div class="card-item" style="margin-top: 6px; white-space: pre-line;"><strong>Observações:</strong> ${orcamento.observacoes}</div>` : ''}
      </div>
    `
        : ''
    }

    <!-- NOSSO COMPROMISSO -->
    <div class="compromisso-box">
      <div class="section-title">Nosso Compromisso com Sua Obra</div>
      <ul class="compromisso-list">
        ${compromisso.map((c) => `<li>${c}</li>`).join('')}
      </ul>
    </div>

    <!-- ASSINATURAS -->
    <div class="footer-sign">
      <div>
        <div class="sign-brand" style="${exibirCnpj ? "font-family: 'Tenor Sans', Georgia, serif; font-size: 13pt; font-weight: 700;" : ''}">${nomeExibicao}</div>
        <div style="font-size: 8pt; color: #616F7D; margin-top: 2px;">
          Excelência e Tradição em Acabamentos
        </div>
      </div>

      <div class="sign-line">
        De acordo do Cliente<br/>
        Data: ____/____/________
      </div>
    </div>
  </div>
</body>
</html>
  `

  janela.document.open()
  janela.document.write(html)
  janela.document.close()
}
