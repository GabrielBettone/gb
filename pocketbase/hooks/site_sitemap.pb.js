// Hook para servir sitemap.xml dinâmico em runtime no PocketBase / Skip Cloud
// Atualiza automaticamente sempre que um serviço ou projeto de portfólio for criado ou modificado

routerAdd('GET', '/backend/v1/sitemap.xml', (e) => {
  try {
    const app = e.app

    // 1. Obter URL base do site das configurações
    let siteUrl = 'https://gessobettone.com.br'
    try {
      const cfgList = app.findRecordsByFilter('site_settings', 'chave = "geral"', '-created', 1, 0)
      if (cfgList && cfgList.length > 0) {
        const u = (cfgList[0].getString('site_url') || '').trim()
        if (u) {
          siteUrl = u.replace(/\/+$/, '')
        }
      }
    } catch (_) {}

    const hoje = new Date().toISOString().substring(0, 10)

    // 2. Rotas estáticas públicas
    const rotasEstaticas = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/servicos', changefreq: 'weekly', priority: '0.9' },
      { loc: '/portfolio', changefreq: 'weekly', priority: '0.9' },
      { loc: '/parceiros', changefreq: 'weekly', priority: '0.8' },
      { loc: '/sobre', changefreq: 'monthly', priority: '0.7' },
      { loc: '/contato', changefreq: 'monthly', priority: '0.8' },
      { loc: '/simulador', changefreq: 'weekly', priority: '0.85' },
    ]

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    for (let i = 0; i < rotasEstaticas.length; i++) {
      const r = rotasEstaticas[i]
      xml += '  <url>\n'
      xml += '    <loc>' + siteUrl + r.loc + '</loc>\n'
      xml += '    <lastmod>' + hoje + '</lastmod>\n'
      xml += '    <changefreq>' + r.changefreq + '</changefreq>\n'
      xml += '    <priority>' + r.priority + '</priority>\n'
      xml += '  </url>\n'
    }

    // 3. Serviços ativos dinâmicos
    try {
      const servicos = app.findRecordsByFilter(
        'site_services',
        'ativo = true',
        '-destaque,ordem,created',
        500,
        0,
      )
      for (let s = 0; s < servicos.length; s++) {
        const rec = servicos[s]
        const slug = rec.getString('slug')
        if (!slug) continue
        const updated = rec.getString('updated') || rec.getString('created') || hoje
        const dataMod = updated.substring(0, 10)
        const isDestaque = rec.getBool('destaque')
        const priority = isDestaque ? '0.85' : '0.8'

        xml += '  <url>\n'
        xml += '    <loc>' + siteUrl + '/servicos/' + slug + '</loc>\n'
        xml += '    <lastmod>' + dataMod + '</lastmod>\n'
        xml += '    <changefreq>monthly</changefreq>\n'
        xml += '    <priority>' + priority + '</priority>\n'
        xml += '  </url>\n'
      }
    } catch (errServicos) {
      console.log('Aviso ao consultar site_services para sitemap:', errServicos)
    }

    // 4. Projetos de portfólio ativos dinâmicos
    try {
      const projetos = app.findRecordsByFilter(
        'site_portfolio',
        'ativo = true',
        '-destaque,ordem,created',
        500,
        0,
      )
      for (let p = 0; p < projetos.length; p++) {
        const rec = projetos[p]
        const slug = rec.getString('slug')
        if (!slug) continue
        const updated = rec.getString('updated') || rec.getString('created') || hoje
        const dataMod = updated.substring(0, 10)
        const isDestaque = rec.getBool('destaque')
        const priority = isDestaque ? '0.85' : '0.8'

        xml += '  <url>\n'
        xml += '    <loc>' + siteUrl + '/portfolio/' + slug + '</loc>\n'
        xml += '    <lastmod>' + dataMod + '</lastmod>\n'
        xml += '    <changefreq>monthly</changefreq>\n'
        xml += '    <priority>' + priority + '</priority>\n'
        xml += '  </url>\n'
      }
    } catch (errProjetos) {
      console.log('Aviso ao consultar site_portfolio para sitemap:', errProjetos)
    }

    // 4. Categorias de Parceiros (/parceiros/categoria/:slug)
    try {
      const partCats = $app.findRecordsByFilter(
        'partner_categories',
        'ativa = true',
        'ordem,nome',
        200,
        0,
      )
      for (let c = 0; c < partCats.length; c++) {
        const catRec = partCats[c]
        const catSlug = catRec.getString('slug')
        if (!catSlug) continue
        const updated = catRec.getString('updated') || catRec.getString('created') || hoje
        const dataMod = updated.substring(0, 10)

        xml += '  <url>\n'
        xml += '    <loc>' + siteUrl + '/parceiros/categoria/' + catSlug + '</loc>\n'
        xml += '    <lastmod>' + dataMod + '</lastmod>\n'
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.8</priority>\n'
        xml += '  </url>\n'
      }
    } catch (errCats) {
      console.log('Aviso ao consultar partner_categories para sitemap:', errCats)
    }

    // 5. Parceiros Ativos (/parceiros/:slug) — Inativos fora do sitemap
    try {
      const partners = $app.findRecordsByFilter(
        'site_partners',
        'ativo = true',
        '-destaque,ordem,nome',
        500,
        0,
      )
      for (let pa = 0; pa < partners.length; pa++) {
        const partRec = partners[pa]
        let partSlug = partRec.getString('slug')
        if (!partSlug) {
          const nome = partRec.getString('nome') || ''
          partSlug = nome
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        if (!partSlug) continue

        const updated = partRec.getString('updated') || partRec.getString('created') || hoje
        const dataMod = updated.substring(0, 10)
        const isDestaque = partRec.getBool('destaque')
        const priority = isDestaque ? '0.85' : '0.8'

        xml += '  <url>\n'
        xml += '    <loc>' + siteUrl + '/parceiros/' + partSlug + '</loc>\n'
        xml += '    <lastmod>' + dataMod + '</lastmod>\n'
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>' + priority + '</priority>\n'
        xml += '  </url>\n'
      }
    } catch (errPartners) {
      console.log('Aviso ao consultar site_partners para sitemap:', errPartners)
    }

    xml += '</urlset>'

    e.response.header().set('Content-Type', 'application/xml; charset=utf-8')
    e.response.header().set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    return e.string(200, xml)
  } catch (err) {
    return e.json(500, { error: 'Erro ao gerar sitemap: ' + (err.message || String(err)) })
  }
})
