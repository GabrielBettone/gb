migrate(
  (app) => {
    // 1. Adicionar campo arquivo_logo na coleção site_settings
    const colSettings = app.findCollectionByNameOrId('site_settings')
    if (!colSettings.fields.getByName('arquivo_logo')) {
      colSettings.fields.add(
        new FileField({
          name: 'arquivo_logo',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
    }
    if (!colSettings.fields.getByName('logo_url')) {
      colSettings.fields.add(new TextField({ name: 'logo_url' }))
    }
    app.save(colSettings)

    // 2. Adicionar campo arquivo_logo na coleção orcamento_configuracoes
    const colOrcConfig = app.findCollectionByNameOrId('orcamento_configuracoes')
    if (!colOrcConfig.fields.getByName('arquivo_logo')) {
      colOrcConfig.fields.add(
        new FileField({
          name: 'arquivo_logo',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
    }
    if (!colOrcConfig.fields.getByName('logo_url')) {
      colOrcConfig.fields.add(new TextField({ name: 'logo_url' }))
    }
    app.save(colOrcConfig)
  },
  (app) => {
    try {
      const colSettings = app.findCollectionByNameOrId('site_settings')
      if (colSettings.fields.getByName('arquivo_logo')) {
        colSettings.fields.removeByName('arquivo_logo')
      }
      if (colSettings.fields.getByName('logo_url')) {
        colSettings.fields.removeByName('logo_url')
      }
      app.save(colSettings)
    } catch (_) {}

    try {
      const colOrcConfig = app.findCollectionByNameOrId('orcamento_configuracoes')
      if (colOrcConfig.fields.getByName('arquivo_logo')) {
        colOrcConfig.fields.removeByName('arquivo_logo')
      }
      if (colOrcConfig.fields.getByName('logo_url')) {
        colOrcConfig.fields.removeByName('logo_url')
      }
      app.save(colOrcConfig)
    } catch (_) {}
  },
)
