import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Star, MessageCircle, HeartHandshake, Quote, CheckCircle2 } from 'lucide-react'
import {
  listarDepoimentos,
  obterConfiguracoes,
  criarDepoimento,
  SiteDepoimento,
  SiteSettings,
  registrarEventoAnalytics,
} from '@/services/site'

export const LandingDepoimentos: React.FC = () => {
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [avaliacao, setAvaliacao] = useState(5)
  const [mensagem, setMensagem] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [depoimentos, setDepoimentos] = useState<SiteDepoimento[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviadoSucesso, setEnviadoSucesso] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const [deps, cfg] = await Promise.all([listarDepoimentos(true), obterConfiguracoes()])
        if (!isMounted) return
        setDepoimentos(deps)
        setSettings(cfg)
      } catch (err) {
        console.error('Erro ao carregar depoimentos/configurações:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [])

  // Se a configuração estiver desligada, esconde toda a seção e o botão
  if (settings && settings.exibir_depoimentos === false) {
    return null
  }

  const handleEnviarDepoimento = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Grava no banco de dados como pendente de aprovação
    try {
      await criarDepoimento({
        nome,
        cidade,
        texto: mensagem,
        nota: avaliacao,
        aprovado: false,
      })
    } catch (err) {
      console.error('Erro ao salvar depoimento no banco:', err)
    }

    registrarEventoAnalytics({
      tipo: 'contato',
      metadata: { acao: 'depoimento_enviado', nome, cidade, nota: avaliacao },
    })

    // 2. Encaminha também no WhatsApp
    const zap = settings?.whatsapp_principal || '5519981093379'
    const text = `*Depoimento de Cliente - Gesso Bettone*%0A%0A*Nome:* ${encodeURIComponent(
      nome,
    )}%0A*Cidade:* ${encodeURIComponent(cidade || 'Não informada')}%0A*Avaliação:* ${'⭐'.repeat(
      avaliacao,
    )} (${avaliacao}/5)%0A*Depoimento:* ${encodeURIComponent(mensagem)}`

    window.open(`https://wa.me/${zap}?text=${text}`, '_blank')
    setEnviadoSucesso(true)
    setTimeout(() => {
      setDialogOpen(false)
      setEnviadoSucesso(false)
      setNome('')
      setCidade('')
      setMensagem('')
    }, 1500)
  }

  return (
    <section className="py-16 bg-[#f4f4f4] border-y border-[#DEE4EA]" id="depoimentos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2C3E50]">
            <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
            CLIENTES & SATISFAÇÃO
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C3E50] tracking-tight">
            A opinião de quem confiou em nós
          </h2>

          <p className="font-script text-xl sm:text-2xl text-[#D4AF37]">
            "Excelência e acabamento impecável em cada metro quadrado"
          </p>

          <p className="text-sm sm:text-base text-[#616F7D] leading-relaxed">
            Mais de três décadas transformando lares, consultórios e espaços comerciais em São Pedro
            e região. Prezado cliente, sua avaliação é fundamental para continuarmos entregando o
            melhor acabamento.
          </p>

          {/* Grade de Depoimentos Aprovados do Banco */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-left">
            {depoimentos.length > 0 ? (
              depoimentos.slice(0, 6).map((dep) => (
                <div
                  key={dep.id}
                  className="p-5 rounded-xl bg-white border border-[#DEE4EA] shadow-xs flex flex-col justify-between relative group hover:border-[#2C3E50]/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-[#D4AF37]">
                        {Array.from({ length: dep.nota || 5 }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <Quote className="w-4 h-4 text-[#DEE4EA]" />
                    </div>
                    <p className="text-xs sm:text-sm text-[#2C3E50] leading-relaxed italic mb-4">
                      "{dep.texto}"
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#DEE4EA] flex items-center justify-between">
                    <div>
                      <span className="font-heading font-bold text-xs text-[#2C3E50] block">
                        {dep.nome}
                      </span>
                      {dep.cidade && (
                        <span className="text-[11px] text-[#616F7D]">{dep.cidade}</span>
                      )}
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-xs text-[#616F7D]">
                Nenhum depoimento em exibição no momento.
              </div>
            )}
          </div>

          {/* Botão de Enviar Depoimento */}
          <div className="pt-6">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-11 px-6 rounded-xl shadow-sm transition-all">
                  <Star className="w-4 h-4 mr-2 text-[#2C3E50] fill-current" />
                  Deixe seu depoimento sobre nossos serviços
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
                    Conte sua experiência com a Gesso Bettone
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#616F7D]">
                    Seu depoimento nos ajuda a aprimorar nosso trabalho e orienta futuros clientes.
                    Ele será encaminhado diretamente ao nosso time.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleEnviarDepoimento} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="depoimento-nome"
                      className="text-xs font-semibold text-[#2C3E50]"
                    >
                      Seu Nome Completo *
                    </Label>
                    <Input
                      id="depoimento-nome"
                      required
                      placeholder="Ex: João da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="depoimento-cidade"
                      className="text-xs font-semibold text-[#2C3E50]"
                    >
                      Sua Cidade (Opcional)
                    </Label>
                    <Input
                      id="depoimento-cidade"
                      placeholder="Ex: São Pedro, Piracicaba, Águas de São Pedro..."
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#2C3E50]">Avaliação Geral</Label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setAvaliacao(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= avaliacao ? 'text-[#D4AF37] fill-current' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-[#2C3E50] ml-2">
                        {avaliacao} de 5 estrelas
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="depoimento-msg"
                      className="text-xs font-semibold text-[#2C3E50]"
                    >
                      Seu Comentário / Depoimento *
                    </Label>
                    <Textarea
                      id="depoimento-msg"
                      required
                      rows={4}
                      placeholder="Conte como foi o atendimento, a pontualidade e o acabamento da sua obra..."
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
                    >
                      <MessageCircle className="w-4 h-4 mr-1.5 text-[#2C3E50]" />
                      Enviar via WhatsApp
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingDepoimentos
