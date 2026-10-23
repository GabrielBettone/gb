migrate(
  (app) => {
    // 1. site_categories
    const siteCategories = new Collection({
      name: 'site_categories',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'ativa', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_site_categories_slug ON site_categories (slug)'],
    })
    app.save(siteCategories)

    // 2. site_services
    const siteServices = new Collection({
      name: 'site_services',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: true },
        { name: 'destaque', type: 'bool' },
        { name: 'ativo', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'descricao_curta', type: 'text' },
        { name: 'descricao_longa', type: 'text' },
        { name: 'beneficios', type: 'json' },
        { name: 'imagem_principal', type: 'text' },
        { name: 'galeria', type: 'json' },
        { name: 'meta_title', type: 'text' },
        { name: 'meta_description', type: 'text' },
        { name: 'keywords', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_site_services_slug ON site_services (slug)',
        'CREATE INDEX idx_site_services_destaque ON site_services (destaque)',
        'CREATE INDEX idx_site_services_ativo ON site_services (ativo)',
      ],
    })
    app.save(siteServices)

    // 3. site_portfolio
    const sitePortfolio = new Collection({
      name: 'site_portfolio',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: true },
        { name: 'subtitulo', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'detalhes_tecnicos', type: 'json' },
        { name: 'imagem_capa', type: 'text' },
        { name: 'galeria', type: 'json' },
        { name: 'fotos_count', type: 'number' },
        { name: 'destaque', type: 'bool' },
        { name: 'ativo', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'meta_title', type: 'text' },
        { name: 'meta_description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_site_portfolio_slug ON site_portfolio (slug)',
        'CREATE INDEX idx_site_portfolio_destaque ON site_portfolio (destaque)',
        'CREATE INDEX idx_site_portfolio_ativo ON site_portfolio (ativo)',
      ],
    })
    app.save(sitePortfolio)

    // 4. site_testimonials
    const siteTestimonials = new Collection({
      name: 'site_testimonials',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '', // permite que visitantes no site público possam enviar depoimento
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cidade', type: 'text' },
        { name: 'texto', type: 'text', required: true },
        { name: 'nota', type: 'number' },
        { name: 'aprovado', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_site_testimonials_aprovado ON site_testimonials (aprovado)'],
    })
    app.save(siteTestimonials)

    // 5. partner_categories
    const partnerCategories = new Collection({
      name: 'partner_categories',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'ativa', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_partner_categories_slug ON partner_categories (slug)'],
    })
    app.save(partnerCategories)

    // 6. site_partners
    const sitePartners = new Collection({
      name: 'site_partners',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'categoria', type: 'text' },
        { name: 'papel', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'logo', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'destaque', type: 'bool' },
        { name: 'ativo', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_site_partners_destaque ON site_partners (destaque)',
        'CREATE INDEX idx_site_partners_ativo ON site_partners (ativo)',
      ],
    })
    app.save(sitePartners)

    // 7. partner_clicks
    const partnerClicks = new Collection({
      name: 'partner_clicks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '', // público ao clicar no WhatsApp do parceiro
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'parceiro_id', type: 'text', required: true },
        { name: 'parceiro_nome', type: 'text' },
        { name: 'data', type: 'date', required: true },
        { name: 'ano_mes', type: 'text' }, // formato 'YYYY-MM' para filtros fáceis
        { name: 'visitor_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_partner_clicks_parceiro ON partner_clicks (parceiro_id)',
        'CREATE INDEX idx_partner_clicks_anomes ON partner_clicks (ano_mes)',
        'CREATE INDEX idx_partner_clicks_data ON partner_clicks (data)',
      ],
    })
    app.save(partnerClicks)

    // 8. site_settings
    const siteSettings = new Collection({
      name: 'site_settings',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'chave', type: 'text', required: true },
        { name: 'nome_site', type: 'text' },
        { name: 'whatsapp_principal', type: 'text' },
        { name: 'email_contato', type: 'text' },
        { name: 'mensagem_orcamento', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'cnpj', type: 'text' },
        { name: 'exibir_depoimentos', type: 'bool' },
        { name: 'cidades_atendidas', type: 'json' },
        { name: 'pagina_parceiros_ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_site_settings_chave ON site_settings (chave)'],
    })
    app.save(siteSettings)

    // 9. site_analytics_events
    const siteAnalyticsEvents = new Collection({
      name: 'site_analytics_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '', // público registra visualizações e cliques
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['pageview', 'click_whatsapp', 'contato', 'click_servico', 'view_categoria'],
          maxSelect: 1,
        },
        { name: 'pagina', type: 'text' },
        { name: 'servico_slug', type: 'text' },
        { name: 'servico_nome', type: 'text' },
        { name: 'categoria_nome', type: 'text' },
        { name: 'visitor_id', type: 'text' },
        { name: 'data', type: 'date', required: true },
        { name: 'data_dia', type: 'text' }, // 'YYYY-MM-DD'
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_site_analytics_tipo ON site_analytics_events (tipo)',
        'CREATE INDEX idx_site_analytics_dia ON site_analytics_events (data_dia)',
        'CREATE INDEX idx_site_analytics_visitor ON site_analytics_events (visitor_id)',
      ],
    })
    app.save(siteAnalyticsEvents)
  },
  (app) => {
    const toDelete = [
      'site_analytics_events',
      'site_settings',
      'partner_clicks',
      'site_partners',
      'partner_categories',
      'site_testimonials',
      'site_portfolio',
      'site_services',
      'site_categories',
    ]
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
