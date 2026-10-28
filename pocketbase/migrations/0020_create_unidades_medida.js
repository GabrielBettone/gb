migrate(
  (app) => {
    // 1. Cria coleção unidades_medida
    const collection = new Collection({
      name: 'unidades_medida',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'sigla', type: 'text', required: true },
        { name: 'metodo_calculo', type: 'text' },
        { name: 'ordem', type: 'number' },
        { name: 'ativo', type: 'bool' },
        { name: 'padrao', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_unidades_sigla ON unidades_medida (sigla)',
        'CREATE INDEX idx_unidades_ordem ON unidades_medida (ordem)',
      ],
    })
    app.save(collection)

    // 2. Seed inicial dos três exemplos solicitados pelo usuário
    const inicial = [
      {
        id: 'unid_m2_metro_quadrado',
        nome: 'Metros quadrados',
        sigla: 'm²',
        metodo_calculo: 'AxB',
        ordem: 1,
        ativo: true,
        padrao: true,
      },
      {
        id: 'unid_m_metro_linear',
        nome: 'Metros lineares',
        sigla: 'm',
        metodo_calculo: '(A+B)x2',
        ordem: 2,
        ativo: true,
        padrao: false,
      },
      {
        id: 'unid_svc_servico',
        nome: 'Serviço',
        sigla: 'svç',
        metodo_calculo: '',
        ordem: 3,
        ativo: true,
        padrao: false,
      },
    ]

    for (const item of inicial) {
      try {
        const record = new Record(collection)
        record.set('id', item.id)
        record.set('nome', item.nome)
        record.set('sigla', item.sigla)
        record.set('metodo_calculo', item.metodo_calculo)
        record.set('ordem', item.ordem)
        record.set('ativo', item.ativo)
        record.set('padrao', item.padrao)
        app.save(record)
      } catch (e) {
        console.log('Aviso ao seedar unidade ' + item.sigla + ': ' + e)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('unidades_medida')
      app.delete(col)
    } catch (_) {}
  },
)
