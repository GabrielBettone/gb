// Rotas customizadas do módulo NFS-e (Gesso Bettone).
// Convenções idênticas às do simulador_api.pb.js: e.app / e.json / findRecordsByFilter.
// A senha do certificado é cifrada com AES-GCM ($security) e NUNCA devolvida ao cliente.

function gerarChaveCert() {
  let k = $os.getenv('NFSE_CERT_KEY') || 'bettone-nfse-cert-key-default-v1'
  while (k.length < 32) k += k
  return k.substring(0, 32)
}

function cifrarSenha(texto) {
  return $security.encrypt(JSON.stringify({ v: texto }), gerarChaveCert())
}

function decifrarSenha(blob) {
  try {
    const json = JSON.parse($security.decrypt(blob))
    return json.v
  } catch (_) {
    return null
  }
}

function exigirAuth(e) {
  const info = e.requestInfo()
  if (!info.auth || !info.auth.id) {
    e.json(401, { error: 'Autenticação obrigatória.' })
    return false
  }
  return true
}

// ---------- POST /backend/v1/nfse/enviar/{id} ----------
routerAdd('POST', '/backend/v1/nfse/enviar/{id}', (e) => {
  try {
    if (!exigirAuth(e)) return
    const app = e.app
    const id = e.request.pathValue('id')

    const notas = app.findRecordsByFilter('nfse_notas', `id = "${id}"`, '-created', 1, 0)
    if (!notas || notas.length === 0) {
      return e.json(404, { error: 'Nota não encontrada.' })
    }
    const nota = notas[0]
    if (nota.getString('status') === 'autorizada') {
      return e.json(400, { error: 'Esta nota já está autorizada.' })
    }

    const emitentes = app.findRecordsByFilter('nfse_emitente', 'id != ""', '-created', 1, 0)
    if (!emitentes || emitentes.length === 0) {
      return e.json(400, { error: 'Emitente não configurado.' })
    }
    const configs = app.findRecordsByFilter('nfse_config', 'id != ""', '-created', 1, 0)
    if (!configs || configs.length === 0) {
      return e.json(400, { error: 'Configurações do NFS-e Nacional não encontradas.' })
    }
    const certs = app.findRecordsByFilter('nfse_certificado', 'ativo = true', '-created', 1, 0)
    if (!certs || certs.length === 0) {
      return e.json(400, {
        error: 'Envie o certificado A1 antes de emitir (aba Certificado e sistema nacional).',
      })
    }
    if (!certs[0].getBool('validado')) {
      return e.json(400, {
        error:
          'O certificado enviado ainda não pôde ser validado: este ambiente de execução não ' +
          'suporta leitura de .pfx/mTLS. O envio real à Receita fica pendente de suporte de plataforma.',
      })
    }

    let servico = null
    const servicoId = nota.getString('servico')
    if (servicoId) {
      const svcs = app.findRecordsByFilter('nfse_servicos', `id = "${servicoId}"`, '', 1, 0)
      if (svcs && svcs.length > 0) servico = svcs[0]
    }

    const NFSe = require(`${__hooks}/nfse_nacional.pb.js`)
    try {
      const retorno = NFSe.enviarDps(nota, emitentes[0], servico, configs[0])
      if (retorno && retorno.protocolo) {
        nota.set('protocolo', retorno.protocolo)
        nota.set('numero_nfse', retorno.numero || '')
        nota.set('status', retorno.status || 'processando')
        app.save(nota)
      }
      return e.json(200, { ok: true, status: nota.getString('status') })
    } catch (err) {
      nota.set('status', 'erro_envio')
      nota.set('mensagem_erro', err.message || 'Falha no envio.')
      app.save(nota)
      return e.json(err.status === 501 ? 501 : 500, { error: err.message || 'Falha no envio.' })
    }
  } catch (err) {
    return e.json(500, { error: 'Erro ao enviar nota: ' + (err.message || String(err)) })
  }
})

// ---------- POST /backend/v1/nfse/consultar/{id} ----------
routerAdd('POST', '/backend/v1/nfse/consultar/{id}', (e) => {
  try {
    if (!exigirAuth(e)) return
    const app = e.app
    const id = e.request.pathValue('id')

    const notas = app.findRecordsByFilter('nfse_notas', `id = "${id}"`, '-created', 1, 0)
    if (!notas || notas.length === 0) {
      return e.json(404, { error: 'Nota não encontrada.' })
    }
    const nota = notas[0]
    if (!nota.getString('protocolo')) {
      return e.json(400, { error: 'Nota sem protocolo de envio — envie a DPS primeiro.' })
    }

    const configs = app.findRecordsByFilter('nfse_config', 'id != ""', '-created', 1, 0)
    if (!configs || configs.length === 0) {
      return e.json(400, { error: 'Configurações do NFS-e Nacional não encontradas.' })
    }

    const NFSe = require(`${__hooks}/nfse_nacional.pb.js`)
    try {
      const retorno = NFSe.consultarNota(nota.getString('protocolo'), configs[0])
      if (retorno && retorno.status) {
        nota.set('status', retorno.status)
        if (retorno.numero) nota.set('numero_nfse', retorno.numero)
        if (retorno.xml) nota.set('xml_autorizado', retorno.xml)
        app.save(nota)
      }
      return e.json(200, { ok: true, status: nota.getString('status') })
    } catch (err) {
      return e.json(err.status === 501 ? 501 : 500, { error: err.message })
    }
  } catch (err) {
    return e.json(500, { error: 'Erro ao consultar nota: ' + (err.message || String(err)) })
  }
})

// ---------- GET /backend/v1/nfse/xml/{id} ----------
routerAdd('GET', '/backend/v1/nfse/xml/{id}', (e) => {
  try {
    if (!exigirAuth(e)) return
    const app = e.app
    const id = e.request.pathValue('id')
    const notas = app.findRecordsByFilter('nfse_notas', `id = "${id}"`, '-created', 1, 0)
    if (!notas || notas.length === 0) {
      return e.json(404, { error: 'Nota não encontrada.' })
    }
    const xml = notas[0].getString('xml_autorizado') || notas[0].getString('xml_dps')
    if (!xml) {
      return e.json(404, { error: 'XML ainda não disponível para esta nota.' })
    }
    e.response.header().set('Content-Disposition', 'attachment; filename="nfse-' + id + '.xml"')
    return e.json(200, { xml: xml })
  } catch (err) {
    return e.json(500, { error: 'Erro ao buscar XML: ' + (err.message || String(err)) })
  }
})

// ---------- POST /backend/v1/nfse/certificado (JSON base64; senha nunca em texto no cliente depois do envio) ----------
routerAdd('POST', '/backend/v1/nfse/certificado', (e) => {
  try {
    if (!exigirAuth(e)) return
    const app = e.app
    const data = e.requestInfo().body || {}
    const senha = String(data.senha || '')
    const arquivoB64 = String(data.arquivo_base64 || '')
    const nomeArquivo = String(data.nome_arquivo || 'certificado.pfx')

    if (!arquivoB64) {
      return e.json(400, { error: 'Envie o arquivo .pfx do certificado A1.' })
    }
    if (!senha) {
      return e.json(400, { error: 'Informe a senha do certificado.' })
    }

    // Remove certificados anteriores
    const anteriores = app.findRecordsByFilter('nfse_certificado', 'id != ""', '', 500, 0)
    for (const ant of anteriores) {
      app.delete(ant)
    }

    const col = app.findCollectionByNameOrId('nfse_certificado')
    const rec = new Record(col)
    rec.set('ativo', true)
    rec.set('senha_cifrada', cifrarSenha(senha))
    rec.set('valido_ate', String(data.valido_ate || ''))
    rec.set('nome_arquivo', nomeArquivo)
    rec.set('arquivo_base64', arquivoB64)
    rec.set('validado', false)
    app.save(rec)

    return e.json(200, {
      ok: true,
      id: rec.id,
      nome_arquivo: nomeArquivo,
      aviso:
        'Certificado armazenado cifrado no servidor. A validação do .pfx e o mTLS dependem de suporte da plataforma.',
    })
  } catch (err) {
    return e.json(500, { error: 'Erro ao salvar certificado: ' + (err.message || String(err)) })
  }
})

// ---------- GET /backend/v1/nfse/certificado/status ----------
routerAdd('GET', '/backend/v1/nfse/certificado/status', (e) => {
  try {
    if (!exigirAuth(e)) return
    const app = e.app
    const certs = app.findRecordsByFilter('nfse_certificado', 'ativo = true', '-created', 1, 0)
    if (!certs || certs.length === 0) {
      return e.json(200, { existe: false })
    }
    const cert = certs[0]
    // A senha NUNCA é devolvida — nem cifrada.
    return e.json(200, {
      existe: true,
      nome_arquivo: cert.getString('nome_arquivo'),
      valido_ate: cert.getString('valido_ate'),
      validado: cert.getBool('validado'),
      atualizado_em: cert.getString('updated'),
    })
  } catch (err) {
    return e.json(500, { error: 'Erro ao consultar certificado: ' + (err.message || String(err)) })
  }
})
