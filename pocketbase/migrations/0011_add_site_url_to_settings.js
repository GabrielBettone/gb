/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      if (!collection.fields.getByName('site_url')) {
        collection.fields.addAt(
          10,
          new TextField({
            name: 'site_url',
            type: 'text',
            required: false,
          }),
        )
        app.save(collection)
      }
    } catch (e) {
      console.log('Aviso ao adicionar site_url em site_settings:', e)
    }
  },
  (app) => {
    // Reversão
  },
)
