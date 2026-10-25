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
  },
  (app) => {
    try {
      const orcamentos = app.findCollectionByNameOrId('orcamentos')
      app.delete(orcamentos)
    } catch (_) {}
  },
)
