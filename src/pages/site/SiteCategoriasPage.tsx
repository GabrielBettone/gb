import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  SiteCategoria,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const SiteCategoriasPage: React.FC = () => {
  const [categorias, setCategorias] = useState<SiteCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SiteCategoria | null>(null)

  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [ativa, setAtiva] = useState(true)
  const [ordem, setOrdem] = useState(1)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const data = await listarCategorias(false)
      setCategorias(data)
    } catch {
      toast({ title: 'Erro ao carregar categorias', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const gerarSlugAuto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleNomeChange = (val: string) => {
    setNome(val)
    if (!editando) {
      setSlug(gerarSlugAuto(val))
    }
  }

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setSlug('')
    setAtiva(true)
    setOrdem(categorias.length + 1)
    setModalOpen(true)
  }

  const abrirEdicao = (c: SiteCategoria) => {
    setEditando(c)
    setNome(c.nome)
    setSlug(c.slug)
    setAtiva(c.ativa)
    setOrdem(c.ordem || 1)
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !slug.trim()) {
      toast({ title: 'Preencha nome e slug', variant: 'destructive' })
      return
    }

    try {
      if (editando) {
        await atualizarCategoria(editando.id, {
          nome: nome.trim(),
          slug: slug.trim(),
          ativa,
          ordem: Number(ordem),
        })
        toast({ title: 'Categoria atualizada com sucesso!' })
      } else {
        await criarCategoria({
          nome: nome.trim(),
          slug: slug.trim(),
          ativa,
          ordem: Number(ordem),
        })
        toast({ title: 'Categoria criada com sucesso!' })
      }
      setModalOpen(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível salvar a categoria. Verifique a conexão com o banco e tente novamente.'
          : err.message
      toast({
        title: 'Erro ao salvar categoria',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (c: SiteCategoria) => {
    if (!confirm(`Deseja excluir a categoria "${c.nome}"?`)) return
    try {
      await excluirCategoria(c.id)
      toast({ title: 'Categoria excluída com sucesso.' })
      carregar()
    } catch (err: any) {
      console.error('Erro ao excluir categoria:', err)
      toast({
        title: 'Erro ao excluir categoria',
        description: 'Não foi possível excluir a categoria. Tente novamente.',
        variant: 'destructive',
      })
    }
  }
  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Categorias do Site
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Categorias usadas na filtragem de Serviços e Portfólio (ex: Residencial, Comercial,
              Fachadas).
            </p>
          </div>

          <Button
            onClick={abrirNovo}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            NOVA CATEGORIA
          </Button>
        </div>

        {/* Tabela de Categorias */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
              <tr>
                <th className="py-3 px-4">Ordem</th>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE4EA]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#616F7D]">
                    Carregando categorias...
                  </td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#616F7D]">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              ) : (
                categorias.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                      #{c.ordem || 1}
                    </td>
                    <td className="py-3.5 px-4 font-heading font-bold text-sm text-[#2C3E50]">
                      {c.nome}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#616F7D]">{c.slug}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEdicao(c)}
                          className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluir(c)}
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

      {/* Modal Criar / Editar Categoria */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editando ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Nome *</Label>
              <Input
                required
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Comercial"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Slug *</Label>
              <Input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex: comercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between pt-5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ativa</Label>
                <Switch checked={ativa} onCheckedChange={setAtiva} />
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
                Salvar Categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SiteCategoriasPage
