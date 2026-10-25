/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Desvincula o campo produto_principal de orcamentos antes de apagar os produtos
    try {
      const orcCol = app.findCollectionByNameOrId('orcamentos')
      const orcamentos = app.findAllRecords(orcCol)
      for (let i = 0; i < orcamentos.length; i++) {
        const o = orcamentos[i]
        o.set('produto_principal', null)
        app.save(o)
      }
    } catch (e) {
      console.log('Aviso ao desvincular produto_principal de orcamentos:', e)
    }

    // 2. Limpeza total de todas as vendas demo/iniciais
    try {
      const vendasCol = app.findCollectionByNameOrId('vendas')
      const vendas = app.findAllRecords(vendasCol)
      for (let i = 0; i < vendas.length; i++) {
        app.delete(vendas[i])
      }
    } catch (e) {
      console.log('Aviso ao limpar vendas:', e)
    }

    // 3. Limpeza total do cadastro inicial de produtos
    try {
      const prodsCol = app.findCollectionByNameOrId('produtos')
      const produtos = app.findAllRecords(prodsCol)
      for (let i = 0; i < produtos.length; i++) {
        app.delete(produtos[i])
      }
    } catch (e) {
      console.log('Aviso ao limpar produtos:', e)
    }

    // 4. Limpa alertas e importações órfãs associadas
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')
      const alertas = app.findAllRecords(alertasCol)
      for (let i = 0; i < alertas.length; i++) {
        app.delete(alertas[i])
      }
    } catch (e) {
      console.log('Aviso ao limpar alertas:', e)
    }

    try {
      const impCol = app.findCollectionByNameOrId('importacoes')
      const importacoes = app.findAllRecords(impCol)
      for (let i = 0; i < importacoes.length; i++) {
        app.delete(importacoes[i])
      }
    } catch (e) {
      console.log('Aviso ao limpar importacoes:', e)
    }
  },
  (app) => {
    // Reversão vazia
  },
)
