migrate(
  (app) => {
    // 1. Seed site_categories
    const catCol = app.findCollectionByNameOrId('site_categories')
    const initialCategories = [
      { nome: 'Residencial', slug: 'residencial', ativa: true, ordem: 1 },
      { nome: 'Comercial', slug: 'comercial', ativa: true, ordem: 2 },
      { nome: 'Fachadas', slug: 'fachadas', ativa: true, ordem: 3 },
    ]

    for (let i = 0; i < initialCategories.length; i++) {
      const c = initialCategories[i]
      try {
        app.findFirstRecordByData('site_categories', 'slug', c.slug)
      } catch (_) {
        const rec = new Record(catCol)
        rec.set('nome', c.nome)
        rec.set('slug', c.slug)
        rec.set('ativa', c.ativa)
        rec.set('ordem', c.ordem)
        app.save(rec)
      }
    }

    // 2. Seed site_services (14 serviços)
    const servCol = app.findCollectionByNameOrId('site_services')
    const servicosData = [
      {
        slug: 'forros-de-gesso',
        nome: 'Forros de Gesso',
        categoria: 'Residencial',
        destaque: true,
        ativo: true,
        ordem: 1,
        descricao_curta:
          'Forros de gesso sob medida, com acabamento preciso e soluções para iluminação e valorização dos ambientes.',
        descricao_longa:
          'Os forros de gesso da Gesso Bettone unem precisão milimétrica, conforto termoacústico e soluções luminotécnicas modernas. Seja para forro plaquinha tradicional ou acartonado estruturado, entregamos tabicas refinadas, recortes para spots, fitas de LED embutidas e superfícies 100% niveladas prontas para a pintura.',
        beneficios: JSON.stringify([
          'Integração perfeita com projetos luminotécnicos (spots, perfis e fitas LED)',
          'Conforto térmico e atenuação acústica de alto nível',
          'Acabamento tabicado elegante ou junta invisível',
          'Esconde vigas, fiações e tubulações com facilidade',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
        ]),
        meta_title: 'Forros de Gesso em São Pedro/SP | Gesso Bettone — 30 anos',
        meta_description:
          'Forros de gesso sob medida em São Pedro, Piracicaba e região. Acabamento preciso, forros tabicados e iluminação embutida. Solicite seu orçamento.',
        keywords: JSON.stringify([
          'forro de gesso são pedro',
          'forro gesso piracicaba',
          'gesso tabicado',
          'rebaixo de teto gesso',
          'gesso bettone',
        ]),
      },
      {
        slug: 'parede-drywall',
        nome: 'Parede Drywall',
        categoria: 'Residencial',
        destaque: true,
        ativo: true,
        ordem: 2,
        descricao_curta:
          'Paredes, divisórias e revestimentos em drywall com execução precisa, praticidade e excelente acabamento.',
        descricao_longa:
          'A construção a seco com drywall oferece velocidade de execução, limpeza de obra, isolamento acústico e total flexibilidade para remodelar espaços comerciais e residenciais. Montagem com estrutura galvanizada certificada e placas resistentes (ST, RU para áreas úmidas ou RF para proteção contra fogo).',
        beneficios: JSON.stringify([
          'Instalação rápida e obra limpa sem entulho pesado',
          'Opções de tratamento termoacústico com lã mineral ou de vidro',
          'Placas resistentes à umidade (RU verde) para banheiros e cozinhas',
          'Superfície perfeitamente plana pronta para pintura ou papel de parede',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
        ]),
        meta_title: 'Paredes e Divisórias em Drywall em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Paredes e divisórias de drywall em São Pedro e região. Construção rápida, limpa e com isolamento acústico superior. Faça seu orçamento.',
        keywords: JSON.stringify([
          'drywall são pedro',
          'parede drywall piracicaba',
          'divisória drywall',
          'gesso acartonado são pedro sp',
        ]),
      },
      {
        slug: 'molduras-e-boiseries',
        nome: 'Faixas decorativas e Boiseries',
        categoria: 'Residencial',
        destaque: true,
        ativo: true,
        ordem: 3,
        descricao_curta:
          'Faixas decorativas, boiseries e detalhes personalizados para transformar paredes e valorizar a arquitetura.',
        descricao_longa:
          'O clássico boiserie francês ganha versatilidade e requinte nas mãos dos nossos artesãos. Criamos molduras de parede, composições geométricas e faixas decorativas milimetricamente simétricas, trazendo sofisticação atemporal a salas, quartos, corredores e halls de entrada.',
        beneficios: JSON.stringify([
          'Elegância clássica e toque contemporâneo',
          'Proporções sob medida para o pé-direito do seu ambiente',
          'Compatível com qualquer cor de pintura e papel de parede',
          'Valorização imediata do imóvel',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
        ]),
        meta_title: 'Boiserie e Faixas Decorativas em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Boiserie em gesso e molduras de parede personalizadas em São Pedro, Piracicaba e região. Acabamento artesanal e sofisticação para seu ambiente.',
        keywords: JSON.stringify([
          'boiserie são pedro',
          'molduras de parede gesso',
          'boiserie piracicaba',
          'faixas decorativas gesso',
        ]),
      },
      {
        slug: 'molduras-de-gesso',
        nome: 'Molduras de gesso',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 4,
        descricao_curta:
          'Molduras de gesso para acabamento entre teto e parede, com diferentes modelos e estilos para complementar a arquitetura do ambiente.',
        descricao_longa:
          'As molduras de gesso são o acabamento ideal na junção entre paredes e tetos, corrigindo imperfeições e proporcionando transições harmônicas. Contamos com dezenas de modelos de frisos, perfis lisos, clássicos ou modernos.',
        beneficios: JSON.stringify([
          'Modelos clássicos, retos, degrau e coloniais',
          'Encaixes e quinas com corte de meia-esquadria perfeito',
          'Resistência e durabilidade garantidas',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
        ]),
        meta_title: 'Molduras de Gesso em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Molduras de gesso tradicionais e modernas em São Pedro e região. Modelos retos, degraus e ornamentados com instalação precisa.',
        keywords: JSON.stringify([
          'molduras de gesso',
          'rodateto gesso são pedro',
          'frisos de gesso',
        ]),
      },
      {
        slug: 'rebaixo-de-teto',
        nome: 'Rebaixo de teto',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 5,
        descricao_curta:
          'Mais possibilidades para iluminação, acabamento e composição do ambiente.',
        descricao_longa:
          'O rebaixo de teto possibilita criar diferentes níveis, demarcar setores integrados como sala de jantar e estar, e desenhar projetos de iluminação sofisticados com ilhas rebaixadas, nichos embutidos e efeitos visuais impressionantes.',
        beneficios: JSON.stringify([
          'Demarcação sutil de ambientes integrados',
          'Criação de ilhas de luz direta e indireta',
          'Melhoria do isolamento acústico entre pavimentos',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
        ]),
        meta_title: 'Rebaixo de Teto em Gesso em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Rebaixo de teto em gesso e drywall sob medida. Crie ilhas luminosas e valorize seu espaço com a Gesso Bettone.',
        keywords: JSON.stringify([
          'rebaixo de teto',
          'rebaixo gesso são pedro',
          'teto rebaixado com led',
        ]),
      },
      {
        slug: 'cortineiros-de-gesso',
        nome: 'Cortineiros de gesso',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 6,
        descricao_curta:
          'Cortineiro de gesso sob medida para integrar cortinas ao forro, ocultar trilhos e criar um acabamento limpo e bem integrado ao ambiente.',
        descricao_longa:
          'O cortineiro de gesso é o detalhe que faz toda a diferença na decoração do quarto ou sala. Ele oculta com perfeição o trilho suíço ou o varão da cortina, dando a impressão de que o tecido desce diretamente do teto, com opção de iluminação embutida por fita LED.',
        beneficios: JSON.stringify([
          'Oculta completamente trilhos, suportes e ferragens',
          'Opção com iluminação indireta suave sobre o tecido',
          'Modelos sobrepostos ou embutidos no forro',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
        ]),
        meta_title: 'Cortineiros de Gesso em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Cortineiros de gesso iluminados e embutidos em São Pedro, Piracicaba e região. Acabamento fino para cortinas elegantes.',
        keywords: JSON.stringify([
          'cortineiro de gesso',
          'cortineiro iluminado',
          'cortineiro embutido são pedro',
        ]),
      },
      {
        slug: 'sancas-e-cortineiros',
        nome: 'Sancas',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 7,
        descricao_curta:
          'Sanca de gesso com iluminação indireta e acabamento personalizado. Soluções para valorizar a arquitetura e criar ambientes mais aconchegantes.',
        descricao_longa:
          'Sancas abertas, fechadas ou invertidas projetadas para direcionar a luz com aconchego e estilo. A iluminação indireta valoriza os materiais e texturas do cômodo, transformando o clima do ambiente para momentos de relaxamento ou recepção.',
        beneficios: JSON.stringify([
          'Sanca aberta com recesso para fita de LED ou mangueira luminosa',
          'Sanca invertida com efeito de teto flutuante',
          'Economia de energia com uso otimizado de iluminação indireta',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        ]),
        meta_title: 'Sancas de Gesso Abertas e Invertidas em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Sancas de gesso com iluminação indireta e efeito flutuante em São Pedro e Piracicaba. Projeto e execução de alta qualidade.',
        keywords: JSON.stringify([
          'sancas de gesso',
          'sanca invertida',
          'sanca aberta são pedro',
          'sanca com led',
        ]),
      },
      {
        slug: 'moveis',
        nome: 'Móveis e guarda-roupas',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 8,
        descricao_curta:
          'Móveis e guarda-roupas em gesso sob medida, com nichos, prateleiras e soluções personalizadas para organizar e integrar ambientes.',
        descricao_longa:
          'Estruturas sólidas e integradas em drywall e gesso para closets, estantes, racks de TV, bancadas e nichos decorativos. Uma solução durável, imune a cupins, com acabamento liso e custo-benefício surpreendente.',
        beneficios: JSON.stringify([
          'Imunidade total contra cupins e umidade controlada',
          'Totalmente sob medida para qualquer dimensão de parede',
          'Possibilidade de instalação de portas de correr e gaveteiros planejados',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
        ]),
        meta_title: 'Móveis e Closets em Gesso e Drywall em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Móveis, estantes, closets e nichos em gesso sob medida em São Pedro e região. Durabilidade, resistência e elegância integrada à alvenaria.',
        keywords: JSON.stringify([
          'móveis de gesso',
          'closet em drywall são pedro',
          'estante de gesso',
          'nichos gesso',
        ]),
      },
      {
        slug: 'revestimento-em-placa-3d',
        nome: 'Revestimento em placa 3D',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 9,
        descricao_curta:
          'Dê vida à sua parede e transforme seu ambiente sem precisar de uma grande reforma.',
        descricao_longa:
          'Placas decorativas tridimensionais em gesso com relevos geométricos, ondulados e contemporâneos. Criam jogos de sombra espetaculares com a iluminação direcionada, sendo o grande ponto focal de salas, cabeceiras e recepções.',
        beneficios: JSON.stringify([
          'Efeito visual moderno de alto impacto decorativo',
          'Aplicação rápida diretamente sobre a parede',
          'Pode receber tinta fosca, acetinada ou efeitos como cimento queimado',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
        ]),
        meta_title: 'Revestimento em Gesso 3D em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Paredes decoradas com placas de gesso 3D em São Pedro e Piracicaba. Diversos modelos geométricos com iluminação destacada.',
        keywords: JSON.stringify([
          'gesso 3d são pedro',
          'placas 3d gesso',
          'revestimento tridimensional gesso piracicaba',
        ]),
      },
      {
        slug: 'molduras-externas-em-cimento-celular',
        nome: 'Molduras Externas em Cimento Celular',
        categoria: 'Fachadas',
        destaque: true,
        ativo: true,
        ordem: 10,
        descricao_curta:
          'Molduras externas resistente a chuva e sol, para fachadas, portas e janelas, com formatos personalizados e acabamento preciso para destacar a arquitetura do projeto.',
        descricao_longa:
          'Desenvolvidas especificamente para resistir às intempéries (sol intenso, chuva e variações térmicas), as molduras de cimento celular da Gesso Bettone garantem durabilidade nas fachadas residenciais e comerciais. Não trincam com facilidade, são leves para a estrutura e conferem requinte incomparável.',
        beneficios: JSON.stringify([
          'Alta resistência climática contra sol, chuva e umidade',
          'Leveza estrutural que não sobrecarrega a edificação',
          'Modelos para contorno de portas, janelas, beirais e platibandas',
          'Padrão estético de alto padrão arquitetônico',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb944ac447f9051305d85665a99fc9f25.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb944ac447f9051305d85665a99fc9f25.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F4a28d60176a9ecf7892986646b834253.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fec638dde10c23a0464266942597cf5e5.jpg',
        ]),
        meta_title: 'Molduras Externas em Cimento Celular para Fachadas | Gesso Bettone',
        meta_description:
          'Molduras para fachadas em cimento celular em São Pedro e região. Resistente a sol e chuva, acabamento premium para janelas e platibandas.',
        keywords: JSON.stringify([
          'molduras externas cimento celular',
          'molduras para fachada são pedro',
          'moldura janela externa',
          'acabamento fachada piracicaba',
        ]),
      },
      {
        slug: 'colunas-de-gesso',
        nome: 'Colunas de gesso',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 11,
        descricao_curta:
          'Colunas de gesso personalizadas para dividir, enquadrar e destacar ambientes, com diferentes formatos e acabamentos integrados ao projeto.',
        descricao_longa:
          'Elementos verticais decorativos inspirados na arquitetura nobre. As colunas de gesso podem ser caneladas, lisas, quadradas ou redondas, com capitéis e bases trabalhadas que enriquecem portais e divisões espaciais.',
        beneficios: JSON.stringify([
          'Modelos clássicos (dórico, jônico) ou retos modernos',
          'Perfeitas para disfarçar pilares estruturais de alvenaria',
          'Enriquecimento visual instantâneo de recepções e salas',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        ]),
        meta_title: 'Colunas de Gesso Decorativas em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Colunas decorativas de gesso sob medida em São Pedro, Piracicaba e região. Acabamento clássico e contemporâneo.',
        keywords: JSON.stringify([
          'colunas de gesso',
          'pilares decorativos gesso',
          'coluna gesso são pedro',
        ]),
      },
      {
        slug: 'vitrais',
        nome: 'Vitrais',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 12,
        descricao_curta:
          'Vitrais personalizados para integrar luz, cores e formas à arquitetura, criando elementos únicos para portas, janelas, divisórias e ambientes.',
        descricao_longa:
          'Composições artísticas em vidro que filtram a luz solar com elegância e criam atmosferas serenas e marcantes. Ideais para aberturas zenitais, portas de entrada, nichos de capelas e divisórias de requinte.',
        beneficios: JSON.stringify([
          'Design exclusivo desenhado para a arquitetura do cliente',
          'Efeito de luz natural e cores vibrantes ao longo do dia',
          'Valorização estética singular',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        ]),
        meta_title: 'Vitrais Artísticos em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Vitrais personalizados para residências e espaços especiais em São Pedro e região. Arte, luz e sofisticação.',
        keywords: JSON.stringify([
          'vitrais são pedro',
          'vitrais decorativos',
          'arte em vitrais piracicaba',
        ]),
      },
      {
        slug: 'forro-de-madeira',
        nome: 'Forro de madeira',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 13,
        descricao_curta: 'O acabamento que traz personalidade para o seu espaço.',
        descricao_longa:
          'A beleza orgânica e o calor da madeira combinados com a precisão de montagem da Gesso Bettone. Trabalhamos com forros lineares de madeira nobre para varandas, áreas gourmet, salas de estar e pergolados protegidos.',
        beneficios: JSON.stringify([
          'Calor térmico e aconchego acolhedor inigualável',
          'Harmonia perfeita com forros de gesso e detalhes em drywall',
          'Tratamento preventivo contra pragas e umidade',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
        ]),
        meta_title: 'Forro de Madeira em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Instalação de forro de madeira de alta qualidade para áreas gourmet e salas em São Pedro e região. Conforto e sofisticação.',
        keywords: JSON.stringify([
          'forro de madeira são pedro',
          'forro ripado madeira',
          'forro varanda gourmet piracicaba',
        ]),
      },
      {
        slug: 'pintura',
        nome: 'Pintura',
        categoria: 'Residencial',
        destaque: false,
        ativo: true,
        ordem: 14,
        descricao_curta:
          'Serviço de pintura para paredes, tetos e elementos de gesso, com preparação e acabamento cuidadoso para finalizar e valorizar o ambiente.',
        descricao_longa:
          'A pintura é o toque final que consagra a qualidade do gesso. Nossa equipe realiza a preparação minuciosa com lixamento técnico, aplicação de selador adequado para gesso e demãos de tintas premium das melhores marcas, sem marcas de rolo ou imperfeições.',
        beneficios: JSON.stringify([
          'Preparação técnica específica para superfícies de gesso e drywall',
          'Acabamento fosco aveludado, acetinado ou semibrilho impecável',
          'Sem manchas, emendas aparentes ou pós residuais na entrega',
        ]),
        imagem_principal:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Feb3360aa97a8b581f33a2895191586b3.png',
        ]),
        meta_title: 'Pintura Residencial de Alto Padrão em São Pedro/SP | Gesso Bettone',
        meta_description:
          'Pintura profissional para paredes, tetos e acabamentos de gesso em São Pedro e região. Preparação impecável e materiais de primeira linha.',
        keywords: JSON.stringify([
          'pintura residencial são pedro',
          'pintor gesso piracicaba',
          'pintura fino acabamento',
        ]),
      },
    ]

    for (let i = 0; i < servicosData.length; i++) {
      const s = servicosData[i]
      try {
        app.findFirstRecordByData('site_services', 'slug', s.slug)
      } catch (_) {
        const rec = new Record(servCol)
        rec.set('nome', s.nome)
        rec.set('slug', s.slug)
        rec.set('categoria', s.categoria)
        rec.set('destaque', s.destaque)
        rec.set('ativo', s.ativo)
        rec.set('ordem', s.ordem)
        rec.set('descricao_curta', s.descricao_curta)
        rec.set('descricao_longa', s.descricao_longa)
        rec.set('beneficios', s.beneficios)
        rec.set('imagem_principal', s.imagem_principal)
        rec.set('galeria', s.galeria)
        rec.set('meta_title', s.meta_title)
        rec.set('meta_description', s.meta_description)
        rec.set('keywords', s.keywords)
        app.save(rec)
      }
    }

    // 3. Seed site_portfolio (6 projetos)
    const portCol = app.findCollectionByNameOrId('site_portfolio')
    const portfolioData = [
      {
        slug: 'revestimento-de-container',
        titulo: 'Revestimento de container',
        categoria: 'Residencial',
        subtitulo: 'Revestimento interno de Container',
        cidade: 'São Pedro/SP',
        descricao:
          'Mais do que melhorar o espaço, transformamos o ambiente. Entregamos qualidade, conforto, aconchego e a sensação de estar verdadeiramente em casa com isolamento térmico e acústico de alta performance e fechamento em drywall impecável.',
        detalhes_tecnicos: JSON.stringify([
          'Isolamento termoacústico com lã mineral de alta densidade',
          'Estruturação metálica de reforço para paredes e forros',
          'Forro tabicado de gesso com iluminação de LED embutida',
          'Pintura premium aveludada lavável',
        ]),
        fotos_count: 7,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fbca94049b9185d1fac854996.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fbca94049b9185d1fac854996.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
        ]),
        destaque: true,
        ativo: true,
        ordem: 1,
        meta_title: 'Projeto Revestimento de Container | Gesso Bettone',
        meta_description:
          'Confira o projeto de revestimento interno de container executado pela Gesso Bettone com isolamento térmico, drywall e acabamento refinado.',
      },
      {
        slug: 'biblioteca',
        titulo: 'Escritório biblioteca',
        categoria: 'Residencial',
        subtitulo: 'Aproveitamento e sofisticação de sótão',
        cidade: 'São Pedro/SP',
        descricao:
          'Um espaço antes perdido e sem uso no sótão se transformou em um lindo escritório e biblioteca acolhedora. Execução de forro inclinado acompanhando o telhado com isolamento e nichos integrados.',
        detalhes_tecnicos: JSON.stringify([
          'Forro inclinado estruturado acompanhando as tesouras do telhado',
          'Nichos e prateleiras embutidas em gesso',
          'Pontos de iluminação pontual para leitura e trabalho',
        ]),
        fotos_count: 4,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F39e7e011d6b4bdc02fc2a92f.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F39e7e011d6b4bdc02fc2a92f.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
        ]),
        destaque: true,
        ativo: true,
        ordem: 2,
        meta_title: 'Projeto Escritório Biblioteca no Sótão | Gesso Bettone',
        meta_description:
          'Transformação de sótão em escritório e biblioteca com forro de gesso e acabamento personalizado pela Gesso Bettone em São Pedro/SP.',
      },
      {
        slug: 'area-gourmet',
        titulo: 'Área gourmet',
        categoria: 'Residencial',
        subtitulo: 'Reforma com forro tabicado e pintura de alto padrão',
        cidade: 'Piracicaba/SP',
        descricao:
          'Mais conforto, mais beleza. É um novo ambiente após reforma com adição do Forro de Gesso Tabicado e Pintura alto padrão que renovaram completamente esta área gourmet com churrasqueira.',
        detalhes_tecnicos: JSON.stringify([
          'Forro tabicado de gesso resistente com pintura especial',
          'Rasgos de luz com perfis de LED de alta eficiência',
          'Resistência ao calor próximo à área da churrasqueira',
        ]),
        fotos_count: 8,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F88bcc881958d712356569279.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F88bcc881958d712356569279.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0850108b048e2887145868310e2b25b3.png',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Feb3360aa97a8b581f33a2895191586b3.png',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb562045f2c0ae4842ee4ef2621a5fd88.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
        ]),
        destaque: true,
        ativo: true,
        ordem: 3,
        meta_title: 'Projeto Reforma Área Gourmet com Forro Tabicado | Gesso Bettone',
        meta_description:
          'Renovação completa de área gourmet com forro de gesso tabicado, rasgos de luz e pintura de alto padrão pela Gesso Bettone.',
      },
      {
        slug: 'aline-harrisson',
        titulo: 'Aline & Harrisson',
        categoria: 'Residencial',
        subtitulo: 'Residência contemporânea de alto padrão',
        cidade: 'São Pedro/SP',
        descricao:
          'Projeto residencial completo englobando forros tabicados em toda a área social, cortineiros embutidos nos quartos e suítes, e sancas iluminadas para valorizar o mobiliário de design.',
        detalhes_tecnicos: JSON.stringify([
          'Forros tabicados em living com pé-direito duplo',
          'Cortineiros embutidos com fita de LED',
          'Acabamento fino nivelado para pintura suave',
        ]),
        fotos_count: 5,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F9d19c1f5796a2cc2272e1924.png',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F9d19c1f5796a2cc2272e1924.png',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
        ]),
        destaque: false,
        ativo: true,
        ordem: 4,
        meta_title: 'Projeto Residencial Aline & Harrisson | Gesso Bettone',
        meta_description:
          'Residência de alto padrão com forro de gesso tabicado, cortineiros e sancas executados pela Gesso Bettone em São Pedro/SP.',
      },
      {
        slug: 'diego-favoretto',
        titulo: 'Diego Favoretto',
        categoria: 'Residencial',
        subtitulo: 'Ambientes integrados e iluminação indireta',
        cidade: 'Águas de São Pedro/SP',
        descricao:
          'Execução precisa de forros, ilhas decorativas e rebaixos que unem sofisticação e conforto, com atenção a cada detalhe arquitetônico.',
        detalhes_tecnicos: JSON.stringify([
          'Integração sala de estar e cozinha com níveis diferenciados',
          'Sancas com transição suave para luz indireta',
          'Acabamento em cantos vivos impecáveis',
        ]),
        fotos_count: 7,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fac3bb9669f649261fd66ee33.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2Fac3bb9669f649261fd66ee33.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F0c55a56649f7361977b7a9eb3153728b.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffbebd6b9412a8ef2cf6121e78a522290.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F449a78a7af8e20228e3ed5a9d86d22cd.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F7b5d0a31081f4d60f71c5a52ef3b140e.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
        ]),
        destaque: false,
        ativo: true,
        ordem: 5,
        meta_title: 'Projeto Residencial Diego Favoretto | Gesso Bettone',
        meta_description:
          'Projeto residencial executado pela Gesso Bettone: forros, sancas e ilhas decorativas com acabamento impecável.',
      },
      {
        slug: 'dra-camila-ferraz-odontologia-especializada',
        titulo: 'Dra. Camila Ferraz - Odontologia especializada',
        categoria: 'Comercial',
        subtitulo: 'Clínica odontológica de alto padrão',
        cidade: 'Piracicaba/SP',
        descricao:
          'Divisórias acústicas em drywall, consultórios isolados, forro higiênico e recepção com design moderno para uma clínica odontológica de referência.',
        detalhes_tecnicos: JSON.stringify([
          'Paredes drywall com isolamento acústico reforçado entre consultórios',
          'Passagem embutida para instalações pneumáticas e odontológicas',
          'Recepção acolhedora com gesso 3D e iluminação convidativa',
        ]),
        fotos_count: 7,
        imagem_capa:
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F85de4325245daab522539257.jpg',
        galeria: JSON.stringify([
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F85de4325245daab522539257.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F897bc30086d8dee1de6580a58076f750.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F106a7cc6ffcd34c002bf77921e15824d.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F5e10734b3ecad47a6b9653ed09c28dd6.jpg',
          'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F99c56de1ee9ebb01f25008713d4f3ed4.jpg',
        ]),
        destaque: true,
        ativo: true,
        ordem: 6,
        meta_title: 'Projeto Comercial Clínica Dra. Camila Ferraz | Gesso Bettone',
        meta_description:
          'Drywall e isolamento acústico para clínica odontológica executados pela Gesso Bettone. Obra rápida, limpa e funcional.',
      },
    ]

    for (let i = 0; i < portfolioData.length; i++) {
      const p = portfolioData[i]
      try {
        app.findFirstRecordByData('site_portfolio', 'slug', p.slug)
      } catch (_) {
        const rec = new Record(portCol)
        rec.set('titulo', p.titulo)
        rec.set('slug', p.slug)
        rec.set('categoria', p.categoria)
        rec.set('subtitulo', p.subtitulo)
        rec.set('cidade', p.cidade)
        rec.set('descricao', p.descricao)
        rec.set('detalhes_tecnicos', p.detalhes_tecnicos)
        rec.set('fotos_count', p.fotos_count)
        rec.set('imagem_capa', p.imagem_capa)
        rec.set('galeria', p.galeria)
        rec.set('destaque', p.destaque)
        rec.set('ativo', p.ativo)
        rec.set('ordem', p.ordem)
        rec.set('meta_title', p.meta_title)
        rec.set('meta_description', p.meta_description)
        app.save(rec)
      }
    }

    // 4. Seed site_testimonials
    const testCol = app.findCollectionByNameOrId('site_testimonials')
    const depoimentosIniciais = [
      {
        nome: 'Marcos Vinicius',
        cidade: 'São Pedro/SP',
        texto:
          'A equipe da Gesso Bettone realizou o rebaixo em gesso e iluminação da minha sala e área gourmet. Acabamento de altíssimo nível, quinas perfeitas e sem sujeira pesada na entrega. Recomendo de olhos fechados!',
        nota: 5,
        aprovado: true,
        ordem: 1,
      },
      {
        nome: 'Dra. Camila Ferraz',
        cidade: 'Piracicaba/SP',
        texto:
          'Construção a seco de consultórios e recepção com isolamento acústico impecável. Os pacientes elogiam o conforto e a estética da clínica todos os dias.',
        nota: 5,
        aprovado: true,
        ordem: 2,
      },
      {
        nome: 'Aline & Harrisson',
        cidade: 'São Pedro/SP',
        texto:
          'Forros tabicados em pé-direito duplo e cortineiros com LED em toda a nossa casa. Cumpriram exatamente o cronograma combinado. Empresa muito séria.',
        nota: 5,
        aprovado: true,
        ordem: 3,
      },
      {
        nome: 'Roberto Silveira',
        cidade: 'Águas de São Pedro/SP',
        texto:
          'Fizeram os boiseries e molduras de parede na nossa casa de campo. Ficou deslumbrante, como em revistas de arquitetura. Atendimento nota 10.',
        nota: 5,
        aprovado: false, // exemplo de depoimento pendente de moderação
        ordem: 4,
      },
    ]

    for (let i = 0; i < depoimentosIniciais.length; i++) {
      const d = depoimentosIniciais[i]
      try {
        app.findFirstRecordByData('site_testimonials', 'nome', d.nome)
      } catch (_) {
        const rec = new Record(testCol)
        rec.set('nome', d.nome)
        rec.set('cidade', d.cidade)
        rec.set('texto', d.texto)
        rec.set('nota', d.nota)
        rec.set('aprovado', d.aprovado)
        rec.set('ordem', d.ordem)
        app.save(rec)
      }
    }

    // 5. Seed partner_categories
    const partCatCol = app.findCollectionByNameOrId('partner_categories')
    const partnerCategoriesData = [
      { nome: 'Construção Civil', slug: 'construcao-civil', ativa: true, ordem: 1 },
      { nome: 'Arquitetura & Design', slug: 'arquitetura-design', ativa: true, ordem: 2 },
      { nome: 'Engenharia', slug: 'engenharia', ativa: true, ordem: 3 },
      { nome: 'Marcenaria & Móveis', slug: 'marcenaria-moveis', ativa: true, ordem: 4 },
      { nome: 'Iluminação & Elétrica', slug: 'iluminacao-eletrica', ativa: true, ordem: 5 },
    ]

    for (let i = 0; i < partnerCategoriesData.length; i++) {
      const pc = partnerCategoriesData[i]
      try {
        app.findFirstRecordByData('partner_categories', 'slug', pc.slug)
      } catch (_) {
        const rec = new Record(partCatCol)
        rec.set('nome', pc.nome)
        rec.set('slug', pc.slug)
        rec.set('ativa', pc.ativa)
        rec.set('ordem', pc.ordem)
        app.save(rec)
      }
    }

    // 6. Seed site_partners
    const partCol = app.findCollectionByNameOrId('site_partners')
    const parceirosData = [
      {
        nome: 'Edivaldo',
        categoria: 'Construção Civil',
        papel: 'Construção & Reformas',
        whatsapp: '5519981093379',
        logo: 'https://gessobettone.com.br/uploads/partners/34eb0f46b06320021778b758.png',
        descricao: 'Parceiro em obras civis e reformas estruturais residenciais e comerciais.',
        destaque: true,
        ativo: true,
        ordem: 1,
      },
      {
        nome: 'Ademar Pereira',
        categoria: 'Construção Civil',
        papel: 'Construção Civil',
        whatsapp: '5519981093379',
        logo: 'https://gessobettone.com.br/uploads/partners/f412b7972d1f4d2fa860fa4c.png',
        descricao: 'Excelência em execução e gerenciamento de obras residenciais de alto padrão.',
        destaque: true,
        ativo: true,
        ordem: 2,
      },
      {
        nome: 'Manfrinato Arquitetura',
        categoria: 'Arquitetura & Design',
        papel: 'Arquitetura & Design',
        whatsapp: '5519981093379',
        logo: 'https://gessobettone.com.br/uploads/partners/c1d8a30c4e366abac17bf870.jpg',
        descricao:
          'Projetos arquitetônicos de alto padrão integrados a detalhes modernos em gesso.',
        destaque: true,
        ativo: true,
        ordem: 3,
      },
    ]

    for (let i = 0; i < parceirosData.length; i++) {
      const p = parceirosData[i]
      try {
        app.findFirstRecordByData('site_partners', 'nome', p.nome)
      } catch (_) {
        const rec = new Record(partCol)
        rec.set('nome', p.nome)
        rec.set('categoria', p.categoria)
        rec.set('papel', p.papel)
        rec.set('whatsapp', p.whatsapp)
        rec.set('logo', p.logo)
        rec.set('descricao', p.descricao)
        rec.set('destaque', p.destaque)
        rec.set('ativo', p.ativo)
        rec.set('ordem', p.ordem)
        app.save(rec)
      }
    }

    // 7. Seed site_settings
    const setCol = app.findCollectionByNameOrId('site_settings')
    try {
      app.findFirstRecordByData('site_settings', 'chave', 'geral')
    } catch (_) {
      const rec = new Record(setCol)
      rec.set('chave', 'geral')
      rec.set('nome_site', 'Gesso Bettone')
      rec.set('whatsapp_principal', '5519981093379')
      rec.set('email_contato', 'contato@gessobettone.com.br')
      rec.set(
        'mensagem_orcamento',
        'Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento.',
      )
      rec.set('instagram', 'https://www.instagram.com/gessobettone_saopedro')
      rec.set('cnpj', '53.242.055/0001-74')
      rec.set('exibir_depoimentos', true)
      rec.set('pagina_parceiros_ativa', true)
      rec.set(
        'cidades_atendidas',
        JSON.stringify([
          'São Pedro/SP',
          'Águas de São Pedro/SP',
          'Piracicaba/SP',
          'Charqueada/SP',
          'Santa Maria da Serra/SP',
          'Rio Claro/SP',
          'Brotas/SP',
          'Torrinha/SP',
          'Itirapina/SP',
        ]),
      )
      app.save(rec)
    }
  },
  (app) => {
    // Reversão opcional (não destrutiva)
  },
)
