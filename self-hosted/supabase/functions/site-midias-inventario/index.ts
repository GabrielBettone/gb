// Supabase Edge Function: site-midias-inventario
// Retorna a lista de todas as fotos, capas, vídeos e logos organizados por pasta para download em ZIP
// Requer usuário autenticado (Header Authorization: Bearer <user_access_token>)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autorização necessária para baixar acervo.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Validar token do usuário
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const itensProjetos: Array<{ pasta: string; nome_arquivo: string; url: string; tipo: string }> =
      []
    const itensServicos: Array<{ pasta: string; nome_arquivo: string; url: string; tipo: string }> =
      []
    const itensParceiros: Array<{
      pasta: string
      nome_arquivo: string
      url: string
      tipo: string
    }> = []

    // 1. Projetos (Portfólio)
    const { data: projetos } = await supabase
      .from('site_portfolio')
      .select('*')
      .order('created_at', { ascending: false })

    for (const p of projetos || []) {
      const pasta = `Projetos/${(p.titulo || 'Projeto').replace(/[\\/:*?"<>|]/g, '_').trim()}`
      if (p.arquivo_capa) {
        itensProjetos.push({
          pasta,
          nome_arquivo: `capa_${p.arquivo_capa.split('/').pop()}`,
          url: p.arquivo_capa,
          tipo: 'storage',
        })
      } else if (p.imagem_capa) {
        itensProjetos.push({
          pasta,
          nome_arquivo: 'capa.jpg',
          url: p.imagem_capa,
          tipo: 'url_externa',
        })
      }

      const galeria = Array.isArray(p.galeria) ? p.galeria : []
      galeria.forEach((img: string, idx: number) => {
        if (img) {
          itensProjetos.push({
            pasta,
            nome_arquivo: `foto_${idx + 1}.jpg`,
            url: img,
            tipo: img.startsWith('http') ? 'url_externa' : 'storage',
          })
        }
      })

      const videos = Array.isArray(p.videos) ? p.videos : []
      videos.forEach((vid: string, idx: number) => {
        if (vid) {
          itensProjetos.push({
            pasta,
            nome_arquivo: `video_${idx + 1}.mp4`,
            url: vid,
            tipo: vid.startsWith('http') ? 'url_externa' : 'storage',
          })
        }
      })
    }

    // 2. Serviços
    const { data: servicos } = await supabase
      .from('site_services')
      .select('*')
      .order('created_at', { ascending: false })

    for (const s of servicos || []) {
      const pasta = `Serviços/${(s.nome || 'Serviço').replace(/[\\/:*?"<>|]/g, '_').trim()}`
      if (s.arquivo_principal) {
        itensServicos.push({
          pasta,
          nome_arquivo: `principal_${s.arquivo_principal.split('/').pop()}`,
          url: s.arquivo_principal,
          tipo: 'storage',
        })
      } else if (s.imagem_principal) {
        itensServicos.push({
          pasta,
          nome_arquivo: 'principal.jpg',
          url: s.imagem_principal,
          tipo: 'url_externa',
        })
      }

      const galeria = Array.isArray(s.galeria) ? s.galeria : []
      galeria.forEach((img: string, idx: number) => {
        if (img) {
          itensServicos.push({
            pasta,
            nome_arquivo: `galeria_${idx + 1}.jpg`,
            url: img,
            tipo: img.startsWith('http') ? 'url_externa' : 'storage',
          })
        }
      })
    }

    // 3. Parceiros
    const { data: parceiros } = await supabase
      .from('site_partners')
      .select('*')
      .order('created_at', { ascending: false })

    for (const part of parceiros || []) {
      const pasta = `Parceiros/${(part.nome || 'Parceiro').replace(/[\\/:*?"<>|]/g, '_').trim()}`
      const logo = part.arquivo_logo || part.logo
      if (logo) {
        itensParceiros.push({
          pasta,
          nome_arquivo: `logo_${part.nome.replace(/\s+/g, '_')}.png`,
          url: logo,
          tipo: logo.startsWith('http') ? 'url_externa' : 'storage',
        })
      }
    }

    const todos = [...itensProjetos, ...itensServicos, ...itensParceiros]

    return new Response(
      JSON.stringify({
        total: todos.length,
        itens: todos,
        contagem: {
          projetos: itensProjetos.length,
          servicos: itensServicos.length,
          parceiros: itensParceiros.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro ao gerar inventário de mídias.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
