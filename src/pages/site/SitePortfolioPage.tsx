import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarPortfolio,
  listarCategorias,
  criarProjeto,
  atualizarProjeto,
  excluirProjeto,
  SitePortfolioItem,
  SiteCategoria,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Star, ExternalLink, Images } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const SitePortfolioPage: React.FC = () => {
  const [projetos, setProjetos] = useState<SitePortfolioItem[]>([])
  const [categorias, setCategorias] = useState<SiteCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SitePortfolioItem | null>(null)

  // Campos
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [categoria, setCategoria] = useState('Residencial')
  const [subtitulo, setSubtitulo] = useState('')
  const [cidade, setCidade] = useState('São Pedro/SP')
  const [descricao, setDescricao] = useState('')
  const [imagemCapa, setImagemCapa] = useState('')
  const [galeriaStr, setGaleriaStr] = useState('')
  const [detalhesStr, setDetalhesStr] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [ordem, setOrdem] = useState(1)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [ports, cats] = await Promise.all([listarPortfolio(false), listarCategorias(false)])
      setProjetos(ports)
      setCategorias(cats)
    } catch {
      toast({ title: 'Erro ao carregar portfólio', variant: 'destructive' })
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

  const handleTituloChange = (val: string) => {
    setTitulo(val)
    if (!editando) {
      setSlug(gerarSlugAuto(val))
    }
  }

  const abrirNovo = () => {
    setEditando(null)
    setTitulo('')
    setSlug('')
    setCategoria(categorias[0]?.nome || 'Residencial')
    setSubtitulo('')
    setCidade('São Pedro/SP')
    setDescricao('')
    setImagemCapa('')
    setGaleriaStr('')
    setDetalhesStr('')
    setDestaque(false)
    setAtivo(true)
    setOrdem(projetos.length + 1)
    setModalOpen(true)
  }

  const abrirEdicao = (p: SitePortfolioItem) => {
    setEditando(p)
    setTitulo(p.titulo)
    setSlug(p.slug)
    setCategoria(p.categoria)
    setSubtitulo(p.subtitulo || '')
    setCidade(p.cidade || 'São Pedro/SP')
    setDescricao(p.descricao)
    setImagemCapa(p.imagem_capa)
    setGaleriaStr((p.galeria || []).join('\n'))
    setDetalhesStr((p.detalhes_tecnicos || []).join('\n'))
    setDestaque(p.destaque)
    setAtivo(p.ativo)
    setOrdem(p.ordem || 1)
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !slug.trim()) {
      toast({ title: 'Preencha título e slug', variant: 'destructive' })
      return
    }

    const galeria = galeriaStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const detalhesTecnicos = detalhesStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const payload: Partial<SitePortfolioItem> = {
      titulo,
      slug,
      categoria,
      subtitulo,
      cidade,
      descricao,
      imagem_capa: imagemCapa,
      galeria,
      fotos_count: galeria.length > 0 ? galeria.length : 1,
      detalhes_tecnicos: detalhesTecnicos,
      destaque,
      ativo,
      ordem: Number(ordem),
    }

    try {
      if (editando) {
        await atualizarProjeto(editando.id, payload)
        toast({ title: 'Projeto atualizado com sucesso!' })
      } else {
        await criarProjeto(payload)
        toast({ title: 'Projeto criado com sucesso!' })
      }
      setModalOpen(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar projeto',
        description: err.message || 'Verifique se o slug é único.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (p: SitePortfolioItem) => {
    if (!confirm(`Deseja excluir o projeto "${p.titulo}"?`)) return
    try {
      await excluirProjeto(p.id)
      toast({ title: 'Projeto excluído' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir projeto', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Portfólio de Obras
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Gerencie os projetos e obras exibidos no site (/portfolio e página inicial).
            </p>
          </div>

          <Button
            onClick={abrirNovo}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            NOVO PROJETO
          </Button>
        </div>

        {/* Tabela de Projetos */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
              <tr>
                <th className="py-3 px-4">Ordem</th>
                <th className="py-3 px-4">Projeto</th>
                <th className="py-3 px-4">Categoria / Cidade</th>
                <th className="py-3 px-4">Fotos</th>
                <th className="py-3 px-4">Destaque</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE4EA]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#616F7D]">
                    Carregando portfólio...
                  </td>
                </tr>
              ) : projetos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#616F7D]">
                    Nenhum projeto cadastrado.
                  </td>
                </tr>
              ) : (
                projetos.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                      #{p.ordem || 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.imagem_capa ? (
                          <img
                            src={p.imagem_capa}
                            alt={p.titulo}
                            className="w-12 h-9 rounded-lg object-cover border border-[#DEE4EA]"
                          />
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-[#DEE4EA] flex items-center justify-center text-[10px] font-bold text-[#616F7D]">
                            SEM CAPA
                          </div>
                        )}
                        <div>
                          <span className="font-heading font-bold text-sm text-[#2C3E50] block">
                            {p.titulo}
                          </span>
                          <span className="text-[11px] text-[#616F7D] font-mono">
                            /portfolio/{p.slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#2C3E50]">{p.categoria}</span>
                        <span className="text-[11px] text-[#616F7D]">{p.cidade || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#616F7D]">
                      <span className="inline-flex items-center gap-1">
                        <Images className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {p.fotos_count || p.galeria?.length || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.destaque ? (
                        <Badge className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-[10px] flex items-center gap-1 w-fit">
                          <Star className="w-3 h-3 fill-current" />
                          Destaque
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-[#616F7D]">Padrão</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/portfolio/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                          title="Ver página pública"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => abrirEdicao(p)}
                          className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluir(p)}
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

      {/* Modal Criar / Editar Portfólio */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editando ? 'Editar Projeto' : 'Novo Projeto no Portfólio'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Título do Projeto *</Label>
                <Input
                  required
                  value={titulo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  placeholder="Ex: Área Gourmet Tabicada"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Slug *</Label>
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: area-gourmet-tabicada"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    {!categorias.some((c) => c.nome === 'Residencial') && (
                      <SelectItem value="Residencial">Residencial</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Comercial') && (
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Fachadas') && (
                      <SelectItem value="Fachadas">Fachadas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Cidade</Label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Pedro/SP"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center bg-[#f4f4f4] p-3 rounded-xl border border-[#DEE4EA]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#2C3E50]">Destaque (Home)</Label>
                <Switch checked={destaque} onCheckedChange={setDestaque} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ativo no Site</Label>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Subtítulo</Label>
              <Input
                value={subtitulo}
                onChange={(e) => setSubtitulo(e.target.value)}
                placeholder="Ex: Reforma com forro tabicado e iluminação moderna"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Descrição da Obra</Label>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva os desafios e a solução entregue ao cliente..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Foto de Capa (URL)</Label>
              <Input
                value={imagemCapa}
                onChange={(e) => setImagemCapa(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Galeria de Fotos (uma URL por linha)
              </Label>
              <Textarea
                rows={3}
                value={galeriaStr}
                onChange={(e) => setGaleriaStr(e.target.value)}
                placeholder="https://imagem1.jpg&#10;https://imagem2.jpg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Detalhes Técnicos (um por linha)
              </Label>
              <Textarea
                rows={3}
                value={detalhesStr}
                onChange={(e) => setDetalhesStr(e.target.value)}
                placeholder="Forro tabicado de gesso com dilatação oculta&#10;Perfis de LED embutidos"
              />
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
                Salvar Projeto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SitePortfolioPage
