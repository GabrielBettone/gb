import React, { useState } from 'react'
import type { ClienteGrupo } from '@/types'
import { criarGrupo, atualizarGrupo, excluirGrupo } from '@/services/orcamentoModulo'
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
import { Plus, Edit2, Trash2, Layers, Check, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AbaGruposProps {
  grupos: ClienteGrupo[]
  onAtualizar: () => void
}

export const AbaGrupos: React.FC<AbaGruposProps> = ({ grupos, onAtualizar }) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<ClienteGrupo | null>(null)
  const [grupoParaExcluir, setGrupoParaExcluir] = useState<ClienteGrupo | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [padrao, setPadrao] = useState(false)

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setDescricao('')
    setAtivo(true)
    setPadrao(false)
    setModalOpen(true)
  }

  const abrirEditar = (g: ClienteGrupo) => {
    setEditando(g)
    setNome(g.nome)
    setDescricao(g.descricao || '')
    setAtivo(g.ativo)
    setPadrao(Boolean(g.padrao))
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome do grupo.',
      })
      return
    }

    setSalvando(true)
    try {
      if (editando) {
        await atualizarGrupo(editando.id, {
          nome: nome.trim(),
          descricao: descricao.trim(),
          ativo,
          padrao,
        })
        toast({ title: 'Grupo atualizado com sucesso!' })
      } else {
        await criarGrupo({
          nome: nome.trim(),
          descricao: descricao.trim(),
          ativo,
          padrao,
        })
        toast({ title: 'Grupo criado com sucesso!' })
      }
      setModalOpen(false)
      onAtualizar()
    } catch (err: any) {
      console.error('Erro ao salvar grupo:', err)
      const rawMsg = err?.message || ''
      const isExpired =
        rawMsg.toLowerCase().includes('jwt expired') ||
        rawMsg.toLowerCase().includes('sessão expirou') ||
        rawMsg.toLowerCase().includes('invalid jwt')
      const msg = isExpired
        ? 'Sua sessão expirou. Faça login novamente.'
        : rawMsg.includes('Failed to') || !rawMsg
          ? 'Não foi possível salvar o grupo. Verifique a conexão com o banco e tente novamente.'
          : rawMsg
      toast({
        variant: 'destructive',
        title: isExpired ? 'Sessão expirada' : 'Erro ao salvar grupo',
        description: msg,
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!grupoParaExcluir) return
    try {
      await excluirGrupo(grupoParaExcluir.id)
      toast({ title: 'Grupo excluído com sucesso.' })
      setGrupoParaExcluir(null)
      onAtualizar()
    } catch (err: any) {
      console.error('Erro ao excluir grupo:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível excluir o grupo. Tente novamente.'
          : err.message
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: msg,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-[#2C3E50]">
            Tabelas de Preços por Grupo de Clientes
          </h3>
          <p className="text-xs text-[#616F7D]">
            Cada grupo permite definir valores personalizados por serviço (ex.: Geral, Senac ASP,
            Arquitetos).
          </p>
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {grupos.map((grupo) => (
          <div
            key={grupo.id}
            className="bg-white rounded-xl border border-[#DEE4EA] p-5 shadow-xs flex flex-col justify-between hover:border-[#2C3E50]/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-[#E8EDF2] text-[#2C3E50] border-[#2C3E50]/20 font-semibold"
                  >
                    Tabela
                  </Badge>
                  {grupo.padrao && (
                    <Badge className="text-[10px] bg-[#D4AF37] text-[#2C3E50] font-bold hover:bg-[#D4AF37]">
                      Padrão
                    </Badge>
                  )}
                  {!grupo.ativo && (
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
                    onClick={() => abrirEditar(grupo)}
                    className="h-7 w-7 p-0 text-[#2C3E50] hover:bg-[#E8EDF2]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGrupoParaExcluir(grupo)}
                    className="h-7 w-7 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <h4 className="font-heading font-bold text-base text-[#2C3E50] mt-1">{grupo.nome}</h4>
              <p className="text-xs text-[#616F7D] mt-2 leading-relaxed">
                {grupo.descricao || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[#DEE4EA] flex items-center justify-between text-[11px] text-[#8A94A0]">
              <span>ID: {grupo.id}</span>
              <span className="flex items-center gap-1 text-[#2C3E50] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                Ativo no Orçamento
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CRIAR / EDITAR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              {editando ? 'Editar Grupo de Clientes' : 'Novo Grupo de Clientes'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="p-5 space-y-4 bg-[#f4f4f4]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Nome do Grupo / Tabela <span className="text-red-500">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Senac ASP ou Construtoras"
                className="h-9 text-xs bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Descrição / Finalidade</Label>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Explique quais tipos de clientes usam esta tabela..."
                className="text-xs bg-white resize-none"
              />
            </div>

            <div className="space-y-2 bg-white p-3 rounded-lg border border-[#DEE4EA]">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#2C3E50] block">Grupo Ativo</span>
                  <span className="text-[10px] text-[#616F7D] block">
                    Disponível para seleção de clientes
                  </span>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#DEE4EA]/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#2C3E50] block">Grupo Padrão</span>
                  <span className="text-[10px] text-[#616F7D] block">
                    Sugerido por padrão nos novos clientes
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
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR EXCLUSÃO */}
      <AlertDialog
        open={Boolean(grupoParaExcluir)}
        onOpenChange={(open) => !open && setGrupoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Excluir Grupo {grupoParaExcluir?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Atenção: remover este grupo afetará clientes e tabelas de preço vinculadas a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Excluir Grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
