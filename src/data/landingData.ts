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
  categoria: string
  subtitulo?: string
  cidade?: string
  descricao: string
  detalhesTecnicos?: string[]
  fotosCount: number
  imagemCapa: string
  galeria: string[]
  videos?: string[]
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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
    imagemPrincipal: '',
    galeria: [],
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

// Lista de projetos do portfólio — vazio por padrão para início do zero
// Os projetos reais devem ser cadastrados pelo usuário no painel administrativo (/painel/site/portfolio)
export const PROJETOS: ProjetoItem[] = []

// Lista de parceiros homologados — vazio por padrão para início do zero
// Os parceiros reais devem ser cadastrados pelo usuário no painel administrativo (/painel/site/parceiros)
export const PARCEIROS: ParceiroItem[] = []
