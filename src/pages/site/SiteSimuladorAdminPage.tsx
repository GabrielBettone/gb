import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  Sparkles,
  Save,
  Users,
  History,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Power,
  Phone,
  RefreshCw,
  Search,
  ExternalLink,
  Ban,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { obterConfiguracoes, salvarConfiguracoes, SiteSettings } from '@/services/site'
import {
  listarClientesSimulador,
  atualizarClienteSimulador,
  listarHistoricoSimulacoes,
  SimuladorCliente,
  SimuladorHistoricoItem,
} from '@/services/simulador'

export const SiteSimuladorAdminPage: React.FC = () => {
  const [tab, setTab] = useState<'config' | 'clientes' | 'historico'>('config')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Configurações globais
  const [simuladorAtivo, setSimuladorAtivo] = useState(true)
  const [exigirLogin, setExigirLogin] = useState(true)
  const [cotaPadrao, setCotaPadrao] = useState(5)

  // Listas
  const [clientes, setClientes] = useState<SimuladorCliente[]>([])
  const [historico, setHistorico] = useState<SimuladorHistoricoItem[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cfg, clis, hists] = await Promise.all([
        obterConfiguracoes(),
        listarClientesSimulador(),
        listarHistoricoSimulacoes(),
      ])
      setSimuladorAtivo(cfg.simulador_ativo !== false)
      setExigirLogin(!!cfg.simulador_exigir_login)
      setCotaPadrao(cfg.simulador_cota_padrao ?? 5)
      setClientes(clis)
      setHistorico(hists)
    } catch {
      toast({ title: 'Erro ao carregar dados do simulador', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await salvarConfiguracoes({
        simulador_ativo: simuladorAtivo,
        simulador_exigir_login: exigirLogin,
        simulador_cota_padrao: Number(cotaPadrao),
      })
      toast({ title: 'Configurações do simulador salvas com sucesso!' })
    } catch {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleToggleBloqueio = async (cliente: SimuladorCliente) => {
    try {
      const novoStatus = !cliente.bloqueado
      await atualizarClienteSimulador(cliente.id, { bloqueado: novoStatus })
      setClientes((prev) =>
        prev.map((c) => (c.id === cliente.id ? { ...c, bloqueado: novoStatus } : c)),
      )
      toast({
        title: novoStatus ? 'Cliente bloqueado com sucesso!' : 'Cliente desbloqueado!',
      })
    } catch {
      toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' })
    }
  }

  const handleAlterarCota = async (cliente: SimuladorCliente, novaCota: number) => {
    try {
      await atualizarClienteSimulador(cliente.id, { cota_mensal: novaCota })
      setClientes((prev) =>
        prev.map((c) => (c.id === cliente.id ? { ...c, cota_mensal: novaCota } : c)),
      )
      toast({ title: `Cota mensal alterada para ${novaCota} simulações.` })
    } catch {
      toast({ title: 'Erro ao alterar cota', variant: 'destructive' })
    }
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.telefone.includes(buscaCliente) ||
      (c.nome && c.nome.toLowerCase().includes(buscaCliente.toLowerCase())),
  )

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Sub-navegação do Módulo Site */}
      <SiteTopNav />

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#616F7D]">
                Site & Captação Digital
              </span>
              <span className="text-xs text-[#616F7D]">•</span>
              <span className="text-xs font-semibold text-[#D4AF37]">Módulo IA</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] tracking-tight mt-1 flex items-center gap-2">
              Controle do Simulador de Ambientes
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-0.5">
              Gerencie a disponibilidade pública da ferramenta, regras de acesso por telefone e
              controle de cotas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={loading}
              className="text-xs border-[#DEE4EA] bg-white text-[#2C3E50]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
            >
              <a href="/simulador" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Ver Simulador no Ar
              </a>
            </Button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-[#DEE4EA]">
          <button
            onClick={() => setTab('config')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              tab === 'config'
                ? 'border-[#2C3E50] text-[#2C3E50]'
                : 'border-transparent text-[#616F7D] hover:text-[#2C3E50]'
            }`}
          >
            <Power className="w-4 h-4" />
            Configurações Gerais
          </button>
          <button
            onClick={() => setTab('clientes')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              tab === 'clientes'
                ? 'border-[#2C3E50] text-[#2C3E50]'
                : 'border-transparent text-[#616F7D] hover:text-[#2C3E50]'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes & Cotas ({clientes.length})
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              tab === 'historico'
                ? 'border-[#2C3E50] text-[#2C3E50]'
                : 'border-transparent text-[#616F7D] hover:text-[#2C3E50]'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico de Gerações ({historico.length})
          </button>
        </div>

        {/* Conteúdo Aba: Configurações Gerais */}
        {tab === 'config' && (
          <form
            onSubmit={handleSalvarConfig}
            className="bg-white rounded-2xl border border-[#DEE4EA] p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#f8fafc] border border-[#DEE4EA]">
                <div>
                  <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
                    <Power className="w-4 h-4 text-[#D4AF37]" />
                    Simulador Ativo no Site
                  </h3>
                  <p className="text-xs text-[#616F7D] mt-0.5">
                    Habilita ou desabilita completamente a página pública /simulador. Quando
                    desativado, o cliente vê uma tela amigável informando a manutenção.
                  </p>
                </div>
                <Switch checked={simuladorAtivo} onCheckedChange={setSimuladorAtivo} />
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#f8fafc] border border-[#DEE4EA]">
                <div>
                  <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#D4AF37]" />
                    Exigir Confirmação de Celular / WhatsApp
                  </h3>
                  <p className="text-xs text-[#616F7D] mt-0.5">
                    Obrigatório para evitar abuso de robôs e garantir que apenas clientes reais
                    utilizem os recursos computacionais da inteligência artificial.
                  </p>
                </div>
                <Switch checked={exigirLogin} onCheckedChange={setExigirLogin} />
              </div>

              <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] space-y-2">
                <label className="text-sm font-bold text-[#2C3E50] block">
                  Cota Padrão de Simulações por Mês (por cliente)
                </label>
                <p className="text-xs text-[#616F7D]">
                  Quantidade máxima de transformações que cada cliente confirmado pode gerar
                  mensalmente.
                </p>
                <div className="w-48 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={cotaPadrao}
                    onChange={(e) => setCotaPadrao(Number(e.target.value))}
                    className="bg-white border-[#DEE4EA] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DEE4EA] flex items-center justify-end">
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-xl shadow-xs"
              >
                <Save className="w-4 h-4 mr-2" />
                {salvando ? 'Salvando...' : 'SALVAR CONFIGURAÇÕES DO SIMULADOR'}
              </Button>
            </div>
          </form>
        )}

        {/* Conteúdo Aba: Clientes & Cotas */}
        {tab === 'clientes' && (
          <div className="bg-white rounded-2xl border border-[#DEE4EA] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#DEE4EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2C3E50]">
                  Clientes Cadastrados no Simulador
                </h3>
                <p className="text-xs text-[#616F7D]">
                  Acompanhe o consumo de gerações, bloqueie números suspeitos ou ajuste cotas
                  individualmente.
                </p>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#616F7D]" />
                <Input
                  placeholder="Buscar por telefone ou nome..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="pl-9 bg-white border-[#DEE4EA] text-xs h-9"
                />
              </div>
            </div>

            {clientesFiltrados.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#616F7D]">
                Nenhum cliente registrado no simulador ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Consumo no Mês</th>
                      <th className="px-4 py-3">Cota Mensal</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEE4EA]">
                    {clientesFiltrados.map((cli) => (
                      <tr key={cli.id} className="hover:bg-[#f8fafc]/50">
                        <td className="px-4 py-3 font-semibold text-[#2C3E50]">
                          {cli.nome || 'Cliente Anônimo'}
                        </td>
                        <td className="px-4 py-3 text-[#2C3E50] font-mono">{cli.telefone}</td>
                        <td className="px-4 py-3">
                          {cli.bloqueado ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Bloqueado
                            </Badge>
                          ) : cli.confirmado ? (
                            <Badge className="bg-[#2C3E50] text-white text-[10px]">
                              Confirmado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#2C3E50]">
                          <span className="font-bold">{cli.geracoes_mes_atual}</span> de{' '}
                          {cli.cota_mensal}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={cli.cota_mensal}
                            onBlur={(e) => handleAlterarCota(cli, Number(e.target.value))}
                            className="w-16 h-7 px-2 border border-[#DEE4EA] rounded-md text-xs text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleBloqueio(cli)}
                            className={`text-xs h-7 px-2.5 ${
                              cli.bloqueado
                                ? 'text-[#2C3E50] hover:bg-[#E8EDF2]'
                                : 'text-[#C4453C] hover:bg-[#FBEFEE]'
                            }`}
                          >
                            {cli.bloqueado ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Bloquear
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba: Histórico de Gerações */}
        {tab === 'historico' && (
          <div className="bg-white rounded-2xl border border-[#DEE4EA] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#DEE4EA]">
              <h3 className="font-heading font-bold text-lg text-[#2C3E50]">
                Histórico Geral de Simulações
              </h3>
              <p className="text-xs text-[#616F7D]">
                Registro de todas as transformações de cômodos solicitadas pelos visitantes do site.
              </p>
            </div>

            {historico.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#616F7D]">
                Nenhuma geração realizada ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {historico.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-[#DEE4EA] overflow-hidden bg-[#f8fafc] flex flex-col justify-between"
                  >
                    <div className="aspect-[16/10] bg-black relative">
                      <img
                        src={h.url_resultado}
                        alt={h.servico_nome}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[10px]">
                        {h.servico_nome}
                      </Badge>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[#616F7D]">
                        <span>Telefone: {h.telefone || 'Anônimo'}</span>
                        <span>{new Date(h.created).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-[11px] text-[#2C3E50] line-clamp-2 italic">
                        "{h.prompt_usado}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SiteSimuladorAdminPage
