import React, { useState } from 'react'
import { Check, ChevronDown, BookmarkPlus, Bookmark, Trash2, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OrcamentoEtapa } from '@/services/orcamentoEtapas'
import type { PredefinicaoFiltroEtapas } from '@/services/orcamentoPredefinicoes'
import { getEtapaConfig } from '@/services/orcamentos'

interface FiltroEtapasMultiSelectProps {
  etapasDisponiveis: OrcamentoEtapa[]
  etapasSelecionadas: string[]
  onEtapasChange: (etapas: string[]) => void
  predefinicoes: PredefinicaoFiltroEtapas[]
  onSalvarPredefinicao: (nome: string, etapas: string[]) => Promise<void>
  onExcluirPredefinicao: (id: string) => Promise<void>
}

export const FiltroEtapasMultiSelect: React.FC<FiltroEtapasMultiSelectProps> = ({
  etapasDisponiveis,
  etapasSelecionadas,
  onEtapasChange,
  predefinicoes,
  onSalvarPredefinicao,
  onExcluirPredefinicao,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [modalSalvarOpen, setModalSalvarOpen] = useState(false)
  const [nomePredefinicao, setNomePredefinicao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const todasAsEtapasNomes = etapasDisponiveis.map((e) => e.nome)
  const todasSelecionadas =
    etapasSelecionadas.length === 0 || etapasSelecionadas.length === etapasDisponiveis.length

  const toggleEtapa = (nome: string) => {
    if (todasSelecionadas) {
      // Se estava mostrando tudo e o usuário clica em uma, ele quer focar só nela
      onEtapasChange([nome])
      return
    }

    if (etapasSelecionadas.includes(nome)) {
      const novaLista = etapasSelecionadas.filter((item) => item !== nome)
      // Se desmarcou todas, volta para "todas"
      onEtapasChange(novaLista.length === 0 ? [] : novaLista)
    } else {
      const novaLista = [...etapasSelecionadas, nome]
      // Se marcou todas, limpa para [] que representa todas
      if (novaLista.length === etapasDisponiveis.length) {
        onEtapasChange([])
      } else {
        onEtapasChange(novaLista)
      }
    }
  }

  const selecionarTodas = () => {
    onEtapasChange([])
  }

  const limparSelecao = () => {
    onEtapasChange([])
  }

  const aplicarPredefinicao = (pred: PredefinicaoFiltroEtapas) => {
    // Filtra etapas que existem atualmente
    const validas = pred.etapas.filter((e) =>
      todasAsEtapasNomes.some((nome) => nome.toLowerCase() === e.toLowerCase()),
    )
    onEtapasChange(validas.length > 0 ? validas : pred.etapas)
    setPopoverOpen(false)
  }

  // Verifica se alguma predefinição bate exatamente com a seleção atual
  const predefinicaoAtiva = predefinicoes.find((p) => {
    if (todasSelecionadas) return false
    if (p.etapas.length !== etapasSelecionadas.length) return false
    return p.etapas.every((e) => etapasSelecionadas.includes(e))
  })

  const handleConfirmarSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomePredefinicao.trim()) return

    const etapasParaSalvar = etapasSelecionadas.length > 0 ? etapasSelecionadas : todasAsEtapasNomes

    setSalvando(true)
    try {
      await onSalvarPredefinicao(nomePredefinicao.trim(), etapasParaSalvar)
      setNomePredefinicao('')
      setModalSalvarOpen(false)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirPredefinicao = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await onExcluirPredefinicao(id)
  }

  // Label do botão principal do filtro
  const labelBotao = () => {
    if (todasSelecionadas) {
      return 'Todas as Etapas'
    }
    if (predefinicaoAtiva) {
      return predefinicaoAtiva.nome
    }
    if (etapasSelecionadas.length === 1) {
      return etapasSelecionadas[0]
    }
    return `${etapasSelecionadas.length} etapas selecionadas`
  }

  return (
    <>
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 text-xs px-3 bg-white border-[#DEE4EA] justify-between gap-2 max-w-[240px] truncate ${
                !todasSelecionadas
                  ? 'border-[#2C3E50] ring-1 ring-[#2C3E50]/20 text-[#2C3E50] font-semibold bg-[#F6F7F9]'
                  : 'text-[#22272A]'
              }`}
              title="Filtrar por etapas do funil"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Filter
                  className={`w-3.5 h-3.5 flex-shrink-0 ${!todasSelecionadas ? 'text-[#D4AF37]' : 'text-[#8A94A0]'}`}
                />
                <span className="truncate">{labelBotao()}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!todasSelecionadas && (
                  <span className="w-5 h-5 rounded-full bg-[#2C3E50] text-[#D4AF37] text-[10px] font-bold flex items-center justify-center">
                    {etapasSelecionadas.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#8A94A0]" />
              </div>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-80 p-0 shadow-lg border-[#DEE4EA] bg-white rounded-xl"
            align="end"
          >
            {/* Cabeçalho do Popover */}
            <div className="p-3 border-b border-[#E3E6EA] bg-[#F6F7F9] flex items-center justify-between">
              <span className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider">
                Filtro por Etapas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selecionarTodas}
                  className="text-[11px] font-semibold text-[#2C3E50] hover:underline"
                >
                  Todas
                </button>
                {!todasSelecionadas && (
                  <>
                    <span className="text-xs text-[#DEE4EA]">|</span>
                    <button
                      type="button"
                      onClick={limparSelecao}
                      className="text-[11px] font-semibold text-[#C4453C] hover:underline"
                    >
                      Limpar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* SEÇÃO: PREDEFINIÇÕES SALVAS */}
            <div className="p-2.5 border-b border-[#E3E6EA] bg-white">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A94A0] flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-[#D4AF37]" /> Predefinições Rápidas
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNomePredefinicao('')
                    setModalSalvarOpen(true)
                  }}
                  className="text-[10px] font-semibold text-[#2C3E50] hover:text-[#D4AF37] flex items-center gap-0.5 hover:underline"
                  title="Salvar a combinação atual como uma nova predefinição"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>Salvar atual</span>
                </button>
              </div>

              {predefinicoes.length === 0 ? (
                <p className="text-[11px] text-[#8A94A0] px-1 py-1 italic">
                  Nenhuma predefinição salva ainda.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {predefinicoes.map((pred) => {
                    const isAtiva =
                      !todasSelecionadas &&
                      pred.etapas.length === etapasSelecionadas.length &&
                      pred.etapas.every((e) => etapasSelecionadas.includes(e))

                    return (
                      <div
                        key={pred.id}
                        onClick={() => aplicarPredefinicao(pred)}
                        className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                          isAtiva
                            ? 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50] shadow-xs'
                            : 'bg-[#F6F7F9] text-[#2C3E50] border-[#E3E6EA] hover:bg-[#E8EDF2] hover:border-[#2C3E50]/40'
                        }`}
                        title={`Etapas: ${pred.etapas.join(' + ')}`}
                      >
                        <span>{pred.nome}</span>
                        <span className="text-[10px] opacity-75">({pred.etapas.length})</span>
                        <button
                          type="button"
                          onClick={(e) => handleExcluirPredefinicao(e, pred.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 ml-0.5 transition-opacity"
                          title="Remover predefinição"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO: CHECKLIST MULTI-SELECT DAS ETAPAS */}
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A94A0]">
                Etapas do Funil (Múltipla Escolha)
              </div>
              {etapasDisponiveis.map((etapa) => {
                const config = getEtapaConfig(etapa.nome)
                const selecionada = todasSelecionadas || etapasSelecionadas.includes(etapa.nome)

                return (
                  <button
                    key={etapa.id || etapa.nome}
                    type="button"
                    onClick={() => toggleEtapa(etapa.nome)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                      selecionada && !todasSelecionadas
                        ? 'bg-[#2C3E50]/10 text-[#2C3E50] font-semibold'
                        : 'hover:bg-[#F6F7F9] text-[#22272A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: etapa.cor }}
                      />
                      <span className="truncate">{etapa.nome}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        selecionada
                          ? 'bg-[#2C3E50] border-[#2C3E50] text-[#D4AF37]'
                          : 'border-[#DEE4EA] bg-white'
                      }`}
                    >
                      {selecionada && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Rodapé do Popover com botão de fechar e feedback */}
            <div className="p-2.5 bg-[#F6F7F9] border-t border-[#E3E6EA] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#616F7D]">
                {todasSelecionadas
                  ? 'Exibindo todas as etapas'
                  : `${etapasSelecionadas.length} de ${etapasDisponiveis.length} etapas ativas`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPopoverOpen(false)}
                className="h-7 text-xs font-semibold text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                Concluir
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão rápido para salvar predefinição da seleção atual se não for todas */}
        {!todasSelecionadas && !predefinicaoAtiva && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNomePredefinicao('')
              setModalSalvarOpen(true)
            }}
            className="h-9 px-2 text-xs text-[#2C3E50] hover:text-[#D4AF37] hover:bg-[#2C3E50]/5"
            title="Salvar esta seleção de etapas como uma predefinição rápida"
          >
            <BookmarkPlus className="w-4 h-4 mr-1 text-[#D4AF37]" />
            <span className="hidden lg:inline text-[11px] font-semibold">Salvar Filtro</span>
          </Button>
        )}
      </div>

      {/* MODAL: SALVAR NOVA PREDEFINIÇÃO */}
      <Dialog open={modalSalvarOpen} onOpenChange={setModalSalvarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#2C3E50] flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#D4AF37]" />
              Salvar Predefinição de Etapas
            </DialogTitle>
            <DialogDescription className="text-xs text-[#616F7D]">
              Dê um nome para identificar e reutilizar essa combinação de etapas sempre que precisar
              (ex: "Compromissos", "Trabalhos", etc.).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarSalvar} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2C3E50]">Nome da Predefinição *</label>
              <Input
                value={nomePredefinicao}
                onChange={(e) => setNomePredefinicao(e.target.value)}
                placeholder="Ex: Compromissos ou Trabalhos"
                className="h-9 text-xs bg-white"
                autoFocus
                required
              />
            </div>

            {/* Resumo das etapas selecionadas que serão salvas */}
            <div className="space-y-1.5 p-3 rounded-lg bg-[#F6F7F9] border border-[#E3E6EA]">
              <span className="text-[11px] font-semibold text-[#2C3E50] block">
                Etapas que farão parte desta predefinição:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(etapasSelecionadas.length > 0 ? etapasSelecionadas : todasAsEtapasNomes).map(
                  (etapaNome) => {
                    const conf = getEtapaConfig(etapaNome)
                    return (
                      <Badge
                        key={etapaNome}
                        variant="outline"
                        className={`text-[10px] py-0.5 px-2 font-medium ${conf.corBadge}`}
                      >
                        {conf.label}
                      </Badge>
                    )
                  },
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSalvarOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando || !nomePredefinicao.trim()}
                className="bg-[#2C3E50] text-[#D4AF37] hover:bg-[#1B2631] text-xs font-bold"
              >
                {salvando ? 'Salvando...' : 'Salvar Predefinição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
