import React, { useEffect, useMemo, useState } from 'react'
import SEO from '@/components/landing/SEO'
import LandingServicos from '@/components/landing/LandingServicos'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingCidades from '@/components/landing/LandingCidades'
import { SERVICOS } from '@/data/landingData'
import { obterConfiguracoes, SiteSettings } from '@/services/site'
import { buildAreaServedCities } from '@/lib/geoStructuredData'

export const ServicosListPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    let ativo = true
    obterConfiguracoes()
      .then((cfg) => {
        if (ativo) setSettings(cfg)
      })
      .catch((err) => {
        console.warn('Falha ao obter configs em ServicosListPage:', err)
      })
    return () => {
      ativo = false
    }
  }, [])

  const itemListJsonLd = useMemo(() => {
    const areaServed = buildAreaServedCities(settings?.cidades_atendidas)
    return {
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
          areaServed,
          provider: {
            '@type': 'LocalBusiness',
            name: settings?.nome_site || 'Gesso Bettone',
            areaServed,
          },
        },
      })),
    }
  }, [settings])

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

      <div className="bg-[#2C3E50] text-white py-12 border-b border-[#1B2631]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="font-heading text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-2">
              CATÁLOGO COMPLETO
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Serviços em Gesso, Drywall e Acabamentos
            </h1>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
              Soluções completas com fotos reais, especificações e consultoria técnica para São
              Pedro, Piracicaba, Águas de São Pedro e toda a região.
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
