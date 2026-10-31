/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const siteSettings = app.findCollectionByNameOrId('site_settings')
      if (!siteSettings.fields.getByName('linha_descritiva')) {
        siteSettings.fields.add(
          new TextField({
            name: 'linha_descritiva',
            type: 'text',
            required: false,
          }),
        )
        app.save(siteSettings)
      }
    } catch (e) {
      console.log('Aviso ao adicionar linha_descritiva em site_settings:', e)
    }

    try {
      const orcConfig = app.findCollectionByNameOrId('orcamento_configuracoes')
      if (!orcConfig.fields.getByName('linha_descritiva')) {
        orcConfig.fields.add(
          new TextField({
            name: 'linha_descritiva',
            type: 'text',
            required: false,
          }),
        )
        app.save(orcConfig)
      }
    } catch (e) {
      console.log('Aviso ao adicionar linha_descritiva em orcamento_configuracoes:', e)
    }
  },
  (app) => {
    try {
      const siteSettings = app.findCollectionByNameOrId('site_settings')
      const fieldSite = siteSettings.fields.getByName('linha_descritiva')
      if (fieldSite) {
        siteSettings.fields.removeByName('linha_descritiva')
        app.save(siteSettings)
      }
    } catch (e) {
      console.log('Aviso ao reverter linha_descritiva em site_settings:', e)
    }

    try {
      const orcConfig = app.findCollectionByNameOrId('orcamento_configuracoes')
      const fieldOrc = orcConfig.fields.getByName('linha_descritiva')
      if (fieldOrc) {
        orcConfig.fields.removeByName('linha_descritiva')
        app.save(orcConfig)
      }
    } catch (e) {
      console.log('Aviso ao reverter linha_descritiva em orcamento_configuracoes:', e)
    }
  },
)
