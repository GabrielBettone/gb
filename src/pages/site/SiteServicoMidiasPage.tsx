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
  rawIdentifier: string // fileName (se nativo) ou URL (se legado/externo)
  isPrincipal: boolean // Capa do serviço
  isDestaque: boolean // Destaque no carrossel (múltiplo)
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

      const destaquesSet = new Set(serv.destaques_fotos || [])

      // 1. Foto principal (capa) se houver
      if (serv.arquivo_principal) {
        const isDest = destaquesSet.has(serv.arquivo_principal)
        midiasList.push({
          id: `princ_${serv.arquivo_principal}`,
          url: resolverUrlMidia('site_services', serv.id, serv.arquivo_principal),
          rawIdentifier: serv.arquivo_principal,
          isPrincipal: true,
          isDestaque: isDest,
          isArquivoNativo: true,
          fileName: serv.arquivo_principal,
        })
      } else if (serv.imagem_principal) {
        const isDest = destaquesSet.has(serv.imagem_principal)
        midiasList.push({
          id: `princ_legacy_${serv.imagem_principal}`,
          url: serv.imagem_principal,
          rawIdentifier: serv.imagem_principal,
          isPrincipal: true,
          isDestaque: isDest,
          isArquivoNativo: false,
        })
      }

      // 2. Arquivos nativos de galeria
      if (serv.arquivos_galeria && serv.arquivos_galeria.length > 0) {
        serv.arquivos_galeria.forEach((arq) => {
          if (arq !== serv.arquivo_principal) {
            const isDest = destaquesSet.has(arq)
            midiasList.push({
              id: `gal_${arq}`,
              url: resolverUrlMidia('site_services', serv.id, arq),
              rawIdentifier: arq,
              isPrincipal: false,
              isDestaque: isDest,
              isArquivoNativo: true,
              fileName: arq,
            })
          }
        })
      }

      // 3. URLs de galeria externa (apenas as que NÃO forem espelho de arquivos_galeria)
      if (serv.galeria && serv.galeria.length > 0) {
        const pathsNativos = new Set(serv.arquivos_galeria || [])
        serv.galeria.forEach((gUrl, idx) => {
          const jaAdicionada =
            gUrl === serv.imagem_principal ||
            midiasList.some((m) => m.url === gUrl) ||
            Array.from(pathsNativos).some((p) => gUrl.includes(p))

          if (!jaAdicionada) {
            const isDest = destaquesSet.has(gUrl)
            midiasList.push({
              id: `legacy_gal_${idx}_${gUrl.slice(-15)}`,
              url: gUrl,
              rawIdentifier: gUrl,
              isPrincipal: false,
              isDestaque: isDest,
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

  // Ação (a): Alternar Destaque no Carrossel (seleção MÚLTIPLA 0 a N em destaques_fotos)
  const handleToggleDestaqueCarrossel = async (midiaId: string) => {
    if (!servico) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    const novoEstado = !midiaAlvo.isDestaque
    const identificador = midiaAlvo.rawIdentifier

    // Monta a nova lista de identificadores destacados
    const destaquesAtuais = new Set(servico.destaques_fotos || [])
    if (novoEstado) {
      destaquesAtuais.add(identificador)
    } else {
      destaquesAtuais.delete(identificador)
    }
    const novosDestaques = Array.from(destaquesAtuais)

    // Atualização otimista
    setMidias((prev) => prev.map((m) => (m.id === midiaId ? { ...m, isDestaque: novoEstado } : m)))
    setServico({ ...servico, destaques_fotos: novosDestaques })

    setSalvando(true)
    try {
      await atualizarServico(servico.id, {
        destaques_fotos: novosDestaques,
      })
      toast({
        title: novoEstado
          ? 'Foto adicionada aos destaques do carrossel!'
          : 'Foto removida dos destaques do carrossel.',
      })
    } catch {
      toast({ title: 'Erro ao atualizar destaques do carrossel', variant: 'destructive' })
      await carregarServico()
    } finally {
      setSalvando(false)
    }
  }

  // Ação (b): Definir Capa do Serviço (exclusiva: campo arquivo_principal/imagem_principal)
  const handleDefinirCapa = async (midiaId: string) => {
    if (!servico) return
    const midiaAlvo = midias.find((m) => m.id === midiaId)
    if (!midiaAlvo) return

    setSalvando(true)
    try {
      if (midiaAlvo.isPrincipal) {
        // Já é a capa, desmarca
        await atualizarServico(servico.id, {
          arquivo_principal: '',
          imagem_principal: '',
        })
        setMidias((prev) => prev.map((m) => ({ ...m, isPrincipal: false })))
        setServico({ ...servico, arquivo_principal: '', imagem_principal: '' })
        toast({ title: 'Capa do serviço desmarcada' })
      } else {
        // Define esta foto como a capa exclusiva
        const payload: Partial<SiteServico> = {}
        if (midiaAlvo.isArquivoNativo && midiaAlvo.fileName) {
          payload.arquivo_principal = midiaAlvo.fileName
          payload.imagem_principal = ''
        } else {
          payload.imagem_principal = midiaAlvo.url
          payload.arquivo_principal = ''
        }

        await atualizarServico(servico.id, payload)
        setMidias((prev) =>
          prev.map((m) => ({
            ...m,
            isPrincipal: m.id === midiaId,
          })),
        )
        setServico({
          ...servico,
          arquivo_principal: payload.arquivo_principal || '',
          imagem_principal: payload.imagem_principal || '',
        })
        toast({ title: 'Foto definida como Capa do Serviço!' })
      }
    } catch {
      toast({ title: 'Erro ao alterar capa do serviço', variant: 'destructive' })
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

      // Se estava nos destaques_fotos, remover também
      const novosDestaques = (servico.destaques_fotos || []).filter(
        (d) => d !== midiaAlvo.rawIdentifier,
      )
      if (novosDestaques.length !== (servico.destaques_fotos || []).length) {
        payload.destaques_fotos = novosDestaques
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

  // Drag and drop para ordenação (HTML5 Drag + Pointer/Touch) com persistência imediata
  const touchCardRef = useRef<{
    index: number
    active: boolean
    startX: number
    startY: number
  }>({ index: -1, active: false, startX: 0, startY: 0 })

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const reordenarEMPersistir = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || !servico) return

    const reordenadas = [...midias]
    const [itemMovido] = reordenadas.splice(fromIdx, 1)
    reordenadas.splice(toIdx, 0, itemMovido)

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

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    await reordenarEMPersistir(draggedIndex, index)
  }

  // Pointer/Touch events para celular
  const handleCardPointerDown = (index: number, e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) return

    touchCardRef.current = {
      index,
      active: true,
      startX: e.clientX,
      startY: e.clientY,
    }
  }

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!touchCardRef.current.active) return
    const dist = Math.hypot(
      e.clientX - touchCardRef.current.startX,
      e.clientY - touchCardRef.current.startY,
    )
    if (dist > 8 && draggedIndex === null) {
      setDraggedIndex(touchCardRef.current.index)
    }

    if (touchCardRef.current.active && draggedIndex !== null) {
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY)
      const card = elemBelow?.closest('[data-midia-index]') as HTMLElement | null
      if (card && card.dataset.midiaIndex !== undefined) {
        const targetIdx = parseInt(card.dataset.midiaIndex, 10)
        if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
          setDragOverIndex(targetIdx)
        }
      }
    }
  }

  const handleContainerPointerUp = () => {
    if (touchCardRef.current.active) {
      if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
        reordenarEMPersistir(draggedIndex, dragOverIndex)
      }
      touchCardRef.current = { index: -1, active: false, startX: 0, startY: 0 }
      setDraggedIndex(null)
      setDragOverIndex(null)
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

        {/* Grade de fotos com drag-and-drop direto (mouse + toque), Destaque no Carrossel (multi) e Capa do Serviço */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#616F7D]">
            <p>
              Arraste as fotos direto pelo card ou pelo{' '}
              <span className="font-mono font-bold">≡</span> para reordenar (funciona também no
              celular).
            </p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                <strong>Capa:</strong> Foto principal do card
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                <strong>Destaque:</strong> Vai ao carrossel
              </span>
            </div>
          </div>

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
            <div
              onPointerMove={handleContainerPointerMove}
              onPointerUp={handleContainerPointerUp}
              onPointerCancel={handleContainerPointerUp}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {midias.map((midia, index) => {
                const isOver = dragOverIndex === index && draggedIndex !== index
                const isDragging = draggedIndex === index

                return (
                  <div
                    key={midia.id}
                    data-midia-index={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => {
                      setDraggedIndex(null)
                      setDragOverIndex(null)
                    }}
                    onDrop={() => handleDrop(index)}
                    onPointerDown={(e) => handleCardPointerDown(index, e)}
                    className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition-all cursor-grab active:cursor-grabbing select-none ${
                      midia.isPrincipal
                        ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]'
                        : midia.isDestaque
                          ? 'border-[#D4AF37]/60'
                          : 'border-[#DEE4EA]'
                    } ${isOver ? 'scale-102 border-[#2C3E50] shadow-md ring-2 ring-[#2C3E50]' : ''} ${
                      isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                    }`}
                  >
                    {/* Visualização da Foto */}
                    <div className="relative aspect-video bg-[#1C252B] overflow-hidden group flex items-center justify-center">
                      <img
                        src={midia.url}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                      />
                      <img
                        src={midia.url}
                        alt={`Foto #${index + 1}`}
                        crossOrigin="anonymous"
                        className="relative z-1 max-w-full max-h-full object-contain pointer-events-none"
                        loading="lazy"
                      />

                      {/* Cabo de arrastar ≡ */}
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-md bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-sm z-10 pointer-events-none"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badges superiores: Capa e/ou Destaque Carrossel */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10 pointer-events-none">
                        {midia.isPrincipal && (
                          <span className="bg-[#D4AF37] text-[#2C3E50] font-bold text-[9px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            CAPA DO SERVIÇO
                          </span>
                        )}
                        {midia.isDestaque && (
                          <span className="bg-[#2C3E50] text-[#D4AF37] border border-[#D4AF37]/50 font-bold text-[9px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            CARROSSEL
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card: Info + 2 Ações Separadas (Destaque e Capa) + Excluir */}
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

                      <div className="space-y-1.5 pt-1 border-t border-[#DEE4EA]/60">
                        {/* Ação (a): Destaque no Carrossel (seleção MÚLTIPLA com estrela) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleDestaqueCarrossel(midia.id)
                          }}
                          disabled={salvando}
                          className={`w-full py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            midia.isDestaque
                              ? 'bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50]'
                              : 'border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#f4f4f4]'
                          }`}
                          title="Exibir esta foto no carrossel da home"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${midia.isDestaque ? 'fill-current' : ''}`}
                          />
                          {midia.isDestaque ? 'No carrossel (destacada)' : 'Destacar no carrossel'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Ação (b): Definir Capa do Serviço (exclusiva) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDefinirCapa(midia.id)
                            }}
                            disabled={salvando}
                            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                              midia.isPrincipal
                                ? 'bg-[#2C3E50] text-[#D4AF37] hover:bg-[#1E2B37]'
                                : 'border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#f4f4f4]'
                            }`}
                            title="Definir como foto de capa principal do serviço"
                          >
                            {midia.isPrincipal ? '✓ Foto de Capa' : 'Definir Capa'}
                          </button>

                          {/* Excluir Foto */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExcluirMidia(midia.id)
                            }}
                            disabled={salvando}
                            className="py-1.5 px-2 rounded-md border border-[#C4453C]/30 text-[#C4453C] hover:bg-red-50 text-[11px] font-semibold transition-colors"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
