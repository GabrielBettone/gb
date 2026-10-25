import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { dataAdapter } from '@/lib/dataAdapter'
import { useRealtime } from '@/hooks/use-realtime'
import type { Produto, Venda } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Boxes,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Search,
  DollarSign,
  ShoppingCart,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const Produtos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [formError, setFormError] = useState('')

  const { toast } = useToast()

  const carregarDados = useCallback(async () => {
    try {
      const [prodsRes, vendasRes] = await Promise.all([
        dataAdapter.getFullList<Produto>('produtos', {
          sort: 'nome',
        }),
        dataAdapter.getFullList<Venda>('vendas'),
      ])
      setProdutos(prodsRes)
      setVendas(vendasRes)
    } catch (e) {
      console.error('Erro ao carregar produtos:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Realtime
  useRealtime<Produto>('produtos', () => {
    carregarDados()
  })
  useRealtime<Venda>('vendas', () => {
    carregarDados()
  })

  // Calcula valor médio de venda por produto e total de vendas
  const metricasPorProduto = useMemo(() => {
    const mapa: { [prodId: string]: { total: number; qtd: number; media: number } } = {}

    vendas.forEach((v) => {
      if (!mapa[v.produto]) {
        mapa[v.produto] = { total: 0, qtd: 0, media: 0 }
      }
      mapa[v.produto].total += v.valor || 0
      mapa[v.produto].qtd += 1
    })

    Object.keys(mapa).forEach((pId) => {
      mapa[pId].media = mapa[pId].qtd > 0 ? mapa[pId].total / mapa[pId].qtd : 0
    })

    return mapa
  }, [vendas])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    if (!termo) return produtos

    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo)),
    )
  }, [produtos, busca])

  const handleOpenCreate = () => {
    setEditingProduto(null)
    setNome('')
    setDescricao('')
    setFormError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (prod: Produto) => {
    setEditingProduto(prod)
    setNome(prod.nome)
    setDescricao(prod.descricao || '')
    setFormError('')
    setModalOpen(true)
  }

  const handleToggleAtivo = async (prod: Produto) => {
    try {
      await dataAdapter.update<Produto>('produtos', prod.id, {
        ativo: !prod.ativo,
      })
      toast({
        title: prod.ativo ? 'Produto arquivado' : 'Produto reativado',
        description: `${prod.nome} foi ${prod.ativo ? 'arquivado' : 'reativado'} com sucesso.`,
      })
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: eObj?.message || 'Falha ao alterar estado do produto.',
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      setFormError('O nome do produto é obrigatório.')
      return
    }

    setSaving(true)
    try {
      if (editingProduto) {
        await dataAdapter.update<Produto>('produtos', editingProduto.id, {
          nome: nome.trim(),
          descricao: descricao.trim(),
        })
        toast({
          title: 'Produto atualizado',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await dataAdapter.create<Produto>('produtos', {
          nome: nome.trim(),
          descricao: descricao.trim(),
          ativo: true,
        })
        toast({
          title: 'Produto cadastrado',
          description: 'Novo serviço inserido no catálogo da Gesso Bettone.',
        })
      }
      setModalOpen(false)
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      setFormError(eObj?.message || 'Falha ao salvar produto. Verifique os dados.')
    } finally {
      setSaving(false)
    }
  }

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
      {/* HEADER DA PÁGINA COM BUSCA E BOTÃO NOVO PRODUTO */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por nome do produto ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10 text-xs bg-white border-[#DEE4EA] focus:ring-[#2C3E50] rounded-lg"
          />
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-10 text-xs bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo produto
        </Button>
      </div>

      {/* GRID DE CARDS DE PRODUTO (3 col desktop, 2 col tablet, 1 col mobile) */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#5B6470]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2C3E50] mb-2" />
          Carregando catálogo de produtos...
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="p-8 bg-white border border-[#E3E6EA] rounded-xl text-center text-xs text-[#8A94A0]">
          Nenhum produto cadastrado ou correspondente à busca.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {produtosFiltrados.map((prod) => {
            const metricas = metricasPorProduto[prod.id] || { total: 0, qtd: 0, media: 0 }

            return (
              <Card
                key={prod.id}
                className={`rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white flex flex-col justify-between ${
                  prod.ativo ? 'border-[#E3E6EA]' : 'border-dashed border-gray-300 opacity-60'
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="font-heading text-base font-bold text-[#2C3E50] flex items-center gap-2">
                        {prod.nome}
                      </CardTitle>
                      {!prod.ativo && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-gray-400 text-gray-500"
                        >
                          Arquivado
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(prod)}
                        className="h-7 w-7 p-0 text-[#616F7D] hover:text-[#2C3E50]"
                        title="Editar produto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtivo(prod)}
                        className={`h-7 w-7 p-0 ${
                          prod.ativo
                            ? 'text-[#5B6470] hover:text-[#C4453C]'
                            : 'text-[#2C3E50] hover:text-[#1B2631]'
                        }`}
                        title={prod.ativo ? 'Arquivar produto' : 'Reativar produto'}
                      >
                        {prod.ativo ? (
                          <Archive className="w-3.5 h-3.5" />
                        ) : (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-[#5B6470] line-clamp-2 mt-1 leading-relaxed">
                    {prod.descricao || 'Sem descrição cadastrada.'}
                  </p>
                </CardHeader>

                <CardContent className="p-5 pt-3 border-t border-[#E3E6EA] bg-[#F6F7F9]/50 rounded-b-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#8A94A0] block">Valor médio de venda</span>
                    <span className="text-sm font-bold text-[#22272A] font-mono">
                      {formatMoeda(metricas.media)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-[#8A94A0] block">Total de vendas</span>
                    <span className="text-xs font-semibold text-[#2C3E50]">
                      {metricas.qtd} pedidos
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR PRODUTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E3E6EA] rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#D4AF37]" />
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>{' '}
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre serviços e acabamentos em gesso e drywall da Gesso Bettone
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">Nome do produto *</Label>
              <Input
                type="text"
                placeholder="Ex: Forros de gesso, Parede drywall..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">Descrição curta</Label>
              <Textarea
                placeholder="Descreva detalhes do serviço, materiais e finalidade..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={saving}
                rows={3}
                className="text-xs"
              />
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <DialogFooter className="pt-4 border-t border-[#E3E6EA]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar produto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Produtos
