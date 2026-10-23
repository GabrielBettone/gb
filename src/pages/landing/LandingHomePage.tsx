import React from 'react'
import SEO from '@/components/landing/SEO'
import LandingHero from '@/components/landing/LandingHero'
import LandingDiferenciais from '@/components/landing/LandingDiferenciais'
import LandingServicos from '@/components/landing/LandingServicos'
import LandingPortfolio from '@/components/landing/LandingPortfolio'
import LandingDepoimentos from '@/components/landing/LandingDepoimentos'
import LandingCidades from '@/components/landing/LandingCidades'
import LandingParceiros from '@/components/landing/LandingParceiros'
import LandingCTA from '@/components/landing/LandingCTA'
import { CIDADES_ATENDIDAS, WHATSAPP_LINK } from '@/data/landingData'

export const LandingHomePage: React.FC = () => {
  // Schema.org LocalBusiness estruturado para o Google
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': 'https://gessobettone.com.br/#business',
    name: 'Gesso Bettone',
    legalName: 'Gesso Bettone',
    url: 'https://gessobettone.com.br/',
    logo: 'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    description:
      'Projetos em gesso, drywall, forros tabicados, molduras e acabamentos de alto padrão em São Pedro/SP e região. Mais de 30 anos de experiência.',
    telephone: '+55-19-98109-3379',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'São Pedro',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    areaServed: CIDADES_ATENDIDAS.map((cidade) => ({
      '@type': 'AdministrativeArea',
      name: cidade,
    })),
    priceRange: '$$',
    sameAs: ['https://gessobettone.com.br/'],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '07:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '08:00',
        closes: '12:00',
      },
    ],
  }

  return (
    <>
      <SEO
        title="Gesso Bettone | Gesso, Drywall e Acabamentos em São Pedro/SP"
        description="Projetos em gesso, drywall, forros tabicados, sancas e acabamentos com mais de 30 anos de experiência em São Pedro, Piracicaba e região. Solicite seu orçamento via WhatsApp!"
        canonical="/"
        ogType="website"
        keywords={[
          'gesso são pedro',
          'drywall são pedro',
          'gesso bettone',
          'forro de gesso são pedro sp',
          'gesso piracicaba',
          'drywall piracicaba',
          'molduras em cimento celular',
          'sancas de gesso',
          'reforma gesso drywall',
        ]}
        jsonLd={localBusinessJsonLd}
      />

      {/* Hero com Carrossel de Fotos Reais */}
      <LandingHero />

      {/* 4 Diferenciais */}
      <LandingDiferenciais />

      {/* Serviços (mostra os principais 6 na home, com botão para todos) */}
      <LandingServicos limit={6} />

      {/* Portfólio de Obras */}
      <LandingPortfolio limit={6} showFilter={true} />

      {/* Cidades Atendidas em texto para Google Index */}
      <LandingCidades />

      {/* Depoimentos & Avaliação */}
      <LandingDepoimentos />

      {/* Nossos Parceiros */}
      <LandingParceiros />

      {/* CTA Final WhatsApp */}
      <LandingCTA
        titulo="Vamos transformar seu ambiente?"
        subtitulo="Entre em contato com a Gesso Bettone para solicitar um orçamento sob medida, tirar dúvidas sobre o seu projeto ou agendar uma visita técnica."
        botaoTexto="Quero um orçamento"
      />
    </>
  )
}

export default LandingHomePage
