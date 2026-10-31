migrate(
  (app) => {
    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      if (!orcamentosCol.fields.getByName('data_emissao')) {
        orcamentosCol.fields.add(
          new DateField({
            name: 'data_emissao',
            required: false,
          }),
        )
        app.save(orcamentosCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar data_emissao em orcamentos:', e)
    }
  },
  (app) => {
    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      if (orcamentosCol.fields.getByName('data_emissao')) {
        orcamentosCol.fields.removeByName('data_emissao')
        app.save(orcamentosCol)
      }
    } catch (e) {
      console.log('Aviso ao reverter data_emissao em orcamentos:', e)
    }
  },
)
