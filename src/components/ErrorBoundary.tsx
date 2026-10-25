import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  returnUrl?: string
  returnLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma exceção de renderização:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      const returnUrl = this.props.returnUrl || '/'
      const returnLabel = this.props.returnLabel || 'Voltar ao início'

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center shadow-xs">
            <div className="w-14 h-14 bg-[#2C3E50]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#2C3E50]">
              <AlertTriangle className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-[#2C3E50] mb-2">
              {this.props.fallbackTitle || 'Não foi possível exibir esta página'}
            </h1>
            <p className="text-sm text-[#616F7D] mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                'Ocorreu uma instabilidade momentânea ao carregar as informações. Você pode tentar recarregar ou navegar para outras páginas.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                type="button"
                onClick={this.handleReset}
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#DEE4EA] text-[#2C3E50] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Link to={returnUrl}>
                  <Home className="w-3.5 h-3.5" />
                  {returnLabel}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
