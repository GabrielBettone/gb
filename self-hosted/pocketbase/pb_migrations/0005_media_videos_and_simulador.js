migrate(
  (app) => {
    // 1. Modificar site_services adicionando campos de arquivo se não existirem
    const colServices = app.findCollectionByNameOrId('site_services')
    if (!colServices.fields.getByName('arquivo_principal')) {
      colServices.fields.add(
        new FileField({
          name: 'arquivo_principal',
          maxSelect: 1,
          maxSize: 15728640, // 15MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        }),
      )
    }
    if (!colServices.fields.getByName('arquivos_galeria')) {
      colServices.fields.add(
        new FileField({
          name: 'arquivos_galeria',
          maxSelect: 50,
          maxSize: 15728640,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        }),
      )
    }
    app.save(colServices)

    // 2. Modificar site_portfolio adicionando campos de arquivo e vídeos
    const colPortfolio = app.findCollectionByNameOrId('site_portfolio')
    if (!colPortfolio.fields.getByName('arquivo_capa')) {
      colPortfolio.fields.add(
        new FileField({
          name: 'arquivo_capa',
          maxSelect: 1,
          maxSize: 52428800, // 50MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
            'video/mp4',
            'video/webm',
            'video/quicktime',
          ],
        }),
      )
    }
    if (!colPortfolio.fields.getByName('arquivos_galeria')) {
      colPortfolio.fields.add(
        new FileField({
          name: 'arquivos_galeria',
          maxSelect: 50,
          maxSize: 15728640,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        }),
      )
    }
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
    if (!colPortfolio.fields.getByName('videos')) {
      colPortfolio.fields.add(
        new JSONField({
          name: 'videos',
          maxSize: 1048576,
        }),
      )
    }
    if (!colPortfolio.fields.getByName('videos_count')) {
      colPortfolio.fields.add(
        new NumberField({
          name: 'videos_count',
          min: 0,
        }),
      )
    }
    app.save(colPortfolio)

    // 3. Modificar site_partners adicionando campo de arquivo se não existir
    const colPartners = app.findCollectionByNameOrId('site_partners')
    if (!colPartners.fields.getByName('arquivo_logo')) {
      colPartners.fields.add(
        new FileField({
          name: 'arquivo_logo',
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
    }
    app.save(colPartners)

    // 4. Modificar site_settings adicionando controles do simulador e logo
    const colSettings = app.findCollectionByNameOrId('site_settings')
    if (!colSettings.fields.getByName('simulador_ativo')) {
      colSettings.fields.add(new BoolField({ name: 'simulador_ativo' }))
    }
    if (!colSettings.fields.getByName('simulador_exigir_login')) {
      colSettings.fields.add(new BoolField({ name: 'simulador_exigir_login' }))
    }
    if (!colSettings.fields.getByName('simulador_cota_padrao')) {
      colSettings.fields.add(new NumberField({ name: 'simulador_cota_padrao', min: 0 }))
    }
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

    // 5. Adicionar arquivo_logo e logo_url na coleção orcamento_configuracoes
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

    // 6. Criar coleção simulador_clientes
    if (!app.hasTable('simulador_clientes')) {
      const simuladorClientes = new Collection({
        name: 'simulador_clientes',
        type: 'base',
        listRule: '', // público pode checar/autenticar por telefone
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'telefone', type: 'text', required: true },
          { name: 'nome', type: 'text' },
          { name: 'bloqueado', type: 'bool' },
          { name: 'cota_mensal', type: 'number' },
          { name: 'geracoes_mes_atual', type: 'number' },
          { name: 'mes_referencia', type: 'text' }, // YYYY-MM
          { name: 'pin_acesso', type: 'text' },
          { name: 'ultimo_codigo_confirmacao', type: 'text' },
          { name: 'confirmado', type: 'bool' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_simulador_clientes_tel ON simulador_clientes (telefone)',
        ],
      })
      app.save(simuladorClientes)
    }

    // 7. Criar coleção simulador_historico
    if (!app.hasTable('simulador_historico')) {
      const clientesColId = app.findCollectionByNameOrId('simulador_clientes').id
      const simuladorHistorico = new Collection({
        name: 'simulador_historico',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'cliente', type: 'relation', collectionId: clientesColId, maxSelect: 1 },
          { name: 'telefone', type: 'text' },
          { name: 'servico_nome', type: 'text', required: true },
          { name: 'servico_slug', type: 'text' },
          {
            name: 'foto_original',
            type: 'file',
            maxSelect: 1,
            maxSize: 15728640,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
          {
            name: 'foto_resultado',
            type: 'file',
            maxSelect: 1,
            maxSize: 15728640,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
          { name: 'url_original', type: 'text' },
          { name: 'url_resultado', type: 'text' },
          { name: 'prompt_usado', type: 'text' },
          { name: 'status', type: 'text' }, // concluido | erro
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sim_hist_telefone ON simulador_historico (telefone)',
          'CREATE INDEX idx_sim_hist_created ON simulador_historico (created)',
        ],
      })
      app.save(simuladorHistorico)
    }
  },
  (app) => {
    try {
      const colHist = app.findCollectionByNameOrId('simulador_historico')
      app.delete(colHist)
    } catch (_) {}
    try {
      const colCli = app.findCollectionByNameOrId('simulador_clientes')
      app.delete(colCli)
    } catch (_) {}
  },
)
