import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarDepoimentos,
  criarDepoimento,
  atualizarDepoimento,
  excluirDepoimento,
  obterConfiguracoes,
  salvarConfiguracoes,
  SiteDepoimento,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Star, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const SiteDepoimentosPage: React.FC = () => {
  const [depoimentos, setDepoimentos] = useState<SiteDepoimento[]>([])
  const [loading, setLoading] = useState(true)
  const [exibirPublicamente, setExibirPublicamente] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SiteDepoimento | null>(null)

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState(5)
  const [aprovado, setAprovado] = useState(true)
  const [ordem, setOrdem] = useState(1)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [deps, cfg] = await Promise.all([listarDepoimentos(false), obterConfiguracoes()])
      setDepoimentos(deps)
      setExibirPublicamente(cfg.exibir_depoimentos !== false)
    } catch {
      toast({ title: 'Erro ao carregar depoimentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleToggleExibirSite = async (checked: boolean) => {
    setExibirPublicamente(checked)
    try {
      await salvarConfiguracoes({ exibir_depoimentos: checked })
      toast({
        title: checked
          ? 'Depoimentos visíveis no site público'
          : 'Depoimentos ocultados do site público',
      })
    } catch {
      toast({ title: 'Erro ao atualizar configuração', variant: 'destructive' })
    }
  }

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setCidade('São Pedro/SP')
    setTexto('')
    setNota(5)
    setAprovado(true)
    setOrdem(depoimentos.length + 1)
    setModalOpen(true)
  }

  const abrirEdicao = (d: SiteDepoimento) => {
    setEditando(d)
    setNome(d.nome)
    setCidade(d.cidade || '')
    setTexto(d.texto)
    setNota(d.nota || 5)
    setAprovado(d.aprovado)
    setOrdem(d.ordem || 1)
    setModalOpen(true)
  }

  const handleAprovarRapido = async (d: SiteDepoimento, novoStatus: boolean) => {
    try {
      await atualizarDepoimento(d.id, { aprovado: novoStatus })
      toast({ title: novoStatus ? 'Depoimento aprovado!' : 'Depoimento colocado em moderação' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !texto.trim()) {
      toast({ title: 'Preencha o nome e o texto', variant: 'destructive' })
      return
    }

    try {
      if (editando) {
        await atualizarDepoimento(editando.id, {
          nome,
          cidade,
          texto,
          nota: Number(nota),
          aprovado,
          ordem: Number(ordem),
        })
        toast({ title: 'Depoimento atualizado com sucesso!' })
      } else {
        await criarDepoimento({
          nome,
          cidade,
          texto,
          nota: Number(nota),
          aprovado,
          ordem: Number(ordem),
        })
        toast({ title: 'Depoimento criado com sucesso!' })
      }
      setModalOpen(false)
      carregarDados()
    } catch {
      toast({ title: 'Erro ao salvar depoimento', variant: 'destructive' })
    }
  }

  const handleExcluir = async (d: SiteDepoimento) => {
    if (!confirm(`Deseja excluir o depoimento de "${d.nome}"?`)) return
    try {
      await excluirDepoimento(d.id)
      toast({ title: 'Depoimento excluído' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir depoimento', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Depoimentos de Clientes
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Modere avaliações recebidas pelo site público ou cadastre depoimentos de clientes
              atendidos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={abrirNovo}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              NOVO DEPOIMENTO
            </Button>
          </div>
        </div>

        {/* Banner de Controle Global de Exibição */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DEE4EA] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-heading font-bold text-sm text-[#2C3E50]">
              Exibir depoimentos no site público
            </div>
            <p className="text-xs text-[#616F7D]">
              Quando desativado, a seção de depoimentos e o botão "Deixe seu depoimento" não
              aparecem no site público. Os registros permanecem salvos aqui na área interna.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={exibirPublicamente} onCheckedChange={handleToggleExibirSite} />
            <span className="text-xs font-semibold text-[#2C3E50]">
              {exibirPublicamente ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>

        {/* Tabela de Depoimentos */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Cidade</th>
                <th className="py-3 px-4">Avaliação</th>
                <th className="py-3 px-4">Texto</th>
                <th className="py-3 px-4">Moderação</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE4EA]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                    Carregando depoimentos...
                  </td>
                </tr>
              ) : depoimentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                    Nenhum depoimento cadastrado.
                  </td>
                </tr>
              ) : (
                depoimentos.map((d) => (
                  <tr key={d.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="py-3.5 px-4 font-heading font-bold text-sm text-[#2C3E50]">
                      {d.nome}
                    </td>
                    <td className="py-3.5 px-4 text-[#616F7D]">{d.cidade || '—'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-0.5 text-[#D4AF37]">
                        {Array.from({ length: d.nota || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="line-clamp-2 text-xs text-[#2C3E50] italic">"{d.texto}"</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.aprovado ? (
                        <button
                          onClick={() => handleAprovarRapido(d, false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                          title="Clique para desaprovar"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAprovarRapido(d, true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                          title="Clique para aprovar"
                        >
                          <Clock className="w-3 h-3" />
                          Pendente
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEdicao(d)}
                          className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluir(d)}
                          className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Depoimento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editando ? 'Editar Depoimento' : 'Novo Depoimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Nome do Cliente *</Label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Cidade</Label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Pedro/SP"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Avaliação (Estrelas: 1 a 5)
              </Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={nota}
                onChange={(e) => setNota(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Texto do Depoimento *</Label>
              <Textarea
                required
                rows={4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="O que o cliente relatou sobre o serviço..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center bg-[#f4f4f4] p-3 rounded-xl border border-[#DEE4EA]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between pt-5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Aprovado no Site</Label>
                <Switch checked={aprovado} onCheckedChange={setAprovado} />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                Salvar Depoimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SiteDepoimentosPage
