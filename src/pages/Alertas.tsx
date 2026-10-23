import React, { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { RegraAlerta, Alerta, IndicadorTipo, ComparacaoTipo } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Bell,
  Plus,
  Trash2,
  Check,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const Alertas: React.FC = () => {
  const [regras, setRegras] = useState<RegraAlerta[]>([])
  const [historico, setHistorico] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [novaRegraOpen, setNovaRegraOpen] = useState(false)
  const [savingRegra, setSavingRegra] = useState(false)
  const [regraToDelete, setRegraToDelete] = useState<RegraAlerta | null>(null)
  const [deletingRegra, setDeletingRegra] = useState(false)

  // Formulário Nova Regra
  const [nome, setNome] = useState('')
  const [indicador, setIndicador] = useState<IndicadorTipo>('faturamento')
  const [comparacao, setComparacao] = useState<ComparacaoTipo>('abaixo')
  const [limite, setLimite] = useState('')
  const [formError, setFormError] = useState('')

  const { toast } = useToast()

  const carregarDados = useCallback(async () => {
    try {
      const [regrasRes, alertasRes] = await Promise.all([
        pb.collection<RegraAlerta>('regras_alerta').getFullList({
          sort: 'created',
        }),
        pb.collection<Alerta>('alertas').getFullList({
          sort: '-created',
          expand: 'regra',
        }),
      ])
      setRegras(regrasRes)
      setHistorico(alertasRes)
    } catch (e) {
      console.error('Erro ao carregar regras e alertas:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Realtime
  useRealtime<RegraAlerta>('regras_alerta', () => {
    carregarDados()
  })
  useRealtime<Alerta>('alertas', () => {
    carregarDados()
  })

  const handleToggleHabilitada = async (regra: RegraAlerta) => {
    try {
      await pb.collection('regras_alerta').update(regra.id, {
        habilitada: !regra.habilitada,
      })
      toast({
        title: regra.habilitada ? 'Regra pausada' : 'Regra ativada',
        description: `A regra "${regra.nome}" foi atualizada.`,
      })
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar estado',
        description: eObj?.message || 'Falha ao comunicar com o servidor.',
      })
    }
  }

  const handleMarcarComoLido = async (alertaId: string) => {
    try {
      await pb.collection('alertas').update(alertaId, {
        lido: true,
      })
      toast({
        title: 'Alerta marcado como lido',
      })
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao marcar alerta',
        description: eObj?.message || 'Falha ao atualizar o alerta.',
      })
    }
  }

  const handleCreateRegra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      setFormError('O nome da regra é obrigatório.')
      return
    }
    const limFloat = parseFloat(limite.replace(/\./g, '').replace(',', '.'))
    if (isNaN(limFloat) || limFloat < 0) {
      setFormError('Informe um valor limite válido.')
      return
    }

    setSavingRegra(true)
    try {
      await pb.collection('regras_alerta').create({
        nome: nome.trim(),
        indicador,
        comparacao,
        limite: limFloat,
        habilitada: true,
      })

      toast({
        title: 'Regra cadastrada com sucesso!',
        description: 'O monitoramento periódico agora considerará esta nova condição.',
      })
      setNovaRegraOpen(false)
      setNome('')
      setLimite('')
      setFormError('')
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      setFormError(eObj?.message || 'Erro ao registrar nova regra.')
    } finally {
      setSavingRegra(false)
    }
  }

  const handleDeleteRegra = async () => {
    if (!regraToDelete) return
    setDeletingRegra(true)
    try {
      await pb.collection('regras_alerta').delete(regraToDelete.id)
      toast({
        title: 'Regra excluída',
        description: 'A regra de alerta foi removida.',
      })
      setRegraToDelete(null)
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir regra',
        description: eObj?.message || 'Falha ao remover regra do sistema.',
      })
    } finally {
      setDeletingRegra(false)
    }
  }

  const getIndicadorLabel = (tipo: IndicadorTipo) => {
    switch (tipo) {
      case 'faturamento':
        return 'Faturamento'
      case 'ticket_medio':
        return 'Ticket Médio'
      case 'quantidade':
        return 'Quantidade de Vendas'
    }
  }

  const getComparacaoLabel = (tipo: ComparacaoTipo) => {
    switch (tipo) {
      case 'acima':
        return 'acima de'
      case 'abaixo':
        return 'abaixo de'
      case 'variacao_percentual':
        return 'com variação de'
    }
  }

  const formatLimite = (ind: IndicadorTipo, valor: number) => {
    if (ind === 'quantidade') {
      return `${Math.round(valor)} vendas`
    }
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full space-y-8">
      {/* 1. SEÇÃO REGRAS DE ALERTA */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
              Regras de Monitoramento
            </h2>{' '}
            <p className="text-xs text-[#5B6470] mt-0.5">
              Condições automatizadas verificadas continuamente a cada 10 minutos
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setNome('')
              setLimite('')
              setFormError('')
              setNovaRegraOpen(true)
            }}
            className="h-9 text-xs bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nova regra
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#5B6470]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2C3E50] mb-2" />
            Carregando regras...
          </div>
        ) : regras.length === 0 ? (
          <div className="p-6 bg-white border border-[#E3E6EA] rounded-xl text-center text-xs text-[#8A94A0]">
            Nenhuma regra de alerta configurada no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regras.map((regra) => (
              <Card
                key={regra.id}
                className={`rounded-xl border transition-all duration-200 hover:shadow-md bg-white ${
                  regra.habilitada ? 'border-[#E3E6EA]' : 'border-dashed border-gray-300 opacity-60'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-[#22272A] leading-tight">
                      {regra.nome}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={regra.habilitada}
                        onCheckedChange={() => handleToggleHabilitada(regra)}
                        className="scale-75 data-[state=checked]:bg-[#2C3E50]"
                        title={regra.habilitada ? 'Regra ativada' : 'Regra desativada'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRegraToDelete(regra)}
                        className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#C4453C] hover:bg-[#FBEFEE]"
                        title="Excluir regra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <div className="text-xs text-[#5B6470] space-y-1">
                    <p>
                      Alerta quando <strong>{getIndicadorLabel(regra.indicador)}</strong> estiver{' '}
                      <span className="text-[#2C3E50] font-semibold">
                        {getComparacaoLabel(regra.comparacao)}
                      </span>{' '}
                      <strong>{formatLimite(regra.indicador, regra.limite)}</strong>.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#E3E6EA] flex items-center justify-between text-[11px]">
                    <span className="text-[#8A94A0]">Período base: 30 dias</span>
                    <span
                      className={`font-semibold ${
                        regra.habilitada ? 'text-[#2E7D5B]' : 'text-gray-400'
                      }`}
                    >
                      {regra.habilitada ? 'Monitoramento Ativo' : 'Pausada'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 2. SEÇÃO HISTÓRICO DE ALERTAS */}
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D4AF37]" />
            Histórico de Alertas Disparados
          </h2>{' '}
          <p className="text-xs text-[#5B6470] mt-0.5">
            Registro de ocorrências disparadas pelas regras de negócio
          </p>
        </div>

        {historico.length === 0 ? (
          <div className="p-8 bg-white border border-[#E3E6EA] rounded-xl text-center text-xs text-[#8A94A0]">
            Nenhum alerta disparado até o momento. O sistema notificará assim que algum indicador
            sair da margem esperada.
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((alerta) => {
              const isPositivo = alerta.tipo === 'positivo'

              return (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isPositivo
                      ? 'bg-[#EAF6EF] border-[#2E7D5B]/30'
                      : 'bg-[#FBEFEE] border-[#C4453C]/30'
                  } ${alerta.lido ? 'opacity-70 bg-white border-[#E3E6EA]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPositivo
                          ? 'bg-[#2E7D5B]/10 text-[#2E7D5B]'
                          : 'bg-[#C4453C]/10 text-[#C4453C]'
                      }`}
                    >
                      {isPositivo ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-bold text-sm ${
                            isPositivo ? 'text-[#2E7D5B]' : 'text-[#C4453C]'
                          }`}
                        >
                          {alerta.expand?.regra?.nome || 'Alerta de Indicador'}
                        </h4>
                        {!alerta.lido && (
                          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" title="Não lido" />
                        )}
                      </div>
                      <p className="text-xs text-[#22272A] mt-1 leading-relaxed">
                        {alerta.mensagem}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#5B6470]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#8A94A0]" />
                          {new Date(alerta.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          Valor registrado:{' '}
                          <strong className="font-mono text-[#22272A]">
                            {alerta.valor_atual.toLocaleString('pt-BR')}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!alerta.lido && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarcarComoLido(alerta.id)}
                      className="text-xs h-8 px-3 border-[#D5DAE0] bg-white hover:bg-[#F6F7F9] self-end sm:self-center flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 mr-1 text-[#2E7D5B]" />
                      Marcar como lido
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* MODAL NOVA REGRA */}
      <Dialog open={novaRegraOpen} onOpenChange={setNovaRegraOpen}>
        <DialogContent className="max-w-md bg-white border-[#E3E6EA] rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D4AF37]" />
              Nova Regra de Alerta
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Configure margens e metas de indicadores para notificações automáticas
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRegra} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">Nome da regra *</Label>
              <Input
                type="text"
                placeholder="Ex: Faturamento abaixo do mínimo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={savingRegra}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Indicador *</Label>
                <Select
                  value={indicador}
                  onValueChange={(val: any) => setIndicador(val)}
                  disabled={savingRegra}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faturamento" className="text-xs">
                      Faturamento (R$)
                    </SelectItem>
                    <SelectItem value="ticket_medio" className="text-xs">
                      Ticket Médio (R$)
                    </SelectItem>
                    <SelectItem value="quantidade" className="text-xs">
                      Quantidade
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Condição *</Label>
                <Select
                  value={comparacao}
                  onValueChange={(val: any) => setComparacao(val)}
                  disabled={savingRegra}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abaixo" className="text-xs">
                      Abaixo de
                    </SelectItem>
                    <SelectItem value="acima" className="text-xs">
                      Acima de
                    </SelectItem>
                    <SelectItem value="variacao_percentual" className="text-xs">
                      Variação (%)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">
                Valor Limite ({indicador === 'quantidade' ? 'unidades' : 'R$'}) *
              </Label>
              <Input
                type="number"
                step="any"
                placeholder={indicador === 'quantidade' ? '30' : '20000'}
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                disabled={savingRegra}
              />
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <DialogFooter className="pt-4 border-t border-[#E3E6EA]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNovaRegraOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingRegra}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                {savingRegra ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar regra'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE EXCLUSÃO DE REGRA */}
      <AlertDialog
        open={Boolean(regraToDelete)}
        onOpenChange={(val) => !val && setRegraToDelete(null)}
      >
        <AlertDialogContent className="bg-white border-[#E3E6EA] rounded-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-[#22272A]">
              Excluir regra de alerta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5B6470]">
              Tem certeza que deseja excluir a regra <strong>{regraToDelete?.nome}</strong>? O
              sistema deixará de monitorar esta condição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRegra}
              disabled={deletingRegra}
              className="bg-[#C4453C] hover:bg-[#A83B33] text-white text-xs font-semibold"
            >
              {deletingRegra ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Alertas
