import React from 'react'
import SEO from '@/components/landing/SEO'
import LandingServicos from '@/components/landing/LandingServicos'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingCidades from '@/components/landing/LandingCidades'
import { SERVICOS } from '@/data/landingData'

export const ServicosListPage: React.FC = () => {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Serviços de Gesso e Drywall — Gesso Bettone',
    description:
      'Catálogo de soluções em gesso, drywall e acabamentos da Gesso Bettone em São Pedro/SP.',
    itemListElement: SERVICOS.map((servico, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: servico.titulo,
        description: servico.descricaoCurta,
        url: `https://gessobettone.com.br/servicos/${servico.slug}`,
        provider: {
          '@type': 'LocalBusiness',
          name: 'Gesso Bettone',
        },
      },
    })),
  }

  return (
    <>
      <SEO
        title="Nossos Serviços de Gesso e Drywall | Gesso Bettone São Pedro/SP"
        description="Conheça todos os nossos serviços: Forros de gesso, divisórias drywall, boiseries, sancas, molduras, pintura e acabamentos arquitetônicos em São Pedro e região."
        canonical="/servicos"
        keywords={[
          'serviços gesso são pedro',
          'drywall piracicaba',
          'forro tabicado',
          'boiserie gesso',
          'molduras cimento celular',
        ]}
        jsonLd={itemListJsonLd}
      />

      <div className="bg-[#1C4E3D] text-white py-12 border-b border-[#153A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-[#C2A24B] font-bold block mb-2">
              CATÁLOGO COMPLETO
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Serviços em Gesso, Drywall e Acabamentos
            </h1>
            <p className="text-sm sm:text-base text-[#E7EFEA]/90 leading-relaxed">
              Soluções executadas com precisão técnica milimétrica, materiais certificados e
              garantia de quem atua há mais de 30 anos no mercado.
            </p>
          </div>
        </div>
      </div>

      <LandingServicos showFilter={true} />

      <LandingCidades />

      <LandingCTA
        titulo="Precisa de uma solução sob medida?"
        subtitulo="Nossa equipe técnica avalia sua planta ou realiza uma visita no local para indicar o melhor sistema para o seu projeto."
        botaoTexto="Solicitar orçamento agora"
      />
    </>
  )
}

export default ServicosListPage
