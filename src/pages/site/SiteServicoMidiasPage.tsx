import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  obterServicoPorId,
  obterServicoPorSlug,
  atualizarServico,
  SiteServico,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, GripVertical, Star, Trash2, Loader2, ImageIcon, Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { resolverUrlMidia } from '@/lib/watermark'

export interface MidiaServicoItem {
  id: string
  url: string
  isPrincipal: boolean
  isArquivoNativo: boolean
  fileName?: string
}

const MAX_IMAGE_SIZE = 15 * 1024 * 1024 // 15MB

export const SiteServicoMidiasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [servico, setServico] = useState<SiteServico | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [midias, setMidias] = useState<MidiaServicoItem[]>([])
  const [arquivosParaUpload, setArquivosParaUpload] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop de reordenação
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const carregarServico = async () => {
    if (!id) return
    setLoading(true)
    try {
      let serv = await obterServicoPorId(id)
      if (!serv) {
        serv = await obterServicoPorSlug(id)
      }

      if (!serv) {
        toast({ title: 'Serviço não encontrado', variant: 'destructive' })
        navigate('/painel/site/servicos')
        return
      }

      setServico(serv)

      const midiasList: MidiaServicoItem[] = []

      // Foto principal/destaque
      if (serv.arquivo_principal) {
        midiasList.push({
          id: `princ_${serv.arquivo_principal}`,
          url: resolverUrlMidia('site_services', serv.id, serv.arquivo_principal),
          isPrincipal: true,
          isArquivoNativo: true,
          fileName: serv.arquivo_principal,
        })
      } else if (serv.imagem_principal) {
        midiasList.push({
          id: `princ_legacy_${serv.imagem_principal}`,
          url: serv.imagem_principal,
          isPrincipal: true,
          isArquivoNativo: false,
        })
      }

      // Arquivos nativos de galeria
      if (serv.arquivos_galeria && serv.arquivos_galeria.length > 0) {
        serv.arquivos_galeria.forEach((arq) => {
          if (arq !== serv.arquivo_principal) {
            midiasList.push({
              id: `gal_${arq}`,
              url: resolverUrlMidia('site_services', serv.id, arq),
              isPrincipal: false,
              isArquivoNativo: true,
              fileName: arq,
            })
          }
        })
      }

      // URLs de galeria externa
      if (serv.galeria && serv.galeria.length > 0) {
        serv.galeria.forEach((gUrl, idx) => {
          if (gUrl !== serv.imagem_principal) {
            midiasList.push({
              id: `legacy_gal_${idx}_${gUrl.slice(-15)}`,
              url: gUrl,
              isPrincipal: false,
              isArquivoNativo: false,
            })
          }
        })
      }

      setMidias(midiasList)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar mídias do serviço', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarServico()
  }, [id])

  // Seleção de novos arquivos de imagem
  const handleSelecionarArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const rejectedErrors: string[] = []

    Array.from(files).forEach((f) => {
      const isImage = f.type.startsWith('image/')
      if (!isImage) {
        rejectedErrors.push(`"${f.name}" não é uma imagem válida.`)
        return
      }
      if (f.size > MAX_IMAGE_SIZE) {
        rejectedErrors.push(`"${f.name}" excede o limite de 15 MB.`)
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
    if (!servico || arquivosParaUpload.length === 0) return
    setSalvando(true)
    try {
      const primeiraMidiaViraPrincipal =
        !servico.arquivo_principal && !servico.imagem_principal && midias.length === 0

      const arquivosEnvio: {
        arquivo_principal?: File
        arquivos_galeria?: File[]
      } = {}

      if (primeiraMidiaViraPrincipal) {
        arquivosEnvio.arquivo_principal = arquivosParaUpload[0]
        if (arquivosParaUpload.length > 1) {
          arquivosEnvio.arquivos_galeria = arquivosParaUpload.slice(1)
        }
      } else {
        arquivosEnvio.arquivos_galeria = arquivosParaUpload
      }

      await atualizarServico(servico.id, {}, arquivosEnvio)

      toast({
        title: `${arquivosParaUpload.length} foto(s) adicionada(s) com sucesso!`,
      })
      setArquivosParaUpload([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await carregarServico()
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

  // Definir ou remover destaque (foto principal)
  const handleToggleDestaque = async (midiaId: string) => {
    if (!servico) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    setSalvando(true)
    try {
      if (midiaAlvo.isPrincipal) {
        // Remove destaque
        await atualizarServico(servico.id, {
          arquivo_principal: '',
          imagem_principal: '',
        })
        setMidias((prev) => prev.map((m) => (m.id === midiaId ? { ...m, isPrincipal: false } : m)))
        toast({ title: 'Destaque removido' })
      } else {
        // Define como principal/destaque
        if (midiaAlvo.isArquivoNativo && midiaAlvo.fileName) {
          await atualizarServico(servico.id, {
            arquivo_principal: midiaAlvo.fileName,
          })
        } else {
          await atualizarServico(servico.id, {
            imagem_principal: midiaAlvo.url,
          })
        }
        setMidias((prev) =>
          prev.map((m) => ({
            ...m,
            isPrincipal: m.id === midiaId,
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

  // Excluir mídia
  const handleExcluirMidia = async (midiaId: string) => {
    if (!servico) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    if (!confirm('Tem certeza que deseja excluir esta foto do serviço?')) return

    setSalvando(true)
    try {
      const novasMidias = midias.filter((m) => m.id !== midiaId)
      const novasGaleriaUrls = novasMidias.filter((m) => !m.isArquivoNativo).map((m) => m.url)

      const payload: Partial<SiteServico> = {
        galeria: novasGaleriaUrls,
      }

      if (midiaAlvo.isPrincipal) {
        payload.arquivo_principal = ''
        payload.imagem_principal = ''
      }

      if (midiaAlvo.isArquivoNativo && midiaAlvo.fileName) {
        const restantesGaleria = (servico.arquivos_galeria || []).filter(
          (f) => f !== midiaAlvo.fileName,
        )
        payload.arquivos_galeria = restantesGaleria
      }

      await atualizarServico(servico.id, payload)
      setMidias(novasMidias)
      toast({ title: 'Foto excluída com sucesso!' })
    } catch {
      toast({ title: 'Erro ao excluir foto', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // Drag and drop para ordenação com persistência imediata
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index || !servico) return

    const reordenadas = [...midias]
    const [itemMovido] = reordenadas.splice(draggedIndex, 1)
    reordenadas.splice(index, 0, itemMovido)

    setMidias(reordenadas)
    setDraggedIndex(null)
    setDragOverIndex(null)

    try {
      const novasGaleriaUrls = reordenadas.filter((m) => !m.isArquivoNativo).map((m) => m.url)
      const novosArquivosGaleria = reordenadas
        .filter((m) => m.isArquivoNativo && m.fileName)
        .map((m) => m.fileName as string)

      const payloadAtualizacao: Partial<SiteServico> = {
        galeria: novasGaleriaUrls,
      }
      if (novosArquivosGaleria.length > 0) {
        payloadAtualizacao.arquivos_galeria = novosArquivosGaleria
      }

      await atualizarServico(servico.id, payloadAtualizacao)
      toast({ title: 'Ordem das fotos atualizada!' })
    } catch {
      toast({ title: 'Erro ao salvar ordenação', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-16">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link
            to="/painel/site/servicos"
            className="inline-flex items-center text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
            Voltar para serviços
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Mídias do serviço
            </h1>
            <p className="text-sm font-semibold text-[#616F7D] mt-1">
              {servico?.nome || 'Carregando serviço...'}
            </p>
          </div>

          <Badge
            variant="outline"
            className="bg-white border-[#DEE4EA] text-[#2C3E50] text-xs py-1 px-3 self-start sm:self-auto"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
            {midias.length} foto(s)
          </Badge>
        </div>

        {/* Card: Formulário 'Adicionar fotos' */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-heading text-base font-bold text-[#2C3E50]">Adicionar fotos</h2>
            <p className="text-xs text-[#616F7D] mt-0.5">
              Selecione uma ou várias imagens para este serviço.
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
                  {arquivosParaUpload.length} foto(s) selecionada(s)
                </span>
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
                'ADICIONAR FOTOS'
              )}
            </Button>
          </div>
        </div>

        {/* Grade de fotos com drag-handle, destaque e exclusão */}
        <div className="space-y-3">
          <p className="text-xs text-[#616F7D]">
            Arraste as fotos pelo <span className="font-mono font-bold">≡</span> para alterar a
            ordem. A posição é salva automaticamente. Você pode marcar quantas fotos quiser como
            destaque.
          </p>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
              Carregando fotos do serviço...
            </div>
          ) : midias.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
              <ImageIcon className="w-8 h-8 text-[#DEE4EA] mx-auto mb-2" />
              Nenhuma foto cadastrada para este serviço ainda. Use o campo acima para adicionar
              imagens.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {midias.map((midia, index) => {
                const isOver = dragOverIndex === index
                const isDragging = draggedIndex === index

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
                      midia.isPrincipal
                        ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]'
                        : 'border-[#DEE4EA]'
                    } ${isOver ? 'scale-102 border-[#2C3E50]' : ''} ${
                      isDragging ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {/* Visualização da Foto */}
                    <div className="relative aspect-video bg-black/90 overflow-hidden group">
                      <img
                        src={midia.url}
                        alt={`Foto #${index + 1}`}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Cabo de arrastar ≡ */}
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-md bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm z-10"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badge Destaque */}
                      {midia.isPrincipal && (
                        <div className="absolute top-2 right-2 bg-[#D4AF37] text-[#2C3E50] font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider z-10">
                          DESTAQUE
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Info + Ações */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-[#2C3E50]">
                          Foto #{index + 1}
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
                            midia.isPrincipal
                              ? 'bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50]'
                              : 'border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#f4f4f4]'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${midia.isPrincipal ? 'fill-current' : ''}`} />
                          {midia.isPrincipal ? 'Remover destaque' : 'Definir destaque'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirMidia(midia.id)}
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

export default SiteServicoMidiasPage
