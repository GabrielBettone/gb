migrate(
  (app) => {
    // 1. Adicionar unidade_padrao_id (relation para unidades_medida) na coleção orcamento_servicos
    try {
      const orcServicosCol = app.findCollectionByNameOrId('orcamento_servicos')
      let unidadesColId = null
      try {
        unidadesColId = app.findCollectionByNameOrId('unidades_medida').id
      } catch (_) {}

      if (!orcServicosCol.fields.getByName('unidade_padrao_id')) {
        if (unidadesColId) {
          orcServicosCol.fields.add(
            new RelationField({
              name: 'unidade_padrao_id',
              collectionId: unidadesColId,
              cascadeDelete: false,
              maxSelect: 1,
            }),
          )
        } else {
          orcServicosCol.fields.add(
            new TextField({
              name: 'unidade_padrao_id',
              max: 100,
            }),
          )
        }
        app.save(orcServicosCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar unidade_padrao_id em orcamento_servicos: ' + e)
    }

    // 2. Adicionar identificacao (text) na coleção orcamentos
    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      if (!orcamentosCol.fields.getByName('identificacao')) {
        orcamentosCol.fields.add(
          new TextField({
            name: 'identificacao',
            max: 250,
          }),
        )
        app.save(orcamentosCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar identificacao em orcamentos: ' + e)
    }
  },
  (app) => {
    try {
      const orcServicosCol = app.findCollectionByNameOrId('orcamento_servicos')
      const f1 = orcServicosCol.fields.getByName('unidade_padrao_id')
      if (f1) {
        orcServicosCol.fields.remove(f1)
        app.save(orcServicosCol)
      }
    } catch (_) {}

    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      const f2 = orcamentosCol.fields.getByName('identificacao')
      if (f2) {
        orcamentosCol.fields.remove(f2)
        app.save(orcamentosCol)
      }
    } catch (_) {}
  },
)
