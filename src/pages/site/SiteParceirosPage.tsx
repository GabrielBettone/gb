import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarParceiros,
  listarCategoriasParceiros,
  listarCliquesParceiros,
  criarParceiro,
  atualizarParceiro,
  excluirParceiro,
  criarCategoriaParceiro,
  atualizarCategoriaParceiro,
  excluirCategoriaParceiro,
  obterConfiguracoes,
  salvarConfiguracoes,
  SiteParceiro,
  CategoriaParceiro,
  PartnerClick,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  ExternalLink,
  Handshake,
  MessageCircle,
  Calendar,
  Layers,
  BarChart2,
  Sliders,
  Search,
  X,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ImageUploader from '@/components/site/ImageUploader'
import { resolverUrlMidia } from '@/lib/watermark'

export const SiteParceirosPage: React.FC = () => {
  // Abas internas do módulo parceiros (Print 2)
  const [abaAtiva, setAbaAtiva] = useState<
    'Dashboard' | 'Parceiros' | 'Categorias' | 'Relatórios' | 'Configurações'
  >('Dashboard')

  // Filtros de Mês / Ano
  const hoje = new Date()
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

  // Filtros, Busca e Ordenação na aba Parceiros (mantém contexto inline)
  const [buscaParceiro, setBuscaParceiro] = useState('')
  const [filtroCatParceiro, setFiltroCatParceiro] = useState('todas')
  const [filtroStatusParceiro, setFiltroStatusParceiro] = useState('todos')
  const [ordParceiro, setOrdParceiro] = useState<'ordem' | 'nome' | 'mais_recentes'>('ordem')

  // Form Parceiro
  const [pNome, setPNome] = useState('')
  const [pCategoria, setPCategoria] = useState('')
  const [pPapel, setPPapel] = useState('')
  const [pWhatsapp, setPWhatsapp] = useState('')
  const [pLogo, setPLogo] = useState('')
  const [pArquivoLogoFile, setPArquivoLogoFile] = useState<File | undefined>()
  const [pDescricao, setPDescricao] = useState('')
  const [pDestaque, setPDestaque] = useState(false)
  const [pAtivo, setPAtivo] = useState(true)
  const [pOrdem, setPOrdem] = useState(1)

  // Form Categoria
  const [cNome, setCNome] = useState('')
  const [cSlug, setCSlug] = useState('')
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
        if (!matchNome && !matchPapel && !matchDesc) return false
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
    const pNome = c.parceiro_nome || 'Parceiro'
    const cur = cliquesPorParceiroMap.get(pId) || { nome: pNome, count: 0 }
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
    setPCategoria(categorias[0]?.nome || '')
    setPPapel('')
    setPWhatsapp('5519981093379')
    setPLogo('')
    setPArquivoLogoFile(undefined)
    setPDescricao('')
    setPDestaque(false)
    setPAtivo(true)
    setPOrdem(parceiros.length + 1)
    setModalParceiroOpen(true)
  }

  const abrirEdicaoParceiro = (p: SiteParceiro) => {
    setEditandoParceiro(p)
    setPNome(p.nome)
    setPCategoria(p.categoria || '')
    setPPapel(p.papel || '')
    setPWhatsapp(p.whatsapp || '')
    setPLogo(p.arquivo_logo || p.logo || '')
    setPArquivoLogoFile(undefined)
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

    try {
      if (editandoParceiro) {
        await atualizarParceiro(
          editandoParceiro.id,
          {
            nome: pNome,
            categoria: pCategoria,
            papel: pPapel,
            whatsapp: pWhatsapp,
            logo: pLogo.startsWith('blob:') ? '' : pLogo,
            descricao: pDescricao,
            destaque: pDestaque,
            ativo: pAtivo,
            ordem: Number(pOrdem),
          },
          pArquivoLogoFile,
        )
        toast({ title: 'Parceiro atualizado!' })
      } else {
        await criarParceiro(
          {
            nome: pNome,
            categoria: pCategoria,
            papel: pPapel,
            whatsapp: pWhatsapp,
            logo: pLogo.startsWith('blob:') ? '' : pLogo,
            descricao: pDescricao,
            destaque: pDestaque,
            ativo: pAtivo,
            ordem: Number(pOrdem),
          },
          pArquivoLogoFile,
        )
        toast({ title: 'Parceiro cadastrado!' })
      }
      setModalParceiroOpen(false)
      carregarDados()
    } catch {
      toast({ title: 'Erro ao salvar parceiro', variant: 'destructive' })
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
    setCAtiva(true)
    setCOrdem(categorias.length + 1)
    setModalCategoriaOpen(true)
  }

  const abrirEdicaoCategoria = (c: CategoriaParceiro) => {
    setEditandoCategoria(c)
    setCNome(c.nome)
    setCSlug(c.slug)
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

    try {
      if (editandoCategoria) {
        await atualizarCategoriaParceiro(editandoCategoria.id, {
          nome: cNome,
          slug: cSlug,
          ativa: cAtiva,
          ordem: Number(cOrdem),
        })
        toast({ title: 'Categoria atualizada!' })
      } else {
        await criarCategoriaParceiro({
          nome: cNome,
          slug: cSlug,
          ativa: cAtiva,
          ordem: Number(cOrdem),
        })
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

      {/* Sub-barra interna do Módulo Parceiros idêntica ao Print */}
      <div className="bg-[#141C22] border-b border-[#2C3E50]/60 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {(['Dashboard', 'Parceiros', 'Categorias', 'Relatórios', 'Configurações'] as const).map(
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
              Dashboard de parceiros
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Visão geral dos parceiros, contatos pelo WhatsApp e relatórios mensais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={abrirNovoParceiro}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
            >
              NOVO PARCEIRO
            </Button>
            <Button
              variant="outline"
              onClick={abrirNovaCategoria}
              className="bg-white border-[#DEE4EA] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
            >
              CATEGORIAS
            </Button>
          </div>
        </div>

        {/* Filtros MÊS e ANO idênticos ao Print */}
        <div className="bg-white p-4 rounded-2xl border border-[#DEE4EA] shadow-xs flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#616F7D]">MÊS</div>
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
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#616F7D]">ANO</div>
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

        {/* ABA: DASHBOARD */}
        {abaAtiva === 'Dashboard' && (
          <div className="space-y-6">
            {/* Grid 6 KPIs do print */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total de parceiros */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Total de parceiros</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalParceiros}
                </div>
              </div>

              {/* Parceiros ativos */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Parceiros ativos</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {parceirosAtivos}
                </div>
              </div>

              {/* Em destaque */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Em destaque</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {parceirosDestaque}
                </div>
              </div>

              {/* Categorias */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">Categorias</div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCategorias}
                </div>
              </div>

              {/* Cliques no WhatsApp no mês */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">
                  Cliques no WhatsApp · {String(mesSelecionado).padStart(2, '0')}/{anoSelecionado}
                </div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCliquesMes}
                </div>
              </div>

              {/* Cliques mês anterior */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs">
                <div className="text-[11px] font-semibold text-[#616F7D]">
                  Cliques ·{' '}
                  {String(mesSelecionado === 1 ? 12 : mesSelecionado - 1).padStart(2, '0')}/
                  {mesSelecionado === 1 ? anoSelecionado - 1 : anoSelecionado}
                </div>
                <div className="font-heading text-3xl font-bold text-[#2C3E50] mt-2">
                  {totalCliquesMesAnterior}
                </div>
              </div>
            </div>

            {/* Linha Inferior com 2 Cards do Print: Maior Volume no Período & Página Pública */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maior volume no período */}
              <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  MAIOR VOLUME NO PERÍODO
                </div>
                <div className="font-heading text-2xl font-bold text-[#2C3E50]">
                  {maiorVolume.nome}
                </div>
                <p className="text-xs text-[#616F7D]">{maiorVolume.count} cliques no WhatsApp</p>
              </div>

              {/* Página pública */}
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
                    placeholder="Buscar por nome, papel ou especialidade..."
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

                <Select value={filtroStatusParceiro} onValueChange={setFiltroStatusParceiro}>
                  <SelectTrigger className="w-[120px] text-xs h-9 bg-white border-[#DEE4EA]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="ativos">Apenas Ativos</SelectItem>
                    <SelectItem value="inativos">Apenas Inativos</SelectItem>
                    <SelectItem value="destaques">Destaques</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#616F7D]">Ordenar por:</span>
                <Select value={ordParceiro} onValueChange={(val: any) => setOrdParceiro(val)}>
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

            <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#DEE4EA] flex items-center justify-between">
                <h2 className="font-heading font-bold text-base text-[#2C3E50]">
                  Lista de Parceiros Cadastrados ({parceirosFiltrados.length})
                </h2>
                <Button
                  onClick={abrirNovoParceiro}
                  size="sm"
                  className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                  <tr>
                    <th className="py-3 px-4">Parceiro</th>
                    <th className="py-3 px-4">Categoria / Papel</th>
                    <th className="py-3 px-4">WhatsApp</th>
                    <th className="py-3 px-4">Destaque</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DEE4EA]">
                  {parceirosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                        Nenhum parceiro encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    parceirosFiltrados.map((p) => (
                      <tr key={p.id} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {p.arquivo_logo || p.logo ? (
                              <img
                                src={
                                  p.arquivo_logo
                                    ? resolverUrlMidia('site_partners', p.id, p.arquivo_logo)
                                    : p.logo
                                }
                                alt={p.nome}
                                crossOrigin="anonymous"
                                className="w-10 h-10 rounded-lg object-contain bg-white border border-[#DEE4EA] p-1"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-[#DEE4EA] flex items-center justify-center font-bold text-[#616F7D]">
                                LOGO
                              </div>
                            )}
                            <div>
                              <span className="font-heading font-bold text-sm text-[#2C3E50] block">
                                {p.nome}
                              </span>
                              <span className="text-[11px] text-[#616F7D]">
                                Ordem: #{p.ordem || 1}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#2C3E50]">
                              {p.categoria || 'Geral'}
                            </span>
                            <span className="text-[11px] text-[#616F7D]">{p.papel || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#2C3E50]">
                          {p.whatsapp || '—'}
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
                              onClick={() => abrirEdicaoParceiro(p)}
                              className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                              title="Editar parceiro (mesma tela)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluirParceiro(p)}
                              className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
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
        )}

        {/* ABA: CATEGORIAS */}
        {abaAtiva === 'Categorias' && (
          <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#DEE4EA] flex items-center justify-between">
              <h2 className="font-heading font-bold text-base text-[#2C3E50]">
                Categorias de Parceiros
              </h2>
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
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {categorias.length === 0 ? (
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
                          <button
                            onClick={() => abrirEdicaoCategoria(c)}
                            className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluirCategoria(c)}
                            className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
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
        )}

        {/* ABA: RELATÓRIOS */}
        {abaAtiva === 'Relatórios' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-4">
              <h2 className="font-heading font-bold text-lg text-[#2C3E50]">
                Cliques no WhatsApp por Parceiro ({mesesNomes[mesSelecionado - 1]}/{anoSelecionado})
              </h2>

              {cliquesPorParceiroMap.size === 0 ? (
                <div className="text-center py-8 text-xs text-[#616F7D]">
                  Nenhum clique registrado no período selecionado. Quando visitantes clicarem no
                  botão de WhatsApp do parceiro na página pública, o contador será incrementado.
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
                  Permite que visitantes acessem a lista de parceiros e entrem em contato
                  diretamente.
                </span>
              </div>
              <Switch checked={paginaPublicaAtiva} onCheckedChange={handleTogglePaginaPublica} />
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Parceiro */}
      <Dialog open={modalParceiroOpen} onOpenChange={setModalParceiroOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editandoParceiro ? `Editar Parceiro: ${editandoParceiro.nome}` : 'Novo Parceiro'}
            </DialogTitle>
            {editandoParceiro && (
              <p className="text-xs text-[#616F7D]">
                Edição inline na mesma tela — você salva sem perder o contexto dos filtros e
                ordenação atuais.
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSalvarParceiro} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Nome da Empresa / Profissional *
              </Label>
              <Input
                required
                value={pNome}
                onChange={(e) => setPNome(e.target.value)}
                placeholder="Ex: Alltax ou Manfrinato Arquitetura"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Categoria</Label>
                <Select value={pCategoria} onValueChange={setPCategoria}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue placeholder="Selecione" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">WhatsApp Comercial</Label>
                <Input
                  value={pWhatsapp}
                  onChange={(e) => setPWhatsapp(e.target.value)}
                  placeholder="Ex: 5519981093379"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem</Label>
                <Input
                  type="number"
                  value={pOrdem}
                  onChange={(e) => setPOrdem(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Upload de Logo do Parceiro */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Logo do Parceiro (Imagem/Arquivo)"
                helperText="Arquivo SVG, PNG ou JPG para o logo"
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
              <div className="pt-1">
                <Label className="text-[11px] text-[#616F7D]">
                  Ou informe uma URL externa para o logo:
                </Label>
                <Input
                  className="mt-1 text-xs"
                  value={pLogo.startsWith('blob:') ? '' : pLogo}
                  onChange={(e) => {
                    setPLogo(e.target.value)
                    setPArquivoLogoFile(undefined)
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Descrição Breve</Label>
              <Textarea
                rows={2}
                value={pDescricao}
                onChange={(e) => setPDescricao(e.target.value)}
                placeholder="Resumo da atuação do parceiro..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center bg-[#f4f4f4] p-3 rounded-xl border border-[#DEE4EA]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#2C3E50]">Destaque</Label>
                <Switch checked={pDestaque} onCheckedChange={setPDestaque} />
              </div>
              <div className="flex items-center justify-between">
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
                    setCSlug(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, ''),
                    )
                  }
                }}
                placeholder="Ex: Engenharia Civil"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Slug *</Label>
              <Input
                required
                value={cSlug}
                onChange={(e) => setCSlug(e.target.value)}
                placeholder="ex: engenharia-civil"
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
    </div>
  )
}

export default SiteParceirosPage
