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
import { Link } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  ExternalLink,
  Images,
  Film,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ImageUploader from '@/components/site/ImageUploader'
import { resolverUrlMidia } from '@/lib/watermark'

export const SitePortfolioPage: React.FC = () => {
  const [projetos, setProjetos] = useState<SitePortfolioItem[]>([])
  const [categorias, setCategorias] = useState<SiteCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SitePortfolioItem | null>(null)

  // Filtros, Busca e Ordenação para manter contexto
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'ordem' | 'titulo' | 'mais_recentes'>('ordem')

  // Campos
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [categoria, setCategoria] = useState('Residencial')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(['Residencial'])
  const [subtitulo, setSubtitulo] = useState('')
  const [cidade, setCidade] = useState('São Pedro/SP')
  const [descricao, setDescricao] = useState('')
  const [imagemCapa, setImagemCapa] = useState('')
  const [galeriaStr, setGaleriaStr] = useState('')
  const [detalhesStr, setDetalhesStr] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [ordem, setOrdem] = useState(1)

  // Arquivos físicos
  const [arquivoCapaFile, setArquivoCapaFile] = useState<File | undefined>()
  const [arquivosGaleriaFiles, setArquivosGaleriaFiles] = useState<File[]>([])
  const [imagensGaleriaList, setImagensGaleriaList] = useState<string[]>([])

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
    const catPadrao = categorias[0]?.nome || 'Residencial'
    setCategoria(catPadrao)
    setCategoriasSelecionadas([catPadrao])
    setSubtitulo('')
    setCidade('São Pedro/SP')
    setDescricao('')
    setImagemCapa('')
    setGaleriaStr('')
    setDetalhesStr('')
    setArquivoCapaFile(undefined)
    setArquivosGaleriaFiles([])
    setImagensGaleriaList([])
    setDestaque(false)
    setAtivo(true)
    setOrdem(projetos.length + 1)
    setModalOpen(true)
  }

  const abrirEdicao = (p: SitePortfolioItem) => {
    setEditando(p)
    setTitulo(p.titulo)
    setSlug(p.slug)
    const lista =
      p.categorias && p.categorias.length > 0
        ? p.categorias
        : p.categoria
          ? [p.categoria]
          : ['Residencial']
    setCategoria(lista[0] || 'Residencial')
    setCategoriasSelecionadas(lista)
    setSubtitulo(p.subtitulo || '')
    setCidade(p.cidade || 'São Pedro/SP')
    setDescricao(p.descricao)

    // Prioriza arquivo nativo ou URL legada
    const capaVal = p.arquivo_capa || p.imagem_capa || ''
    setImagemCapa(capaVal)

    const listaGaleria = [...(p.arquivos_galeria || []), ...(p.galeria || [])].filter(Boolean)
    setImagensGaleriaList(listaGaleria)
    setGaleriaStr((p.galeria || []).join('\n'))

    setArquivoCapaFile(undefined)
    setArquivosGaleriaFiles([])
    setDetalhesStr((p.detalhes_tecnicos || []).join('\n'))
    setDestaque(p.destaque)
    setAtivo(p.ativo)
    setOrdem(p.ordem || 1)
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditando(null)
  }

  // Filtragem e ordenação da lista
  const projetosFiltrados = projetos
    .filter((p) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const matchTitulo = p.titulo.toLowerCase().includes(termo)
        const matchSub = (p.subtitulo || '').toLowerCase().includes(termo)
        const matchCidade = (p.cidade || '').toLowerCase().includes(termo)
        if (!matchTitulo && !matchSub && !matchCidade) return false
      }
      if (filtroCategoria !== 'todas') {
        const itemCats = p.categorias && p.categorias.length > 0 ? p.categorias : [p.categoria]
        if (!itemCats.includes(filtroCategoria)) return false
      }
      if (filtroStatus === 'ativos' && !p.ativo) return false
      if (filtroStatus === 'inativos' && p.ativo) return false
      if (filtroStatus === 'destaques' && !p.destaque) return false
      return true
    })
    .sort((a, b) => {
      if (ordenacao === 'ordem') return (a.ordem || 0) - (b.ordem || 0)
      if (ordenacao === 'titulo') return a.titulo.localeCompare(b.titulo)
      if (ordenacao === 'mais_recentes') {
        return new Date(b.created || '').getTime() - new Date(a.created || '').getTime()
      }
      return 0
    })

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !slug.trim()) {
      toast({ title: 'Preencha título e slug', variant: 'destructive' })
      return
    }

    const galeria = imagensGaleriaList.filter(
      (url) => !url.startsWith('blob:') && (url.startsWith('http') || !url.includes('/')),
    )
    const detalhesTecnicos = detalhesStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const totalFotos = Math.max(1, imagensGaleriaList.length + arquivosGaleriaFiles.length)

    const finalCategorias =
      categoriasSelecionadas.length > 0 ? categoriasSelecionadas : [categoria || 'Residencial']

    const payload: Partial<SitePortfolioItem> = {
      titulo,
      slug,
      categoria: finalCategorias[0],
      categorias: finalCategorias,
      subtitulo,
      cidade,
      descricao,
      imagem_capa: imagemCapa.startsWith('blob:') ? '' : imagemCapa,
      galeria,
      fotos_count: totalFotos,
      detalhes_tecnicos: detalhesTecnicos,
      destaque,
      ativo,
      ordem: Number(ordem),
    }

    const arquivosEnvio = {
      arquivo_capa: arquivoCapaFile,
      arquivos_galeria: arquivosGaleriaFiles.length > 0 ? arquivosGaleriaFiles : undefined,
    }

    try {
      if (editando) {
        await atualizarProjeto(editando.id, payload, arquivosEnvio)
        toast({ title: 'Projeto atualizado com sucesso!' })
      } else {
        await criarProjeto(payload, arquivosEnvio)
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

        {/* Barra de Filtros, Busca e Ordenação Inline */}
        <div className="bg-white p-4 rounded-2xl border border-[#DEE4EA] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[#616F7D] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar projeto, subtítulo, cidade..."
                className="pl-9 pr-8 text-xs bg-white border-[#DEE4EA] h-9"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#616F7D] hover:text-[#2C3E50]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[140px] text-xs h-9 bg-white border-[#DEE4EA]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="text-xs bg-white">
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[120px] text-xs h-9 bg-white border-[#DEE4EA]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="text-xs bg-white">
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativos">Apenas Ativos</SelectItem>
                <SelectItem value="inativos">Apenas Inativos</SelectItem>
                <SelectItem value="destaques">Destaques Home</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#616F7D]">Ordenar por:</span>
            <Select value={ordenacao} onValueChange={(val: any) => setOrdenacao(val)}>
              <SelectTrigger className="w-[140px] text-xs h-9 bg-white border-[#DEE4EA]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs bg-white">
                <SelectItem value="ordem">Ordem (#)</SelectItem>
                <SelectItem value="titulo">Título (A-Z)</SelectItem>
                <SelectItem value="mais_recentes">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              ) : projetosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#616F7D]">
                    Nenhum projeto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                projetosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                      #{p.ordem || 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.arquivo_capa || p.imagem_capa ? (
                          <img
                            src={
                              p.arquivo_capa
                                ? resolverUrlMidia('site_portfolio', p.id, p.arquivo_capa)
                                : p.imagem_capa
                            }
                            alt={p.titulo}
                            crossOrigin="anonymous"
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
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {(p.categorias && p.categorias.length > 0
                            ? p.categorias
                            : [p.categoria]
                          ).map((cNome, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="border-[#DEE4EA] text-[#2C3E50] text-[10px]"
                            >
                              {cNome}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-[11px] text-[#616F7D]">{p.cidade || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#616F7D]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1" title="Fotos">
                          <Images className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {p.fotos_count || p.galeria?.length || 0}
                        </span>
                        {(p.videos_count || p.videos?.length || 0) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[#2C3E50]"
                            title="Vídeos"
                          >
                            <Film className="w-3.5 h-3.5 text-[#2C3E50]" />
                            {p.videos_count || p.videos?.length}
                          </span>
                        )}
                      </div>
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
                        <Link
                          to={`/painel/site/portfolio/${p.id}/midias`}
                          className="p-1.5 text-[#D4AF37] hover:text-[#B89425] hover:bg-[#DEE4EA] rounded-lg transition-colors font-semibold flex items-center gap-1 text-[11px]"
                          title="Gerenciar mídias do projeto"
                        >
                          <Images className="w-4 h-4" />
                          <span className="hidden lg:inline">Mídias</span>
                        </Link>
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
                          title="Editar (mesma tela)"
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
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) fecharModal()
          else setModalOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
                {editando ? `Editar Projeto: ${editando.titulo}` : 'Novo Projeto no Portfólio'}
              </DialogTitle>
            </div>
            {editando && (
              <p className="text-xs text-[#616F7D]">
                Edição inline na mesma tela — todas as alterações são salvas mantendo seus filtros e
                ordenação atuais.
              </p>
            )}
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

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Categorias do Projeto (selecione uma ou mais) *
              </Label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-[#DEE4EA] bg-[#f8fafc]">
                {categorias.map((c) => {
                  const sel = categoriasSelecionadas.includes(c.nome)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoriasSelecionadas((prev) => {
                          if (prev.includes(c.nome)) {
                            if (prev.length <= 1) return prev
                            const updated = prev.filter((x) => x !== c.nome)
                            setCategoria(updated[0])
                            return updated
                          } else {
                            const updated = [...prev, c.nome]
                            setCategoria(updated[0])
                            return updated
                          }
                        })
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        sel
                          ? 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50]'
                          : 'bg-white text-[#616F7D] border-[#DEE4EA] hover:border-[#2C3E50]'
                      }`}
                    >
                      {sel ? '✓ ' : '+ '}
                      {c.nome}
                    </button>
                  )
                })}
                {categorias.length === 0 &&
                  ['Residencial', 'Comercial', 'Fachadas'].map((fallbackNome) => {
                    const sel = categoriasSelecionadas.includes(fallbackNome)
                    return (
                      <button
                        key={fallbackNome}
                        type="button"
                        onClick={() => {
                          setCategoriasSelecionadas((prev) => {
                            if (prev.includes(fallbackNome)) {
                              if (prev.length <= 1) return prev
                              const updated = prev.filter((x) => x !== fallbackNome)
                              setCategoria(updated[0])
                              return updated
                            } else {
                              const updated = [...prev, fallbackNome]
                              setCategoria(updated[0])
                              return updated
                            }
                          })
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          sel
                            ? 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50]'
                            : 'bg-white text-[#616F7D] border-[#DEE4EA] hover:border-[#2C3E50]'
                        }`}
                      >
                        {sel ? '✓ ' : '+ '}
                        {fallbackNome}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Foto de Capa (Arquivo ou URL) */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Foto de Capa do Projeto"
                helperText="Arquivo nativo ou URL legada"
                multiple={false}
                values={imagemCapa ? [imagemCapa] : []}
                collectionName="site_portfolio"
                recordId={editando?.id}
                onChange={(vals, files) => {
                  setImagemCapa(vals[0] || '')
                  setArquivoCapaFile(files?.[0])
                }}
              />
              <div className="pt-1">
                <Label className="text-[11px] text-[#616F7D]">
                  Ou informe uma URL externa direta:
                </Label>
                <Input
                  className="mt-1 text-xs"
                  value={imagemCapa.startsWith('blob:') ? '' : imagemCapa}
                  onChange={(e) => {
                    setImagemCapa(e.target.value)
                    setArquivoCapaFile(undefined)
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Galeria de Fotos */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Galeria de Fotos do Projeto"
                helperText="Envie múltiplos arquivos para a galeria da obra"
                multiple={true}
                values={imagensGaleriaList}
                collectionName="site_portfolio"
                recordId={editando?.id}
                onChange={(vals, files) => {
                  setImagensGaleriaList(vals)
                  if (files && files.length > 0) {
                    setArquivosGaleriaFiles((prev) => [...prev, ...files])
                  }
                }}
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
              <Button type="button" variant="outline" onClick={fecharModal} className="text-xs">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                {editando ? 'Salvar Alterações' : 'Criar Projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SitePortfolioPage
