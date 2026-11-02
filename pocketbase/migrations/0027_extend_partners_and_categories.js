migrate(
  (app) => {
    // 1. Atualizar partner_categories: adicionar descricao
    const partCatCol = app.findCollectionByNameOrId('partner_categories')
    if (!partCatCol.fields.getByName('descricao')) {
      partCatCol.fields.add(new TextField({ name: 'descricao' }))
    }
    app.save(partCatCol)

    // 2. Atualizar site_partners: adicionar slug, capa, arquivo_capa, email, site, instagram, cidade, endereco
    const partCol = app.findCollectionByNameOrId('site_partners')
    if (!partCol.fields.getByName('slug')) {
      partCol.fields.add(new TextField({ name: 'slug' }))
    }
    if (!partCol.fields.getByName('capa')) {
      partCol.fields.add(new TextField({ name: 'capa' }))
    }
    if (!partCol.fields.getByName('arquivo_capa')) {
      partCol.fields.add(
        new FileField({
          name: 'arquivo_capa',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        }),
      )
    }
    if (!partCol.fields.getByName('email')) {
      partCol.fields.add(new EmailField({ name: 'email' }))
    }
    if (!partCol.fields.getByName('site')) {
      partCol.fields.add(new URLField({ name: 'site' }))
    }
    if (!partCol.fields.getByName('instagram')) {
      partCol.fields.add(new TextField({ name: 'instagram' }))
    }
    if (!partCol.fields.getByName('cidade')) {
      partCol.fields.add(new TextField({ name: 'cidade' }))
    }
    if (!partCol.fields.getByName('endereco')) {
      partCol.fields.add(new TextField({ name: 'endereco' }))
    }
    app.save(partCol)

    // Adicionar índice único para slug em site_partners
    partCol.addIndex('idx_site_partners_slug', true, 'slug', '')
    app.save(partCol)
  },
  (app) => {
    try {
      const partCol = app.findCollectionByNameOrId('site_partners')
      partCol.removeIndex('idx_site_partners_slug')
      app.save(partCol)
    } catch (_) {}
  },
)
