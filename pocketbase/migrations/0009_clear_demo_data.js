/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Limpa todos os projetos de portfólio de exemplo
    try {
      const portCol = app.findCollectionByNameOrId('site_portfolio')
      const portfolioRecords = app.findAllRecords(portCol)
      for (let i = 0; i < portfolioRecords.length; i++) {
        app.delete(portfolioRecords[i])
      }
    } catch (e) {
      console.log('Erro ou coleção site_portfolio não encontrada:', e)
    }

    // 2. Limpa todos os parceiros de exemplo e cliques legados
    try {
      const partCol = app.findCollectionByNameOrId('site_partners')
      const partnerRecords = app.findAllRecords(partCol)
      for (let i = 0; i < partnerRecords.length; i++) {
        app.delete(partnerRecords[i])
      }
    } catch (e) {
      console.log('Erro ou coleção site_partners não encontrada:', e)
    }

    // 3. Limpa categorias de parceiros de exemplo
    try {
      const partCatCol = app.findCollectionByNameOrId('partner_categories')
      const partnerCatRecords = app.findAllRecords(partCatCol)
      for (let i = 0; i < partnerCatRecords.length; i++) {
        app.delete(partnerCatRecords[i])
      }
    } catch (e) {
      console.log('Erro ou coleção partner_categories não encontrada:', e)
    }

    // 4. Limpa as imagens default dos serviços (mantendo os dados dos serviços intactos)
    try {
      const servCol = app.findCollectionByNameOrId('site_services')
      const servicesRecords = app.findAllRecords(servCol)
      for (let i = 0; i < servicesRecords.length; i++) {
        const s = servicesRecords[i]
        // Se a imagem for placeholder/default ou link externo antigo, reseta para vazio
        s.set('imagem_principal', '')
        s.set('galeria', JSON.stringify([]))
        app.save(s)
      }
    } catch (e) {
      console.log('Erro ao limpar imagens default dos serviços:', e)
    }
  },
  (app) => {
    // Reversão
  },
)
