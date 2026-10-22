import React, { useState } from 'react'
import type { Orcamento } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  FileText,
  DollarSign,
  Tag,
  CheckCircle2,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { ETAPAS_CONFIG, parseItens } from '@/services/orcamentos'

interface OrcamentoDetalhesModalProps {
  orcamento: Orcamento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditar: (orcamento: Orcamento) => void
  onConcluir?: (orcamento: Orcamento) => void
  onExcluir: (orcamento: Orcamento) => void
}

export const OrcamentoDetalhesModal: React.FC<OrcamentoDetalhesModalProps> = ({
  orcamento,
  open,
  onOpenChange,
  onEditar,
  onConcluir,
  onExcluir,
}) => {
  if (!orcamento) return null

  const config = ETAPAS_CONFIG[orcamento.status] || {
    label: orcamento.status,
    corBadge: 'bg-gray-100 text-gray-800 border-gray-300',
    corHeader: 'bg-gray-50 text-gray-900 border-gray-200',
  }

  const itens = parseItens(orcamento.itens)

  const formatData = (d?: string) => {
    if (!d) return 'Não definida'
    const dateObj = new Date(d)
    return isNaN(dateObj.getTime())
      ? d
      : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatMoeda = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 bg-white border-b border-[#E3E6EA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-sm shadow-sm border border-[#C2A24B]/30 flex-shrink-0">
                GB
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-[#1C4E3D]">
                    {orcamento.numero}
                  </DialogTitle>
                  <Badge variant="outline" className={`text-[11px] font-medium ${config.corBadge}`}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-[#5B6470] mt-0.5">{orcamento.cliente}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#5B6470] block">Valor Total</span>
              <span className="text-xl font-bold text-[#1C4E3D]">
                {formatMoeda(orcamento.valor_total)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 bg-[#FBFBFC]">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#E3E6EA]">
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Phone className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Contato:</strong>{' '}
                {orcamento.contato || 'Não informado'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <MapPin className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Cidade:</strong>{' '}
                {orcamento.cidade || 'São Pedro'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Tag className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Canal de Origem:</strong>{' '}
                {orcamento.canal_origem}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Layers className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Serviço Principal:</strong>{' '}
                {orcamento.expand?.produto_principal?.nome || 'Sob Medida'}
              </span>
            </div>
          </div>

          {/* Cronograma do Trabalho */}
          <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C4E3D] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C2A24B]" />
              Cronograma do Trabalho (Gantt)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-[#F6F7F9] rounded-lg border border-[#E3E6EA]">
                <span className="text-[11px] text-[#5B6470] block">Início Previsto</span>
                <span className="font-semibold text-[#22272A]">
                  {formatData(orcamento.data_inicio_prevista)}
                </span>
              </div>
              <div className="p-2.5 bg-[#F6F7F9] rounded-lg border border-[#E3E6EA]">
                <span className="text-[11px] text-[#5B6470] block">Término Previsto</span>
                <span className="font-semibold text-[#22272A]">
                  {formatData(orcamento.data_fim_prevista)}
                </span>
              </div>
              <div className="p-2.5 bg-[#F6F7F9] rounded-lg border border-[#E3E6EA]">
                <span className="text-[11px] text-[#5B6470] block">Validade Proposta</span>
                <span className="font-semibold text-[#22272A]">
                  {formatData(orcamento.validade)}
                </span>
              </div>
            </div>
            {orcamento.data_conclusao && (
              <div className="p-2.5 bg-[#EEF4F0] rounded-lg border border-[#1C4E3D]/20 text-xs text-[#1C4E3D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1C4E3D]" />
                <span>
                  Trabalho concluído em: <strong>{formatData(orcamento.data_conclusao)}</strong>{' '}
                  (Venda sincronizada no Dashboard)
                </span>
              </div>
            )}
          </div>

          {/* Itens do Orçamento */}
          <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C4E3D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#C2A24B]" />
              Itens e Serviços Orçados ({itens.length})
            </h4>

            <div className="space-y-2">
              {itens.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#F6F7F9] rounded-lg text-xs border border-[#E3E6EA]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#22272A]">{it.descricao}</span>
                    <span className="text-[11px] text-[#5B6470]">
                      {it.quantidade} {it.unidade || 'un'} x {formatMoeda(it.valor_unitario)}
                    </span>
                  </div>
                  <span className="font-bold text-[#1C4E3D]">{formatMoeda(it.valor_total)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#E3E6EA] flex justify-between text-xs text-[#5B6470]">
              <span>Subtotal: {formatMoeda(orcamento.subtotal)}</span>
              {Boolean(orcamento.desconto) && (
                <span className="text-red-600">Desconto: -{formatMoeda(orcamento.desconto)}</span>
              )}
              <span className="font-bold text-[#1C4E3D] text-sm">
                Total: {formatMoeda(orcamento.valor_total)}
              </span>
            </div>
          </div>

          {/* Observações */}
          {orcamento.observacoes && (
            <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C4E3D]">
                Observações
              </h4>
              <p className="text-xs text-[#5B6470] whitespace-pre-line leading-relaxed">
                {orcamento.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 bg-white border-t border-[#E3E6EA] flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExcluir(orcamento)}
            className="text-[#C4453C] hover:bg-[#FBEFEE] text-xs h-9"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Excluir
          </Button>

          <div className="flex items-center gap-2">
            {orcamento.status !== 'Concluídos' && onConcluir && (
              <Button
                size="sm"
                onClick={() => onConcluir(orcamento)}
                className="bg-[#1C4E3D] hover:bg-[#163D30] text-white text-xs h-9 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Marcar como Concluído
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditar(orcamento)}
              className="text-xs h-9 border-[#E3E6EA]"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Editar Orçamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
