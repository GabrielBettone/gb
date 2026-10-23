import React from 'react'
import SEO from '@/components/landing/SEO'
import LandingDiferenciais from '@/components/landing/LandingDiferenciais'
import LandingCidades from '@/components/landing/LandingCidades'
import LandingParceiros from '@/components/landing/LandingParceiros'
import LandingCTA from '@/components/landing/LandingCTA'
import { CheckCircle2, ShieldCheck, Award, Users } from 'lucide-react'

export const SobrePage: React.FC = () => {
  return (
    <>
      <SEO
        title="Sobre a Gesso Bettone | Tradição e Excelência desde 1993"
        description="Conheça a história da Gesso Bettone: mais de 30 anos transformando ambientes com precisão em gesso, drywall e acabamentos em São Pedro/SP e região."
        canonical="/sobre"
        keywords={[
          'sobre gesso bettone',
          'historia gesso bettone',
          'empresa gesso são pedro',
          'especialista drywall piracicaba',
        ]}
      />

      {/* Hero da Página Sobre */}
      <div className="bg-[#1C4E3D] text-white py-14 border-b border-[#153A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-[#C2A24B] font-bold block mb-2">
              QUEM SOMOS
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              Mais de 30 anos dedicados à perfeição em cada acabamento.
            </h1>
            <p className="text-base sm:text-lg text-[#E7EFEA]/90 leading-relaxed">
              A Gesso Bettone nasceu com o propósito de transformar paredes e tetos comuns em
              ambientes que expressam bom gosto, aconchego e precisão construtiva.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Institucional */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#1C4E3D]">
              <Award className="w-4 h-4 text-[#C2A24B]" />
              NOSSA TRAJETÓRIA
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#22272A] tracking-tight">
              A arte do gesso aliada à engenharia moderna do drywall.
            </h2>

            <p className="text-sm sm:text-base text-[#5B6470] leading-relaxed">
              Fundada e sediada em São Pedro/SP, a <strong>Gesso Bettone</strong> consolidou-se como
              referência indiscutível em soluções de acabamento no interior paulista. O trabalho
              artesanal com molduras e sancas evoluiu lado a lado com os mais avançados sistemas de
              construção a seco (drywall, forros acartonados e cimento celular para fachadas).
            </p>

            <p className="text-sm sm:text-base text-[#5B6470] leading-relaxed">
              Trabalhamos em estreita parceria com arquitetos, engenheiros, designers de interiores
              e construtoras, garantindo que a execução no canteiro de obras seja uma reprodução
              fiel e rigorosa do projeto original.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C2A24B] flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#22272A]">
                  <strong>Profissionais qualificados:</strong> Instaladores experientes com domínio
                  em alinhamento a laser e normas técnicas ABNT.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C2A24B] flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#22272A]">
                  <strong>Materiais certificados:</strong> Chapas, perfis galvanizados e massas de
                  fabricantes homologados para máxima durabilidade.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C2A24B] flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#22272A]">
                  <strong>Compromisso de limpeza:</strong> Respeito ao seu imóvel com obra
                  organizada e descarte responsável de sobras.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#E3E6EA]">
              <img
                src="https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg"
                alt="Equipe Gesso Bettone executando forro de alto padrão"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-[#C2A24B] font-bold text-xs uppercase tracking-wider block mb-1">
                  Tradição & Confiança
                </span>
                <p className="text-lg font-bold">
                  Mais de 1.000 ambientes transformados em São Pedro, Piracicaba e região.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LandingDiferenciais />

      <LandingCidades />

      <LandingParceiros />

      <LandingCTA
        titulo="Pronto para planejar sua reforma ou construção?"
        subtitulo="Conte com quem entende do assunto há mais de três décadas. Converse diretamente com o nosso especialista."
        botaoTexto="Falar com a Gesso Bettone"
      />
    </>
  )
}

export default SobrePage
