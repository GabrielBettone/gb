import React, { useState, useEffect } from 'react'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Phone,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  solicitarCodigoSimulador,
  confirmarCodigoSimulador,
  gerarSimulacaoComIa,
  SimuladorCliente,
  GerarSimulacaoResult,
} from '@/services/simulador'
import { obterConfiguracoes, SiteSettings } from '@/services/site'

const SERVICOS_SIMULADOR = [
  {
    nome: 'Forro de Gesso Tabicado com LED',
    slug: 'forro-tabicado-led',
    desc: 'Rebaixo elegante com junta de dilatação tabicada e perfil para iluminação indireta quente.',
  },
  {
    nome: 'Sanca Invertida Iluminada',
    slug: 'sanca-invertida',
    desc: 'Iluminação cênica de destaque valorizando o teto e os detalhes arquitetônicos.',
  },
  {
    nome: 'Divisória em Drywall Acústico',
    slug: 'divisoria-drywall',
    desc: 'Separação prática e rápida de cômodos com isolamento acústico e acabamento pronto para pintura.',
  },
  {
    nome: 'Molduras & Boiseries Clássicas',
    slug: 'molduras-boiseries',
    desc: 'Molduras de teto e molduras de parede refinadas que trazem sofisticação atemporal.',
  },
  {
    nome: 'Cortineiro Iluminado Embutido',
    slug: 'cortineiro-iluminado',
    desc: 'Cortineiro em gesso que esconde o trilho da cortina com luz suave integrada.',
  },
]

export const SimuladorPublicPage: React.FC = () => {
  const [config, setConfig] = useState<SiteSettings | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Estados do fluxo
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState(SERVICOS_SIMULADOR[0].nome)
  const [detalhes, setDetalhes] = useState('')
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState<GerarSimulacaoResult | null>(null)

  // Autenticação por telefone do cliente
  const [cliente, setCliente] = useState<SimuladorCliente | null>(null)
  const [telefone, setTelefone] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoDemo, setCodigoDemo] = useState('')
  const [validandoCodigo, setValidandoCodigo] = useState(false)

  useEffect(() => {
    obterConfiguracoes()
      .then((cfg) => setConfig(cfg))
      .finally(() => setLoadingConfig(false))
  }, [])

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Envie um arquivo de imagem (JPEG, PNG ou WEBP)', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setFotoOriginal(ev.target?.result as string)
      setResultado(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefone.trim()) {
      toast({ title: 'Informe seu WhatsApp celular com DDD', variant: 'destructive' })
      return
    }

    setValidandoCodigo(true)
    try {
      const res = await solicitarCodigoSimulador(telefone, nomeCliente)
      setCodigoEnviado(true)
      if (res.codigo_demo) {
        setCodigoDemo(res.codigo_demo)
        setCodigoInput(res.codigo_demo)
      }
      toast({
        title: 'Código gerado com sucesso!',
        description: 'Digite o código para autenticar e iniciar suas simulações.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao solicitar código',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setValidandoCodigo(false)
    }
  }

  const handleConfirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoInput.trim()) return

    setValidandoCodigo(true)
    try {
      const res = await confirmarCodigoSimulador(telefone, codigoInput)
      setCliente(res.cliente)
      toast({
        title: 'Telefone confirmado com sucesso!',
        description: `Bem-vindo! Você possui cota mensal de ${res.cliente.cota_mensal} simulações.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na validação',
        description: err.message || 'Código incorreto.',
        variant: 'destructive',
      })
    } finally {
      setValidandoCodigo(false)
    }
  }

  const handleGerarSimulacao = async () => {
    if (!fotoOriginal) {
      toast({ title: 'Selecione uma foto do seu ambiente primeiro', variant: 'destructive' })
      return
    }

    if (config?.simulador_exigir_login && !cliente) {
      toast({
        title: 'Confirmação de telefone necessária',
        description: 'Por favor, confirme seu número de celular para prosseguir.',
        variant: 'destructive',
      })
      return
    }

    setGerando(true)
    setResultado(null)

    try {
      const res = await gerarSimulacaoComIa({
        telefone: cliente?.telefone || telefone || 'anônimo',
        servico_nome: servicoSelecionado,
        imagem_base64: fotoOriginal,
        descricao_adicional: detalhes,
      })

      setResultado(res)
      toast({
        title: 'Simulação gerada com sucesso!',
        description: 'A transformação visual foi aplicada com a marca d água da Bettone.',
      })
    } catch (err: any) {
      toast({
        title: 'Aviso do Simulador',
        description: err.message || 'Não foi possível gerar a simulação no momento.',
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-[#2C3E50]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37]" />
          <span className="text-sm font-semibold">Carregando Simulador de Ambientes...</span>
        </div>
      </div>
    )
  }

  if (config?.simulador_ativo === false) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] py-16 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#DEE4EA] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#f4f4f4] text-[#2C3E50] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50]">
            Simulador Temporariamente Indisponível
          </h1>
          <p className="text-sm text-[#616F7D] leading-relaxed">
            O simulador inteligente de ambientes da Gesso Bettone está passando por uma manutenção
            programada ou foi desativado temporariamente pela nossa equipe técnica.
          </p>
          <div className="pt-4">
            <Button asChild className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold">
              <a href="https://wa.me/5519981093379" target="_blank" rel="noopener noreferrer">
                Solicitar orçamento diretamente no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title="Simulador de Ambientes com IA | Gesso Bettone"
        description="Envie uma foto do seu cômodo e visualize instantaneamente como ele ficará com forro de gesso tabicado, sanca iluminada, drywall ou molduras instaladas pela Gesso Bettone."
      />

      {/* Hero do Simulador */}
      <section className="bg-[#1B2631] text-white py-14 sm:py-20 border-b border-[#2C3E50] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37]">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            Inteligência Artificial Aplicada ao Gesso & Drywall
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto">
            Veja seu ambiente transformado antes mesmo do primeiro corte
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            Faça upload de uma foto da sua sala, quarto ou comércio, selecione a solução desejada e
            receba uma projeção visual de acabamento com a assinatura de excelência Bettone.
          </p>
        </div>
      </section>

      {/* Corpo do Simulador */}
      <section className="py-12 bg-[#f4f4f4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Alerta de Confirmação de Telefone se exigido */}
          {config?.simulador_exigir_login && !cliente && (
            <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 sm:p-8 shadow-xs max-w-xl mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2C3E50]">
                    Identificação de Contato
                  </h3>
                  <p className="text-xs text-[#616F7D]">
                    Confirme seu número para liberar seu limite de simulações com IA
                  </p>
                </div>
              </div>

              {!codigoEnviado ? (
                <form onSubmit={handleSolicitarCodigo} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C3E50]">
                      Seu Nome (opcional)
                    </label>
                    <Input
                      placeholder="Ex: Gabriel Silva"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      className="bg-white border-[#DEE4EA] text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C3E50]">
                      WhatsApp / Celular com DDD
                    </label>
                    <Input
                      placeholder="Ex: (19) 98109-3379"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="bg-white border-[#DEE4EA] text-xs"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={validandoCodigo}
                    className="w-full bg-[#2C3E50] hover:bg-[#1B2631] text-white font-bold text-xs h-10 rounded-xl"
                  >
                    {validandoCodigo ? 'Gerando código...' : 'Solicitar Código de Acesso'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleConfirmarCodigo} className="space-y-4 pt-2">
                  <div className="p-3 rounded-xl bg-[#F0F5F2] border border-[#2C3E50]/20 text-xs text-[#2C3E50] space-y-1">
                    <p className="font-semibold">Código gerado para {telefone}:</p>
                    <p className="text-base font-mono font-bold text-[#D4AF37]">{codigoDemo}</p>
                    <p className="text-[11px] text-[#616F7D]">
                      Insira o código acima para validar seu acesso instantaneamente.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#2C3E50]">
                      Código de 6 dígitos
                    </label>
                    <Input
                      placeholder="000000"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      className="bg-white border-[#DEE4EA] text-center font-mono font-bold tracking-widest text-base"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCodigoEnviado(false)}
                      className="w-1/3 text-xs"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      disabled={validandoCodigo}
                      className="w-2/3 bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
                    >
                      {validandoCodigo ? 'Validando...' : 'Confirmar e Liberar'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Área Principal de Simulação */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna 1: Parâmetros & Foto (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-[#2C3E50]">
                  1. Foto do seu cômodo
                </h2>
                <p className="text-xs text-[#616F7D] mt-0.5">
                  Tire uma foto bem iluminada do teto ou das paredes onde deseja o trabalho.
                </p>
              </div>

              {/* Upload Box */}
              <div>
                {fotoOriginal ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#DEE4EA] aspect-[4/3] bg-black/5 group">
                    <img
                      src={fotoOriginal}
                      alt="Ambiente original"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-[#2C3E50] text-xs font-bold px-3 py-2 rounded-lg shadow-sm">
                        Trocar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadFoto}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer border-2 border-dashed border-[#DEE4EA] hover:border-[#D4AF37] rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-[#f8fafc]">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-[#DEE4EA] flex items-center justify-center mb-3 text-[#2C3E50]">
                      <Upload className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-bold text-[#2C3E50]">
                      Clique para enviar a foto
                    </span>
                    <span className="text-[11px] text-[#616F7D] mt-1">
                      JPEG, PNG ou WEBP até 15MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadFoto}
                    />
                  </label>
                )}
              </div>

              {/* Escolha do Serviço */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider block">
                  2. Escolha o acabamento desejado
                </label>
                <div className="space-y-2">
                  {SERVICOS_SIMULADOR.map((srv) => (
                    <button
                      key={srv.slug}
                      type="button"
                      onClick={() => setServicoSelecionado(srv.nome)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                        servicoSelecionado === srv.nome
                          ? 'border-[#2C3E50] bg-[#E8EDF2] font-semibold text-[#2C3E50] shadow-xs'
                          : 'border-[#DEE4EA] hover:bg-[#f8fafc] text-[#616F7D]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#2C3E50] font-bold">{srv.nome}</span>
                        {servicoSelecionado === srv.nome && (
                          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                        )}
                      </div>
                      <p className="text-[11px] mt-1 leading-snug">{srv.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalhes Adicionais */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider block">
                  3. Preferências de iluminação ou estilo
                </label>
                <Textarea
                  rows={3}
                  placeholder="Ex: Prefiro fita LED branco quente 3000k, rebaixo mínimo de 15cm, pintura branca fosca..."
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  className="bg-white border-[#DEE4EA] text-xs"
                />
              </div>

              {/* Botão de Disparo */}
              <div>
                <Button
                  type="button"
                  onClick={handleGerarSimulacao}
                  disabled={gerando || !fotoOriginal}
                  className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-12 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {gerando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Projetando acabamento com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#2C3E50]" />
                      Gerar Projeção do Ambiente
                    </>
                  )}
                </Button>
                {cliente && (
                  <p className="text-[11px] text-center text-[#616F7D] mt-2">
                    Cota: {cliente.cota_mensal - cliente.geracoes_mes_atual} simulações restantes
                    este mês
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 2: Resultado Projetado com Marca d'Água (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#DEE4EA]">
                  <div>
                    <h2 className="font-heading font-bold text-xl text-[#2C3E50]">
                      Visualização da Transformação
                    </h2>
                    <p className="text-xs text-[#616F7D]">
                      Imagem renderizada com a marca d água de garantia Gesso Bettone
                    </p>
                  </div>
                  {resultado && (
                    <Badge className="bg-[#2C3E50] text-white text-xs">
                      {resultado.modo === 'gateway' ? 'IA Generativa' : 'Curadoria Técnica'}
                    </Badge>
                  )}
                </div>

                <div className="mt-6">
                  {gerando ? (
                    <div className="aspect-[16/10] bg-[#f8fafc] rounded-xl border border-[#DEE4EA] flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center animate-pulse">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <h3 className="font-heading font-bold text-base text-[#2C3E50]">
                        Aplicando {servicoSelecionado}...
                      </h3>
                      <p className="text-xs text-[#616F7D] max-w-sm">
                        Calculando alinhamento dos perfis, difusão de luz LED e texturização
                        acetinada...
                      </p>
                    </div>
                  ) : resultado ? (
                    <div className="space-y-4">
                      {/* Imagem com Marca d'Água Bettone Obrigatória */}
                      <div className="relative rounded-2xl overflow-hidden border border-[#DEE4EA] shadow-md bg-black aspect-[16/10]">
                        <WatermarkedImage
                          src={resultado.url_resultado}
                          alt={`Projeção de ${resultado.servico_nome}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Ações pós-simulação */}
                      <div className="p-4 rounded-xl bg-[#F0F5F2] border border-[#2C3E50]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-[#2C3E50] space-y-0.5 text-center sm:text-left">
                          <p className="font-bold">Gostou do resultado?</p>
                          <p className="text-[#616F7D]">
                            Nossos mestres em gesso executam exatamente esse acabamento na sua obra.
                          </p>
                        </div>
                        <Button
                          asChild
                          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-5 rounded-xl shadow-xs"
                        >
                          <a
                            href={`https://wa.me/5519981093379?text=${encodeURIComponent(
                              `Olá! Fiz uma simulação no site da Gesso Bettone para ${resultado.servico_nome} e gostaria de solicitar um orçamento para meu espaço!`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Send className="w-3.5 h-3.5 mr-2" />
                            Pedir Orçamento Desta Simulação
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-[#f8fafc] rounded-xl border-2 border-dashed border-[#DEE4EA] flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <ImageIcon className="w-12 h-12 text-[#DEE4EA]" />
                      <h3 className="font-heading font-bold text-base text-[#2C3E50]">
                        Nenhuma simulação gerada ainda
                      </h3>
                      <p className="text-xs text-[#616F7D] max-w-sm">
                        Envie a foto do seu cômodo no painel à esquerda e clique em "Gerar Projeção
                        do Ambiente" para visualizar a mágica do gesso aplicado.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Institucional de Confiança */}
              <div className="p-6 rounded-2xl bg-white border border-[#DEE4EA] space-y-3">
                <h3 className="font-heading font-bold text-sm text-[#2C3E50] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  Garantia de Fidelidade de Execução
                </h3>
                <p className="text-xs text-[#616F7D] leading-relaxed">
                  As imagens geradas pelo nosso simulador servem como referência visual para o
                  planejamento. Toda instalação da Gesso Bettone segue normas da ABNT, com perfis
                  galvanizados antiferrugem, cantoneiras estruturadas e iluminação testada antes da
                  entrega final.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingCTA
        titulo="Pronto para tirar o projeto do papel?"
        subtitulo="Visita técnica em São Pedro, Piracicaba e região com orçamento detalhado em até 24 horas."
        botaoTexto="Chamar no WhatsApp"
      />
    </>
  )
}

export default SimuladorPublicPage
