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
import { ArrowLeft, GripVertical, Star, Trash2, Loader2, Plus, ImageIcon } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { resolverUrlMidia } from '@/lib/watermark'

interface MidiaFotoItem {
  id: string
  url: string
  isCapa: boolean
  isArquivoNativo: boolean
  fileName?: string
}

export const SiteProjetoMidiasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [projeto, setProjeto] = useState<SitePortfolioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [fotos, setFotos] = useState<MidiaFotoItem[]>([])
  const [arquivosParaUpload, setArquivosParaUpload] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop de reordenação
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const carregarProjeto = async () => {
    if (!id) return
    setLoading(true)
    try {
      // Tenta carregar por ID ou por Slug
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

      // Monta lista unificada de fotos
      const fotosList: MidiaFotoItem[] = []

      // Capa (se houver)
      if (proj.arquivo_capa) {
        fotosList.push({
          id: `capa_${proj.arquivo_capa}`,
          url: resolverUrlMidia('site_portfolio', proj.id, proj.arquivo_capa),
          isCapa: true,
          isArquivoNativo: true,
          fileName: proj.arquivo_capa,
        })
      } else if (proj.imagem_capa) {
        fotosList.push({
          id: `capa_legacy_${proj.imagem_capa}`,
          url: proj.imagem_capa,
          isCapa: true,
          isArquivoNativo: false,
        })
      }

      // Arquivos de galeria nativos
      if (proj.arquivos_galeria && proj.arquivos_galeria.length > 0) {
        proj.arquivos_galeria.forEach((arq) => {
          // Evita duplicar se já estiver como capa
          if (arq !== proj.arquivo_capa) {
            fotosList.push({
              id: `galeria_${arq}`,
              url: resolverUrlMidia('site_portfolio', proj.id, arq),
              isCapa: false,
              isArquivoNativo: true,
              fileName: arq,
            })
          }
        })
      }

      // URLs de galeria externa
      if (proj.galeria && proj.galeria.length > 0) {
        proj.galeria.forEach((gUrl, idx) => {
          if (gUrl !== proj.imagem_capa) {
            fotosList.push({
              id: `legacy_gal_${idx}_${gUrl.slice(-15)}`,
              url: gUrl,
              isCapa: false,
              isArquivoNativo: false,
            })
          }
        })
      }

      setFotos(fotosList)
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

  // Lidar com seleção de novos arquivos pelo input
  const handleSelecionarArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileList.length === 0) return
    setArquivosParaUpload(fileList)
  }

  // Fazer upload imediato dos arquivos selecionados
  const handleUploadFotos = async () => {
    if (!projeto || arquivosParaUpload.length === 0) return
    setSalvando(true)
    try {
      // Se não havia capa, o primeiro arquivo vira capa nativa
      const primeiraFotoViraCapa =
        !projeto.arquivo_capa && !projeto.imagem_capa && fotos.length === 0

      await atualizarProjeto(
        projeto.id,
        {
          fotos_count: fotos.length + arquivosParaUpload.length,
        },
        {
          arquivo_capa: primeiraFotoViraCapa ? arquivosParaUpload[0] : undefined,
          arquivos_galeria: arquivosParaUpload,
        },
      )

      toast({
        title: `${arquivosParaUpload.length} foto(s) adicionada(s) com sucesso!`,
      })
      setArquivosParaUpload([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await carregarProjeto()
    } catch (err: any) {
      toast({
        title: 'Erro no upload de fotos',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Definir ou remover destaque (capa)
  const handleToggleDestaque = async (fotoId: string) => {
    if (!projeto) return
    const fotoAlvo = fotos.find((f) => f.id === fotoId)
    if (!fotoAlvo) return

    setSalvando(true)
    try {
      if (fotoAlvo.isCapa) {
        // Se já era destaque, desmarca
        await atualizarProjeto(projeto.id, {
          arquivo_capa: '',
          imagem_capa: '',
        })
        setFotos((prev) => prev.map((f) => (f.id === fotoId ? { ...f, isCapa: false } : f)))
        toast({ title: 'Destaque removido' })
      } else {
        // Marca como destaque
        if (fotoAlvo.isArquivoNativo && fotoAlvo.fileName) {
          await atualizarProjeto(projeto.id, {
            arquivo_capa: fotoAlvo.fileName,
          })
        } else {
          await atualizarProjeto(projeto.id, {
            imagem_capa: fotoAlvo.url,
          })
        }
        setFotos((prev) =>
          prev.map((f) => ({
            ...f,
            isCapa: f.id === fotoId,
          })),
        )
        toast({ title: 'Foto definida como destaque com sucesso!' })
      }
    } catch {
      toast({ title: 'Erro ao alterar destaque', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // Excluir foto
  const handleExcluirFoto = async (fotoId: string) => {
    if (!projeto) return
    if (!confirm('Tem certeza que deseja excluir esta foto do projeto?')) return

    const fotoAlvo = fotos.find((f) => f.id === fotoId)
    if (!fotoAlvo) return

    setSalvando(true)
    try {
      const novasFotos = fotos.filter((f) => f.id !== fotoId)

      // Atualiza galeria no PocketBase
      const novasGaleriaUrls = novasFotos.filter((f) => !f.isArquivoNativo).map((f) => f.url)

      const payload: Partial<SitePortfolioItem> = {
        galeria: novasGaleriaUrls,
        fotos_count: novasFotos.length,
      }

      if (fotoAlvo.isCapa) {
        payload.arquivo_capa = ''
        payload.imagem_capa = ''
      }

      await atualizarProjeto(projeto.id, payload)
      setFotos(novasFotos)
      toast({ title: 'Foto excluída com sucesso!' })
    } catch {
      toast({ title: 'Erro ao excluir foto', variant: 'destructive' })
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

    const reordenadas = [...fotos]
    const [itemMovido] = reordenadas.splice(draggedIndex, 1)
    reordenadas.splice(index, 0, itemMovido)

    setFotos(reordenadas)
    setDraggedIndex(null)
    setDragOverIndex(null)

    // Salvar nova ordem no backend
    try {
      const novasGaleriaUrls = reordenadas.filter((f) => !f.isArquivoNativo).map((f) => f.url)

      await atualizarProjeto(projeto.id, {
        galeria: novasGaleriaUrls,
      })
      toast({ title: 'Ordem das fotos atualizada!' })
    } catch {
      toast({ title: 'Erro ao salvar ordenação', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-16">
      {/* TopNav padrão do módulo Site com aba Portfólio ativa */}
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Link Voltar */}
        <div>
          <Link
            to="/painel/site/portfolio"
            className="inline-flex items-center text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
            Voltar para portfólio
          </Link>
        </div>

        {/* Título e Subtítulo idênticos ao layout de referência */}
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
            Mídias do projeto
          </h1>
          <p className="text-sm font-semibold text-[#616F7D] mt-1">
            {projeto?.titulo || 'Carregando projeto...'}
          </p>
        </div>

        {/* Card 1: Formulário 'Adicionar fotos' */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-heading text-base font-bold text-[#2C3E50]">Adicionar fotos</h2>
            <p className="text-xs text-[#616F7D] mt-0.5">
              Selecione uma ou várias imagens para este projeto.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleSelecionarArquivos}
                className="text-xs text-[#2C3E50] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[#DEE4EA] file:text-xs file:font-semibold file:bg-[#f4f4f4] file:text-[#2C3E50] hover:file:bg-[#DEE4EA] cursor-pointer"
              />
              {arquivosParaUpload.length > 0 && (
                <span className="text-xs font-semibold text-[#2C3E50]">
                  {arquivosParaUpload.length} arquivo(s) selecionado(s)
                </span>
              )}
            </div>

            <Button
              type="button"
              disabled={arquivosParaUpload.length === 0 || salvando}
              onClick={handleUploadFotos}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-lg uppercase tracking-wide shadow-sm"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                'ADICIONAR FOTOS'
              )}
            </Button>
          </div>
        </div>

        {/* Card 2: Grid de fotos com drag-handle, destaque e exclusão */}
        <div className="space-y-3">
          <p className="text-xs text-[#616F7D]">
            Arraste as fotos pelo <span className="font-mono font-bold">≡</span> para alterar a
            ordem. A posição é salva automaticamente. Você pode marcar quantas fotos quiser como
            destaque.
          </p>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
              Carregando galeria do projeto...
            </div>
          ) : fotos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <ImageIcon className="w-8 h-8 text-[#DEE4EA] mx-auto mb-2" />
              Nenhuma foto cadastrada para este projeto ainda. Use o campo acima para adicionar.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fotos.map((foto, index) => {
                const isOver = dragOverIndex === index
                const isDragging = draggedIndex === index

                return (
                  <div
                    key={foto.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => {
                      setDraggedIndex(null)
                      setDragOverIndex(null)
                    }}
                    onDrop={() => handleDrop(index)}
                    className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition-all ${
                      foto.isCapa ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]' : 'border-[#DEE4EA]'
                    } ${isOver ? 'scale-102 border-[#2C3E50]' : ''} ${
                      isDragging ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {/* Imagem com Cabo ≡ e Badge DESTAQUE */}
                    <div className="relative aspect-video bg-black/5 overflow-hidden">
                      <img
                        src={foto.url}
                        alt={`Foto #${index + 1}`}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Cabo de arrastar ≡ */}
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-md bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badge Destaque */}
                      {foto.isCapa && (
                        <div className="absolute top-2 right-2 bg-[#D4AF37] text-[#2C3E50] font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                          DESTAQUE
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Foto #N + Ações */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <span className="font-heading font-bold text-xs text-[#2C3E50]">
                        Foto #{index + 1}
                      </span>

                      <div className="flex items-center gap-2 pt-1 border-t border-[#DEE4EA]/60">
                        <button
                          type="button"
                          onClick={() => handleToggleDestaque(foto.id)}
                          disabled={salvando}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                            foto.isCapa
                              ? 'bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50]'
                              : 'border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#f4f4f4]'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${foto.isCapa ? 'fill-current' : ''}`} />
                          {foto.isCapa ? 'Remover destaque' : 'Definir destaque'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirFoto(foto.id)}
                          disabled={salvando}
                          className="py-1.5 px-2.5 rounded-md border border-[#C4453C]/30 text-[#C4453C] hover:bg-red-50 text-[11px] font-semibold transition-colors"
                          title="Excluir foto"
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
