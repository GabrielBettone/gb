migrate(
  (app) => {
    // 1. Atualizar select de status em pagamentos_parcelas para permitir 'parcial'
    try {
      const parcelasCol = app.findCollectionByNameOrId('pagamentos_parcelas')
      const statusField = parcelasCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['a_pagar', 'parcial', 'paga', 'cancelada']
        statusField.maxSelect = 1
        app.save(parcelasCol)
      }
    } catch (e) {
      console.warn('Erro ao atualizar status de pagamentos_parcelas:', e)
    }

    // 2. Criar coleção parcela_recebimentos
    try {
      app.findCollectionByNameOrId('parcela_recebimentos')
    } catch (_) {
      const parcelasCol = app.findCollectionByNameOrId('pagamentos_parcelas')
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')

      const recCol = new Collection({
        name: 'parcela_recebimentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'parcela',
            type: 'relation',
            required: true,
            collectionId: parcelasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'orcamento',
            type: 'relation',
            required: false,
            collectionId: orcamentosCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'valor', type: 'number', required: true },
          { name: 'data_pagamento', type: 'date', required: true },
          { name: 'forma_pagamento', type: 'text', max: 100, required: true },
          { name: 'observacao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_rec_parcela ON parcela_recebimentos (parcela)',
          'CREATE INDEX idx_rec_orcamento ON parcela_recebimentos (orcamento)',
          'CREATE INDEX idx_rec_data ON parcela_recebimentos (data_pagamento)',
        ],
      })
      app.save(recCol)
    }
  },
  (app) => {
    try {
      const recCol = app.findCollectionByNameOrId('parcela_recebimentos')
      app.delete(recCol)
    } catch (_) {}
  },
)
