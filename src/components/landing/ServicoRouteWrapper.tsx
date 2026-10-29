import React, { Component, ReactNode, ErrorInfo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldCheck, MessageCircle, ArrowLeft, RefreshCw, Layers } from 'lucide-react'
import { getWhatsAppUrlForService, SERVICOS } from '@/data/landingData'
import ServicoDetailPage from '@/pages/landing/ServicoDetailPage'

interface BoundaryProps {
  children: ReactNode
  slug?: string
}

interface BoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ServicoRouteBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ServicoRouteBoundary capturou erro na rota /servicos/:slug:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public componentDidUpdate(prevProps: BoundaryProps) {
    // Reset automático se o slug mudar
    if (prevProps.slug !== this.props.slug && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null })
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render() {
    if (this.state.hasError) {
      const slugAtual = this.props.slug || ''
      const servicoLocal = SERVICOS.find(
        (s) => s.slug === slugAtual || s.slug.replace(/-/g, '') === slugAtual.replace(/-/g, ''),
      )
      const nomeServico = servicoLocal?.titulo || slugAtual.replace(/-/g, ' ') || 'Serviço'
      const whatsappUrl = getWhatsAppUrlForService(nomeServico)
      const outrosServicos = SERVICOS.filter((s) => s.slug !== slugAtual).slice(0, 3)

      return (
        <div className="min-h-[70vh] bg-[#f4f4f4] py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-[#DEE4EA] p-8 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 bg-[#2C3E50]/10 rounded-2xl flex items-center justify-center mx-auto text-[#2C3E50]">
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">
                Gesso Bettone • Atendimento Especializado
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50]">
                {nomeServico ? `Soluções em ${nomeServico}` : 'Detalhes do Serviço'}
              </h1>
              <p className="text-sm text-[#616F7D] leading-relaxed max-w-md mx-auto">
                Não foi possível carregar a visualização completa desta página neste instante. Você
                pode falar diretamente com nossos especialistas pelo WhatsApp com fotos e projetos,
                ou explorar os outros serviços do nosso catálogo.
              </p>
            </div>

            {/* Mensagem técnica do erro em texto pequeno para diagnóstico visível */}
            {this.state.error && (
              <div className="p-3 bg-red-50/90 border border-red-200 rounded-lg text-left max-w-md mx-auto">
                <p className="text-[11px] font-mono text-red-700 break-words leading-tight">
                  <span className="font-semibold text-red-800">Diagnóstico técnico:</span>{' '}
                  {this.state.error.message || String(this.state.error)}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-1 text-[10px] text-red-600 font-mono">
                    <summary className="cursor-pointer hover:underline">Stack do erro</summary>
                    <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-[9px] bg-white p-1 rounded border border-red-100">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                asChild
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs uppercase tracking-wider h-11 px-5"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Consultar no WhatsApp
                </a>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={this.handleRetry}
                className="border-[#DEE4EA] text-[#2C3E50] font-bold text-xs uppercase tracking-wider h-11 px-4"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Recarregar
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-[#DEE4EA] text-[#2C3E50] font-bold text-xs uppercase tracking-wider h-11 px-4"
              >
                <Link to="/servicos">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Ver todos
                </Link>
              </Button>
            </div>

            {outrosServicos.length > 0 && (
              <div className="pt-6 border-t border-[#DEE4EA] text-left">
                <span className="text-xs font-semibold text-[#2C3E50] block mb-2">
                  Você também pode se interessar por:
                </span>
                <div className="flex flex-wrap gap-2">
                  {outrosServicos.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/servicos/${s.slug}`}
                      className="px-3 py-1.5 rounded-lg bg-[#f4f4f4] hover:bg-[#E8EDF2] border border-[#DEE4EA] text-xs font-medium text-[#2C3E50] transition-colors inline-flex items-center gap-1.5"
                    >
                      <Layers className="w-3 h-3 text-[#D4AF37]" />
                      <span>{s.titulo}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export const ServicoRouteWrapper: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  return (
    <ServicoRouteBoundary slug={slug} key={slug || 'servico-wrapper'}>
      <ServicoDetailPage />
    </ServicoRouteBoundary>
  )
}

export default ServicoRouteWrapper
