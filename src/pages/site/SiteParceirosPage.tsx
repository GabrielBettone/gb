import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  listarParceiros,
  criarParceiro,
  atualizarParceiro,
  excluirParceiro,
  listarCategoriasParceiros,
  criarCategoriaParceiro,
  atualizarCategoriaParceiro,
  excluirCategoriaParceiro,
  listarCliquesParceiros,
  obterConfiguracoes,
  salvarConfiguracoes,
  SiteParceiro,
  CategoriaParceiro,
  PartnerClick,
} from '@/services/site'
import {
  Pencil,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  X,
  Eye,
  Globe,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react'
import ImageUploader from '@/components/site/ImageUploader'
import { resolverUrlMidia } from '@/lib/watermark'

const mesesNomes = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SiteParceirosPage: React.FC = () => {
  const { toast } = useToast()

  const [abaAtiva, setAbaAtiva] = useState<
    'Dashboard' | 'Parceiros' | 'Categorias' | 'Relatórios' | 'Configurações'
  >('Parceiros')

  const hoje = new Date()
  const [mesSelecionado, setMesSelecionado] = useState<number>(hoje.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState<number>(hoje.getFullYear())

  // Dados
  const [parceiros, setParceiros] = useState<SiteParceiro[]>([])
  const [categorias, setCategorias] = useState<CategoriaParceiro[]>([])
  const [cliques, setCliques] = useState<PartnerClick[]>([])
  const [cliquesMesAnterior, setCliquesMesAnterior] = useState<PartnerClick[]>([])
  const [paginaPublicaAtiva, setPaginaPublicaAtiva] = useState(true)
  const [loading, setLoading] = useState(true)

  // Modais
  const [modalParceiroOpen, setModalParceiroOpen] = useState(false)
  const [editandoParceiro, setEditandoParceiro] = useState<SiteParceiro | null>(null)
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState<CategoriaParceiro | null>(null)
  const [previewParceiro, setPreviewParceiro] = useState<SiteParceiro | null>(null)

  // Filtros, Busca e Ordenação na aba Parceiros
  const [buscaParceiro, setBuscaParceiro] = useState('')
  const [filtroCatParceiro, setFiltroCatParceiro] = useState('todas')
  const [filtroStatusParceiro, setFiltroStatusParceiro] = useState('todos')
  const [ordParceiro, setOrdParceiro] = useState<'ordem' | 'nome' | 'mais_recentes'>('ordem')

  // Form Parceiro
  const [pNome, setPNome] = useState('')
  const [pSlug, setPSlug] = useState('')
  const [pCategoria, setPCategoria] = useState('')
  const [pPapel, setPPapel] = useState('')
  const [pWhatsapp, setPWhatsapp] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pSite, setPSite] = useState('')
  const [pInstagram, setPInstagram] = useState('')
  const [pCidade, setPCidade] = useState('')
  const [pEndereco, setPEndereco] = useState('')
  const [pDescricao, setPDescricao] = useState('')
  const [pDestaque, setPDestaque] = useState(false)
  const [pAtivo, setPAtivo] = useState(true)
  const [pOrdem, setPOrdem] = useState(1)

  // Imagens parceiro
  const [pLogo, setPLogo] = useState('')
  const [pArquivoLogoFile, setPArquivoLogoFile] = useState<File | undefined>()
  const [pCapa, setPCapa] = useState('')
  const [pArquivoCapaFile, setPArquivoCapaFile] = useState<File | undefined>()

  // Form Categoria
  const [cNome, setCNome] = useState('')
  const [cSlug, setCSlug] = useState('')
  const [cDescricao, setCDescricao] = useState('')
  const [cAtiva, setCAtiva] = useState(true)
  const [cOrdem, setCOrdem] = useState(1)

  const formatAnoMes = (m: number, a: number) => `${a}-${String(m).padStart(2, '0')}`

  const carregarDados = async () => {
    setLoading(true)
    try {
      const anoMesAtual = formatAnoMes(mesSelecionado, anoSelecionado)
      const mesAnt = mesSelecionado === 1 ? 12 : mesSelecionado - 1
      const anoAnt = mesSelecionado === 1 ? anoSelecionado - 1 : anoSelecionado
      const anoMesAnt = formatAnoMes(mesAnt, anoAnt)

      const [parts, cats, clicksCurrent, clicksPrev, cfg] = await Promise.all([
        listarParceiros(false),
        listarCategoriasParceiros(false),
        listarCliquesParceiros(anoMesAtual),
        listarCliquesParceiros(anoMesAnt),
        obterConfiguracoes(),
      ])

      setParceiros(parts)
      setCategorias(cats)
      setCliques(clicksCurrent)
      setCliquesMesAnterior(clicksPrev)
      setPaginaPublicaAtiva(cfg.pagina_parceiros_ativa !== false)
    } catch {
      toast({ title: 'Erro ao carregar dados dos parceiros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [mesSelecionado, anoSelecionado])

  // KPIs
  const totalParceiros = parceiros.length
  const parceirosAtivos = parceiros.filter((p) => p.ativo).length
  const parceirosDestaque = parceiros.filter((p) => p.destaque).length
  const totalCategorias = categorias.length
  const totalCliquesMes = cliques.length
  const totalCliquesMesAnterior = cliquesMesAnterior.length

  // Parceiros filtrados na aba Parceiros
  const parceirosFiltrados = parceiros
    .filter((p) => {
      if (buscaParceiro.trim()) {
        const termo = buscaParceiro.toLowerCase()
        const matchNome = p.nome.toLowerCase().includes(termo)
        const matchPapel = (p.papel || '').toLowerCase().includes(termo)
        const matchDesc = (p.descricao || '').toLowerCase().includes(termo)
        const matchCidade = (p.cidade || '').toLowerCase().includes(termo)
        if (!matchNome && !matchPapel && !matchDesc && !matchCidade) return false
      }
      if (filtroCatParceiro !== 'todas' && p.categoria !== filtroCatParceiro) {
        return false
      }
      if (filtroStatusParceiro === 'ativos' && !p.ativo) return false
      if (filtroStatusParceiro === 'inativos' && p.ativo) return false
      if (filtroStatusParceiro === 'destaques' && !p.destaque) return false
      return true
    })
    .sort((a, b) => {
      if (ordParceiro === 'ordem') return (a.ordem || 0) - (b.ordem || 0)
      if (ordParceiro === 'nome') return a.nome.localeCompare(b.nome)
      if (ordParceiro === 'mais_recentes') {
        return new Date(b.created || '').getTime() - new Date(a.created || '').getTime()
      }
      return 0
    })

  // Maior volume do período
  const cliquesPorParceiroMap = new Map<string, { nome: string; count: number }>()
  cliques.forEach((c) => {
    const pId = c.parceiro_id
    const nome = c.parceiro_nome || 'Parceiro'
    const cur = cliquesPorParceiroMap.get(pId) || { nome, count: 0 }
    cur.count++
    cliquesPorParceiroMap.set(pId, cur)
  })

  let maiorVolume = { nome: 'Nenhum clique', count: 0 }
  cliquesPorParceiroMap.forEach((v) => {
    if (v.count > maiorVolume.count) {
      maiorVolume = v
    }
  })

  // Handlers Parceiro
  const abrirNovoParceiro = () => {
    setEditandoParceiro(null)
    setPNome('')
    setPSlug('')
    setPCategoria(categorias[0]?.nome || '')
    setPPapel('')
    setPWhatsapp('5519981093379')
    setPEmail('')
    setPSite('')
    setPInstagram('')
    setPCidade('São Pedro/SP')
    setPEndereco('')
    setPLogo('')
    setPArquivoLogoFile(undefined)
    setPCapa('')
    setPArquivoCapaFile(undefined)
    setPDescricao('')
    setPDestaque(false)
    setPAtivo(true)
    setPOrdem(parceiros.length + 1)
    setModalParceiroOpen(true)
  }

  const abrirEdicaoParceiro = (p: SiteParceiro) => {
    setEditandoParceiro(p)
    setPNome(p.nome)
    setPSlug(p.slug || gerarSlug(p.nome))
    setPCategoria(p.categoria || '')
    setPPapel(p.papel || '')
    setPWhatsapp(p.whatsapp || '')
    setPEmail(p.email || '')
    setPSite(p.site || '')
    setPInstagram(p.instagram || '')
    setPCidade(p.cidade || '')
    setPEndereco(p.endereco || '')
    setPLogo(p.arquivo_logo || p.logo || '')
    setPArquivoLogoFile(undefined)
    setPCapa(p.arquivo_capa || p.capa || '')
    setPArquivoCapaFile(undefined)
    setPDescricao(p.descricao || '')
    setPDestaque(p.destaque)
    setPAtivo(p.ativo)
    setPOrdem(p.ordem || 1)
    setModalParceiroOpen(true)
  }

  const handleSalvarParceiro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pNome.trim()) {
      toast({ title: 'Preencha o nome do parceiro', variant: 'destructive' })
      return
    }

    const slugFinal = (pSlug.trim() || gerarSlug(pNome)).trim()

    const payload: Partial<SiteParceiro> = {
      nome: pNome.trim(),
      slug: slugFinal,
      categoria: pCategoria,
      papel: pPapel.trim(),
      whatsapp: pWhatsapp.trim(),
      email: pEmail.trim(),
      site: pSite.trim(),
      instagram: pInstagram.trim(),
      cidade: pCidade.trim(),
      endereco: pEndereco.trim(),
      logo: pLogo.startsWith('blob:') ? '' : pLogo,
      capa: pCapa.startsWith('blob:') ? '' : pCapa,
      descricao: pDescricao.trim(),
      destaque: pDestaque,
      ativo: pAtivo,
      ordem: Number(pOrdem),
    }

    try {
      if (editandoParceiro) {
        await atualizarParceiro(editandoParceiro.id, payload, {
          arquivoLogo: pArquivoLogoFile,
          arquivoCapa: pArquivoCapaFile,
        })
        toast({ title: 'Parceiro atualizado com sucesso!' })
      } else {
        await criarParceiro(payload, {
          arquivoLogo: pArquivoLogoFile,
          arquivoCapa: pArquivoCapaFile,
        })
        toast({ title: 'Parceiro cadastrado com sucesso!' })
      }
      setModalParceiroOpen(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar parceiro',
        description: err.message || 'Verifique se o slug é único',
        variant: 'destructive',
      })
    }
  }

  const handleExcluirParceiro = async (p: SiteParceiro) => {
    if (!confirm(`Deseja excluir o parceiro "${p.nome}"?`)) return
    try {
      await excluirParceiro(p.id)
      toast({ title: 'Parceiro excluído' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir parceiro', variant: 'destructive' })
    }
  }

  // Handlers Categoria
  const abrirNovaCategoria = () => {
    setEditandoCategoria(null)
    setCNome('')
    setCSlug('')
    setCDescricao('')
    setCAtiva(true)
    setCOrdem(categorias.length + 1)
    setModalCategoriaOpen(true)
  }

  const abrirEdicaoCategoria = (c: CategoriaParceiro) => {
    setEditandoCategoria(c)
    setCNome(c.nome)
    setCSlug(c.slug)
    setCDescricao(c.descricao || '')
    setCAtiva(c.ativa)
    setCOrdem(c.ordem || 1)
    setModalCategoriaOpen(true)
  }

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cNome.trim() || !cSlug.trim()) {
      toast({ title: 'Preencha nome e slug da categoria', variant: 'destructive' })
      return
    }

    const payload: Partial<CategoriaParceiro> = {
      nome: cNome.trim(),
      slug: cSlug.trim(),
      descricao: cDescricao.trim(),
      ativa: cAtiva,
      ordem: Number(cOrdem),
    }

    try {
      if (editandoCategoria) {
        await atualizarCategoriaParceiro(editandoCategoria.id, payload)
        toast({ title: 'Categoria atualizada!' })
      } else {
        await criarCategoriaParceiro(payload)
        toast({ title: 'Categoria criada!' })
      }
      setModalCategoriaOpen(false)
      carregarDados()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar categoria', description: err.message, variant: 'destructive' })
    }
  }

  const handleExcluirCategoria = async (c: CategoriaParceiro) => {
    if (!confirm(`Deseja excluir a categoria "${c.nome}"?`)) return
    try {
      await excluirCategoriaParceiro(c.id)
      toast({ title: 'Categoria excluída' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' })
    }
  }

  const handleTogglePaginaPublica = async (checked: boolean) => {
    setPaginaPublicaAtiva(checked)
    try {
      await salvarConfiguracoes({ pagina_parceiros_ativa: checked })
      toast({
        title: checked
          ? 'Página pública /parceiros ativada'
          : 'Página pública /parceiros desativada',
      })
    } catch {
      toast({ title: 'Erro ao atualizar configuração', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* TopNav geral do Site */}
      <SiteTopNav />

      {/* Sub-barra interna do Módulo Parceiros */}
      <div className="bg-[#141C22] border-b border-[#2C3E50]/60 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {(['Parceiros', 'Categorias', 'Dashboard', 'Relatórios', 'Configurações'] as const).map(
            (aba) => (
              <button
                key={aba}
                type="button"
                onClick={() => setAbaAtiva(aba)}
                className={`relative px-4 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  abaAtiva === aba
                    ? 'text-white bg-[#2C3E50]/70 font-semibold border-l-2 border-[#D4AF37]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {aba}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Topo do Módulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Gestão de Parceiros
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Cadastre parceiros homologados, categorias, páginas próprias e otimização para SEO no
              Google.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={abrirNovoParceiro}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              NOVO PARCEIRO
            </Button>
            <Button
              variant="outline"
              onClick={abrirNovaCategoria}
              className="bg-white border-[#DEE4EA] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              NOVA CATEGORIA
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-white border-[#DEE4EA] text-[#2C3E50] text-xs h-10 px-3 rounded-xl shadow-sm"
            >
              <a href="/parceiros" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Ver no site
              </a>
            </Button>
          </div>
        </div>

        {/* ABA: PARCEIROS */}
        {abaAtiva === 'Parceiros' && (
          <div className="space-y-4">
            {/* Barra de Filtros e Busca Inline */}
            <div className="bg-white p-4 rounded-2xl border border-[#DEE4EA] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-[#616F7D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={buscaParceiro}
                    onChange={(e) => setBuscaParceiro(e.target.value)}
                    placeholder="Buscar por nome, especialidade, cidade..."
                    className="pl-9 pr-8 text-xs bg-white border-[#DEE4EA] h-9"
                  />
                  {buscaParceiro && (
                    <button
                      type="button"
                      onClick={() => setBuscaParceiro('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#616F7D] hover:text-[#2C3E50]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Select value={filtroCatParceiro} onValueChange={setFiltroCatParceiro}>
                  <SelectTrigger className="w-[150px] text-xs h-9 bg-white border-[#DEE4EA]">
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

                <Select value={filtroStatusParceiro} onValueChange={setFiltroStatusParceiro}>
                  <SelectTrigger className="w-[120px] text-xs h-9 bg-white border-[#DEE4EA]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="ativos">Apenas ativos</SelectItem>
                    <SelectItem value="inativos">Inativos</SelectItem>
                    <SelectItem value="destaques">Destaques</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={ordParceiro}
                  onValueChange={(v: any) =>
                    setOrdParceiro(v as 'ordem' | 'nome' | 'mais_recentes')
                  }
                >
                  <SelectTrigger className="w-[140px] text-xs h-9 bg-white border-[#DEE4EA]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="ordem">Por ordem (#)</SelectItem>
                    <SelectItem value="nome">Nome A-Z</SelectItem>
                    <SelectItem value="mais_recentes">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-[#616F7D]">
                Exibindo <strong>{parceirosFiltrados.length}</strong> de {parceiros.length}{' '}
                parceiros
              </div>
            </div>

            {/* Tabela de Parceiros */}
            <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                  <tr>
                    <th className="py-3 px-4">Parceiro & Slug</th>
                    <th className="py-3 px-4">Categoria / Cidade</th>
                    <th className="py-3 px-4">Contatos</th>
                    <th className="py-3 px-4">Destaque</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DEE4EA]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                        Carregando parceiros...
                      </td>
                    </tr>
                  ) : parceirosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#616F7D]">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-semibold text-sm text-[#2C3E50]">
                            Nenhum parceiro cadastrado ou encontrado com os filtros.
                          </p>
                          <p className="text-xs">
                            Clique em <strong>Novo Parceiro</strong> para começar a cadastrar. A
                            página pública <code>/parceiros</code> já está pronta e exibe um estado
                            elegante.
                          </p>
                          <Button
                            onClick={abrirNovoParceiro}
                            size="sm"
                            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs mt-2"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Cadastrar primeiro parceiro
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    parceirosFiltrados.map((p) => {
                      const logoUrl = p.arquivo_logo
                        ? resolverUrlMidia('site_partners', p.id, p.arquivo_logo)
                        : p.logo
                      const pSlugVal = p.slug || gerarSlug(p.nome)

                      return (
                        <tr key={p.id} className="hover:bg-[#f9fafb] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={p.nome}
                                  crossOrigin="anonymous"
                                  className="w-12 h-12 rounded-xl object-contain bg-white border border-[#DEE4EA] p-1.5 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-sm flex-shrink-0 shadow-xs">
                                  {p.nome.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-heading font-bold text-sm text-[#2C3E50] block truncate">
                                  {p.nome}
                                </span>
                                <span className="text-[11px] text-[#616F7D] font-mono block truncate">
                                  /parceiros/{pSlugVal}
                                </span>
                                {p.papel && (
                                  <span className="text-[10px] text-[#D4AF37] font-semibold block">
                                    {p.papel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#2C3E50]">
                                {p.categoria || 'Geral'}
                              </span>
                              <span className="text-[11px] text-[#616F7D]">
                                {p.cidade || 'São Pedro e região'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-[11px] text-[#2C3E50]">
                              {p.whatsapp && (
                                <div className="flex items-center gap-1 font-mono text-[10px]">
                                  <Phone className="w-3 h-3 text-[#25D366]" />
                                  <span>{p.whatsapp}</span>
                                </div>
                              )}
                              {p.email && (
                                <div className="flex items-center gap-1 text-[#616F7D] truncate max-w-[160px]">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate">{p.email}</span>
                                </div>
                              )}
                              {p.site && (
                                <div className="flex items-center gap-1 text-[#2C3E50] truncate max-w-[160px]">
                                  <Globe className="w-3 h-3 text-[#616F7D]" />
                                  <span className="truncate">
                                    {p.site.replace(/^https?:\/\//, '')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {p.destaque ? (
                              <Badge className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-[10px]">
                                Sim
                              </Badge>
                            ) : (
                              <span className="text-[#616F7D] text-[11px]">Não</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.ativo
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {p.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewParceiro(p)}
                                className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                                title="Visualizar preview do parceiro"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <a
                                href={`/parceiros/${pSlugVal}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#616F7D] hover:text-[#D4AF37] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                                title="Abrir página pública"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => abrirEdicaoParceiro(p)}
                                className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                                title="Editar parceiro"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirParceiro(p)}
                                className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir parceiro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: CATEGORIAS */}
        {abaAtiva === 'Categorias' && (
          <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#DEE4EA] flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-base text-[#2C3E50]">
                  Categorias de Parceiros
                </h2>
                <p className="text-xs text-[#616F7D]">
                  Organize arquitetos, engenheiros, construtores e pintores em páginas específicas
                  no Google (/parceiros/categoria/slug).
                </p>
              </div>
              <Button
                onClick={abrirNovaCategoria}
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Categoria
              </Button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                <tr>
                  <th className="py-3 px-4">Ordem</th>
                  <th className="py-3 px-4">Nome & Descrição</th>
                  <th className="py-3 px-4">Slug / URL</th>
                  <th className="py-3 px-4">Parceiros</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[#616F7D]">
                      Nenhuma categoria cadastrada. Clique em <strong>Nova Categoria</strong> acima
                      para criar (ex: Arquitetura & Interiores, Construção Civil, Pintura &
                      Acabamentos).
                    </td>
                  </tr>
                ) : (
                  categorias.map((c) => {
                    const count = parceiros.filter((p) => p.categoria === c.nome).length
                    return (
                      <tr key={c.id} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                          #{c.ordem || 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-heading font-bold text-sm text-[#2C3E50] block">
                            {c.nome}
                          </span>
                          {c.descricao && (
                            <span className="text-[11px] text-[#616F7D] line-clamp-1">
                              {c.descricao}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#616F7D]">
                          /parceiros/categoria/{c.slug}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {count} parceiro(s)
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.ativa
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {c.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/parceiros/categoria/${c.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#616F7D] hover:text-[#D4AF37] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                              title="Abrir no site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => abrirEdicaoCategoria(c)}
                              className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                              title="Editar categoria"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirCategoria(c)}
                              className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir categoria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {abaAtiva === 'Dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Total de parceiros</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalParceiros}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Parceiros ativos</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {parceirosAtivos}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Em destaque</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {parceirosDestaque}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Categorias</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCategorias}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">
                  Cliques no WhatsApp · {String(mesSelecionado).padStart(2, '0')}/{anoSelecionado}
                </div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCliquesMes}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Cliques mês anterior</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCliquesMesAnterior}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  MAIOR VOLUME NO PERÍODO
                </div>
                <div className="font-heading text-2xl font-bold text-[#2C3E50]">
                  {maiorVolume.nome}
                </div>
                <p className="text-xs text-[#616F7D]">{maiorVolume.count} cliques no WhatsApp</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  PÁGINA PÚBLICA
                </div>
                <div className="font-heading text-2xl font-bold text-[#2C3E50]">
                  {paginaPublicaAtiva ? 'Ativada' : 'Desativada'}
                </div>
                <div>
                  <a
                    href="/parceiros"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C3E50] hover:text-[#D4AF37] transition-colors"
                  >
                    <span>Abrir /parceiros</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: RELATÓRIOS */}
        {abaAtiva === 'Relatórios' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-[#DEE4EA] shadow-xs flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#616F7D]">
                  MÊS
                </div>
                <Select
                  value={String(mesSelecionado)}
                  onValueChange={(val) => setMesSelecionado(Number(val))}
                >
                  <SelectTrigger className="w-[140px] bg-white text-xs border-[#DEE4EA]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    {mesesNomes.map((m, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#616F7D]">
                  ANO
                </div>
                <Input
                  type="number"
                  className="w-[100px] bg-white text-xs border-[#DEE4EA]"
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                />
              </div>

              <div className="pt-5">
                <Button
                  onClick={carregarDados}
                  className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9 px-4 rounded-xl"
                >
                  ATUALIZAR
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-4">
              <h2 className="font-heading font-bold text-lg text-[#2C3E50]">
                Cliques no WhatsApp por Parceiro ({mesesNomes[mesSelecionado - 1]}/{anoSelecionado})
              </h2>

              {cliquesPorParceiroMap.size === 0 ? (
                <div className="text-center py-8 text-xs text-[#616F7D]">
                  Nenhum clique registrado no período selecionado.
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(cliquesPorParceiroMap.entries()).map(([pId, info]) => {
                    const maxVal = Math.max(
                      ...Array.from(cliquesPorParceiroMap.values()).map((v) => v.count),
                      1,
                    )
                    const percent = (info.count / maxVal) * 100
                    return (
                      <div key={pId} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-[#2C3E50]">
                          <span>{info.nome}</span>
                          <span className="font-mono text-sm">{info.count} cliques</span>
                        </div>
                        <div className="h-2.5 w-full bg-[#f4f4f4] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full bg-[#D4AF37] rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: CONFIGURAÇÕES */}
        {abaAtiva === 'Configurações' && (
          <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-6 max-w-2xl">
            <h2 className="font-heading font-bold text-lg text-[#2C3E50]">
              Configurações da Página Pública de Parceiros
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA]">
              <div>
                <span className="font-semibold text-sm text-[#2C3E50] block">
                  Ativar página pública /parceiros
                </span>
                <span className="text-xs text-[#616F7D]">
                  Permite que visitantes acessem a lista de parceiros, páginas individuais e entrem
                  em contato.
                </span>
              </div>
              <Switch checked={paginaPublicaAtiva} onCheckedChange={handleTogglePaginaPublica} />
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Parceiro */}
      <Dialog open={modalParceiroOpen} onOpenChange={setModalParceiroOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editandoParceiro ? `Editar Parceiro: ${editandoParceiro.nome}` : 'Novo Parceiro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarParceiro} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Nome da Empresa / Profissional *
                </Label>
                <Input
                  required
                  value={pNome}
                  onChange={(e) => {
                    setPNome(e.target.value)
                    if (!editandoParceiro) {
                      setPSlug(gerarSlug(e.target.value))
                    }
                  }}
                  placeholder="Ex: Alltax ou Manfrinato Arquitetura"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Slug da URL (para o Google) *
                </Label>
                <Input
                  required
                  value={pSlug}
                  onChange={(e) => setPSlug(gerarSlug(e.target.value))}
                  placeholder="ex: manfrinato-arquitetura"
                />
                <span className="text-[10px] text-[#616F7D] block">
                  URL gerada: /parceiros/{pSlug || 'slug-do-parceiro'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Categoria</Label>
                <Select value={pCategoria} onValueChange={setPCategoria}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    {!categorias.some((c) => c.nome === 'Construção Civil') && (
                      <SelectItem value="Construção Civil">Construção Civil</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Arquitetura & Design') && (
                      <SelectItem value="Arquitetura & Design">Arquitetura & Design</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Pintura & Acabamentos') && (
                      <SelectItem value="Pintura & Acabamentos">Pintura & Acabamentos</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Papel / Especialidade
                </Label>
                <Input
                  value={pPapel}
                  onChange={(e) => setPPapel(e.target.value)}
                  placeholder="Ex: Arquitetura & Interiores"
                />
              </div>
            </div>

            {/* Contatos */}
            <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA] space-y-3">
              <span className="font-heading font-bold text-xs text-[#2C3E50] block uppercase tracking-wider">
                Canais de Contato & Redes
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#2C3E50]">
                    WhatsApp Comercial (com DDD)
                  </Label>
                  <Input
                    value={pWhatsapp}
                    onChange={(e) => setPWhatsapp(e.target.value)}
                    placeholder="Ex: 5519981093379"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#2C3E50]">E-mail</Label>
                  <Input
                    type="email"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#2C3E50]">
                    Site Oficial (URL)
                  </Label>
                  <Input
                    value={pSite}
                    onChange={(e) => setPSite(e.target.value)}
                    placeholder="https://www.empresa.com.br"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#2C3E50]">Instagram</Label>
                  <Input
                    value={pInstagram}
                    onChange={(e) => setPInstagram(e.target.value)}
                    placeholder="@perfil ou link completo"
                  />
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Cidade</Label>
                <Input
                  value={pCidade}
                  onChange={(e) => setPCidade(e.target.value)}
                  placeholder="Ex: São Pedro/SP ou Piracicaba/SP"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Endereço (opcional)</Label>
                <Input
                  value={pEndereco}
                  onChange={(e) => setPEndereco(e.target.value)}
                  placeholder="Ex: Av. dos Imigrantes, 120"
                />
              </div>
            </div>

            {/* Upload de Logo e Capa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#DEE4EA]">
                <ImageUploader
                  label="Logo do Parceiro"
                  helperText="SVG, PNG ou JPG (sem fundo de preferência)"
                  multiple={false}
                  values={pLogo ? [pLogo] : []}
                  collectionName="site_partners"
                  recordId={editandoParceiro?.id}
                  aspectRatioClass="aspect-square"
                  onChange={(vals, files) => {
                    setPLogo(vals[0] || '')
                    setPArquivoLogoFile(files?.[0])
                  }}
                />
              </div>

              <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#DEE4EA]">
                <ImageUploader
                  label="Foto de Capa (opcional)"
                  helperText="Banner para o topo da página individual"
                  multiple={false}
                  values={pCapa ? [pCapa] : []}
                  collectionName="site_partners"
                  recordId={editandoParceiro?.id}
                  aspectRatioClass="aspect-video"
                  onChange={(vals, files) => {
                    setPCapa(vals[0] || '')
                    setPArquivoCapaFile(files?.[0])
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Completa do Parceiro
              </Label>
              <Textarea
                rows={4}
                value={pDescricao}
                onChange={(e) => setPDescricao(e.target.value)}
                placeholder="Apresentação detalhada da empresa, história, diferenciais, serviços prestados e atuação conjunta com a Gesso Bettone..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-[#f4f4f4] p-3 rounded-xl border border-[#DEE4EA]">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem de Exibição</Label>
                <Input
                  type="number"
                  value={pOrdem}
                  onChange={(e) => setPOrdem(Number(e.target.value))}
                  className="bg-white h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between sm:justify-center gap-2">
                <Label className="text-xs font-semibold text-[#2C3E50]">Destaque</Label>
                <Switch checked={pDestaque} onCheckedChange={setPDestaque} />
              </div>
              <div className="flex items-center justify-between sm:justify-center gap-2">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ativo no Site</Label>
                <Switch checked={pAtivo} onCheckedChange={setPAtivo} />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalParceiroOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                Salvar Parceiro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Criar / Editar Categoria de Parceiro */}
      <Dialog open={modalCategoriaOpen} onOpenChange={setModalCategoriaOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editandoCategoria ? 'Editar Categoria de Parceiro' : 'Nova Categoria de Parceiro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCategoria} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Nome da Categoria *</Label>
              <Input
                required
                value={cNome}
                onChange={(e) => {
                  setCNome(e.target.value)
                  if (!editandoCategoria) {
                    setCSlug(gerarSlug(e.target.value))
                  }
                }}
                placeholder="Ex: Engenharia Civil"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Slug da URL *</Label>
              <Input
                required
                value={cSlug}
                onChange={(e) => setCSlug(gerarSlug(e.target.value))}
                placeholder="ex: engenharia-civil"
              />
              <span className="text-[10px] text-[#616F7D] block">
                URL gerada: /parceiros/categoria/{cSlug || 'slug'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Descrição Curta</Label>
              <Textarea
                rows={2}
                value={cDescricao}
                onChange={(e) => setCDescricao(e.target.value)}
                placeholder="Breve texto sobre esta área de atuação (útil para SEO e exibição)..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem</Label>
                <Input
                  type="number"
                  value={cOrdem}
                  onChange={(e) => setCOrdem(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between pt-5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ativa</Label>
                <Switch checked={cAtiva} onCheckedChange={setCAtiva} />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalCategoriaOpen(false)}
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

      {/* Modal Preview do Parceiro */}
      <Dialog open={!!previewParceiro} onOpenChange={(open) => !open && setPreviewParceiro(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-0 overflow-hidden">
          {previewParceiro && (
            <div>
              {/* Capa */}
              <div className="h-32 bg-[#2C3E50] relative overflow-hidden flex items-center justify-center">
                {previewParceiro.capa || previewParceiro.arquivo_capa ? (
                  <img
                    src={
                      previewParceiro.arquivo_capa
                        ? resolverUrlMidia(
                            'site_partners',
                            previewParceiro.id,
                            previewParceiro.arquivo_capa,
                          )
                        : previewParceiro.capa
                    }
                    alt={previewParceiro.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-white/40 text-xs font-mono uppercase tracking-widest">
                    Gesso Bettone • Parceiro Homologado
                  </div>
                )}
                {previewParceiro.destaque && (
                  <div className="absolute top-3 right-3 bg-[#D4AF37] text-[#2C3E50] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Destaque
                  </div>
                )}
              </div>

              {/* Corpo */}
              <div className="p-6 pt-0 relative space-y-4">
                {/* Logo sobreposto */}
                <div className="-mt-10 mb-2 flex items-end justify-between">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-white shadow-md p-2 flex items-center justify-center overflow-hidden">
                    {previewParceiro.logo || previewParceiro.arquivo_logo ? (
                      <img
                        src={
                          previewParceiro.arquivo_logo
                            ? resolverUrlMidia(
                                'site_partners',
                                previewParceiro.id,
                                previewParceiro.arquivo_logo,
                              )
                            : previewParceiro.logo
                        }
                        alt={previewParceiro.nome}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2C3E50] text-[#D4AF37] rounded-xl flex items-center justify-center font-heading font-bold text-lg">
                        {previewParceiro.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <a
                    href={`/parceiros/${previewParceiro.slug || gerarSlug(previewParceiro.nome)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2C3E50] hover:text-[#D4AF37] font-semibold flex items-center gap-1"
                  >
                    <span>Abrir página pública</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div>
                  <h3 className="font-heading text-xl font-bold text-[#2C3E50]">
                    {previewParceiro.nome}
                  </h3>
                  {previewParceiro.papel && (
                    <span className="text-xs font-semibold text-[#D4AF37]">
                      {previewParceiro.papel}
                    </span>
                  )}
                  <div className="text-xs text-[#616F7D] mt-1 flex items-center gap-2">
                    <span>{previewParceiro.categoria || 'Geral'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#D4AF37]" />
                      {previewParceiro.cidade || 'São Pedro e região'}
                    </span>
                  </div>
                </div>

                {previewParceiro.descricao && (
                  <p className="text-xs text-[#616F7D] leading-relaxed line-clamp-4">
                    {previewParceiro.descricao}
                  </p>
                )}

                <div className="pt-2 border-t border-[#DEE4EA] flex flex-wrap gap-2 text-xs">
                  {previewParceiro.whatsapp && (
                    <a
                      href={`https://wa.me/${previewParceiro.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold text-[11px]"
                    >
                      <Phone className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                  {previewParceiro.site && (
                    <a
                      href={previewParceiro.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4f4f4] text-[#2C3E50] border border-[#DEE4EA] text-[11px] font-semibold"
                    >
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                  {previewParceiro.instagram && (
                    <a
                      href={
                        previewParceiro.instagram.startsWith('http')
                          ? previewParceiro.instagram
                          : `https://instagram.com/${previewParceiro.instagram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4f4f4] text-[#2C3E50] border border-[#DEE4EA] text-[11px] font-semibold"
                    >
                      <Instagram className="w-3 h-3" /> Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SiteParceirosPage
