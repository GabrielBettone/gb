migrate(
  (app) => {
    const colPortfolio = app.findCollectionByNameOrId('site_portfolio')

    // 1. Adicionar campo arquivos_videos se não existir (até 20 vídeos, 52428800 bytes = 50MB por arquivo)
    if (!colPortfolio.fields.getByName('arquivos_videos')) {
      colPortfolio.fields.add(
        new FileField({
          name: 'arquivos_videos',
          maxSelect: 20,
          maxSize: 52428800, // 50MB
          mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-msvideo'],
        }),
      )
    }

    // 2. Adicionar campo videos (json) para metadados/URLs legadas de vídeo se não existir
    if (!colPortfolio.fields.getByName('videos')) {
      colPortfolio.fields.add(
        new JSONField({
          name: 'videos',
          maxSize: 1048576,
        }),
      )
    }

    // 3. Adicionar campo videos_count (number) se não existir
    if (!colPortfolio.fields.getByName('videos_count')) {
      colPortfolio.fields.add(
        new NumberField({
          name: 'videos_count',
          min: 0,
        }),
      )
    }

    // 4. Também estender arquivo_capa e arquivos_galeria para aceitar mimeTypes de vídeo caso o usuário defina vídeo como capa
    const arqCapa = colPortfolio.fields.getByName('arquivo_capa')
    if (arqCapa && arqCapa.mimeTypes) {
      arqCapa.mimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ]
      arqCapa.maxSize = 52428800 // 50MB
    }

    app.save(colPortfolio)
  },
  (app) => {
    try {
      const colPortfolio = app.findCollectionByNameOrId('site_portfolio')
      colPortfolio.fields.removeByName('arquivos_videos')
      colPortfolio.fields.removeByName('videos')
      colPortfolio.fields.removeByName('videos_count')
      app.save(colPortfolio)
    } catch (_) {}
  },
)
