import React, { useState, useEffect } from 'react'
import type { Orcamento, OrcamentoConfiguracao } from '@/types'
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
  Printer,
  CreditCard,
} from 'lucide-react'
import {
  ETAPAS_CONFIG,
  getEtapaConfig,
  parseItens,
  parseItensPorLocal,
} from '@/services/orcamentos'
import { obterConfiguracoesOrcamento } from '@/services/orcamentoModulo'
import { obterConfiguracoes as obterConfiguracoesSite } from '@/services/site'
import { imprimirOrcamentoPDF } from '@/services/orcamentoPDF'
import { formatarCondicoesPrazo } from '@/services/orcamentoCondicoes'

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
  const [configGeral, setConfigGeral] = useState<OrcamentoConfiguracao | null>(null)

  useEffect(() => {
    if (open) {
      Promise.all([obterConfiguracoesOrcamento(), obterConfiguracoesSite()])
        .then(([orcConfig, siteConfig]) => {
          setConfigGeral({
            ...orcConfig,
            razao_social: siteConfig.razao_social || orcConfig.razao_social,
            nome_fantasia: siteConfig.nome_site || orcConfig.nome_fantasia,
            cnpj: siteConfig.cnpj || orcConfig.cnpj,
            email: siteConfig.email_contato || orcConfig.email,
            telefone: siteConfig.whatsapp_principal || orcConfig.telefone,
            exibir_cnpj_padrao: siteConfig.exibir_cnpj_pdf !== false,
            logo_url: siteConfig.logo_url || orcConfig.logo_url,
          })
        })
        .catch(console.error)
    }
  }, [open])

  if (!orcamento) return null

  const config = getEtapaConfig(orcamento.status)

  const itens = parseItens(orcamento.itens)
  const itensPorLocal = parseItensPorLocal(orcamento.itens_por_local)

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

  const valorAPrazo = orcamento.valor_a_prazo ?? orcamento.valor_total ?? 0
  const valorAVista = orcamento.valor_a_vista ?? valorAPrazo
  const metodoAtual = orcamento.expand?.metodo_pagamento
  const percentualDescAVista = metodoAtual?.desconto_a_vista || 0
  const condicoesPrazo = formatarCondicoesPrazo(metodoAtual, valorAPrazo)

  const handleImprimir = async () => {
    if (orcamento) {
      await imprimirOrcamentoPDF(orcamento, configGeral)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 bg-white border-b border-[#E3E6EA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-sm shadow-sm border border-[#D4AF37]/30 flex-shrink-0">
                GB
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50]">
                    Orçamento {orcamento.numero}
                  </DialogTitle>{' '}
                  <Badge variant="outline" className={`text-[11px] font-medium ${config.corBadge}`}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-[#5B6470] mt-0.5">{orcamento.cliente}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#5B6470] block">Valor Total</span>
              <span className="text-xl font-bold text-[#2C3E50]">
                {formatMoeda(orcamento.valor_total)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 bg-[#FBFBFC]">
          {/* SEÇÃO VALORES DO ORÇAMENTO: À VISTA VS. A PRAZO */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-3 shadow-xs">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              Valores do Orçamento: À Vista vs. A Prazo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/50 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                  VALOR À VISTA
                  {percentualDescAVista > 0 ? ` (COM ${percentualDescAVista}% DE DESCONTO)` : ''}
                </span>
                <div className="text-2xl font-bold text-emerald-800">
                  {formatMoeda(valorAVista)}
                </div>
                <p className="text-[11px] text-emerald-700">
                  {valorAPrazo > valorAVista
                    ? `Economia de ${formatMoeda(valorAPrazo - valorAVista)} para pagamento no PIX / Transferência imediata.`
                    : 'Pagamento no PIX / Transferência imediata.'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#DEE4EA] bg-[#f8fafc] space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C3E50] block">
                  VALOR A PRAZO
                </span>
                <div className="text-2xl font-bold text-[#2C3E50]">{formatMoeda(valorAPrazo)}</div>
                <div className="text-[11px] text-[#616F7D] space-y-0.5">
                  {condicoesPrazo.map((cond, i) => (
                    <p key={i}>{cond}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Informações Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#E3E6EA]">
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Phone className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Contato:</strong>{' '}
                {orcamento.contato || 'Não informado'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <MapPin className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Cidade:</strong>{' '}
                {orcamento.cidade || 'São Pedro'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Tag className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Canal de Origem:</strong>{' '}
                {orcamento.canal_origem}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#5B6470]">
              <Layers className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>
                <strong className="text-[#22272A]">Serviço Principal:</strong>{' '}
                {orcamento.expand?.produto_principal?.nome || 'Sob Medida'}
              </span>
            </div>
          </div>

          {/* Cronograma do Trabalho */}
          <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-2.5">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
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
              <div className="p-2.5 bg-[#E8EDF2] rounded-lg border border-[#2C3E50]/20 text-xs text-[#2C3E50] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C3E50]" />
                <span>
                  Trabalho concluído em: <strong>{formatData(orcamento.data_conclusao)}</strong>{' '}
                  (Venda sincronizada no Dashboard)
                </span>
              </div>
            )}
          </div>

          {/* Tabela de Itens por Local / Ambiente */}
          {itensPorLocal.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                Detalhamento por Ambiente / Local ({itensPorLocal.length})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F7F9] text-[#5B6470] border-b border-[#E3E6EA]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Local</th>
                      <th className="py-2 px-3 font-semibold">Serviço / Descrição</th>
                      <th className="py-2 px-3 text-center font-semibold">Metragem</th>
                      <th className="py-2 px-3 text-right font-semibold">Valor Unit.</th>
                      <th className="py-2 px-3 text-right font-semibold">Total Linha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E6EA]">
                    {itensPorLocal.map((linha, idx) => (
                      <tr key={idx} className="hover:bg-[#F6F7F9]/50">
                        <td className="py-2 px-3 font-bold text-[#2C3E50]">{linha.local}</td>
                        <td className="py-2 px-3 text-[#22272A]">{linha.servico}</td>
                        <td className="py-2 px-3 text-center font-mono font-medium">
                          {linha.metragem} m²
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatMoeda(linha.valor)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#2C3E50]">
                          {formatMoeda(linha.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Itens do Orçamento */}
          {itens.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                Itens e Serviços Gerais ({itens.length})
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
                    <span className="font-bold text-[#2C3E50]">{formatMoeda(it.valor_total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#E3E6EA] flex justify-between text-xs text-[#5B6470]">
                <span>Subtotal: {formatMoeda(orcamento.subtotal)}</span>
                {Boolean(orcamento.desconto) && (
                  <span className="text-red-600">Desconto: -{formatMoeda(orcamento.desconto)}</span>
                )}
                <span className="font-bold text-[#2C3E50] text-sm">
                  Total: {formatMoeda(orcamento.valor_total)}
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          {orcamento.observacoes && (
            <div className="bg-white p-4 rounded-xl border border-[#E3E6EA] space-y-1.5">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImprimir}
              className="text-xs h-9 border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#E8EDF2]"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
              Imprimir / PDF
            </Button>

            {orcamento.status !== 'Concluídos' && onConcluir && (
              <Button
                size="sm"
                onClick={() => onConcluir(orcamento)}
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] text-xs h-9 font-bold"
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
