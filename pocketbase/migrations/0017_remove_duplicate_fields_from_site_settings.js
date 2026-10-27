/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('site_settings')
      if (collection.fields.getByName('razao_social')) {
        collection.fields.removeByName('razao_social')
      }
      if (collection.fields.getByName('endereco')) {
        collection.fields.removeByName('endereco')
      }
      if (collection.fields.getByName('exibir_cnpj_pdf')) {
        collection.fields.removeByName('exibir_cnpj_pdf')
      }
      app.save(collection)
    } catch (e) {
      console.log('Aviso ao remover campos duplicados de site_settings:', e)
    }
  },
  (app) => {
    // Reversão opcional
  },
)
