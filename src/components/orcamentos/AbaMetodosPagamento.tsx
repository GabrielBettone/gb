import React, { useState } from 'react'
import type { MetodoPagamento } from '@/types'
import {
  criarMetodoPagamento,
  atualizarMetodoPagamento,
  excluirMetodoPagamento,
} from '@/services/orcamentoModulo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Plus, Edit2, Trash2, CreditCard, CheckCircle2, Percent } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AbaMetodosPagamentoProps {
  metodos: MetodoPagamento[]
  onAtualizar: () => void
}

export const AbaMetodosPagamento: React.FC<AbaMetodosPagamentoProps> = ({
  metodos,
  onAtualizar,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<MetodoPagamento | null>(null)
  const [metodoParaExcluir, setMetodoParaExcluir] = useState<MetodoPagamento | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [nome, setNome] = useState('')
  const [descontoAVista, setDescontoAVista] = useState<string>('0')
  const [numeroParcelas, setNumeroParcelas] = useState<string>('1')
  const [condicoesTexto, setCondicoesTexto] = useState('')
  const [padrao, setPadrao] = useState(false)
  const [ativo, setAtivo] = useState(true)

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setDescontoAVista('0')
    setNumeroParcelas('1')
    setCondicoesTexto('À vista com 10% de desconto\nQuitação na assinatura')
    setPadrao(false)
    setAtivo(true)
    setModalOpen(true)
  }

  const abrirEditar = (m: MetodoPagamento) => {
    setEditando(m)
    setNome(m.nome)
    setDescontoAVista((m.desconto_a_vista || 0).toString())
    setNumeroParcelas((m.numero_parcelas || 1).toString())
    const conds = Array.isArray(m.condicoes)
      ? m.condicoes.join('\n')
      : typeof m.condicoes === 'string'
        ? m.condicoes
        : ''
    setCondicoesTexto(conds)
    setPadrao(Boolean(m.padrao))
    setAtivo(m.ativo)
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome do método de pagamento.',
      })
      return
    }

    const descNum = parseFloat(descontoAVista.replace(',', '.')) || 0
    const parcNum = parseInt(numeroParcelas, 10) || 1
    const condicoesArray = condicoesTexto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    setSalvando(true)
    try {
      if (editando) {
        await atualizarMetodoPagamento(editando.id, {
          nome: nome.trim(),
          desconto_a_vista: descNum,
          numero_parcelas: parcNum,
          condicoes: condicoesArray,
          padrao,
          ativo,
        })
        toast({ title: 'Método de pagamento atualizado!' })
      } else {
        await criarMetodoPagamento({
          nome: nome.trim(),
          desconto_a_vista: descNum,
          numero_parcelas: parcNum,
          condicoes: condicoesArray,
          padrao,
          ativo,
        })
        toast({ title: 'Método de pagamento cadastrado!' })
      }
      setModalOpen(false)
      onAtualizar()
    } catch (err: any) {
      console.error('Erro ao salvar método de pagamento:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível salvar o método de pagamento. Verifique a conexão com o banco e tente novamente.'
          : err.message
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar método',
        description: msg,
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!metodoParaExcluir) return
    try {
      await excluirMetodoPagamento(metodoParaExcluir.id)
      toast({ title: 'Método removido com sucesso.' })
      setMetodoParaExcluir(null)
      onAtualizar()
    } catch (err: any) {
      console.error('Erro ao excluir método de pagamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o método. Tente novamente.',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-[#2C3E50]">
            Condições & Métodos de Pagamento
          </h3>
          <p className="text-xs text-[#616F7D]">
            Configuração de descontos à vista (%), parcelas e descritivo exibido nos orçamentos e
            PDF.
          </p>
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Método
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metodos.map((metodo) => {
          const condicoes = Array.isArray(metodo.condicoes)
            ? metodo.condicoes
            : typeof metodo.condicoes === 'string'
              ? [metodo.condicoes]
              : []

          return (
            <div
              key={metodo.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                metodo.ativo
                  ? 'border-[#DEE4EA] hover:border-[#2C3E50]/40'
                  : 'border-dashed opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {metodo.padrao && (
                      <Badge className="text-[10px] bg-[#D4AF37] text-[#2C3E50] font-bold hover:bg-[#D4AF37]">
                        Padrão
                      </Badge>
                    )}
                    {(metodo.desconto_a_vista || 0) > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                      >
                        {metodo.desconto_a_vista}% desc. à vista
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-[#616F7D]">
                        Sem desconto à vista
                      </Badge>
                    )}
                    {!metodo.ativo && (
                      <Badge variant="destructive" className="text-[10px]">
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditar(metodo)}
                      className="h-7 w-7 p-0 text-[#2C3E50] hover:bg-[#E8EDF2]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMetodoParaExcluir(metodo)}
                      className="h-7 w-7 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <h4 className="font-heading font-bold text-base text-[#2C3E50] mt-1">
                  {metodo.nome}
                </h4>
                <span className="text-[11px] text-[#8A94A0] block mt-0.5">
                  Número de parcelas: {metodo.numero_parcelas || 1}
                </span>

                <div className="space-y-1.5 mt-3 pt-3 border-t border-[#DEE4EA]">
                  <span className="text-[10px] font-semibold text-[#8A94A0] uppercase tracking-wider block">
                    Condições descritas no orçamento & PDF:
                  </span>
                  <ul className="space-y-1 text-xs text-[#616F7D]">
                    {condicoes.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#D4AF37] font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#DEE4EA] flex items-center justify-between text-[11px] text-[#8A94A0]">
                <span>{metodo.ativo ? 'Disponível para novos orçamentos' : 'Desativado'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL CRIAR / EDITAR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              {editando ? 'Editar Método de Pagamento' : 'Novo Método de Pagamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="p-5 space-y-4 bg-[#f4f4f4]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Nome do Método <span className="text-red-500">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: À vista no PIX com 10% de desconto"
                className="h-9 text-xs bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Desconto à Vista (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={descontoAVista}
                    onChange={(e) => setDescontoAVista(e.target.value)}
                    className="h-9 text-xs bg-white pl-8"
                  />
                  <Percent className="w-3.5 h-3.5 text-[#8A94A0] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-[#8A94A0] block">
                  Calcula o valor à vista lado a lado no orçamento.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Número de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
                <span className="text-[10px] text-[#8A94A0] block">
                  Gera a agenda de parcelas na aprovação.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Condições de Pagamento (Uma por linha, impressas no PDF)
              </Label>
              <Textarea
                rows={4}
                value={condicoesTexto}
                onChange={(e) => setCondicoesTexto(e.target.value)}
                placeholder="À vista com 10% de desconto&#10;Entrada de 50% e saldo na entrega&#10;Em até 6x sem juros"
                className="text-xs bg-white resize-none font-mono"
              />
            </div>

            <div className="space-y-2 bg-white p-3 rounded-lg border border-[#DEE4EA]">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#2C3E50] block">Ativo</span>
                  <span className="text-[10px] text-[#616F7D] block">
                    Disponível para novos orçamentos
                  </span>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#DEE4EA]/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#2C3E50] block">Método Padrão</span>
                  <span className="text-[10px] text-[#616F7D] block">
                    Selecionado automaticamente nos novos orçamentos
                  </span>
                </div>
                <Switch checked={padrao} onCheckedChange={setPadrao} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
              >
                {salvando ? 'Salvando...' : editando ? 'Atualizar Método' : 'Criar Método'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR EXCLUSÃO */}
      <AlertDialog
        open={Boolean(metodoParaExcluir)}
        onOpenChange={(open) => !open && setMetodoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Excluir Método de Pagamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Tem certeza que deseja remover <strong>{metodoParaExcluir?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Excluir Método
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
