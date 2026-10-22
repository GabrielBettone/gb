// Hook agendado a cada 10 minutos para verificação das regras de alerta
cronAdd('alertas_check', '*/10 * * * *', (e) => {
  const app = e.app
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dataIsoFiltro = trintaDiasAtras.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

  // Busca regras habilitadas
  const regras = app.findRecordsByFilter('regras_alerta', 'habilitada = true', 'created', 100, 0)
  if (!regras || regras.length === 0) {
    return
  }

  // Busca vendas dos últimos 30 dias
  const vendas = app.findRecordsByFilter('vendas', `data >= "${dataIsoFiltro}"`, 'data', 5000, 0)

  let totalFaturamento = 0
  const quantidadeVendas = vendas.length
  for (let i = 0; i < vendas.length; i++) {
    totalFaturamento += vendas[i].getFloat('valor')
  }
  const ticketMedio = quantidadeVendas > 0 ? totalFaturamento / quantidadeVendas : 0

  const alertasCol = app.findCollectionByNameOrId('alertas')

  for (let r = 0; r < regras.length; r++) {
    const regra = regras[r]
    const regraId = regra.id
    const indicador = regra.getString('indicador')
    const comparacao = regra.getString('comparacao')
    const limite = regra.getFloat('limite')
    const regraNome = regra.getString('nome')

    let valorAtual = 0
    if (indicador === 'faturamento') {
      valorAtual = totalFaturamento
    } else if (indicador === 'ticket_medio') {
      valorAtual = ticketMedio
    } else if (indicador === 'quantidade') {
      valorAtual = quantidadeVendas
    }

    let disparou = false
    if (comparacao === 'acima' && valorAtual > limite) {
      disparou = true
    } else if (comparacao === 'abaixo' && valorAtual < limite) {
      disparou = true
    }

    if (disparou) {
      // Verifica se já existe alerta não lido recente para esta regra
      const alertasExistentes = app.findRecordsByFilter(
        'alertas',
        `regra = "${regraId}" && lido = false && created >= "${dataIsoFiltro}"`,
        '-created',
        1,
        0,
      )

      if (!alertasExistentes || alertasExistentes.length === 0) {
        const novoAlerta = new Record(alertasCol)
        novoAlerta.set('regra', regraId)

        let tipo = 'negativo'
        if (comparacao === 'acima') {
          tipo = 'positivo'
        }
        novoAlerta.set('tipo', tipo)

        let msg = ''
        const valFormatado =
          indicador === 'quantidade'
            ? Math.round(valorAtual).toString()
            : 'R$ ' +
              valorAtual.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
        const limFormatado =
          indicador === 'quantidade'
            ? Math.round(limite).toString()
            : 'R$ ' +
              limite.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        if (tipo === 'positivo') {
          msg = `${regraNome}: O indicador de ${indicador} atingiu ${valFormatado}, superando a meta de ${limFormatado}.`
        } else {
          msg = `${regraNome}: O indicador de ${indicador} está em ${valFormatado}, abaixo do limite esperado de ${limFormatado}.`
        }

        novoAlerta.set('mensagem', msg)
        novoAlerta.set('valor_atual', Math.round(valorAtual * 100) / 100)
        novoAlerta.set('lido', false)
        app.save(novoAlerta)
      }
    }
  }
})
