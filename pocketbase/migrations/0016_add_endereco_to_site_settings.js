/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      if (!collection.fields.getByName('endereco')) {
        collection.fields.add(
          new TextField({
            name: 'endereco',
            type: 'text',
            required: false,
          }),
        )
      }
      app.save(collection)
    } catch (e) {
      console.log('Aviso ao adicionar endereco em site_settings:', e)
    }
  },
  (app) => {
    // Reversão
  },
)
