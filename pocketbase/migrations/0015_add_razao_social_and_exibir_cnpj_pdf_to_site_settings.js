/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      if (!collection.fields.getByName('razao_social')) {
        collection.fields.add(
          new TextField({
            name: 'razao_social',
            type: 'text',
            required: false,
          }),
        )
      }
      if (!collection.fields.getByName('exibir_cnpj_pdf')) {
        collection.fields.add(
          new BoolField({
            name: 'exibir_cnpj_pdf',
            type: 'bool',
            required: false,
          }),
        )
      }
      app.save(collection)
    } catch (e) {
      console.log('Aviso ao adicionar razao_social e exibir_cnpj_pdf em site_settings:', e)
    }
  },
  (app) => {
    // Reversão
  },
)
