import React from 'react'
import SEO from '@/components/landing/SEO'
import LandingPortfolio from '@/components/landing/LandingPortfolio'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingDepoimentos from '@/components/landing/LandingDepoimentos'
import { PROJETOS } from '@/data/landingData'

export const PortfolioListPage: React.FC = () => {
  const portfolioJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Portfólio de Obras e Projetos — Gesso Bettone',
    description:
      'Projetos reais de gesso acartonado, drywall, sancas e acabamentos executados pela Gesso Bettone em São Pedro/SP e região.',
    itemListElement: PROJETOS.map((proj, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'CreativeWork',
        name: proj.titulo,
        description: proj.descricao,
        image: proj.imagemCapa,
        url: `https://gessobettone.com.br/portfolio/${proj.slug}`,
      },
    })),
  }

  return (
    <>
      <SEO
        title="Portfólio de Obras e Projetos em Gesso | Gesso Bettone São Pedro/SP"
        description="Confira fotos de obras reais executadas pela Gesso Bettone: Áreas gourmet, consultórios, forros tabicados, escritórios e residências de alto padrão."
        canonical="/portfolio"
        keywords={[
          'fotos gesso são pedro',
          'portfólio gesso piracicaba',
          'obras drywall fotos',
          'forro tabicado fotos',
          'gesso bettone projetos',
        ]}
        jsonLd={portfolioJsonLd}
      />

      <div className="bg-[#1C4E3D] text-white py-12 border-b border-[#153A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-[#C2A24B] font-bold block mb-2">
              PORTFÓLIO DE PROJETOS
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Nossos Trabalhos Realizados
            </h1>
            <p className="text-sm sm:text-base text-[#E7EFEA]/90 leading-relaxed">
              Veja a qualidade, o detalhamento das quinas e a harmonia da iluminação em obras
              concluídas pela nossa equipe em São Pedro, Piracicaba e região.
            </p>
          </div>
        </div>
      </div>

      <LandingPortfolio showFilter={true} />

      <LandingDepoimentos />

      <LandingCTA
        titulo="Gostou do que viu nos projetos?"
        subtitulo="Transformamos o seu espaço com a mesma precisão e atenção aos detalhes. Faça um orçamento sem compromisso."
        botaoTexto="Fazer orçamento do meu projeto"
      />
    </>
  )
}

export default PortfolioListPage
