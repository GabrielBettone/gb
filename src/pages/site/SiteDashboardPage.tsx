import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import { carregarDadosAnalytics } from '@/services/site'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Eye,
  MousePointerClick,
  MessageCircle,
  Bot,
  Activity,
  Download,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { baixarTodasMidiasZip } from '@/services/siteMidiasDownload'

export const SiteDashboardPage: React.FC = () => {
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [progressoZip, setProgressoZip] = useState<{
    atual: number
    total: number
    mensagem: string
  } | null>(null)
  const [periodo, setPeriodo] = useState<'7' | '30' | '90'>('30')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    visitantesUnicos: 0,
    visitas: 0,
    pageviews: 0,
    eventosCliques: 0,
    simulador: 0,
    contatos: 0,
    visitasPorDia: [] as { data: string; label: string; count: number }[],
    eventosPorDia: [] as { data: string; label: string; count: number }[],
    categoriasMaisAcessadas: [] as { nome: string; count: number }[],
    servicosMaisVisualizados: [] as { nome: string; count: number }[],
  })

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    carregarDadosAnalytics(Number(periodo))
      .then((res) => {
        if (isMounted) setData(res)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [periodo])

  // Cálculo para dimensionar altura das barras douradas
  const maxVisitasDia = Math.max(...data.visitasPorDia.map((d) => d.count), 1)
  const maxEventosDia = Math.max(...data.eventosPorDia.map((d) => d.count), 1)
  const maxCategoriaCount = Math.max(...data.categoriasMaisAcessadas.map((c) => c.count), 1)
  const maxServicoCount = Math.max(...data.servicosMaisVisualizados.map((s) => s.count), 1)

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Barra de Navegação estilo dos prints anexados */}
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Título, Seletor de Período e Botão Baixar Mídias */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Dashboard
            </h1>
            <p className="text-xs text-[#616F7D] mt-0.5">
              Gestão de conteúdo, métricas em tempo real e mídias originais do site.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botão Baixar Mídias */}
            <Button
              type="button"
              disabled={downloadingZip}
              onClick={async () => {
                setDownloadingZip(true)
                try {
                  toast({
                    title: 'Iniciando download das mídias originais',
                    description:
                      'Empacotando pastas de Projetos, Serviços e Parceiros sem marca d água...',
                  })
                  await baixarTodasMidiasZip((prog) => {
                    setProgressoZip(prog)
                  })
                  toast({
                    title: 'Download concluído com sucesso!',
                    description: 'O arquivo ZIP com todas as mídias originais foi gerado.',
                  })
                } catch (err: any) {
                  toast({
                    title: 'Erro ao baixar mídias',
                    description: err.message || 'Verifique sua conexão.',
                    variant: 'destructive',
                  })
                } finally {
                  setDownloadingZip(false)
                  setProgressoZip(null)
                }
              }}
              className="bg-[#2C3E50] hover:bg-[#1B2631] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm flex items-center gap-2"
            >
              {downloadingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>
                    Baixando ({progressoZip?.atual || 0}/{progressoZip?.total || '...'})
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Baixar Mídias (ZIP)</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#616F7D]">
                PERÍODO
              </span>
              <Select value={periodo} onValueChange={(val: any) => setPeriodo(val)}>
                <SelectTrigger className="w-[170px] bg-white border-[#DEE4EA] text-xs font-medium text-[#2C3E50]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent className="bg-white text-xs">
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Durante Download de Mídias */}
        {downloadingZip && progressoZip && (
          <div className="bg-[#2C3E50] text-white p-4 rounded-2xl border border-[#D4AF37]/40 shadow-md space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                {progressoZip.mensagem}
              </span>
              <span className="font-mono text-[#D4AF37] font-bold">
                {Math.round((progressoZip.atual / Math.max(progressoZip.total, 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.max(4, Math.min(100, (progressoZip.atual / Math.max(progressoZip.total, 1)) * 100))}%`,
                }}
                className="h-full bg-[#D4AF37] transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* 6 Cards de Indicadores idênticos ao Print */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Visitantes Únicos */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              VISITANTES ÚNICOS
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.visitantesUnicos.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* 2. Visitas */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              VISITAS
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.visitas.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* 3. Pageviews */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              PAGEVIEWS
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.pageviews.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* 4. Eventos / Cliques */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              EVENTOS / CLIQUES
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.eventosCliques.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* 5. Simulador */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              SIMULADOR
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.simulador}
            </div>
          </div>

          {/* 6. Contatos */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs">
            <div className="text-[10px] sm:text-[11px] font-bold text-[#616F7D] uppercase tracking-wider">
              CONTATOS
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] mt-2">
              {data.contatos.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* 2 Gráficos de Barras Douradas: Visitas por dia & Eventos por dia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visitas por dia */}
          <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-4">
            <h2 className="font-heading text-xl font-bold text-[#2C3E50]">Visitas por dia</h2>
            <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 border-b border-[#DEE4EA] overflow-x-auto no-scrollbar">
              {data.visitasPorDia.map((item, idx) => {
                const heightPercent = maxVisitasDia > 0 ? (item.count / maxVisitasDia) * 100 : 0
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip de valor no hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-[#2C3E50] text-white text-[10px] font-bold py-0.5 px-1.5 rounded-sm pointer-events-none whitespace-nowrap z-10">
                      {item.count} visitas ({item.label})
                    </div>
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className="w-full bg-[#D4AF37] hover:bg-[#B89425] rounded-t-xs transition-all"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#616F7D] px-1 font-mono">
              <span>{data.visitasPorDia[0]?.label || ''}</span>
              <span>
                {data.visitasPorDia[Math.floor(data.visitasPorDia.length / 2)]?.label || ''}
              </span>
              <span>{data.visitasPorDia[data.visitasPorDia.length - 1]?.label || ''}</span>
            </div>
          </div>

          {/* Eventos por dia */}
          <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-4">
            <h2 className="font-heading text-xl font-bold text-[#2C3E50]">Eventos por dia</h2>
            <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 border-b border-[#DEE4EA] overflow-x-auto no-scrollbar">
              {data.eventosPorDia.map((item, idx) => {
                const heightPercent = maxEventosDia > 0 ? (item.count / maxEventosDia) * 100 : 0
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-[#2C3E50] text-white text-[10px] font-bold py-0.5 px-1.5 rounded-sm pointer-events-none whitespace-nowrap z-10">
                      {item.count} eventos ({item.label})
                    </div>
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className="w-full bg-[#D4AF37] hover:bg-[#B89425] rounded-t-xs transition-all"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#616F7D] px-1 font-mono">
              <span>{data.eventosPorDia[0]?.label || ''}</span>
              <span>
                {data.eventosPorDia[Math.floor(data.eventosPorDia.length / 2)]?.label || ''}
              </span>
              <span>{data.eventosPorDia[data.eventosPorDia.length - 1]?.label || ''}</span>
            </div>
          </div>
        </div>

        {/* 2 Listas com Barras Horizontais Douradas: Categorias mais acessadas & Serviços mais visualizados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categorias mais acessadas */}
          <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-5">
            <h2 className="font-heading text-xl font-bold text-[#2C3E50]">
              Categorias mais acessadas
            </h2>
            {data.categoriasMaisAcessadas.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#616F7D]">
                Nenhum dado registrado para o período. Conforme visitantes navegam pelo site
                público, os contadores são atualizados em tempo real.
              </div>
            ) : (
              <div className="space-y-4">
                {data.categoriasMaisAcessadas.map((cat, idx) => {
                  const widthPercent = (cat.count / maxCategoriaCount) * 100
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#2C3E50]">
                        <span>{cat.nome}</span>
                        <span className="font-mono text-sm">{cat.count}</span>
                      </div>
                      <div className="h-2 w-full bg-[#f4f4f4] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(widthPercent, 5)}%` }}
                          className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Serviços mais visualizados */}
          <div className="bg-white p-6 rounded-2xl border border-[#DEE4EA] shadow-xs space-y-5">
            <h2 className="font-heading text-xl font-bold text-[#2C3E50]">
              Serviços mais visualizados
            </h2>
            {data.servicosMaisVisualizados.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#616F7D]">
                Nenhum clique em serviços registrado ainda no período. O rastreamento inicia do zero
                conforme clientes reais acessam os cards.
              </div>
            ) : (
              <div className="space-y-4">
                {data.servicosMaisVisualizados.map((serv, idx) => {
                  const widthPercent = (serv.count / maxServicoCount) * 100
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#2C3E50]">
                        <span>{serv.nome}</span>
                        <span className="font-mono text-sm">{serv.count}</span>
                      </div>
                      <div className="h-2 w-full bg-[#f4f4f4] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(widthPercent, 5)}%` }}
                          className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SiteDashboardPage
