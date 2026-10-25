migrate(
  (app) => {
    // 1. Coleção: clientes_grupos (ex: "Geral", "Senac ASP")
    let gruposCol
    try {
      gruposCol = app.findCollectionByNameOrId('clientes_grupos')
    } catch (_) {
      const grupos = new Collection({
        name: 'clientes_grupos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true, max: 150 },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'padrao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_clientes_grupos_nome ON clientes_grupos (nome)'],
      })
      app.save(grupos)
      gruposCol = app.findCollectionByNameOrId('clientes_grupos')
    }

    // 2. Coleção: clientes (cadastrados com vínculo obrigatório ao grupo)
    let clientesCol
    try {
      clientesCol = app.findCollectionByNameOrId('clientes')
    } catch (_) {
      const clientes = new Collection({
        name: 'clientes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true, max: 200 },
          {
            name: 'grupo',
            type: 'relation',
            required: true,
            collectionId: gruposCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'documento', type: 'text', max: 30 }, // CPF ou CNPJ
          { name: 'whatsapp', type: 'text', max: 50 },
          { name: 'email', type: 'text', max: 150 },
          { name: 'cidade', type: 'text', max: 100 },
          { name: 'endereco', type: 'text', max: 250 },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_clientes_nome ON clientes (nome)',
          'CREATE INDEX idx_clientes_grupo ON clientes (grupo)',
          'CREATE INDEX idx_clientes_documento ON clientes (documento)',
        ],
      })
      app.save(clientes)
      clientesCol = app.findCollectionByNameOrId('clientes')
    }

    // 3. Coleção: orcamento_servicos (Serviços e preços por grupo)
    let orcamentoServicosCol
    try {
      orcamentoServicosCol = app.findCollectionByNameOrId('orcamento_servicos')
    } catch (_) {
      let siteServicesColId = null
      try {
        siteServicesColId = app.findCollectionByNameOrId('site_services').id
      } catch (_) {}

      const fields = [
        { name: 'nome', type: 'text', required: true, max: 200 },
        {
          name: 'grupo',
          type: 'relation',
          required: true,
          collectionId: gruposCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'modo_calculo',
          type: 'select',
          required: true,
          values: ['area', 'dimensoes'], // area em m² OU largura × comprimento
          maxSelect: 1,
        },
        { name: 'unidade', type: 'text', required: true, max: 20 }, // m², m linear, un
        { name: 'preco_unitario', type: 'number', required: true },
        { name: 'descricao_pdf', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      if (siteServicesColId) {
        fields.push({
          name: 'site_service',
          type: 'relation',
          collectionId: siteServicesColId,
          cascadeDelete: false,
          maxSelect: 1,
        })
      }

      const orcServicos = new Collection({
        name: 'orcamento_servicos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields,
        indexes: [],
      })
      app.save(orcServicos)
      orcamentoServicosCol = app.findCollectionByNameOrId('orcamento_servicos')
    }

    // 4. Coleção: metodos_pagamento
    let metodosCol
    try {
      metodosCol = app.findCollectionByNameOrId('metodos_pagamento')
    } catch (_) {
      const metodos = new Collection({
        name: 'metodos_pagamento',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true, max: 150 },
          { name: 'desconto_a_vista', type: 'number' }, // % ex: 10
          { name: 'condicoes', type: 'json' }, // lista de linhas de texto
          { name: 'numero_parcelas', type: 'number' },
          { name: 'padrao', type: 'bool' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_metodos_pagamento_nome ON metodos_pagamento (nome)'],
      })
      app.save(metodos)
      metodosCol = app.findCollectionByNameOrId('metodos_pagamento')
    }

    // 5. Coleção: orcamento_configuracoes (Configurações do orçamento)
    let orcConfigCol
    try {
      orcConfigCol = app.findCollectionByNameOrId('orcamento_configuracoes')
    } catch (_) {
      const orcConfig = new Collection({
        name: 'orcamento_configuracoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'chave', type: 'text', required: true },
          { name: 'razao_social', type: 'text' },
          { name: 'nome_fantasia', type: 'text' },
          { name: 'cnpj', type: 'text' },
          { name: 'exibir_cnpj_padrao', type: 'bool' },
          { name: 'nosso_compromisso', type: 'json' },
          { name: 'telefone', type: 'text' },
          { name: 'email', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'cidade', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_orc_config_chave ON orcamento_configuracoes (chave)'],
      })
      app.save(orcConfig)
      orcConfigCol = app.findCollectionByNameOrId('orcamento_configuracoes')
    }

    // 6. Atualizar a coleção orcamentos com novos campos
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    if (!orcamentosCol.fields.getByName('cliente_cadastrado')) {
      orcamentosCol.fields.add(
        new RelationField({
          name: 'cliente_cadastrado',
          collectionId: clientesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!orcamentosCol.fields.getByName('grupo')) {
      orcamentosCol.fields.add(
        new RelationField({
          name: 'grupo',
          collectionId: gruposCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!orcamentosCol.fields.getByName('metodo_pagamento')) {
      orcamentosCol.fields.add(
        new RelationField({
          name: 'metodo_pagamento',
          collectionId: metodosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!orcamentosCol.fields.getByName('valor_a_vista')) {
      orcamentosCol.fields.add(new NumberField({ name: 'valor_a_vista' }))
    }
    if (!orcamentosCol.fields.getByName('valor_a_prazo')) {
      orcamentosCol.fields.add(new NumberField({ name: 'valor_a_prazo' }))
    }
    if (!orcamentosCol.fields.getByName('exibir_cnpj')) {
      orcamentosCol.fields.add(new BoolField({ name: 'exibir_cnpj' }))
    }
    app.save(orcamentosCol)

    // 7. Coleção: pagamentos_parcelas (Controle de Contas a Receber / Agenda de Pagamentos)
    let parcelasCol
    try {
      parcelasCol = app.findCollectionByNameOrId('pagamentos_parcelas')
    } catch (_) {
      const parcelas = new Collection({
        name: 'pagamentos_parcelas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'orcamento',
            type: 'relation',
            required: true,
            collectionId: orcamentosCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'numero_parcela', type: 'number', required: true },
          { name: 'total_parcelas', type: 'number', required: true },
          { name: 'descricao', type: 'text', max: 200 },
          { name: 'valor_previsto', type: 'number', required: true },
          { name: 'data_vencimento', type: 'date', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['a_pagar', 'paga', 'cancelada'],
            maxSelect: 1,
          },
          { name: 'data_pagamento', type: 'date' },
          { name: 'valor_pago', type: 'number' },
          { name: 'ajuste', type: 'number' },
          { name: 'forma_pagamento', type: 'text', max: 100 },
          { name: 'observacoes_baixa', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_parcelas_orcamento ON pagamentos_parcelas (orcamento)',
          'CREATE INDEX idx_parcelas_status ON pagamentos_parcelas (status)',
          'CREATE INDEX idx_parcelas_vencimento ON pagamentos_parcelas (data_vencimento)',
        ],
      })
      app.save(parcelas)
    }
  },
  (app) => {
    const toDelete = [
      'pagamentos_parcelas',
      'orcamento_configuracoes',
      'metodos_pagamento',
      'orcamento_servicos',
      'clientes',
      'clientes_grupos',
    ]
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
