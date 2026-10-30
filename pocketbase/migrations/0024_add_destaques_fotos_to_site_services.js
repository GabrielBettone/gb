migrate(
  (app) => {
    const colServices = app.findCollectionByNameOrId('site_services')
    if (!colServices.fields.getByName('destaques_fotos')) {
      colServices.fields.add(
        new JSONField({
          name: 'destaques_fotos',
        }),
      )
      app.save(colServices)
    }
  },
  (app) => {
    try {
      const colServices = app.findCollectionByNameOrId('site_services')
      const f = colServices.fields.getByName('destaques_fotos')
      if (f) {
        colServices.fields.removeByName('destaques_fotos')
        app.save(colServices)
      }
    } catch (_) {}
  },
)
