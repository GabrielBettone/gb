migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('orcamento_filtros_predefinidos')
    } catch (_) {
      const predCol = new Collection({
        name: 'orcamento_filtros_predefinidos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'nome',
            type: 'text',
            required: true,
            max: 120,
          },
          {
            name: 'etapas',
            type: 'json',
            required: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pred_nome ON orcamento_filtros_predefinidos (nome)'],
      })
      app.save(predCol)

      // Seed inicial das predefinições sugeridas
      try {
        const predefinicoesPadrao = [
          {
            nome: 'Compromissos',
            etapas: ['Orçamentos a realizar', 'Aprovados aguardando início', 'Trabalhos iniciados'],
          },
          {
            nome: 'Trabalhos',
            etapas: ['Aprovados aguardando início', 'Trabalhos iniciados'],
          },
          {
            nome: 'Obras em Andamento',
            etapas: ['Trabalhos iniciados'],
          },
        ]

        for (const item of predefinicoesPadrao) {
          const record = new Record(predCol)
          record.set('nome', item.nome)
          record.set('etapas', item.etapas)
          app.save(record)
        }
      } catch (seedErr) {
        console.warn('Erro ao inserir seeds de predefinições:', seedErr)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('orcamento_filtros_predefinidos')
      app.delete(col)
    } catch (_) {}
  },
)
