migrate(
  (app) => {
    // 1. Seed Usuário Inicial
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gabrielgiovani@msn.com')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('gabrielgiovani@msn.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Gabriel Bettone')
      app.save(admin)
    }

    // 2. Seed Produtos (12 itens reais)
    const produtosCol = app.findCollectionByNameOrId('produtos')
    const listaProdutos = [
      {
        nome: 'Forros de gesso',
        descricao: 'Forros lisos e estruturados para acabamento de teto residencial e corporativo.',
      },
      {
        nome: 'Parede drywall',
        descricao: 'Divisórias acústicas e estruturadas em placas de gesso acartonado.',
      },
      {
        nome: 'Faixas decorativas e boiseries',
        descricao: 'Molduras finas para paredes estilo clássico e contemporâneo.',
      },
      {
        nome: 'Molduras de gesso',
        descricao: 'Acabamento de transição entre teto e paredes com diversos perfis e desenhos.',
      },
      {
        nome: 'Rebaixo de teto',
        descricao: 'Rebaixo em gesso para projetos luminotécnicos e integração de ambientes.',
      },
      {
        nome: 'Cortineiros de gesso',
        descricao: 'Espaço embutido e discreto para trilhos e cortinas iluminadas.',
      },
      {
        nome: 'Sancas',
        descricao: 'Sancas abertas, fechadas e invertidas com iluminação indireta personalizada.',
      },
      {
        nome: 'Móveis e guarda-roupas em gesso',
        descricao: 'Nicho, estantes e estruturas sob medida construídas em gesso e drywall.',
      },
      {
        nome: 'Revestimento em placa 3D',
        descricao: 'Painéis de gesso com padrões tridimensionais de alto relevo decorativo.',
      },
      {
        nome: 'Molduras externas em cimento celular',
        descricao: 'Molduras para fachadas e áreas externas resistentes às intempéries.',
      },
      {
        nome: 'Colunas de gesso',
        descricao: 'Colunas decorativas romanas, gregas e modernas para sustentação visual.',
      },
      {
        nome: 'Vitrais',
        descricao: 'Vitrais artísticos e peças decorativas integradas ao acabamento de gesso.',
      },
    ]

    const produtoMap = {}
    for (let i = 0; i < listaProdutos.length; i++) {
      const item = listaProdutos[i]
      let prodRec
      try {
        prodRec = app.findFirstRecordByData('produtos', 'nome', item.nome)
      } catch (_) {
        prodRec = new Record(produtosCol)
        prodRec.set('nome', item.nome)
        prodRec.set('descricao', item.descricao)
        prodRec.set('ativo', true)
        app.save(prodRec)
      }
      produtoMap[item.nome] = prodRec.id
    }

    // 3. Seed Regras de Alerta
    const regrasCol = app.findCollectionByNameOrId('regras_alerta')
    const listaRegras = [
      {
        nome: 'Faturamento abaixo do esperado',
        indicador: 'faturamento',
        comparacao: 'abaixo',
        limite: 20000,
        habilitada: true,
      },
      {
        nome: 'Queda no ticket médio',
        indicador: 'ticket_medio',
        comparacao: 'abaixo',
        limite: 850,
        habilitada: true,
      },
      {
        nome: 'Alerta de crescimento de vendas',
        indicador: 'quantidade',
        comparacao: 'acima',
        limite: 30,
        habilitada: true,
      },
    ]

    for (let r = 0; r < listaRegras.length; r++) {
      const item = listaRegras[r]
      try {
        app.findFirstRecordByData('regras_alerta', 'nome', item.nome)
      } catch (_) {
        const regRec = new Record(regrasCol)
        regRec.set('nome', item.nome)
        regRec.set('indicador', item.indicador)
        regRec.set('comparacao', item.comparacao)
        regRec.set('limite', item.limite)
        regRec.set('habilitada', item.habilitada)
        app.save(regRec)
      }
    }

    // 4. Seed Vendas (~12 meses com sazonalidade, canais e cidades)
    const vendasCol = app.findCollectionByNameOrId('vendas')
    const totalVendasExistentes = app.countRecords('vendas')
    if (totalVendasExistentes === 0) {
      const canais = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']
      const cidades = [
        'São Pedro',
        'Águas de São Pedro',
        'Piracicaba',
        'Charqueada',
        'Santa Maria',
        'Rio Claro',
        'Brotas',
      ]
      const clientesBase = [
        'Resid. Oliveira',
        'Construtora Alfa',
        'Cond. Vista Verde',
        'Dr. Marcos Vinicius',
        'Engenharia San Marino',
        'Arq. Renata Meireles',
        'Residencial Bela Vista',
        'Clínica Vida São Pedro',
        'Restaurante Serra Bonita',
        'Empório da Vila',
        'Cond. Bosque dos Cedros',
        'Fazenda Bela Aliança',
        'Pousada Brotas Natural',
        'Edifício Solar das Águas',
        'Colégio Santa Maria',
        'Centro Comercial Central',
        'Hotel Fonte das Águas',
        'Residencial Bougainville',
        'Oficina Prime',
        'Buffet Primavera',
        'Cond. Recanto dos Pássaros',
        'Resid. Carvalho e Ramos',
        'Casa e Conforto Design',
        'Espaço Nobre Eventos',
      ]

      const prodNames = Object.keys(produtoMap)

      // Média de valores típicos por produto
      const valoresFaixa = {
        'Forros de gesso': [1200, 4800],
        'Parede drywall': [2200, 9500],
        'Faixas decorativas e boiseries': [650, 2400],
        'Molduras de gesso': [450, 1800],
        'Rebaixo de teto': [1800, 6200],
        'Cortineiros de gesso': [350, 1200],
        Sancas: [950, 3600],
        'Móveis e guarda-roupas em gesso': [3200, 11500],
        'Revestimento em placa 3D': [1100, 4200],
        'Molduras externas em cimento celular': [2800, 14500],
        'Colunas de gesso': [1400, 5800],
        Vitrais: [2100, 8900],
      }

      // Gera vendas cobrindo os últimos 12 meses
      const hoje = new Date()
      // Para reproducibilidade e variação consistente
      let seedState = 42
      function pseudoRandom() {
        seedState = (seedState * 9301 + 49297) % 233280
        return seedState / 233280
      }

      for (let mesAtras = 11; mesAtras >= 0; mesAtras--) {
        // Picos em meses de fim de ano e verão (nov, dez, jan)
        const dataMes = new Date(hoje.getFullYear(), hoje.getMonth() - mesAtras, 1)
        const mesNum = dataMes.getMonth() // 0 a 11
        let qtdVendasNoMes = 14 + Math.floor(pseudoRandom() * 8) // 14 a 21
        if (mesNum === 10 || mesNum === 11 || mesNum === 0) {
          // Nov, Dez, Jan
          qtdVendasNoMes += 8 + Math.floor(pseudoRandom() * 6) // Pico 22 a 34 vendas
        } else if (mesNum === 6 || mesNum === 7) {
          // Julho/Agosto
          qtdVendasNoMes += 4
        }

        for (let v = 0; v < qtdVendasNoMes; v++) {
          const dia = Math.min(28, 1 + Math.floor(pseudoRandom() * 27))
          const hora = 8 + Math.floor(pseudoRandom() * 10)
          const minuto = Math.floor(pseudoRandom() * 60)

          const dataVenda = new Date(
            dataMes.getFullYear(),
            dataMes.getMonth(),
            dia,
            hora,
            minuto,
            0,
          )
          const dataVendaStr = dataVenda.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

          const prodNome = prodNames[Math.floor(pseudoRandom() * prodNames.length)]
          const faixa = valoresFaixa[prodNome] || [500, 3000]
          const valCalculado =
            Math.round((faixa[0] + pseudoRandom() * (faixa[1] - faixa[0])) * 100) / 100

          const clienteNome = clientesBase[Math.floor(pseudoRandom() * clientesBase.length)]
          const canalEscolhido = canais[Math.floor(pseudoRandom() * canais.length)]
          const cidadeEscolhida = cidades[Math.floor(pseudoRandom() * cidades.length)]

          const vendaRec = new Record(vendasCol)
          vendaRec.set('data', dataVendaStr)
          vendaRec.set('cliente', clienteNome)
          vendaRec.set('produto', produtoMap[prodNome])
          vendaRec.set('canal', canalEscolhido)
          vendaRec.set('cidade', cidadeEscolhida)
          vendaRec.set('valor', valCalculado)
          app.save(vendaRec)
        }
      }
    }
  },
  (app) => {
    // Rollback não exclui usuário nem coleções de modo destrutivo se houver dados
  },
)
