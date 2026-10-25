import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  obterProjetoPorId,
  obterProjetoPorSlug,
  atualizarProjeto,
  SitePortfolioItem,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  GripVertical,
  Star,
  Trash2,
  Loader2,
  Plus,
  ImageIcon,
  Video,
  Film,
  Play,
  Upload,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { resolverUrlMidia } from '@/lib/watermark'

export type TipoMidia = 'foto' | 'video'

export interface MidiaItem {
  id: string
  url: string
  tipo: TipoMidia
  isCapa: boolean
  isArquivoNativo: boolean
  fileName?: string
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_IMAGE_SIZE = 15 * 1024 * 1024 // 15MB

function detectarTipoMidia(arquivoOuUrl: string | File): TipoMidia {
  if (typeof arquivoOuUrl !== 'string') {
    if (arquivoOuUrl.type.startsWith('video/')) return 'video'
    return 'foto'
  }
  const clean = arquivoOuUrl.toLowerCase().split('?')[0]
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v')
  ) {
    return 'video'
  }
  return 'foto'
}

export const SiteProjetoMidiasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [projeto, setProjeto] = useState<SitePortfolioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [midias, setMidias] = useState<MidiaItem[]>([])
  const [arquivosParaUpload, setArquivosParaUpload] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop de reordenação
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const carregarProjeto = async () => {
    if (!id) return
    setLoading(true)
    try {
      let proj = await obterProjetoPorId(id)
      if (!proj) {
        proj = await obterProjetoPorSlug(id)
      }

      if (!proj) {
        toast({ title: 'Projeto não encontrado', variant: 'destructive' })
        navigate('/painel/site/portfolio')
        return
      }

      setProjeto(proj)

      const midiasList: MidiaItem[] = []

      // Capa (se houver)
      if (proj.arquivo_capa) {
        const tipo = detectarTipoMidia(proj.arquivo_capa)
        midiasList.push({
          id: `capa_${proj.arquivo_capa}`,
          url: resolverUrlMidia('site_portfolio', proj.id, proj.arquivo_capa),
          tipo,
          isCapa: true,
          isArquivoNativo: true,
          fileName: proj.arquivo_capa,
        })
      } else if (proj.imagem_capa) {
        const tipo = detectarTipoMidia(proj.imagem_capa)
        midiasList.push({
          id: `capa_legacy_${proj.imagem_capa}`,
          url: proj.imagem_capa,
          tipo,
          isCapa: true,
          isArquivoNativo: false,
        })
      }

      // Arquivos nativos de galeria de fotos
      if (proj.arquivos_galeria && proj.arquivos_galeria.length > 0) {
        proj.arquivos_galeria.forEach((arq) => {
          if (arq !== proj.arquivo_capa) {
            midiasList.push({
              id: `galeria_${arq}`,
              url: resolverUrlMidia('site_portfolio', proj.id, arq),
              tipo: detectarTipoMidia(arq),
              isCapa: false,
              isArquivoNativo: true,
              fileName: arq,
            })
          }
        })
      }

      // Arquivos nativos de vídeos (arquivos_videos)
      if (proj.arquivos_videos && proj.arquivos_videos.length > 0) {
        proj.arquivos_videos.forEach((vArq) => {
          if (vArq !== proj.arquivo_capa) {
            midiasList.push({
              id: `video_${vArq}`,
              url: resolverUrlMidia('site_portfolio', proj.id, vArq),
              tipo: 'video',
              isCapa: false,
              isArquivoNativo: true,
              fileName: vArq,
            })
          }
        })
      }

      // URLs de galeria externa (fotos ou vídeos)
      if (proj.galeria && proj.galeria.length > 0) {
        proj.galeria.forEach((gUrl, idx) => {
          if (gUrl !== proj.imagem_capa) {
            midiasList.push({
              id: `legacy_gal_${idx}_${gUrl.slice(-15)}`,
              url: gUrl,
              tipo: detectarTipoMidia(gUrl),
              isCapa: false,
              isArquivoNativo: false,
            })
          }
        })
      }

      // URLs de vídeos externos (videos json)
      if (proj.videos && proj.videos.length > 0) {
        proj.videos.forEach((vUrl, idx) => {
          if (vUrl !== proj.imagem_capa) {
            midiasList.push({
              id: `legacy_vid_${idx}_${vUrl.slice(-15)}`,
              url: vUrl,
              tipo: 'video',
              isCapa: false,
              isArquivoNativo: false,
            })
          }
        })
      }

      setMidias(midiasList)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar mídias do projeto', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarProjeto()
  }, [id])

  // Seleção de novos arquivos (fotos e vídeos)
  const handleSelecionarArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const rejectedErrors: string[] = []

    Array.from(files).forEach((f) => {
      const isImage = f.type.startsWith('image/')
      const isVideo = f.type.startsWith('video/')

      if (!isImage && !isVideo) {
        rejectedErrors.push(`"${f.name}" não é foto nem vídeo suportado.`)
        return
      }

      if (isVideo && f.size > MAX_VIDEO_SIZE) {
        rejectedErrors.push(
          `Vídeo "${f.name}" excede o limite de 50 MB (${(f.size / (1024 * 1024)).toFixed(1)} MB).`,
        )
        return
      }

      if (isImage && f.size > MAX_IMAGE_SIZE) {
        rejectedErrors.push(`Foto "${f.name}" excede o limite de 15 MB.`)
        return
      }

      validFiles.push(f)
    })

    if (rejectedErrors.length > 0) {
      toast({
        title: 'Alguns arquivos não foram aceitos',
        description: rejectedErrors.join(' '),
        variant: 'destructive',
      })
    }

    setArquivosParaUpload(validFiles)
  }

  // Fazer upload imediato dos arquivos selecionados
  const handleUploadMidias = async () => {
    if (!projeto || arquivosParaUpload.length === 0) return
    setSalvando(true)
    try {
      const fotosParaEnviar = arquivosParaUpload.filter((f) => f.type.startsWith('image/'))
      const videosParaEnviar = arquivosParaUpload.filter((f) => f.type.startsWith('video/'))

      // Se ainda não houver capa, o primeiro item pode virar capa
      const primeiraMidiaViraCapa =
        !projeto.arquivo_capa && !projeto.imagem_capa && midias.length === 0

      const fotosExistentes = midias.filter((m) => m.tipo === 'foto').length
      const videosExistentes = midias.filter((m) => m.tipo === 'video').length

      const payload: Partial<SitePortfolioItem> = {
        fotos_count: fotosExistentes + fotosParaEnviar.length,
        videos_count: videosExistentes + videosParaEnviar.length,
      }

      const arquivosEnvio: {
        arquivo_capa?: File
        arquivos_galeria?: File[]
        arquivos_videos?: File[]
      } = {}

      if (primeiraMidiaViraCapa) {
        arquivosEnvio.arquivo_capa = arquivosParaUpload[0]
      }
      if (fotosParaEnviar.length > 0) {
        arquivosEnvio.arquivos_galeria = fotosParaEnviar
      }
      if (videosParaEnviar.length > 0) {
        arquivosEnvio.arquivos_videos = videosParaEnviar
      }

      await atualizarProjeto(projeto.id, payload, arquivosEnvio)

      toast({
        title: `${arquivosParaUpload.length} mídia(s) adicionada(s) com sucesso!`,
        description: `${fotosParaEnviar.length} foto(s) e ${videosParaEnviar.length} vídeo(s).`,
      })
      setArquivosParaUpload([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await carregarProjeto()
    } catch (err: any) {
      toast({
        title: 'Erro no upload de mídias',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Definir ou remover destaque (capa)
  const handleToggleDestaque = async (midiaId: string) => {
    if (!projeto) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    setSalvando(true)
    try {
      if (midiaAlvo.isCapa) {
        await atualizarProjeto(projeto.id, {
          arquivo_capa: '',
          imagem_capa: '',
        })
        setMidias((prev) => prev.map((m) => (m.id === midiaId ? { ...m, isCapa: false } : m)))
        toast({ title: 'Destaque removido' })
      } else {
        if (midiaAlvo.isArquivoNativo && midiaAlvo.fileName) {
          await atualizarProjeto(projeto.id, {
            arquivo_capa: midiaAlvo.fileName,
          })
        } else {
          await atualizarProjeto(projeto.id, {
            imagem_capa: midiaAlvo.url,
          })
        }
        setMidias((prev) =>
          prev.map((m) => ({
            ...m,
            isCapa: m.id === midiaId,
          })),
        )
        toast({
          title:
            midiaAlvo.tipo === 'video'
              ? 'Vídeo definido como capa!'
              : 'Foto definida como destaque com sucesso!',
        })
      }
    } catch {
      toast({ title: 'Erro ao alterar destaque', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // Excluir mídia
  const handleExcluirMidia = async (midiaId: string) => {
    if (!projeto) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    const tipoNome = midiaAlvo.tipo === 'video' ? 'este vídeo' : 'esta foto'
    if (!confirm(`Tem certeza que deseja excluir ${tipoNome} do projeto?`)) return

    setSalvando(true)
    try {
      const novasMidias = midias.filter((m) => m.id !== midiaId)

      const novasGaleriaUrls = novasMidias
        .filter((m) => !m.isArquivoNativo && m.tipo === 'foto')
        .map((m) => m.url)
      const novasVideosUrls = novasMidias
        .filter((m) => !m.isArquivoNativo && m.tipo === 'video')
        .map((m) => m.url)

      const fotosCount = novasMidias.filter((m) => m.tipo === 'foto').length
      const videosCount = novasMidias.filter((m) => m.tipo === 'video').length

      const payload: Partial<SitePortfolioItem> = {
        galeria: novasGaleriaUrls,
        videos: novasVideosUrls,
        fotos_count: fotosCount,
        videos_count: videosCount,
      }

      if (midiaAlvo.isCapa) {
        payload.arquivo_capa = ''
        payload.imagem_capa = ''
      }

      // Se for arquivo nativo, removemos do array de arquivos correspondente no PocketBase
      if (midiaAlvo.isArquivoNativo && midiaAlvo.fileName) {
        if (midiaAlvo.tipo === 'foto') {
          const restantesGaleria = (projeto.arquivos_galeria || []).filter(
            (f) => f !== midiaAlvo.fileName,
          )
          payload.arquivos_galeria = restantesGaleria
        } else {
          const restantesVideos = (projeto.arquivos_videos || []).filter(
            (f) => f !== midiaAlvo.fileName,
          )
          payload.arquivos_videos = restantesVideos
        }
      }

      await atualizarProjeto(projeto.id, payload)
      setMidias(novasMidias)
      toast({
        title: `${midiaAlvo.tipo === 'video' ? 'Vídeo' : 'Foto'} excluído(a) com sucesso!`,
      })
    } catch {
      toast({ title: 'Erro ao excluir mídia', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // Drag and drop para ordenação
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index || !projeto) return

    const reordenadas = [...midias]
    const [itemMovido] = reordenadas.splice(draggedIndex, 1)
    reordenadas.splice(index, 0, itemMovido)

    setMidias(reordenadas)
    setDraggedIndex(null)
    setDragOverIndex(null)

    try {
      const novasGaleriaUrls = reordenadas
        .filter((m) => !m.isArquivoNativo && m.tipo === 'foto')
        .map((m) => m.url)
      const novasVideosUrls = reordenadas
        .filter((m) => !m.isArquivoNativo && m.tipo === 'video')
        .map((m) => m.url)

      await atualizarProjeto(projeto.id, {
        galeria: novasGaleriaUrls,
        videos: novasVideosUrls,
      })
      toast({ title: 'Ordem das mídias atualizada!' })
    } catch {
      toast({ title: 'Erro ao salvar ordenação', variant: 'destructive' })
    }
  }

  const totalFotos = midias.filter((m) => m.tipo === 'foto').length
  const totalVideos = midias.filter((m) => m.tipo === 'video').length

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-16">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link
            to="/painel/site/portfolio"
            className="inline-flex items-center text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
            Voltar para portfólio
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Mídias do projeto
            </h1>
            <p className="text-sm font-semibold text-[#616F7D] mt-1">
              {projeto?.titulo || 'Carregando projeto...'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-white border-[#DEE4EA] text-[#2C3E50] text-xs py-1 px-3"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
              {totalFotos} foto(s)
            </Badge>
            <Badge
              variant="outline"
              className="bg-white border-[#DEE4EA] text-[#2C3E50] text-xs py-1 px-3"
            >
              <Film className="w-3.5 h-3.5 mr-1.5 text-[#2C3E50]" />
              {totalVideos} vídeo(s)
            </Badge>
          </div>
        </div>

        {/* Card: Formulário 'Adicionar mídias (Fotos e Vídeos)' */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-heading text-base font-bold text-[#2C3E50]">
              Adicionar fotos e vídeos
            </h2>
            <p className="text-xs text-[#616F7D] mt-0.5">
              Selecione fotos (JPG, PNG, WEBP até 15MB) e vídeos (MP4, WebM até 50MB) para este
              projeto. O tipo é detectado automaticamente.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={handleSelecionarArquivos}
                className="text-xs text-[#2C3E50] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[#DEE4EA] file:text-xs file:font-semibold file:bg-[#f4f4f4] file:text-[#2C3E50] hover:file:bg-[#DEE4EA] cursor-pointer"
              />
              {arquivosParaUpload.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2C3E50]">
                  <span>{arquivosParaUpload.length} arquivo(s) selecionado(s):</span>
                  <span className="text-[#616F7D] font-normal">
                    {arquivosParaUpload.filter((f) => f.type.startsWith('image/')).length} fotos,{' '}
                    {arquivosParaUpload.filter((f) => f.type.startsWith('video/')).length} vídeos
                  </span>
                </div>
              )}
            </div>

            <Button
              type="button"
              disabled={arquivosParaUpload.length === 0 || salvando}
              onClick={handleUploadMidias}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-lg uppercase tracking-wide shadow-sm"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                'ADICIONAR MÍDIAS'
              )}
            </Button>
          </div>
        </div>

        {/* Card: Grid de mídias com drag-handle, badge de tipo, destaque e exclusão */}
        <div className="space-y-3">
          <p className="text-xs text-[#616F7D]">
            Arraste as mídias pelo <span className="font-mono font-bold">≡</span> para alterar a
            ordem. A posição é salva automaticamente. Você pode marcar uma foto ou vídeo como
            destaque (capa).
          </p>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
              Carregando mídias do projeto...
            </div>
          ) : midias.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <ImageIcon className="w-8 h-8 text-[#DEE4EA] mx-auto mb-2" />
              Nenhuma mídia cadastrada para este projeto ainda. Use o campo acima para adicionar
              fotos ou vídeos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {midias.map((midia, index) => {
                const isOver = dragOverIndex === index
                const isDragging = draggedIndex === index
                const isVideo = midia.tipo === 'video'

                return (
                  <div
                    key={midia.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => {
                      setDraggedIndex(null)
                      setDragOverIndex(null)
                    }}
                    onDrop={() => handleDrop(index)}
                    className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition-all ${
                      midia.isCapa ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]' : 'border-[#DEE4EA]'
                    } ${isOver ? 'scale-102 border-[#2C3E50]' : ''} ${
                      isDragging ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {/* Visualização de Mídia (Foto ou Vídeo) */}
                    <div className="relative aspect-video bg-black/90 overflow-hidden group">
                      {isVideo ? (
                        <video
                          src={midia.url}
                          preload="metadata"
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={midia.url}
                          alt={`Mídia #${index + 1}`}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}

                      {/* Cabo de arrastar ≡ */}
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-md bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm z-10"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badge de Tipo: Foto ou Vídeo */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        {midia.isCapa && (
                          <div className="bg-[#D4AF37] text-[#2C3E50] font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            DESTAQUE
                          </div>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs ${
                            isVideo ? 'bg-[#2C3E50] text-white' : 'bg-white/90 text-[#2C3E50]'
                          }`}
                        >
                          {isVideo ? (
                            <>
                              <Film className="w-3 h-3 text-[#D4AF37]" /> Vídeo
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3 text-[#2C3E50]" /> Foto
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Rodapé do Card: Info + Ações */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-[#2C3E50]">
                          {isVideo ? 'Vídeo' : 'Foto'} #{index + 1}
                        </span>
                        {midia.fileName && (
                          <span
                            className="text-[10px] text-[#616F7D] font-mono truncate max-w-[120px]"
                            title={midia.fileName}
                          >
                            {midia.fileName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-[#DEE4EA]/60">
                        <button
                          type="button"
                          onClick={() => handleToggleDestaque(midia.id)}
                          disabled={salvando}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                            midia.isCapa
                              ? 'bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50]'
                              : 'border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#f4f4f4]'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${midia.isCapa ? 'fill-current' : ''}`} />
                          {midia.isCapa ? 'Remover destaque' : 'Definir destaque'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirMidia(midia.id)}
                          disabled={salvando}
                          className="py-1.5 px-2.5 rounded-md border border-[#C4453C]/30 text-[#C4453C] hover:bg-red-50 text-[11px] font-semibold transition-colors"
                          title={`Excluir ${isVideo ? 'vídeo' : 'foto'}`}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteProjetoMidiasPage
