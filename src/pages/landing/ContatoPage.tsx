import React, { useState } from 'react'
import SEO from '@/components/landing/SEO'
import LandingCidades from '@/components/landing/LandingCidades'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { WHATSAPP_NUMBER, WHATSAPP_LINK, CIDADES_ATENDIDAS, SERVICOS } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageCircle, Phone, MapPin, Clock, Send, Sparkles, CheckCircle2 } from 'lucide-react'

export const ContatoPage: React.FC = () => {
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [servicoInteresse, setServicoInteresse] = useState('')
  const [tipoImovel, setTipoImovel] = useState('Residencial')
  const [mensagem, setMensagem] = useState('')

  const handleEnviarWhatsApp = (e: React.FormEvent) => {
    e.preventDefault()

    const linhas = [
      'Olá! Gostaria de solicitar um orçamento pelo site da Gesso Bettone.',
      `*Nome:* ${nome}`,
      `*Cidade da Obra:* ${cidade || 'Não informada'}`,
      `*Tipo:* ${tipoImovel}`,
      `*Serviço de Interesse:* ${servicoInteresse || 'Não especificado'}`,
      mensagem ? `*Detalhes:* ${mensagem}` : null,
    ].filter(Boolean)

    const textoFormatado = linhas.join('\n')
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(textoFormatado)}`
    window.open(url, '_blank')
  }

  return (
    <>
      <SEO
        title="Contato e Orçamento | Gesso Bettone São Pedro/SP"
        description="Solicite seu orçamento para forros de gesso, drywall e acabamentos com a Gesso Bettone. Atendimento rápido via WhatsApp para São Pedro, Piracicaba e região."
        canonical="/contato"
        keywords={[
          'contato gesso bettone',
          'orçamento gesso são pedro',
          'preço drywall piracicaba',
          'telefone gesso bettone',
          'whatsapp gesso bettone',
        ]}
      />

      {/* Hero da Página de Contato */}
      <div className="bg-[#1C4E3D] text-white py-12 border-b border-[#153A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-[#C2A24B] font-bold block mb-2">
              ORÇAMENTO & ATENDIMENTO
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Entre em Contato com a Gesso Bettone
            </h1>
            <p className="text-sm sm:text-base text-[#E7EFEA]/90 leading-relaxed">
              Tire dúvidas, envie fotos ou a planta da sua obra e receba uma proposta detalhada sem
              custo nem compromisso.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Lado Esquerdo: Formulário Pré-WhatsApp */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3E6EA] shadow-xs">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1C4E3D] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C2A24B]" />
                SOLICITAÇÃO DE PROPOSTA
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#22272A]">
                Preencha os dados do seu projeto
              </h2>
              <p className="text-xs sm:text-sm text-[#5B6470] mt-1">
                Você será direcionado diretamente para uma conversa com nossa equipe técnica no
                WhatsApp com tudo já estruturado.
              </p>
            </div>

            <form onSubmit={handleEnviarWhatsApp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contato-nome" className="text-xs font-semibold text-[#22272A]">
                    Seu Nome *
                  </Label>
                  <Input
                    id="contato-nome"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contato-cidade" className="text-xs font-semibold text-[#22272A]">
                    Cidade da Obra *
                  </Label>
                  <Input
                    id="contato-cidade"
                    required
                    placeholder="Ex: São Pedro, Piracicaba..."
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#22272A]">Tipo de Espaço</Label>
                  <Select value={tipoImovel} onValueChange={setTipoImovel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Residencial">Residencial (Casa / Apto)</SelectItem>
                      <SelectItem value="Comercial">
                        Comercial (Loja / Escritório / Clínica)
                      </SelectItem>
                      <SelectItem value="Fachada Externa">Fachada Externa</SelectItem>
                      <SelectItem value="Condomínio">Condomínio Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#22272A]">
                    Serviço de Maior Interesse
                  </Label>
                  <Select value={servicoInteresse} onValueChange={setServicoInteresse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICOS.map((s) => (
                        <SelectItem key={s.slug} value={s.titulo}>
                          {s.titulo}
                        </SelectItem>
                      ))}
                      <SelectItem value="Múltiplos serviços / Obra completa">
                        Múltiplos serviços / Obra completa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contato-mensagem" className="text-xs font-semibold text-[#22272A]">
                  Descrição / Medidas aproximadas (Opcional)
                </Label>
                <Textarea
                  id="contato-mensagem"
                  rows={4}
                  placeholder="Ex: Gostaria de colocar forro de gesso tabicado na sala de estar (cerca de 25m²) e cortineiro iluminado nos dois quartos."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#1C4E3D] hover:bg-[#163D30] text-white font-bold text-sm h-12 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5 text-[#C2A24B]" />
                  Enviar Solicitação via WhatsApp
                </Button>
                <p className="text-[11px] text-center text-[#5B6470] mt-2">
                  Atendimento sem burocracia com nosso especialista
                </p>
              </div>
            </form>
          </div>

          {/* Lado Direito: Canais de Atendimento & Horários */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#EEF4F0] border border-[#E3E6EA] space-y-4">
              <h3 className="font-bold text-lg text-[#1C4E3D]">Canais Diretos de Atendimento</h3>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#E3E6EA]">
                  <MessageCircle className="w-5 h-5 text-[#25D366] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#22272A] block">WhatsApp Principal</span>
                    <a
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1C4E3D] font-semibold hover:underline"
                    >
                      (19) 98109-3379
                    </a>
                    <span className="text-[11px] text-[#5B6470] block">
                      Envio de fotos, plantas e áudios
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#E3E6EA]">
                  <Phone className="w-5 h-5 text-[#1C4E3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#22272A] block">Ligações Telefônicas</span>
                    <a
                      href="tel:+5519981093379"
                      className="text-[#1C4E3D] font-semibold hover:underline"
                    >
                      (19) 98109-3379
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#E3E6EA]">
                  <MapPin className="w-5 h-5 text-[#C2A24B] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#22272A] block">Base Operacional</span>
                    <span className="text-[#5B6470]">São Pedro - SP</span>
                    <span className="text-[11px] text-[#5B6470] block">
                      Atendimento a toda a região metropolitana
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#E3E6EA]">
                  <Clock className="w-5 h-5 text-[#1C4E3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#22272A] block">Horário de Funcionamento</span>
                    <span className="text-[#5B6470] block">Segunda a Sexta: 07:00 às 18:00</span>
                    <span className="text-[#5B6470] block">Sábado: 08:00 às 12:00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E3E6EA] space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#1C4E3D]">
                Como funciona o processo:
              </h4>
              <ol className="space-y-2 text-xs text-[#5B6470]">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1C4E3D] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    1
                  </span>
                  <span>Envio de informações ou visita técnica sem compromisso</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1C4E3D] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    2
                  </span>
                  <span>Elaboração de orçamento detalhado com prazos</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1C4E3D] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    3
                  </span>
                  <span>Execução limpa, rápida e com alto padrão de acabamento</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <LandingCidades />
      <LandingParceiros />
    </>
  )
}

export default ContatoPage
