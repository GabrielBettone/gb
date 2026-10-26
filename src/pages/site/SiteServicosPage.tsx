import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarServicos,
  listarCategorias,
  criarServico,
  atualizarServico,
  excluirServico,
  SiteServico,
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
import { Plus, Pencil, Trash2, Star, Eye, ExternalLink, Search, X, Images } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ImageUploader from '@/components/site/ImageUploader'
import { resolverUrlMidia } from '@/lib/watermark'

export const SiteServicosPage: React.FC = () => {
  const [servicos, setServicos] = useState<SiteServico[]>([])
  const [categorias, setCategorias] = useState<SiteCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SiteServico | null>(null)

  // Filtros, Busca e Ordenação
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'ordem' | 'nome' | 'mais_recentes'>('ordem')

  // Formulário
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [categoria, setCategoria] = useState('Residencial')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(['Residencial'])
  const [destaque, setDestaque] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [ordem, setOrdem] = useState(1)
  const [descricaoCurta, setDescricaoCurta] = useState('')
  const [descricaoLonga, setDescricaoLonga] = useState('')
  const [imagemPrincipal, setImagemPrincipal] = useState('')
  const [galeriaStr, setGaleriaStr] = useState('')
  const [beneficiosStr, setBeneficiosStr] = useState('')

  // Arquivos físicos selecionados
  const [arquivoPrincipalFile, setArquivoPrincipalFile] = useState<File | undefined>()
  const [arquivosGaleriaFiles, setArquivosGaleriaFiles] = useState<File[]>([])
  const [imagensGaleriaList, setImagensGaleriaList] = useState<string[]>([])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [servs, cats] = await Promise.all([listarServicos(false), listarCategorias(false)])
      setServicos(servs)
      setCategorias(cats)
    } catch {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setSlug('')
    const catPadrao = categorias[0]?.nome || 'Residencial'
    setCategoria(catPadrao)
    setCategoriasSelecionadas([catPadrao])
    setDestaque(false)
    setAtivo(true)
    setOrdem(servicos.length + 1)
    setDescricaoCurta('')
    setDescricaoLonga('')
    setImagemPrincipal('')
    setGaleriaStr('')
    setBeneficiosStr('')
    setArquivoPrincipalFile(undefined)
    setArquivosGaleriaFiles([])
    setImagensGaleriaList([])
    setModalOpen(true)
  }

  const abrirEdicao = (s: SiteServico) => {
    setEditando(s)
    setNome(s.nome)
    setSlug(s.slug)
    const lista =
      s.categorias && s.categorias.length > 0
        ? s.categorias
        : s.categoria
          ? [s.categoria]
          : ['Residencial']
    setCategoria(lista[0] || 'Residencial')
    setCategoriasSelecionadas(lista)
    setDestaque(s.destaque)
    setAtivo(s.ativo)
    setOrdem(s.ordem || 1)
    setDescricaoCurta(s.descricao_curta)
    setDescricaoLonga(s.descricao_longa)

    // Prioriza arquivo nativo ou URL legada
    const princVal = s.arquivo_principal || s.imagem_principal || ''
    setImagemPrincipal(princVal)

    // Combina galeria nativa + galeria legado sem duplicação
    const setUrls = new Set<string>()
    const listaGaleria: string[] = []
    ;[...(s.arquivos_galeria || []), ...(s.galeria || [])].forEach((item) => {
      if (item && !setUrls.has(item)) {
        setUrls.add(item)
        listaGaleria.push(item)
      }
    })
    setImagensGaleriaList(listaGaleria)
    setGaleriaStr((s.galeria || []).join('\n'))

    setArquivoPrincipalFile(undefined)
    setArquivosGaleriaFiles([])
    setBeneficiosStr((s.beneficios || []).join('\n'))
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditando(null)
  }

  // Filtragem e ordenação da lista
  const servicosFiltrados = servicos
    .filter((s) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const matchNome = s.nome.toLowerCase().includes(termo)
        const matchCurta = (s.descricao_curta || '').toLowerCase().includes(termo)
        const matchLonga = (s.descricao_longa || '').toLowerCase().includes(termo)
        if (!matchNome && !matchCurta && !matchLonga) return false
      }
      if (filtroCategoria !== 'todas') {
        const itemCats = s.categorias && s.categorias.length > 0 ? s.categorias : [s.categoria]
        if (!itemCats.includes(filtroCategoria)) return false
      }
      if (filtroStatus === 'ativos' && !s.ativo) return false
      if (filtroStatus === 'inativos' && s.ativo) return false
      if (filtroStatus === 'destaques' && !s.destaque) return false
      return true
    })
    .sort((a, b) => {
      if (ordenacao === 'ordem') return (a.ordem || 0) - (b.ordem || 0)
      if (ordenacao === 'nome') return a.nome.localeCompare(b.nome)
      if (ordenacao === 'mais_recentes') {
        return new Date(b.created || '').getTime() - new Date(a.created || '').getTime()
      }
      return 0
    })

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

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !slug.trim()) {
      toast({ title: 'Preencha nome e slug', variant: 'destructive' })
      return
    }

    const galeria = imagensGaleriaList.filter(
      (url) => !url.startsWith('blob:') && (url.startsWith('http') || !url.includes('/')),
    )
    const beneficios = beneficiosStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const finalCategorias =
      categoriasSelecionadas.length > 0 ? categoriasSelecionadas : [categoria || 'Residencial']

    const payload: Partial<SiteServico> = {
      nome,
      slug,
      categoria: finalCategorias[0],
      categorias: finalCategorias,
      destaque,
      ativo,
      ordem: Number(ordem),
      descricao_curta: descricaoCurta,
      descricao_longa: descricaoLonga,
      imagem_principal: imagemPrincipal.startsWith('blob:') ? '' : imagemPrincipal,
      galeria,
      beneficios,
    }

    const arquivosEnvio = {
      arquivo_principal: arquivoPrincipalFile,
      arquivos_galeria: arquivosGaleriaFiles.length > 0 ? arquivosGaleriaFiles : undefined,
    }

    try {
      if (editando) {
        await atualizarServico(editando.id, payload, arquivosEnvio)
        toast({ title: 'Serviço atualizado com sucesso!' })
      } else {
        await criarServico(payload, arquivosEnvio)
        toast({ title: 'Serviço criado com sucesso!' })
      }
      setModalOpen(false)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível salvar o serviço. Verifique a conexão com o banco e tente novamente.'
          : err.message
      toast({
        title: 'Erro ao salvar serviço',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (s: SiteServico) => {
    if (!confirm(`Deseja excluir o serviço "${s.nome}"?`)) return
    try {
      await excluirServico(s.id)
      toast({ title: 'Serviço excluído com sucesso.' })
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao excluir serviço:', err)
      toast({
        title: 'Erro ao excluir serviço',
        description: 'Não foi possível excluir o serviço. Tente novamente.',
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
              Serviços do Site
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Gerencie os serviços exibidos na landing pública (/servicos e página inicial).
            </p>
          </div>

          <Button
            onClick={abrirNovo}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            NOVO SERVIÇO
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
                placeholder="Buscar serviço por nome ou descrição..."
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
                <SelectItem value="todas">Todas categorias</SelectItem>
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
                <SelectItem value="nome">Nome (A-Z)</SelectItem>
                <SelectItem value="mais_recentes">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Serviços */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                <tr>
                  <th className="py-3 px-4">Ordem</th>
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Destaque</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                      Carregando serviços...
                    </td>
                  </tr>
                ) : servicosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                      Nenhum serviço encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  servicosFiltrados.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                        #{s.ordem || 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const fotoPrincipal = s.arquivo_principal
                              ? resolverUrlMidia('site_services', s.id, s.arquivo_principal)
                              : s.imagem_principal
                            const primeiraGaleria =
                              s.arquivos_galeria && s.arquivos_galeria.length > 0
                                ? resolverUrlMidia('site_services', s.id, s.arquivos_galeria[0])
                                : s.galeria && s.galeria.length > 0
                                  ? resolverUrlMidia('site_services', s.id, s.galeria[0])
                                  : ''
                            const fotoFinal = fotoPrincipal || primeiraGaleria

                            return fotoFinal ? (
                              <img
                                src={fotoFinal}
                                alt={s.nome}
                                crossOrigin="anonymous"
                                className="w-10 h-10 rounded-lg object-cover border border-[#DEE4EA]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-[#DEE4EA] flex items-center justify-center text-[10px] font-bold text-[#616F7D] text-center px-1">
                                SEM FOTO
                              </div>
                            )
                          })()}
                          <div>
                            <span className="font-heading font-bold text-sm text-[#2C3E50] block">
                              {s.nome}
                            </span>
                            <span className="text-[11px] text-[#616F7D] font-mono">
                              /servicos/{s.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(s.categorias && s.categorias.length > 0
                            ? s.categorias
                            : [s.categoria]
                          ).map((catNome, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="border-[#DEE4EA] text-[#2C3E50] text-[11px]"
                            >
                              {catNome}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.destaque ? (
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
                            s.ativo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/painel/site/servicos/${s.id}/midias`}
                            className="p-1.5 text-[#D4AF37] hover:text-[#B89425] hover:bg-[#DEE4EA] rounded-lg transition-colors font-semibold flex items-center gap-1 text-[11px]"
                            title="Gerenciar mídias do serviço"
                          >
                            <Images className="w-4 h-4" />
                            <span className="hidden lg:inline">Mídias</span>
                          </Link>
                          <a
                            href={`/servicos/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                            title="Ver página pública"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => abrirEdicao(s)}
                            className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                            title="Editar serviço (mesma tela)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluir(s)}
                            className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir serviço"
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
      </div>

      {/* Modal Criar / Editar Serviço */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) fecharModal()
          else setModalOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editando ? `Editar Serviço: ${editando.nome}` : 'Novo Serviço'}
            </DialogTitle>
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
                <Label className="text-xs font-semibold text-[#2C3E50]">Nome do Serviço *</Label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Forros de Gesso Tabicado"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Slug (URL) *</Label>
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: forros-de-gesso-tabicado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Categorias do Serviço (selecione uma ou mais) *
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
                            if (prev.length <= 1) return prev // manter pelo menos 1
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
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem de exibição</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col justify-end space-y-2 pb-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Destaque (Selo)</Label>
                  <Switch checked={destaque} onCheckedChange={setDestaque} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Ativo no Site</Label>
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Curta (Cards)
              </Label>
              <Textarea
                rows={2}
                value={descricaoCurta}
                onChange={(e) => setDescricaoCurta(e.target.value)}
                placeholder="Resumo em poucas frases para os cards da home e catálogo..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Longa (Página do Serviço)
              </Label>
              <Textarea
                rows={4}
                value={descricaoLonga}
                onChange={(e) => setDescricaoLonga(e.target.value)}
                placeholder="Texto explicativo completo dos detalhes e benefícios..."
              />
            </div>

            {/* Upload de Imagem Principal (Arquivo ou URL) */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Foto / Capa Principal do Serviço"
                helperText="Envie um arquivo ou use URL compatível"
                multiple={false}
                values={imagemPrincipal ? [imagemPrincipal] : []}
                collectionName="site_services"
                recordId={editando?.id}
                onChange={(vals, files) => {
                  setImagemPrincipal(vals[0] || '')
                  setArquivoPrincipalFile(files?.[0])
                }}
              />
              <div className="pt-1">
                <Label className="text-[11px] text-[#616F7D]">
                  Ou informe uma URL externa direta:
                </Label>
                <Input
                  className="mt-1 text-xs"
                  value={imagemPrincipal.startsWith('blob:') ? '' : imagemPrincipal}
                  onChange={(e) => {
                    setImagemPrincipal(e.target.value)
                    setArquivoPrincipalFile(undefined)
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Upload de Galeria de Fotos */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Galeria de Fotos do Serviço"
                helperText="Selecione múltiplos arquivos para a galeria"
                multiple={true}
                values={imagensGaleriaList}
                collectionName="site_services"
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
                Benefícios / Diferenciais (um por linha)
              </Label>
              <Textarea
                rows={3}
                value={beneficiosStr}
                onChange={(e) => setBeneficiosStr(e.target.value)}
                placeholder="Acabamento tabicado refinado&#10;Isolamento termoacústico"
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
                {editando ? 'Salvar Alterações' : 'Criar Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SiteServicosPage
