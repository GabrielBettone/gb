/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      if (!collection.fields.getByName('whatsapp_webdesigner')) {
        collection.fields.add(
          new TextField({
            name: 'whatsapp_webdesigner',
            type: 'text',
            required: false,
          }),
        )
        app.save(collection)
      }
    } catch (e) {
      console.log('Aviso ao adicionar whatsapp_webdesigner em site_settings:', e)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      const field = collection.fields.getByName('whatsapp_webdesigner')
      if (field) {
        collection.fields.removeByName('whatsapp_webdesigner')
        app.save(collection)
      }
    } catch (e) {
      console.log('Aviso ao reverter whatsapp_webdesigner em site_settings:', e)
    }
  },
)
