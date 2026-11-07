/// <reference path="../../pb_data/types.d.ts" />
/**
 * Módulo NFS-e (Gesso Bettone) — coleções + seeds.
 * Idempotente: usa findCollectionByNameOrId / contagem antes de criar.
 * A senha do certificado é cifrada no hook server-side, nunca em texto plano.
 */
migrate(
  (app) => {
    const authRule = "@request.auth.id != ''"

    // ---------- 1. nfse_emitente (empresa emitente, pré-cadastrada) ----------
    let emitenteCol
    try {
      emitenteCol = app.findCollectionByNameOrId('nfse_emitente')
    } catch (_) {
      emitenteCol = new Collection({
        name: 'nfse_emitente',
        type: 'base',
        listRule: authRule,
        viewRule: authRule,
        createRule: authRule,
        updateRule: authRule,
        deleteRule: null, // emitente não é excluído pelo app
        fields: [
          { name: 'razao_social', type: 'text', required: true, max: 200 },
          { name: 'nome_fantasia', type: 'text', max: 200 },
          { name: 'cnpj', type: 'text', required: true, max: 20 },
          { name: 'inscricao_municipal', type: 'text', max: 40 },
          { name: 'logradouro', type: 'text', max: 250 },
          { name: 'numero', type: 'text', max: 20 },
          { name: 'bairro', type: 'text', max: 120 },
          { name: 'codigo_municipio_ibge', type: 'text', max: 10 },
          { name: 'municipio', type: 'text', max: 120 },
          { name: 'uf', type: 'text', max: 2 },
          { name: 'cep', type: 'text', max: 12 },
          { name: 'telefone', type: 'text', max: 30 },
          { name: 'email', type: 'text', max: 150 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_nfse_emitente_cnpj ON nfse_emitente (cnpj)'],
      })
      app.save(emitenteCol)
      emitenteCol = app.findCollectionByNameOrId('nfse_emitente')
    }

    // ---------- 2. nfse_servicos (serviços LC 116) ----------
    let servicosCol
    try {
      servicosCol = app.findCollectionByNameOrId('nfse_servicos')
    } catch (_) {
      servicosCol = new Collection({
        name: 'nfse_servicos',
        type: 'base',
        listRule: authRule,
        viewRule: authRule,
        createRule: authRule,
        updateRule: authRule,
        deleteRule: authRule,
        fields: [
          { name: 'nome', type: 'text', required: true, max: 250 },
          { name: 'codigo_lc116', type: 'text', required: true, max: 12 },
          { name: 'descricao', type: 'text' },
          { name: 'aliquota_iss', type: 'number' },
          { name: 'reter_irrf', type: 'bool' },
          { name: 'reter_csll', type: 'bool' },
          { name: 'reter_cofins', type: 'bool' },
          { name: 'reter_pis', type: 'bool' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_nfse_servicos_nome ON nfse_servicos (nome)'],
      })
      app.save(servicosCol)
      servicosCol = app.findCollectionByNameOrId('nfse_servicos')
    }

    // ---------- 3. nfse_config (ambiente, município de incidência, alíquotas) ----------
    let configCol
    try {
      configCol = app.findCollectionByNameOrId('nfse_config')
    } catch (_) {
      configCol = new Collection({
        name: 'nfse_config',
        type: 'base',
        listRule: authRule,
        viewRule: authRule,
        createRule: authRule,
        updateRule: authRule,
        deleteRule: null,
        fields: [
          {
            name: 'ambiente',
            type: 'select',
            required: true,
            values: ['homologacao', 'producao'],
            maxSelect: 1,
          },
          { name: 'municipio_incidencia', type: 'text', max: 150 },
          { name: 'municipio_incidencia_ibge', type: 'text', max: 10 },
          { name: 'aliquota_iss_padrao', type: 'number' },
          { name: 'reter_federais_padrao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configCol)
      configCol = app.findCollectionByNameOrId('nfse_config')
    }

    // ---------- 4. nfse_certificado (A1; senha cifrada no servidor) ----------
    let certCol
    try {
      certCol = app.findCollectionByNameOrId('nfse_certificado')
    } catch (_) {
      certCol = new Collection({
        name: 'nfse_certificado',
        type: 'base',
        // Regras nulas: o certificado SÓ é acessado/gravado pelo hook server-side.
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'nome_arquivo', type: 'text', max: 250 },
          { name: 'arquivo_base64', type: 'text' },
          { name: 'senha_cifrada', type: 'text' },
          { name: 'valido_ate', type: 'text', max: 20 },
          { name: 'validado', type: 'bool' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(certCol)
      certCol = app.findCollectionByNameOrId('nfse_certificado')
    }

    // ---------- 5. nfse_notas (RPS / NFS-e) ----------
    let notasCol
    try {
      notasCol = app.findCollectionByNameOrId('nfse_notas')
    } catch (_) {
      const orcamentosColId = app.findCollectionByNameOrId('orcamentos').id
      notasCol = new Collection({
        name: 'nfse_notas',
        type: 'base',
        listRule: authRule,
        viewRule: authRule,
        createRule: authRule,
        updateRule: authRule,
        deleteRule: authRule,
        fields: [
          {
            name: 'orcamento',
            type: 'relation',
            collectionId: orcamentosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'servico',
            type: 'relation',
            collectionId: servicosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'rps',
              'enviando',
              'processando',
              'autorizada',
              'rejeitada',
              'cancelada',
              'erro_envio',
            ],
            maxSelect: 1,
          },
          { name: 'numero_rps', type: 'number' },
          { name: 'serie_rps', type: 'text', max: 10 },
          { name: 'protocolo', type: 'text', max: 100 },
          { name: 'numero_nfse', type: 'text', max: 30 },
          { name: 'data_competencia', type: 'text', max: 10 },
          { name: 'data_emissao_dps', type: 'text', max: 30 },
          { name: 'descricao_servico', type: 'text' },
          { name: 'valor_servicos', type: 'number', required: true },
          { name: 'aliquota_iss', type: 'number' },
          { name: 'valor_iss', type: 'number' },
          { name: 'iss_retido', type: 'bool' },
          { name: 'valor_irrf', type: 'number' },
          { name: 'valor_csll', type: 'number' },
          { name: 'valor_cofins', type: 'number' },
          { name: 'valor_pis', type: 'number' },
          { name: 'codigo_lc116', type: 'text', max: 12 },
          { name: 'codigo_tributario_municipio', type: 'text', max: 12 },
          { name: 'tomador_nome', type: 'text', max: 200 },
          { name: 'tomador_documento', type: 'text', max: 30 },
          { name: 'tomador_email', type: 'text', max: 150 },
          { name: 'tomador_logradouro', type: 'text', max: 250 },
          { name: 'tomador_numero', type: 'text', max: 20 },
          { name: 'tomador_bairro', type: 'text', max: 120 },
          { name: 'tomador_codigo_ibge', type: 'text', max: 10 },
          { name: 'tomador_cep', type: 'text', max: 12 },
          { name: 'xml_dps', type: 'text' },
          { name: 'xml_autorizado', type: 'text' },
          { name: 'mensagem_erro', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nfse_notas_status ON nfse_notas (status)',
          'CREATE INDEX idx_nfse_notas_orcamento ON nfse_notas (orcamento)',
        ],
      })
      app.save(notasCol)
      notasCol = app.findCollectionByNameOrId('nfse_notas')
    }

    // ---------- 6. Seeds ----------
    const contar = (nome) => {
      try {
        return app.countRecords(nome)
      } catch (_) {
        return 0
      }
    }

    if (contar('nfse_emitente') === 0) {
      const rec = new Record(emitenteCol)
      rec.set('razao_social', 'GB SOLUCOES LTDA')
      rec.set('nome_fantasia', 'Gesso Bettone')
      rec.set('cnpj', '53.242.055/0001-74')
      rec.set('inscricao_municipal', '')
      rec.set('logradouro', '')
      rec.set('numero', '')
      rec.set('bairro', '')
      rec.set('codigo_municipio_ibge', '3550407')
      rec.set('municipio', 'São Pedro')
      rec.set('uf', 'SP')
      rec.set('cep', '')
      rec.set('telefone', '')
      rec.set('email', '')
      app.save(rec)
    }

    if (contar('nfse_servicos') === 0) {
      const servicosSeed = [
        {
          nome: 'Aplicação de forro de gesso',
          codigo_lc116: '7.04',
          descricao:
            'Serviços de instalação e montagem de forros de gesso (gesso liso e placas), inclusive sancas e iluminação embutida.',
        },
        {
          nome: 'Instalação de drywall / paredes de gesso acartonado',
          codigo_lc116: '7.04',
          descricao:
            'Montagem de paredes e divisórias em drywall (gesso acartonado), plumas, steel frame e acabamentos.',
        },
        {
          nome: 'Execução de alvenaria e revestimento de paredes',
          codigo_lc116: '7.01',
          descricao:
            'Execução de alvenaria, emboço, reboco e revestimento de paredes em obras de construção civil.',
        },
        {
          nome: 'Obras de concreto e acabamento em edificações',
          codigo_lc116: '7.02',
          descricao:
            'Serviços e obras de concreto em geral e acabamentos em edificações (novo, reforma ou ampliação).',
        },
        {
          nome: 'Instalação e montagem de estruturas metálicas',
          codigo_lc116: '7.05',
          descricao: 'Instalação e montagem de estruturas metálicas e divisórias industriais.',
        },
        {
          nome: 'Reformas e acabamentos em interiores',
          codigo_lc116: '7.07',
          descricao: 'Reformas em geral: gesso, pintura, molduras, sancas e acabamentos internos.',
        },
      ]
      for (const s of servicosSeed) {
        const rec = new Record(servicosCol)
        rec.set('nome', s.nome)
        rec.set('codigo_lc116', s.codigo_lc116)
        rec.set('descricao', s.descricao)
        rec.set('aliquota_iss', 2)
        rec.set('reter_irrf', false)
        rec.set('reter_csll', false)
        rec.set('reter_cofins', false)
        rec.set('reter_pis', false)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    if (contar('nfse_config') === 0) {
      const rec = new Record(configCol)
      rec.set('ambiente', 'homologacao')
      rec.set('municipio_incidencia', 'São Pedro/SP')
      rec.set('municipio_incidencia_ibge', '3550407')
      rec.set('aliquota_iss_padrao', 2)
      rec.set('reter_federais_padrao', false)
      app.save(rec)
    }
  },
  (app) => {
    const toDelete = [
      'nfse_notas',
      'nfse_certificado',
      'nfse_config',
      'nfse_servicos',
      'nfse_emitente',
    ]
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {
        /* já removida */
      }
    }
  },
)
