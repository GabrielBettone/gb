migrate(
  (app) => {
    try {
      const portCol = app.findCollectionByNameOrId('site_portfolio')
      const rec = app.findFirstRecordByData(
        'site_portfolio',
        'slug',
        'dra-camila-ferraz-odontologia-especializada',
      )
      rec.set(
        'videos',
        JSON.stringify([
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        ]),
      )
      rec.set('videos_count', 1)
      app.save(rec)
    } catch (_) {}
  },
  (app) => {},
)
