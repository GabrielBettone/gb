migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('unidades_medida')
    if (!col) return

    const inicial = [
      {
        nome: 'Metros quadrados',
        sigla: 'm²',
        metodo_calculo: 'AxB',
        ordem: 1,
        ativo: true,
        padrao: true,
      },
      {
        nome: 'Metros lineares',
        sigla: 'm',
        metodo_calculo: '(A+B)x2',
        ordem: 2,
        ativo: true,
        padrao: false,
      },
      {
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
        const existing = app.findRecordsByFilter(
          'unidades_medida',
          'sigla = {:sigla}',
          '-created',
          1,
          0,
          { sigla: item.sigla },
        )
        if (existing && existing.length > 0) {
          continue
        }
        const record = new Record(col)
        record.set('nome', item.nome)
        record.set('sigla', item.sigla)
        record.set('metodo_calculo', item.metodo_calculo)
        record.set('ordem', item.ordem)
        record.set('ativo', item.ativo)
        record.set('padrao', item.padrao)
        app.save(record)
      } catch (e) {
        console.warn('Erro ao inserir unidade ' + item.sigla + ':', e)
      }
    }
  },
  (app) => {},
)
