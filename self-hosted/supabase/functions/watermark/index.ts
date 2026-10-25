// Supabase Edge Function: watermark
// Aplica a marca d'água elegante da Gesso Bettone diretamente no servidor usando Deno
// Aceita multipart/form-data com o arquivo 'file' ou JSON { url: string }
// Faz o upload no bucket 'public-media' do Supabase Storage e retorna a URL pública gerada.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const contentType = req.headers.get('content-type') || ''
    let fileBuffer: Uint8Array | null = null
    let fileName = `media_${Date.now()}.jpg`
    let mimeType = 'image/jpeg'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      fileBuffer = new Uint8Array(await file.arrayBuffer())
      fileName = file.name || fileName
      mimeType = file.type || mimeType
    } else {
      const json = await req.json().catch(() => ({}))
      if (json.url) {
        const res = await fetch(json.url)
        if (!res.ok) throw new Error(`Falha ao baixar imagem remota: ${res.statusText}`)
        fileBuffer = new Uint8Array(await res.arrayBuffer())
        fileName = json.url.split('/').pop() || fileName
      }
    }

    if (!fileBuffer) {
      return new Response(JSON.stringify({ error: 'Arquivo inválido ou ausente.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Salva o arquivo no bucket 'public-media'
    const storagePath = `uploads/${Date.now()}_${fileName.replace(/\s+/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('public-media')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('public-media').getPublicUrl(storagePath)

    return new Response(
      JSON.stringify({
        sucesso: true,
        url: publicUrl,
        path: storagePath,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro ao processar imagem.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
