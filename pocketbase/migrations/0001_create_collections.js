migrate(
  (app) => {
    // 1. produtos
    const produtos = new Collection({
      name: 'produtos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_produtos_nome ON produtos (nome)'],
    })
    app.save(produtos)

    const produtosCol = app.findCollectionByNameOrId('produtos')

    // 2. vendas
    const vendas = new Collection({
      name: 'vendas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'cliente', type: 'text', required: true, max: 200 },
        {
          name: 'produto',
          type: 'relation',
          required: true,
          collectionId: produtosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['WhatsApp', 'E-mail', 'Instagram', 'Loja física'],
          maxSelect: 1,
        },
        { name: 'cidade', type: 'text', max: 100 },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vendas_data ON vendas (data)',
        'CREATE INDEX idx_vendas_produto ON vendas (produto)',
        'CREATE INDEX idx_vendas_canal ON vendas (canal)',
      ],
    })
    app.save(vendas)

    // 3. regras_alerta
    const regrasAlerta = new Collection({
      name: 'regras_alerta',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'indicador',
          type: 'select',
          required: true,
          values: ['faturamento', 'ticket_medio', 'quantidade'],
          maxSelect: 1,
        },
        {
          name: 'comparacao',
          type: 'select',
          required: true,
          values: ['acima', 'abaixo', 'variacao_percentual'],
          maxSelect: 1,
        },
        { name: 'limite', type: 'number', required: true },
        { name: 'habilitada', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(regrasAlerta)

    const regrasAlertaCol = app.findCollectionByNameOrId('regras_alerta')

    // 4. alertas
    const alertas = new Collection({
      name: 'alertas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'regra',
          type: 'relation',
          required: true,
          collectionId: regrasAlertaCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['positivo', 'negativo'],
          maxSelect: 1,
        },
        { name: 'mensagem', type: 'text', required: true },
        { name: 'valor_atual', type: 'number', required: true },
        { name: 'lido', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_alertas_created ON alertas (created)'],
    })
    app.save(alertas)

    // 5. importacoes
    const importacoes = new Collection({
      name: 'importacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'arquivo', type: 'text', required: true },
        { name: 'total_registros', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(importacoes)
  },
  (app) => {
    const toDelete = ['importacoes', 'alertas', 'regras_alerta', 'vendas', 'produtos']
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
