// Hook para inventário de mídias para download (ZIP)
// Acesso restrito a usuários autenticados da área administrativa ($apis.requireAuth())

routerAdd(
  'GET',
  '/backend/v1/site/midias-inventario',
  (e) => {
    try {
      const app = e.app

      // 1. Projetos (Portfólio)
      const projetos = app.findRecordsByFilter('site_portfolio', '', '-created', 500, 0)
      const itensProjetos = []

      for (let i = 0; i < projetos.length; i++) {
        const p = projetos[i]
        const titulo = p.getString('titulo') || 'Projeto ' + (i + 1)
        const pasta = 'Projetos/' + titulo.replace(/[\\/:*?"<>|]/g, '_').trim()

        // Capa (se arquivo ou URL)
        const arqCapa = p.getString('arquivo_capa')
        const imgCapa = p.getString('imagem_capa')
        if (arqCapa) {
          itensProjetos.push({
            pasta: pasta,
            nome_arquivo: 'capa_' + arqCapa,
            url: '/api/files/' + p.collection().id + '/' + p.id + '/' + arqCapa,
            tipo: 'arquivo_nativo',
          })
        } else if (imgCapa) {
          itensProjetos.push({
            pasta: pasta,
            nome_arquivo: 'capa.jpg',
            url: imgCapa,
            tipo: 'url_externa',
          })
        }

        // Galeria (arquivos nativos)
        const galeriaArquivos = p.getStringSlice('arquivos_galeria')
        if (galeriaArquivos && galeriaArquivos.length > 0) {
          for (let g = 0; g < galeriaArquivos.length; g++) {
            const fn = galeriaArquivos[g]
            itensProjetos.push({
              pasta: pasta,
              nome_arquivo: 'midia_' + (g + 1) + '_' + fn,
              url: '/api/files/' + p.collection().id + '/' + p.id + '/' + fn,
              tipo: 'arquivo_nativo',
            })
          }
        }

        // Galeria de Vídeos nativos (arquivos_videos)
        const videosArquivos = p.getStringSlice('arquivos_videos')
        if (videosArquivos && videosArquivos.length > 0) {
          for (let v = 0; v < videosArquivos.length; v++) {
            const vFn = videosArquivos[v]
            itensProjetos.push({
              pasta: pasta,
              nome_arquivo: 'video_' + (v + 1) + '_' + vFn,
              url: '/api/files/' + p.collection().id + '/' + p.id + '/' + vFn,
              tipo: 'arquivo_nativo',
            })
          }
        }

        // Galeria (URLs legado)
        try {
          const galeriaUrls = JSON.parse(p.getString('galeria'))
          if (Array.isArray(galeriaUrls)) {
            for (let u = 0; u < galeriaUrls.length; u++) {
              const urlItem = galeriaUrls[u]
              if (urlItem && typeof urlItem === 'string' && urlItem.startsWith('http')) {
                const ext = urlItem.includes('.mp4') ? '.mp4' : '.jpg'
                itensProjetos.push({
                  pasta: pasta,
                  nome_arquivo: 'midia_antiga_' + (u + 1) + ext,
                  url: urlItem,
                  tipo: 'url_externa',
                })
              }
            }
          }
        } catch (_) {}

        // Vídeos legado (campo videos)
        try {
          const videosUrls = JSON.parse(p.getString('videos'))
          if (Array.isArray(videosUrls)) {
            for (let vu = 0; vu < videosUrls.length; vu++) {
              const vUrl = videosUrls[vu]
              if (vUrl && typeof vUrl === 'string' && vUrl.startsWith('http')) {
                itensProjetos.push({
                  pasta: pasta,
                  nome_arquivo: 'video_antigo_' + (vu + 1) + '.mp4',
                  url: vUrl,
                  tipo: 'url_externa',
                })
              }
            }
          }
        } catch (_) {}
      }

      // 2. Serviços
      const servicos = app.findRecordsByFilter('site_services', '', '-created', 500, 0)
      const itensServicos = []

      for (let s = 0; s < servicos.length; s++) {
        const srv = servicos[s]
        const nome = srv.getString('nome') || 'Serviço ' + (s + 1)
        const pasta = 'Serviços/' + nome.replace(/[\\/:*?"<>|]/g, '_').trim()

        const arqPrinc = srv.getString('arquivo_principal')
        const imgPrinc = srv.getString('imagem_principal')

        if (arqPrinc) {
          itensServicos.push({
            pasta: pasta,
            nome_arquivo: 'principal_' + arqPrinc,
            url: '/api/files/' + srv.collection().id + '/' + srv.id + '/' + arqPrinc,
            tipo: 'arquivo_nativo',
          })
        } else if (imgPrinc) {
          itensServicos.push({
            pasta: pasta,
            nome_arquivo: 'principal.jpg',
            url: imgPrinc,
            tipo: 'url_externa',
          })
        }

        const galeriaArquivos = srv.getStringSlice('arquivos_galeria')
        if (galeriaArquivos && galeriaArquivos.length > 0) {
          for (let g = 0; g < galeriaArquivos.length; g++) {
            const fn = galeriaArquivos[g]
            itensServicos.push({
              pasta: pasta,
              nome_arquivo: 'galeria_' + (g + 1) + '_' + fn,
              url: '/api/files/' + srv.collection().id + '/' + srv.id + '/' + fn,
              tipo: 'arquivo_nativo',
            })
          }
        }

        try {
          const galeriaUrls = JSON.parse(srv.getString('galeria'))
          if (Array.isArray(galeriaUrls)) {
            for (let u = 0; u < galeriaUrls.length; u++) {
              const urlItem = galeriaUrls[u]
              if (urlItem && typeof urlItem === 'string' && urlItem.startsWith('http')) {
                itensServicos.push({
                  pasta: pasta,
                  nome_arquivo: 'galeria_antiga_' + (u + 1) + '.jpg',
                  url: urlItem,
                  tipo: 'url_externa',
                })
              }
            }
          }
        } catch (_) {}
      }

      // 3. Parceiros
      const parceiros = app.findRecordsByFilter('site_partners', '', '-created', 500, 0)
      const itensParceiros = []

      for (let p = 0; p < parceiros.length; p++) {
        const parc = parceiros[p]
        const nome = parc.getString('nome') || 'Parceiro ' + (p + 1)
        const pasta = 'Parceiros/' + nome.replace(/[\\/:*?"<>|]/g, '_').trim()

        const arqLogo = parc.getString('arquivo_logo')
        const logoUrl = parc.getString('logo')

        if (arqLogo) {
          itensParceiros.push({
            pasta: pasta,
            nome_arquivo: 'logo_' + arqLogo,
            url: '/api/files/' + parc.collection().id + '/' + parc.id + '/' + arqLogo,
            tipo: 'arquivo_nativo',
          })
        } else if (logoUrl) {
          itensParceiros.push({
            pasta: pasta,
            nome_arquivo: 'logo.png',
            url: logoUrl,
            tipo: 'url_externa',
          })
        }
      }

      const todosItens = [...itensProjetos, ...itensServicos, ...itensParceiros]

      return e.json(200, {
        total: todosItens.length,
        itens: todosItens,
        contagem: {
          projetos: itensProjetos.length,
          servicos: itensServicos.length,
          parceiros: itensParceiros.length,
        },
      })
    } catch (err) {
      return e.json(500, {
        error: 'Erro ao gerar inventário de mídias: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
