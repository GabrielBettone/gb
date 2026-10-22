migrate(
  (app) => {
    // 1. Obter referências das coleções existentes necessárias
    const produtosCol = app.findCollectionByNameOrId('produtos')
    const vendasCol = app.findCollectionByNameOrId('vendas')

    // 2. Criar coleção orcamentos
    let orcamentosCol
    try {
      orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    } catch (_) {
      const orcamentos = new Collection({
        name: 'orcamentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'numero', type: 'text', required: true },
          { name: 'cliente', type: 'text', required: true, max: 200 },
          { name: 'contato', type: 'text', max: 100 },
          { name: 'cidade', type: 'text', max: 100 },
          {
            name: 'canal_origem',
            type: 'select',
            required: true,
            values: ['WhatsApp', 'E-mail', 'Instagram', 'Loja física'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Orçamentos a realizar',
              'Aguardando aprovação',
              'Aprovados aguardando início',
              'Trabalhos iniciados',
              'Concluídos',
            ],
            maxSelect: 1,
          },
          {
            name: 'produto_principal',
            type: 'relation',
            collectionId: produtosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'itens', type: 'json' },
          { name: 'subtotal', type: 'number' },
          { name: 'desconto', type: 'number' },
          { name: 'valor_total', type: 'number', required: true },
          { name: 'data_inicio_prevista', type: 'date' },
          { name: 'data_fim_prevista', type: 'date' },
          { name: 'data_conclusao', type: 'date' },
          { name: 'validade', type: 'date' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_orcamentos_numero ON orcamentos (numero)',
          'CREATE INDEX idx_orcamentos_status ON orcamentos (status)',
          'CREATE INDEX idx_orcamentos_cliente ON orcamentos (cliente)',
          'CREATE INDEX idx_orcamentos_data_inicio ON orcamentos (data_inicio_prevista)',
        ],
      })
      app.save(orcamentos)
      orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    }

    // 3. Adicionar campo 'orcamento' na coleção vendas para vincular e evitar duplicidade
    try {
      const orcField = vendasCol.fields.getByName('orcamento')
      if (!orcField) {
        vendasCol.fields.add(
          new RelationField({
            name: 'orcamento',
            collectionId: orcamentosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
        app.save(vendasCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campo orcamento em vendas:', e)
    }

    // 4. Semeadura inicial demonstrativa de orçamentos nas 5 etapas
    const totalOrcamentos = app.countRecords('orcamentos')
    if (totalOrcamentos === 0) {
      // Obter alguns produtos para associar
      const prods = app.findRecordsByFilter('produtos', 'ativo = true', 'nome', 12, 0)
      const prodForro = prods.find((p) => p.getString('nome').includes('Forros')) || prods[0]
      const prodDrywall = prods.find((p) => p.getString('nome').includes('drywall')) || prods[1]
      const prodBoiserie = prods.find((p) => p.getString('nome').includes('Faixas')) || prods[2]
      const prodSancas = prods.find((p) => p.getString('nome').includes('Sancas')) || prods[3]
      const prodRebaixo = prods.find((p) => p.getString('nome').includes('Rebaixo')) || prods[4]

      const hoje = new Date()
      const formatIsoDate = (d) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day} 12:00:00.000Z`
      }

      const addDays = (d, days) => {
        const res = new Date(d.getTime())
        res.setDate(res.getDate() + days)
        return res
      }

      const demoOrcamentos = [
        {
          numero: 'ORC-2025-0001',
          cliente: 'Residencial Alphaville (Sr. Carlos Eduardo)',
          contato: '(19) 99876-1234',
          cidade: 'São Pedro',
          canal_origem: 'WhatsApp',
          status: 'Orçamentos a realizar',
          produto_principal: prodForro ? prodForro.id : '',
          subtotal: 4800,
          desconto: 300,
          valor_total: 4500,
          data_inicio_prevista: formatIsoDate(addDays(hoje, 1)),
          data_fim_prevista: formatIsoDate(addDays(hoje, 5)),
          validade: formatIsoDate(addDays(hoje, 15)),
          observacoes: 'Visita técnica agendada para medição dos quartos e sala ampla.',
          itens: JSON.stringify([
            {
              produto_id: prodForro ? prodForro.id : '',
              descricao: 'Forro de gesso acartonado estruturado FVS',
              quantidade: 60,
              unidade: 'm²',
              valor_unitario: 80,
              valor_total: 4800,
            },
          ]),
        },
        {
          numero: 'ORC-2025-0002',
          cliente: 'Dra. Camila Nogueira - Consultório',
          contato: 'camila.odonto@gmail.com',
          cidade: 'Águas de São Pedro',
          canal_origem: 'E-mail',
          status: 'Aguardando aprovação',
          produto_principal: prodDrywall ? prodDrywall.id : '',
          subtotal: 7200,
          desconto: 400,
          valor_total: 6800,
          data_inicio_prevista: formatIsoDate(addDays(hoje, 3)),
          data_fim_prevista: formatIsoDate(addDays(hoje, 9)),
          validade: formatIsoDate(addDays(hoje, 10)),
          observacoes: 'Divisórias acústicas drywall com lã de vidro para isolamento.',
          itens: JSON.stringify([
            {
              produto_id: prodDrywall ? prodDrywall.id : '',
              descricao: 'Parede drywall com isolamento acústico lã de rocha',
              quantidade: 45,
              unidade: 'm²',
              valor_unitario: 160,
              valor_total: 7200,
            },
          ]),
        },
        {
          numero: 'ORC-2025-0003',
          cliente: 'Arq. Rodrigo Vasconcelos (Casa Colina)',
          contato: '(19) 98765-4321',
          cidade: 'Piracicaba',
          canal_origem: 'Instagram',
          status: 'Aprovados aguardando início',
          produto_principal: prodBoiserie ? prodBoiserie.id : '',
          subtotal: 3900,
          desconto: 0,
          valor_total: 3900,
          data_inicio_prevista: formatIsoDate(addDays(hoje, 4)),
          data_fim_prevista: formatIsoDate(addDays(hoje, 8)),
          validade: formatIsoDate(addDays(hoje, 20)),
          observacoes: 'Contrato assinado. Aguardando liberação do pintor para início.',
          itens: JSON.stringify([
            {
              produto_id: prodBoiserie ? prodBoiserie.id : '',
              descricao: 'Faixas decorativas e molduras boiserie clássicas em sala de jantar',
              quantidade: 65,
              unidade: 'm linear',
              valor_unitario: 60,
              valor_total: 3900,
            },
          ]),
        },
        {
          numero: 'ORC-2025-0004',
          cliente: 'Restaurante Pátio da Serra',
          contato: '(19) 3481-2290',
          cidade: 'São Pedro',
          canal_origem: 'Loja física',
          status: 'Trabalhos iniciados',
          produto_principal: prodSancas ? prodSancas.id : '',
          subtotal: 8500,
          desconto: 500,
          valor_total: 8000,
          data_inicio_prevista: formatIsoDate(addDays(hoje, -2)),
          data_fim_prevista: formatIsoDate(addDays(hoje, 4)),
          validade: formatIsoDate(addDays(hoje, 30)),
          observacoes: 'Obra em andamento. Estrutura montada, passando fiação das fitas LED.',
          itens: JSON.stringify([
            {
              produto_id: prodSancas ? prodSancas.id : '',
              descricao: 'Sanca invertida aberta com rebaixo central e cortineiro',
              quantidade: 1,
              unidade: 'un',
              valor_unitario: 8500,
              valor_total: 8500,
            },
          ]),
        },
        {
          numero: 'ORC-2025-0005',
          cliente: 'Condomínio Quinta das Flores (Salão de Festas)',
          contato: '(19) 99123-8877',
          cidade: 'São Pedro',
          canal_origem: 'WhatsApp',
          status: 'Concluídos',
          produto_principal: prodRebaixo ? prodRebaixo.id : '',
          subtotal: 5600,
          desconto: 200,
          valor_total: 5400,
          data_inicio_prevista: formatIsoDate(addDays(hoje, -10)),
          data_fim_prevista: formatIsoDate(addDays(hoje, -3)),
          data_conclusao: formatIsoDate(addDays(hoje, -3)),
          validade: formatIsoDate(addDays(hoje, 15)),
          observacoes: 'Trabalho finalizado com sucesso e entregue ao síndico.',
          itens: JSON.stringify([
            {
              produto_id: prodRebaixo ? prodRebaixo.id : '',
              descricao: 'Rebaixo de teto estruturado com rasgos de luz',
              quantidade: 70,
              unidade: 'm²',
              valor_unitario: 80,
              valor_total: 5600,
            },
          ]),
        },
      ]

      for (let i = 0; i < demoOrcamentos.length; i++) {
        const item = demoOrcamentos[i]
        const rec = new Record(orcamentosCol)
        rec.set('numero', item.numero)
        rec.set('cliente', item.cliente)
        rec.set('contato', item.contato)
        rec.set('cidade', item.cidade)
        rec.set('canal_origem', item.canal_origem)
        rec.set('status', item.status)
        if (item.produto_principal) rec.set('produto_principal', item.produto_principal)
        rec.set('itens', item.itens)
        rec.set('subtotal', item.subtotal)
        rec.set('desconto', item.desconto)
        rec.set('valor_total', item.valor_total)
        rec.set('data_inicio_prevista', item.data_inicio_prevista)
        rec.set('data_fim_prevista', item.data_fim_prevista)
        if (item.data_conclusao) rec.set('data_conclusao', item.data_conclusao)
        rec.set('validade', item.validade)
        rec.set('observacoes', item.observacoes)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const orcamentos = app.findCollectionByNameOrId('orcamentos')
      app.delete(orcamentos)
    } catch (_) {}
  },
)
