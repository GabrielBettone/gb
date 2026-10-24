migrate(
  (app) => {
    // 1. Obter referências das coleções criadas
    const gruposCol = app.findCollectionByNameOrId('clientes_grupos')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const orcServicosCol = app.findCollectionByNameOrId('orcamento_servicos')
    const metodosCol = app.findCollectionByNameOrId('metodos_pagamento')
    const orcConfigCol = app.findCollectionByNameOrId('orcamento_configuracoes')
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    const parcelasCol = app.findCollectionByNameOrId('pagamentos_parcelas')

    // 2. Semear Grupos de Clientes (ex: "Geral", "Senac ASP", "Arquitetos & Parceiros")
    let grupoGeralId = ''
    let grupoSenacId = ''
    let grupoArquitetoId = ''

    try {
      const gGeral = app.findFirstRecordByData('clientes_grupos', 'nome', 'Geral')
      grupoGeralId = gGeral.id
    } catch (_) {
      const r = new Record(gruposCol)
      r.set('nome', 'Geral')
      r.set('descricao', 'Tabela de preços padrão para clientes finais e obras residenciais')
      r.set('ativo', true)
      r.set('padrao', true)
      app.save(r)
      grupoGeralId = r.id
    }

    try {
      const gSenac = app.findFirstRecordByData('clientes_grupos', 'nome', 'Senac ASP')
      grupoSenacId = gSenac.id
    } catch (_) {
      const r = new Record(gruposCol)
      r.set('nome', 'Senac ASP')
      r.set('descricao', 'Tabela corporativa e institucional diferenciada')
      r.set('ativo', true)
      r.set('padrao', false)
      app.save(r)
      grupoSenacId = r.id
    }

    try {
      const gArq = app.findFirstRecordByData('clientes_grupos', 'nome', 'Arquitetos & Parceiros')
      grupoArquitetoId = gArq.id
    } catch (_) {
      const r = new Record(gruposCol)
      r.set('nome', 'Arquitetos & Parceiros')
      r.set(
        'descricao',
        'Condições para arquitetos, designers de interiores e construtoras parceiras',
      )
      r.set('ativo', true)
      r.set('padrao', false)
      app.save(r)
      grupoArquitetoId = r.id
    }

    // 3. Semear Clientes com vínculo aos grupos
    let clienteAlphavilleId = ''
    let clienteDraCamilaId = ''
    let clienteArqRodrigoId = ''

    try {
      const c1 = app.findFirstRecordByData('clientes', 'nome', 'Carlos Eduardo (Alphaville)')
      clienteAlphavilleId = c1.id
    } catch (_) {
      const r = new Record(clientesCol)
      r.set('nome', 'Carlos Eduardo (Alphaville)')
      r.set('grupo', grupoGeralId)
      r.set('documento', '284.912.838-41')
      r.set('whatsapp', '(19) 99876-1234')
      r.set('email', 'carlos.alphaville@gmail.com')
      r.set('cidade', 'São Pedro')
      r.set('endereco', 'Residencial Alphaville, Al. dos Flamboyants 142')
      r.set('observacoes', 'Casa térrea em fase de gesso nos quartos e sala com pé direito alto')
      app.save(r)
      clienteAlphavilleId = r.id
    }

    try {
      const c2 = app.findFirstRecordByData('clientes', 'nome', 'Dra. Camila Nogueira - Consultório')
      clienteDraCamilaId = c2.id
    } catch (_) {
      const r = new Record(clientesCol)
      r.set('nome', 'Dra. Camila Nogueira - Consultório')
      r.set('grupo', grupoSenacId)
      r.set('documento', '18.452.981/0001-34')
      r.set('whatsapp', '(19) 99123-5544')
      r.set('email', 'camila.odonto@gmail.com')
      r.set('cidade', 'Águas de São Pedro')
      r.set('endereco', 'Av. Carlos Mauro, 450 - Sala 3')
      r.set('observacoes', 'Necessita parede drywall acústica dupla')
      app.save(r)
      clienteDraCamilaId = r.id
    }

    try {
      const c3 = app.findFirstRecordByData('clientes', 'nome', 'Arq. Rodrigo Vasconcelos')
      clienteArqRodrigoId = c3.id
    } catch (_) {
      const r = new Record(clientesCol)
      r.set('nome', 'Arq. Rodrigo Vasconcelos')
      r.set('grupo', grupoArquitetoId)
      r.set('documento', '312.456.789-00')
      r.set('whatsapp', '(19) 98765-4321')
      r.set('email', 'contato@rodrigovasconcelos.arq.br')
      r.set('cidade', 'Piracicaba')
      r.set('endereco', 'Rua Governador Pedro de Toledo, 1200')
      r.set('observacoes', 'Parceiro recorrente para projetos de alto padrão')
      app.save(r)
      clienteArqRodrigoId = r.id
    }

    // 4. Semear Serviços e Preços de Orçamento (com preços específicos por grupo)
    // Lista oficial solicitada pelo usuário:
    // Forros de gesso, Parede drywall, Faixas decorativas e boiseries, Molduras de gesso,
    // Rebaixo de teto, Cortineiros de gesso, Sancas, Móveis e guarda-roupas em gesso,
    // Revestimento em placa 3D, Molduras externas em cimento celular, Colunas de gesso, Vitrais.
    const servicosCatalogo = [
      {
        nome: 'Forros de gesso',
        modo_calculo: 'area',
        unidade: 'm²',
        precoGeral: 120,
        precoSenac: 220,
        precoArq: 105,
        desc: 'Forro de gesso acartonado estruturado FVS com acabamento refinado para pintura.',
      },
      {
        nome: 'Parede drywall',
        modo_calculo: 'dimensoes',
        unidade: 'm²',
        precoGeral: 160,
        precoSenac: 240,
        precoArq: 145,
        desc: 'Divisória e parede estruturada em drywall com perfis galvanizados e isolamento termoacústico.',
      },
      {
        nome: 'Faixas decorativas e boiseries',
        modo_calculo: 'area',
        unidade: 'm linear',
        precoGeral: 65,
        precoSenac: 95,
        precoArq: 55,
        desc: 'Molduras clássicas estilo boiserie com encaixe perfeito em 45 graus e alinhamento a laser.',
      },
      {
        nome: 'Molduras de gesso',
        modo_calculo: 'area',
        unidade: 'm linear',
        precoGeral: 45,
        precoSenac: 70,
        precoArq: 40,
        desc: 'Molduras tradicionais em gesso liso de alta densidade.',
      },
      {
        nome: 'Rebaixo de teto',
        modo_calculo: 'area',
        unidade: 'm²',
        precoGeral: 95,
        precoSenac: 150,
        precoArq: 85,
        desc: 'Rebaixo de teto com rasgos de luz, spots embutidos e acabamento impecável.',
      },
      {
        nome: 'Cortineiros de gesso',
        modo_calculo: 'area',
        unidade: 'm linear',
        precoGeral: 60,
        precoSenac: 85,
        precoArq: 50,
        desc: 'Cortineiro embutido ou sobreposto com espaço para fita LED indireta.',
      },
      {
        nome: 'Sancas',
        modo_calculo: 'area',
        unidade: 'm linear',
        precoGeral: 120,
        precoSenac: 180,
        precoArq: 110,
        desc: 'Sanca aberta, fechada ou invertida com iluminação difusa decorativa.',
      },
      {
        nome: 'Móveis e guarda-roupas em gesso',
        modo_calculo: 'area',
        unidade: 'un',
        precoGeral: 3800,
        precoSenac: 5200,
        precoArq: 3400,
        desc: 'Mobiliário fixo e nichos estruturados em placas de gesso aramado e drywall.',
      },
      {
        nome: 'Revestimento em placa 3D',
        modo_calculo: 'area',
        unidade: 'm²',
        precoGeral: 140,
        precoSenac: 210,
        precoArq: 125,
        desc: 'Aplicação de placas 3D em gesso fundido com desenhos geométricos contemporâneos.',
      },
      {
        nome: 'Molduras externas em cimento celular',
        modo_calculo: 'area',
        unidade: 'm linear',
        precoGeral: 150,
        precoSenac: 230,
        precoArq: 135,
        desc: 'Molduras resistentes a intempéries em cimento celular para fachadas e beirais.',
      },
      {
        nome: 'Colunas de gesso',
        modo_calculo: 'area',
        unidade: 'un',
        precoGeral: 480,
        precoSenac: 720,
        precoArq: 430,
        desc: 'Colunas dóricas, jônicas ou caneladas em gesso maciço com capitel e base.',
      },
      {
        nome: 'Vitrais',
        modo_calculo: 'area',
        unidade: 'un',
        precoGeral: 850,
        precoSenac: 1300,
        precoArq: 780,
        desc: 'Composição de vitrais decorativos com requadro em gesso e iluminação traseira.',
      },
    ]

    // Criar itens para o grupo "Geral"
    const totalServicos = app.countRecords('orcamento_servicos')
    if (totalServicos === 0) {
      for (let i = 0; i < servicosCatalogo.length; i++) {
        const item = servicosCatalogo[i]
        // Grupo Geral
        const rGeral = new Record(orcServicosCol)
        rGeral.set('nome', item.nome)
        rGeral.set('grupo', grupoGeralId)
        rGeral.set('modo_calculo', item.modo_calculo)
        rGeral.set('unidade', item.unidade)
        rGeral.set('preco_unitario', item.precoGeral)
        rGeral.set('descricao_pdf', item.desc)
        rGeral.set('ativo', true)
        app.save(rGeral)

        // Grupo Senac ASP (tabela diferenciada)
        const rSenac = new Record(orcServicosCol)
        rSenac.set('nome', item.nome)
        rSenac.set('grupo', grupoSenacId)
        rSenac.set('modo_calculo', item.modo_calculo)
        rSenac.set('unidade', item.unidade)
        rSenac.set('preco_unitario', item.precoSenac)
        rSenac.set('descricao_pdf', item.desc)
        rSenac.set('ativo', true)
        app.save(rSenac)

        // Grupo Arquitetos & Parceiros
        const rArq = new Record(orcServicosCol)
        rArq.set('nome', item.nome)
        rArq.set('grupo', grupoArquitetoId)
        rArq.set('modo_calculo', item.modo_calculo)
        rArq.set('unidade', item.unidade)
        rArq.set('preco_unitario', item.precoArq)
        rArq.set('descricao_pdf', item.desc)
        rArq.set('ativo', true)
        app.save(rArq)
      }
    }

    // 5. Semear Métodos de Pagamento
    // Seed solicitado: À vista (10% desconto, padrão), Entrada + saldo, Parcelado 6x sem juros
    let metodoAVistaId = ''
    let metodoEntradaSaldoId = ''
    let metodoParcelado6xId = ''

    const totalMetodos = app.countRecords('metodos_pagamento')
    if (totalMetodos === 0) {
      const m1 = new Record(metodosCol)
      m1.set('nome', 'À vista (PIX / Dinheiro / Transferência)')
      m1.set('desconto_a_vista', 10)
      m1.set(
        'condicoes',
        JSON.stringify([
          '10% de desconto para pagamento integral à vista',
          'Quitação no ato da assinatura do contrato ou início dos trabalhos',
          'Chave PIX ou transferência bancária imediata',
        ]),
      )
      m1.set('numero_parcelas', 1)
      m1.set('padrao', true)
      m1.set('ativo', true)
      app.save(m1)
      metodoAVistaId = m1.id

      const m2 = new Record(metodosCol)
      m2.set('nome', 'Entrada + Saldo na Entrega')
      m2.set('desconto_a_vista', 5)
      m2.set(
        'condicoes',
        JSON.stringify([
          '50% de entrada no fechamento do contrato',
          '50% restante após vistoria final e entrega da obra',
          '5% de desconto promocional na entrada',
        ]),
      )
      m2.set('numero_parcelas', 2)
      m2.set('padrao', false)
      m2.set('ativo', true)
      app.save(m2)
      metodoEntradaSaldoId = m2.id

      const m3 = new Record(metodosCol)
      m3.set('nome', 'Parcelado em até 6x Sem Juros no Cartão')
      m3.set('desconto_a_vista', 0)
      m3.set(
        'condicoes',
        JSON.stringify([
          'Em até 6 parcelas iguais mensais sem juros no cartão de crédito',
          'Primeira parcela na aprovação do orçamento',
          'Opção de parcelamento estendido em até 18x com taxa da maquininha',
        ]),
      )
      m3.set('numero_parcelas', 6)
      m3.set('padrao', false)
      m3.set('ativo', true)
      app.save(m3)
      metodoParcelado6xId = m3.id
    } else {
      try {
        metodoAVistaId = app.findFirstRecordByData('metodos_pagamento', 'padrao', true).id
      } catch (_) {}
    }

    // 6. Semear Configurações do Orçamento
    const totalConfig = app.countRecords('orcamento_configuracoes')
    if (totalConfig === 0) {
      const cfg = new Record(orcConfigCol)
      cfg.set('chave', 'padrao')
      cfg.set('razao_social', 'Gesso Bettone Comércio e Instalações Eireli')
      cfg.set('nome_fantasia', 'Gesso Bettone')
      cfg.set('cnpj', '32.185.940/0001-72')
      cfg.set('exibir_cnpj_padrao', true)
      cfg.set(
        'nosso_compromisso',
        JSON.stringify([
          'Utilização de matérias-primas e gesso de alta pureza certificados pelas normas ABNT',
          'Mão de obra altamente qualificada com experiência de mais de 15 anos no mercado',
          'Cumprimento rigoroso do cronograma de início e entrega acordado',
          'Garantia estrutural de 5 anos sobre os serviços executados',
          'Limpeza completa da obra ao término de cada etapa de instalação',
        ]),
      )
      cfg.set('telefone', '(19) 99767-1189')
      cfg.set('email', 'contato@gessobettone.com.br')
      cfg.set('endereco', 'Rua Valentim Amaral, 412 - Centro')
      cfg.set('cidade', 'São Pedro/SP')
      app.save(cfg)
    }

    // 7. Atualizar orçamentos existentes para ligar aos novos clientes, grupos e métodos
    const orcs = app.findRecordsByFilter('orcamentos', "numero != ''", 'numero', 10, 0)
    for (let i = 0; i < orcs.length; i++) {
      const o = orcs[i]
      const total = o.getFloat('valor_total') || 1000
      let mudou = false

      if (!o.getString('grupo') && grupoGeralId) {
        o.set('grupo', grupoGeralId)
        mudou = true
      }

      if (!o.getString('cliente_cadastrado')) {
        if (o.getString('cliente').includes('Alphaville') && clienteAlphavilleId) {
          o.set('cliente_cadastrado', clienteAlphavilleId)
          mudou = true
        } else if (o.getString('cliente').includes('Camila') && clienteDraCamilaId) {
          o.set('cliente_cadastrado', clienteDraCamilaId)
          o.set('grupo', grupoSenacId)
          mudou = true
        } else if (o.getString('cliente').includes('Rodrigo') && clienteArqRodrigoId) {
          o.set('cliente_cadastrado', clienteArqRodrigoId)
          o.set('grupo', grupoArquitetoId)
          mudou = true
        }
      }

      if (!o.getString('metodo_pagamento') && metodoAVistaId) {
        o.set('metodo_pagamento', metodoAVistaId)
        mudou = true
      }

      if (!o.getFloat('valor_a_prazo')) {
        o.set('valor_a_prazo', total)
        o.set('valor_a_vista', Math.round(total * 0.9)) // 10% desc
        o.set('exibir_cnpj', true)
        mudou = true
      }

      if (mudou) {
        app.save(o)
      }

      // Se o orçamento está aprovado ("Aprovados aguardando início"), "Trabalhos iniciados" ou "Concluídos",
      // gerar as parcelas de pagamento de exemplo para testar a conciliação
      const status = o.getString('status')
      if (
        status === 'Aprovados aguardando início' ||
        status === 'Trabalhos iniciados' ||
        status === 'Concluídos'
      ) {
        const parcelasExistentes = app.findRecordsByFilter(
          'pagamentos_parcelas',
          `orcamento = '${o.id}'`,
          '-created',
          1,
          0,
        )
        if (parcelasExistentes.length === 0) {
          const hoje = new Date()
          const addDays = (d, days) => {
            const res = new Date(d.getTime())
            res.setDate(res.getDate() + days)
            return `${res.getFullYear()}-${String(res.getMonth() + 1).padStart(2, '0')}-${String(
              res.getDate(),
            ).padStart(2, '0')} 12:00:00.000Z`
          }

          if (status === 'Concluídos') {
            // Orçamento concluído: parcela 1 e 2 pagas
            const p1 = new Record(parcelasCol)
            p1.set('orcamento', o.id)
            p1.set('numero_parcela', 1)
            p1.set('total_parcelas', 2)
            p1.set('descricao', 'Entrada na assinatura')
            p1.set('valor_previsto', total / 2)
            p1.set('data_vencimento', addDays(hoje, -10))
            p1.set('status', 'paga')
            p1.set('data_pagamento', addDays(hoje, -10))
            p1.set('valor_pago', total / 2)
            p1.set('forma_pagamento', 'PIX')
            p1.set('observacoes_baixa', 'Conciliado via extrato PIX Bettone')
            app.save(p1)

            const p2 = new Record(parcelasCol)
            p2.set('orcamento', o.id)
            p2.set('numero_parcela', 2)
            p2.set('total_parcelas', 2)
            p2.set('descricao', 'Saldo na entrega')
            p2.set('valor_previsto', total / 2)
            p2.set('data_vencimento', addDays(hoje, -3))
            p2.set('status', 'paga')
            p2.set('data_pagamento', addDays(hoje, -3))
            p2.set('valor_pago', total / 2)
            p2.set('forma_pagamento', 'PIX')
            p2.set('observacoes_baixa', 'Obra entregue e saldo quitado')
            app.save(p2)
          } else if (status === 'Trabalhos iniciados') {
            // Em andamento: parcela 1 paga, parcela 2 a pagar
            const p1 = new Record(parcelasCol)
            p1.set('orcamento', o.id)
            p1.set('numero_parcela', 1)
            p1.set('total_parcelas', 2)
            p1.set('descricao', 'Entrada na aprovação')
            p1.set('valor_previsto', total / 2)
            p1.set('data_vencimento', addDays(hoje, -2))
            p1.set('status', 'paga')
            p1.set('data_pagamento', addDays(hoje, -2))
            p1.set('valor_pago', total / 2)
            p1.set('forma_pagamento', 'Transferência')
            p1.set('observacoes_baixa', 'Comprovante recebido via WhatsApp')
            app.save(p1)

            const p2 = new Record(parcelasCol)
            p2.set('orcamento', o.id)
            p2.set('numero_parcela', 2)
            p2.set('total_parcelas', 2)
            p2.set('descricao', 'Saldo na entrega')
            p2.set('valor_previsto', total / 2)
            p2.set('data_vencimento', addDays(hoje, 15))
            p2.set('status', 'a_pagar')
            app.save(p2)
          } else {
            // Aprovados aguardando início: parcela a pagar próxima semana
            const p1 = new Record(parcelasCol)
            p1.set('orcamento', o.id)
            p1.set('numero_parcela', 1)
            p1.set('total_parcelas', 1)
            p1.set('descricao', 'Pagamento à vista com desconto')
            p1.set('valor_previsto', o.getFloat('valor_a_vista') || total)
            p1.set('data_vencimento', addDays(hoje, 4))
            p1.set('status', 'a_pagar')
            app.save(p1)
          }
        }
      }
    }
  },
  (app) => {
    // Reverter seeds é opcional ou truncate
  },
)
