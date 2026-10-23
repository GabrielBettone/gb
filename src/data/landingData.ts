export interface ServicoItem {
  slug: string
  titulo: string
  categoria: 'Residencial' | 'Fachadas' | 'Comercial'
  destaque?: boolean
  descricaoCurta: string
  descricaoCompleta: string
  beneficios: string[]
  imagemPrincipal: string
  galeria: string[]
  metaTitle: string
  metaDescription: string
  keywords: string[]
}

export interface ProjetoItem {
  slug: string
  titulo: string
  categoria: 'Residencial' | 'Comercial' | 'Fachadas'
  subtitulo?: string
  descricao: string
  detalhesTecnicos?: string[]
  fotosCount: number
  imagemCapa: string
  galeria: string[]
  metaTitle: string
  metaDescription: string
}

export interface ParceiroItem {
  nome: string
  papel?: string
  logo: string
  descricao?: string
}

export interface DiferencialItem {
  titulo: string
  descricao: string
  iconName: 'Compass' | 'Sparkles' | 'ShieldCheck' | 'Headphones' | 'Clock' | 'Award'
}

export const WHATSAPP_NUMBER = '5519981093379'
export const WHATSAPP_DEFAULT_TEXT =
  'Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento.'
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_TEXT)}`

export const getWhatsAppUrlForService = (servico: string) => {
  const text = `Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento para o serviço de ${servico}.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
}

export const getWhatsAppUrlForProject = (projeto: string) => {
  const text = `Olá! Vi o projeto "${projeto}" no site da Gesso Bettone e gostaria de fazer algo parecido no meu espaço.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
}

export const CIDADES_ATENDIDAS = [
  'São Pedro/SP',
  'Águas de São Pedro/SP',
  'Piracicaba/SP',
  'Charqueada/SP',
  'Santa Maria da Serra/SP',
  'Rio Claro/SP',
  'Brotas/SP',
  'Torrinha/SP',
  'Itirapina/SP',
]

export const DIFERENCIAIS: DiferencialItem[] = [
  {
    titulo: 'Projetos sob medida',
    descricao:
      'Soluções personalizadas para cada ambiente, aproveitando cada centímetro com harmonia arquitetônica.',
    iconName: 'Compass',
  },
  {
    titulo: 'Acabamento',
    descricao:
      'Precisão em cada detalhe, cantos perfeitos, superfícies alinhadas e acabamento impecável.',
    iconName: 'Sparkles',
  },
  {
    titulo: 'Experiência comprovada',
    descricao:
      'Mais de 30 anos de atuação sólida e contínua no mercado da construção civil e interiores.',
    iconName: 'Award',
  },
  {
    titulo: 'Atendimento do projeto à entrega',
    descricao:
      'Assessoria completa, pontualidade, equipe técnica qualificada e suporte após a conclusão.',
    iconName: 'Headphones',
  },
]

export const SERVICOS: ServicoItem[] = [
  {
    slug: 'forros-de-gesso',
    titulo: 'Forros de Gesso',
    categoria: 'Residencial',
    destaque: true,
    descricaoCurta:
      'Forros de gesso sob medida, com acabamento preciso e soluções para iluminação e valorização dos ambientes.',
    descricaoCompleta:
      'Os forros de gesso da Gesso Bettone unem precisão milimétrica, conforto termoacústico e soluções luminotécnicas modernas. Seja para forro plaquinha tradicional ou acartonado estruturado, entregamos tabicas refinadas, recortes para spots, fitas de LED embutidas e superfícies 100% niveladas prontas para a pintura.',
    beneficios: [
      'Integração perfeita com projetos luminotécnicos (spots, perfis e fitas LED)',
      'Conforto térmico e atenuação acústica de alto nível',
      'Acabamento tabicado elegante ou junta invisível',
      'Esconde vigas, fiações e tubulações com facilidade',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
    ],
    metaTitle: 'Forros de Gesso em São Pedro/SP | Gesso Bettone — 30 anos',
    metaDescription:
      'Forros de gesso sob medida em São Pedro, Piracicaba e região. Acabamento preciso, forros tabicados e iluminação embutida. Solicite seu orçamento.',
    keywords: [
      'forro de gesso são pedro',
      'forro gesso piracicaba',
      'gesso tabicado',
      'rebaixo de teto gesso',
      'gesso bettone',
    ],
  },
  {
    slug: 'parede-drywall',
    titulo: 'Parede Drywall',
    categoria: 'Residencial',
    destaque: true,
    descricaoCurta:
      'Paredes, divisórias e revestimentos em drywall com execução precisa, praticidade e excelente acabamento.',
    descricaoCompleta:
      'A construção a seco com drywall oferece velocidade de execução, limpeza de obra, isolamento acústico e total flexibilidade para remodelar espaços comerciais e residenciais. Montagem com estrutura galvanizada certificada e placas resistentes (ST, RU para áreas úmidas ou RF para proteção contra fogo).',
    beneficios: [
      'Instalação rápida e obra limpa sem entulho pesado',
      'Opções de tratamento termoacústico com lã mineral ou de vidro',
      'Placas resistentes à umidade (RU verde) para banheiros e cozinhas',
      'Superfície perfeitamente plana pronta para pintura ou papel de parede',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
    ],
    metaTitle: 'Paredes e Divisórias em Drywall em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Paredes e divisórias de drywall em São Pedro e região. Construção rápida, limpa e com isolamento acústico superior. Faça seu orçamento.',
    keywords: [
      'drywall são pedro',
      'parede drywall piracicaba',
      'divisória drywall',
      'gesso acartonado são pedro sp',
    ],
  },
  {
    slug: 'molduras-e-boiseries',
    titulo: 'Faixas decorativas e Boiseries',
    categoria: 'Residencial',
    destaque: true,
    descricaoCurta:
      'Faixas decorativas, boiseries e detalhes personalizados para transformar paredes e valorizar a arquitetura.',
    descricaoCompleta:
      'O clássico boiserie francês ganha versatilidade e requinte nas mãos dos nossos artesãos. Criamos molduras de parede, composições geométricas e faixas decorativas milimetricamente simétricas, trazendo sofisticação atemporal a salas, quartos, corredores e halls de entrada.',
    beneficios: [
      'Elegância clássica e toque contemporâneo',
      'Proporções sob medida para o pé-direito do seu ambiente',
      'Compatível com qualquer cor de pintura e papel de parede',
      'Valorização imediata do imóvel',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
    ],
    metaTitle: 'Boiserie e Faixas Decorativas em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Boiserie em gesso e molduras de parede personalizadas em São Pedro, Piracicaba e região. Acabamento artesanal e sofisticação para seu ambiente.',
    keywords: [
      'boiserie são pedro',
      'molduras de parede gesso',
      'boiserie piracicaba',
      'faixas decorativas gesso',
    ],
  },
  {
    slug: 'molduras-de-gesso',
    titulo: 'Molduras de gesso',
    categoria: 'Residencial',
    descricaoCurta:
      'Molduras de gesso para acabamento entre teto e parede, com diferentes modelos e estilos para complementar a arquitetura do ambiente.',
    descricaoCompleta:
      'As molduras de gesso são o acabamento ideal na junção entre paredes e tetos, corrigindo imperfeições e proporcionando transições harmônicas. Contamos com dezenas de modelos de frisos, perfis lisos, clássicos ou modernos.',
    beneficios: [
      'Modelos clássicos, retos, degrau e coloniais',
      'Encaixes e quinas com corte de meia-esquadria perfeito',
      'Resistência e durabilidade garantidas',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
    ],
    metaTitle: 'Molduras de Gesso em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Molduras de gesso tradicionais e modernas em São Pedro e região. Modelos retos, degraus e ornamentados com instalação precisa.',
    keywords: ['molduras de gesso', 'rodateto gesso são pedro', 'frisos de gesso'],
  },
  {
    slug: 'rebaixo-de-teto',
    titulo: 'Rebaixo de teto',
    categoria: 'Residencial',
    descricaoCurta: 'Mais possibilidades para iluminação, acabamento e composição do ambiente.',
    descricaoCompleta:
      'O rebaixo de teto possibilita criar diferentes níveis, demarcar setores integrados como sala de jantar e estar, e desenhar projetos de iluminação sofisticados com ilhas rebaixadas, nichos embutidos e efeitos visuais impressionantes.',
    beneficios: [
      'Demarcação sutil de ambientes integrados',
      'Criação de ilhas de luz direta e indireta',
      'Melhoria do isolamento acústico entre pavimentos',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
    ],
    metaTitle: 'Rebaixo de Teto em Gesso em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Rebaixo de teto em gesso e drywall sob medida. Crie ilhas luminosas e valorize seu espaço com a Gesso Bettone.',
    keywords: ['rebaixo de teto', 'rebaixo gesso são pedro', 'teto rebaixado com led'],
  },
  {
    slug: 'cortineiros-de-gesso',
    titulo: 'Cortineiros de gesso',
    categoria: 'Residencial',
    descricaoCurta:
      'Cortineiro de gesso sob medida para integrar cortinas ao forro, ocultar trilhos e criar um acabamento limpo e bem integrado ao ambiente.',
    descricaoCompleta:
      'O cortineiro de gesso é o detalhe que faz toda a diferença na decoração do quarto ou sala. Ele oculta com perfeição o trilho suíço ou o varão da cortina, dando a impressão de que o tecido desce diretamente do teto, com opção de iluminação embutida por fita LED.',
    beneficios: [
      'Oculta completamente trilhos, suportes e ferragens',
      'Opção com iluminação indireta suave sobre o tecido',
      'Modelos sobrepostos ou embutidos no forro',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
    ],
    metaTitle: 'Cortineiros de Gesso em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Cortineiros de gesso iluminados e embutidos em São Pedro, Piracicaba e região. Acabamento fino para cortinas elegantes.',
    keywords: ['cortineiro de gesso', 'cortineiro iluminado', 'cortineiro embutido são pedro'],
  },
  {
    slug: 'sancas-e-cortineiros',
    titulo: 'Sancas',
    categoria: 'Residencial',
    descricaoCurta:
      'Sanca de gesso com iluminação indireta e acabamento personalizado. Soluções para valorizar a arquitetura e criar ambientes mais aconchegantes.',
    descricaoCompleta:
      'Sancas abertas, fechadas ou invertidas projetadas para direcionar a luz com aconchego e estilo. A iluminação indireta valoriza os materiais e texturas do cômodo, transformando o clima do ambiente para momentos de relaxamento ou recepção.',
    beneficios: [
      'Sanca aberta com recesso para fita de LED ou mangueira luminosa',
      'Sanca invertida com efeito de teto flutuante',
      'Economia de energia com uso otimizado de iluminação indireta',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    ],
    metaTitle: 'Sancas de Gesso Abertas e Invertidas em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Sancas de gesso com iluminação indireta e efeito flutuante em São Pedro e Piracicaba. Projeto e execução de alta qualidade.',
    keywords: ['sancas de gesso', 'sanca invertida', 'sanca aberta são pedro', 'sanca com led'],
  },
  {
    slug: 'moveis',
    titulo: 'Móveis e guarda-roupas',
    categoria: 'Residencial',
    descricaoCurta:
      'Móveis e guarda-roupas em gesso sob medida, com nichos, prateleiras e soluções personalizadas para organizar e integrar ambientes.',
    descricaoCompleta:
      'Estruturas sólidas e integradas em drywall e gesso para closets, estantes, racks de TV, bancadas e nichos decorativos. Uma solução durável, imune a cupins, com acabamento liso e custo-benefício surpreendente.',
    beneficios: [
      'Imunidade total contra cupins e umidade controlada',
      'Totalmente sob medida para qualquer dimensão de parede',
      'Possibilidade de instalação de portas de correr e gaveteiros planejados',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
    ],
    metaTitle: 'Móveis e Closets em Gesso e Drywall em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Móveis, estantes, closets e nichos em gesso sob medida em São Pedro e região. Durabilidade, resistência e elegância integrada à alvenaria.',
    keywords: [
      'móveis de gesso',
      'closet em drywall são pedro',
      'estante de gesso',
      'nichos gesso',
    ],
  },
  {
    slug: 'revestimento-em-placa-3d',
    titulo: 'Revestimento em placa 3D',
    categoria: 'Residencial',
    descricaoCurta:
      'Dê vida à sua parede e transforme seu ambiente sem precisar de uma grande reforma.',
    descricaoCompleta:
      'Placas decorativas tridimensionais em gesso com relevos geométricos, ondulados e contemporâneos. Criam jogos de sombra espetaculares com a iluminação direcionada, sendo o grande ponto focal de salas, cabeceiras e recepções.',
    beneficios: [
      'Efeito visual moderno de alto impacto decorativo',
      'Aplicação rápida diretamente sobre a parede',
      'Pode receber tinta fosca, acetinada ou efeitos como cimento queimado',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
    ],
    metaTitle: 'Revestimento em Gesso 3D em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Paredes decoradas com placas de gesso 3D em São Pedro e Piracicaba. Diversos modelos geométricos com iluminação destacada.',
    keywords: [
      'gesso 3d são pedro',
      'placas 3d gesso',
      'revestimento tridimensional gesso piracicaba',
    ],
  },
  {
    slug: 'molduras-externas-em-cimento-celular',
    titulo: 'Molduras Externas em Cimento Celular',
    categoria: 'Fachadas',
    destaque: true,
    descricaoCurta:
      'Molduras externas resistente a chuva e sol, para fachadas, portas e janelas, com formatos personalizados e acabamento preciso para destacar a arquitetura do projeto.',
    descricaoCompleta:
      'Desenvolvidas especificamente para resistir às intempéries (sol intenso, chuva e variações térmicas), as molduras de cimento celular da Gesso Bettone garantem durabilidade nas fachadas residenciais e comerciais. Não trincam com facilidade, são leves para a estrutura e conferem requinte incomparável.',
    beneficios: [
      'Alta resistência climática contra sol, chuva e umidade',
      'Leveza estrutural que não sobrecarrega a edificação',
      'Modelos para contorno de portas, janelas, beirais e platibandas',
      'Padrão estético de alto padrão arquitetônico',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb944ac447f9051305d85665a99fc9f25.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb944ac447f9051305d85665a99fc9f25.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F4a28d60176a9ecf7892986646b834253.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fec638dde10c23a0464266942597cf5e5.jpg',
    ],
    metaTitle: 'Molduras Externas em Cimento Celular para Fachadas | Gesso Bettone',
    metaDescription:
      'Molduras para fachadas em cimento celular em São Pedro e região. Resistente a sol e chuva, acabamento premium para janelas e platibandas.',
    keywords: [
      'molduras externas cimento celular',
      'molduras para fachada são pedro',
      'moldura janela externa',
      'acabamento fachada piracicaba',
    ],
  },
  {
    slug: 'colunas-de-gesso',
    titulo: 'Colunas de gesso',
    categoria: 'Residencial',
    descricaoCurta:
      'Colunas de gesso personalizadas para dividir, enquadrar e destacar ambientes, com diferentes formatos e acabamentos integrados ao projeto.',
    descricaoCompleta:
      'Elementos verticais decorativos inspirados na arquitetura nobre. As colunas de gesso podem ser caneladas, lisas, quadradas ou redondas, com capitéis e bases trabalhadas que enriquecem portais e divisões espaciais.',
    beneficios: [
      'Modelos clássicos (dórico, jônico) ou retos modernos',
      'Perfeitas para disfarçar pilares estruturais de alvenaria',
      'Enriquecimento visual instantâneo de recepções e salas',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    ],
    metaTitle: 'Colunas de Gesso Decorativas em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Colunas decorativas de gesso sob medida em São Pedro, Piracicaba e região. Acabamento clássico e contemporâneo.',
    keywords: ['colunas de gesso', 'pilares decorativos gesso', 'coluna gesso são pedro'],
  },
  {
    slug: 'vitrais',
    titulo: 'Vitrais',
    categoria: 'Residencial',
    descricaoCurta:
      'Vitrais personalizados para integrar luz, cores e formas à arquitetura, criando elementos únicos para portas, janelas, divisórias e ambientes.',
    descricaoCompleta:
      'Composições artísticas em vidro que filtram a luz solar com elegância e criam atmosferas serenas e marcantes. Ideais para aberturas zenitais, portas de entrada, nichos de capelas e divisórias de requinte.',
    beneficios: [
      'Design exclusivo desenhado para a arquitetura do cliente',
      'Efeito de luz natural e cores vibrantes ao longo do dia',
      'Valorização estética singular',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    ],
    metaTitle: 'Vitrais Artísticos em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Vitrais personalizados para residências e espaços especiais em São Pedro e região. Arte, luz e sofisticação.',
    keywords: ['vitrais são pedro', 'vitrais decorativos', 'arte em vitrais piracicaba'],
  },
  {
    slug: 'forro-de-madeira',
    titulo: 'Forro de madeira',
    categoria: 'Residencial',
    descricaoCurta: 'O acabamento que traz personalidade para o seu espaço.',
    descricaoCompleta:
      'A beleza orgânica e o calor da madeira combinados com a precisão de montagem da Gesso Bettone. Trabalhamos com forros lineares de madeira nobre para varandas, áreas gourmet, salas de estar e pergolados protegidos.',
    beneficios: [
      'Calor térmico e aconchego acolhedor inigualável',
      'Harmonia perfeita com forros de gesso e detalhes em drywall',
      'Tratamento preventivo contra pragas e umidade',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
    ],
    metaTitle: 'Forro de Madeira em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Instalação de forro de madeira de alta qualidade para áreas gourmet e salas em São Pedro e região. Conforto e sofisticação.',
    keywords: [
      'forro de madeira são pedro',
      'forro ripado madeira',
      'forro varanda gourmet piracicaba',
    ],
  },
  {
    slug: 'pintura',
    titulo: 'Pintura',
    categoria: 'Residencial',
    descricaoCurta:
      'Serviço de pintura para paredes, tetos e elementos de gesso, com preparação e acabamento cuidadoso para finalizar e valorizar o ambiente.',
    descricaoCompleta:
      'A pintura é o toque final que consagra a qualidade do gesso. Nossa equipe realiza a preparação minuciosa com lixamento técnico, aplicação de selador adequado para gesso e demãos de tintas premium das melhores marcas, sem marcas de rolo ou imperfeições.',
    beneficios: [
      'Preparação técnica específica para superfícies de gesso e drywall',
      'Acabamento fosco aveludado, acetinado ou semibrilho impecável',
      'Sem manchas, emendas aparentes ou pós residuais na entrega',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Feb3360aa97a8b581f33a2895191586b3.png',
    ],
    metaTitle: 'Pintura Residencial de Alto Padrão em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Pintura profissional para paredes, tetos e acabamentos de gesso em São Pedro e região. Preparação impecável e materiais de primeira linha.',
    keywords: [
      'pintura residencial são pedro',
      'pintor gesso piracicaba',
      'pintura fino acabamento',
    ],
  },
  {
    slug: 'impermeabilizacao-de-telhados',
    titulo: 'Impermeabilização de telhados',
    categoria: 'Residencial',
    descricaoCurta:
      'Acabe definitivamente com manutenções no telhado e com os transtornos que as infiltrações podem causar.',
    descricaoCompleta:
      'Proteja seu forro de gesso e toda a estrutura do seu imóvel antes que as chuvas causem danos irreversíveis. Aplicação de mantas asfálticas, membranas líquidas de poliuretano e resinas térmicas elastoméricas de alta performance.',
    beneficios: [
      'Proteção contra goteiras e infiltrações que danificam o gesso',
      'Garantia de estanqueidade e durabilidade prolongada',
      'Redução da temperatura interna com membranas térmicas refletivas',
    ],
    imagemPrincipal:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    ],
    metaTitle: 'Impermeabilização de Telhados em São Pedro/SP | Gesso Bettone',
    metaDescription:
      'Soluções completas de impermeabilização para telhados e lajes em São Pedro e região. Evite infiltrações e preserve seu patrimônio.',
    keywords: [
      'impermeabilização telhados são pedro',
      'manta liquida piracicaba',
      'vazamento telhado gesso',
    ],
  },
]

export const PROJETOS: ProjetoItem[] = [
  {
    slug: 'revestimento-de-container',
    titulo: 'Revestimento de container',
    categoria: 'Residencial',
    subtitulo: 'Revestimento interno de Container',
    descricao:
      'Mais do que melhorar o espaço, transformamos o ambiente. Entregamos qualidade, conforto, aconchego e a sensação de estar verdadeiramente em casa com isolamento térmico e acústico de alta performance e fechamento em drywall impecável.',
    detalhesTecnicos: [
      'Isolamento termoacústico com lã mineral de alta densidade',
      'Estruturação metálica de reforço para paredes e forros',
      'Forro tabicado de gesso com iluminação de LED embutida',
      'Pintura premium aveludada lavável',
    ],
    fotosCount: 7,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fbca94049b9185d1fac854996.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fbca94049b9185d1fac854996.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    ],
    metaTitle: 'Projeto Revestimento de Container | Gesso Bettone',
    metaDescription:
      'Confira o projeto de revestimento interno de container executado pela Gesso Bettone com isolamento térmico, drywall e acabamento refinado.',
  },
  {
    slug: 'biblioteca',
    titulo: 'Escritório biblioteca',
    categoria: 'Residencial',
    subtitulo: 'Aproveitamento e sofisticação de sótão',
    descricao:
      'Um espaço antes perdido e sem uso no sótão se transformou em um lindo escritório e biblioteca acolhedora. Execução de forro inclinado acompanhando o telhado com isolamento e nichos integrados.',
    detalhesTecnicos: [
      'Forro inclinado estruturado acompanhando as tesouras do telhado',
      'Nichos e prateleiras embutidas em gesso',
      'Pontos de iluminação pontual para leitura e trabalho',
    ],
    fotosCount: 4,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F39e7e011d6b4bdc02fc2a92f.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F39e7e011d6b4bdc02fc2a92f.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
    ],
    metaTitle: 'Projeto Escritório Biblioteca no Sótão | Gesso Bettone',
    metaDescription:
      'Transformação de sótão em escritório e biblioteca com forro de gesso e acabamento personalizado pela Gesso Bettone em São Pedro/SP.',
  },
  {
    slug: 'area-gourmet',
    titulo: 'Área gourmet',
    categoria: 'Residencial',
    subtitulo: 'Reforma com forro tabicado e pintura de alto padrão',
    descricao:
      'Mais conforto, mais beleza. É um novo ambiente após reforma com adição do Forro de Gesso Tabicado e Pintura alto padrão que renovaram completamente esta área gourmet com churrasqueira.',
    detalhesTecnicos: [
      'Forro tabicado de gesso resistente com pintura especial',
      'Rasgos de luz com perfis de LED de alta eficiência',
      'Resistência ao calor próximo à área da churrasqueira',
    ],
    fotosCount: 8,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F88bcc881958d712356569279.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F88bcc881958d712356569279.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Feb3360aa97a8b581f33a2895191586b3.png',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
    ],
    metaTitle: 'Projeto Reforma Área Gourmet com Forro Tabicado | Gesso Bettone',
    metaDescription:
      'Renovação completa de área gourmet com forro de gesso tabicado, rasgos de luz e pintura de alto padrão pela Gesso Bettone.',
  },
  {
    slug: 'aline-harrisson',
    titulo: 'Aline & Harrisson',
    categoria: 'Residencial',
    subtitulo: 'Residência contemporânea de alto padrão',
    descricao:
      'Projeto residencial completo englobando forros tabicados em toda a área social, cortineiros embutidos nos quartos e suítes, e sancas iluminadas para valorizar o mobiliário de design.',
    detalhesTecnicos: [
      'Forros tabicados em living com pé-direito duplo',
      'Cortineiros embutidos com fita de LED',
      'Acabamento fino nivelado para pintura suave',
    ],
    fotosCount: 5,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F9d19c1f5796a2cc2272e1924.png',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F9d19c1f5796a2cc2272e1924.png',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
    ],
    metaTitle: 'Projeto Residencial Aline & Harrisson | Gesso Bettone',
    metaDescription:
      'Residência de alto padrão com forro de gesso tabicado, cortineiros e sancas executados pela Gesso Bettone em São Pedro/SP.',
  },
  {
    slug: 'diego-favoretto',
    titulo: 'Diego Favoretto',
    categoria: 'Residencial',
    subtitulo: 'Ambientes integrados e iluminação indireta',
    descricao:
      'Execução precisa de forros, ilhas decorativas e rebaixos que unem sofisticação e conforto, com atenção a cada detalhe arquitetônico.',
    detalhesTecnicos: [
      'Integração sala de estar e cozinha com níveis diferenciados',
      'Sancas com transição suave para luz indireta',
      'Acabamento em cantos vivos impecáveis',
    ],
    fotosCount: 7,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fac3bb9669f649261fd66ee33.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fac3bb9669f649261fd66ee33.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
    ],
    metaTitle: 'Projeto Residencial Diego Favoretto | Gesso Bettone',
    metaDescription:
      'Projeto residencial executado pela Gesso Bettone: forros, sancas e ilhas decorativas com acabamento impecável.',
  },
  {
    slug: 'dra-camila-ferraz-odontologia-especializada',
    titulo: 'Dra. Camila Ferraz - Odontologia especializada',
    categoria: 'Comercial',
    subtitulo: 'Clínica odontológica de alto padrão',
    descricao:
      'Divisórias acústicas em drywall, consultórios isolados, forro higiênico e recepção com design moderno para uma clínica odontológica de referência.',
    detalhesTecnicos: [
      'Paredes drywall com isolamento acústico reforçado entre consultórios',
      'Passagem embutida para instalações pneumáticas e odontológicas',
      'Recepção acolhedora com gesso 3D e iluminação convidativa',
    ],
    fotosCount: 7,
    imagemCapa:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F85de4325245daab522539257.jpg',
    galeria: [
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F85de4325245daab522539257.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
    ],
    metaTitle: 'Projeto Comercial Clínica Dra. Camila Ferraz | Gesso Bettone',
    metaDescription:
      'Drywall e isolamento acústico para clínica odontológica executados pela Gesso Bettone. Obra rápida, limpa e funcional.',
  },
]

export const PARCEIROS: ParceiroItem[] = [
  {
    nome: 'Edivaldo',
    papel: 'Construção & Reformas',
    logo: 'https://gessobettone.com.br/uploads/partners/34eb0f46b06320021778b758.png',
    descricao: 'Parceiro em obras civis e reformas estruturais.',
  },
  {
    nome: 'Ademar Pereira',
    papel: 'Construção Civil',
    logo: 'https://gessobettone.com.br/uploads/partners/f412b7972d1f4d2fa860fa4c.png',
    descricao: 'Excelência em execução e gerenciamento de obras residenciais.',
  },
  {
    nome: 'Manfrinato Arquitetura',
    papel: 'Arquitetura & Design',
    logo: 'https://gessobettone.com.br/uploads/partners/c1d8a30c4e366abac17bf870.jpg',
    descricao: 'Projetos arquitetônicos de alto padrão integrados ao gesso.',
  },
]
