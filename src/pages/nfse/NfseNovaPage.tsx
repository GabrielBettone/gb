/**
 * Página NFS-e • Nova NFS-e — emissão a partir de formulário (ou pré-preenchida
 * a partir de um orçamento via ?orcamento=). Cálculo de impostos em tempo real.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Send,
  Trash2,
  Loader2,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeConfig, type NFSeNota, type NFSeServico } from '@/services/nfseApi'
import { calcularImpostos, formatMoedaNFSe, validarDocumento } from '@/services/nfse'
import type { Orcamento, Cliente } from '@/types'
import { dataAdapter } from '@/lib/dataAdapter'
import { consultarCnpj, type CnpjConsultaResult } from '@/services/cnpj'

export const NfseNovaPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const orcamentoId = searchParams.get('orcamento') || ''

  const [servicos, setServicos] = useState<NFSeServico[]>([])
  const [config, setConfig] = useState<NFSeConfig | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [notaId, setNotaId] = useState<string>('')

  // Formulário - Tomador
  const [tomadorNome, setTomadorNome] = useState('')
  const [tomadorDoc, setTomadorDoc] = useState('')
  const [tomadorEmail, setTomadorEmail] = useState('')
  const [tomadorTelefone, setTomadorTelefone] = useState('')
  const [tomadorEndereco, setTomadorEndereco] = useState('')
  const [tomadorLogradouro, setTomadorLogradouro] = useState('')
  const [tomadorNumero, setTomadorNumero] = useState('')
  const [tomadorComplemento, setTomadorComplemento] = useState('')
  const [tomadorBairro, setTomadorBairro] = useState('')
  const [tomadorCep, setTomadorCep] = useState('')
  const [tomadorCodigoMunicipio, setTomadorCodigoMunicipio] = useState('')
  const [tomadorMunicipio, setTomadorMunicipio] = useState('')
  const [tomadorUf, setTomadorUf] = useState('SP')

  // Estado da busca de CNPJ
  const [consultandoCnpj, setConsultandoCnpj] = useState(false)
  const [cnpjConsultadoInfo, setCnpjConsultadoInfo] = useState<CnpjConsultaResult | null>(null)
  const [ultimoCnpjConsultado, setUltimoCnpjConsultado] = useState<string>('')

  // Serviço e valores
  const [servicoId, setServicoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [valor, setValor] = useState<string>('')
  const [dataCompetencia, setDataCompetencia] = useState(new Date().toISOString().slice(0, 10))
  const [issRetido, setIssRetido] = useState(false)

  // Carrega serviços + config + (opcional) orçamento pré-preenchido
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [servs, cfg] = await Promise.all([nfseApi.listarServicos(), nfseApi.obterConfig()])
        if (!ativo) return
        setServicos(servs)
        setConfig(cfg)
        if (orcamentoId) {
          await carregarEPreencherOrcamento(orcamentoId, servs, ativo)
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar dados',
          description: e?.message || 'Verifique se o SQL supabase/nfse_schema.sql foi executado.',
        })
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId])

  async function carregarEPreencherOrcamento(id: string, servs: NFSeServico[], isMounted: boolean) {
    try {
      const orcList = await dataAdapter.getFullList<Orcamento>('orcamentos', {
        filter: `id="${id}"`,
        expand: 'cliente_cadastrado',
      })
      const orc = orcList[0]
      if (!orc || !isMounted) return

      let cliente: Cliente | null = orc.expand?.cliente_cadastrado || null

      // Se cliente_cadastrado não veio expandido mas tem id, busca direto
      if (!cliente && (orc as any).cliente_cadastrado) {
        try {
          const cliList = await dataAdapter.getFullList<Cliente>('clientes', {
            filter: `id="${(orc as any).cliente_cadastrado}"`,
          })
          if (cliList[0]) cliente = cliList[0]
        } catch {
          /* intentionally ignored */
        }
      }

      // Se ainda não achou cliente cadastrado, tenta localizar por nome do cliente
      if (!cliente && orc.cliente) {
        try {
          const nomeLimpo = orc.cliente.trim().replace(/"/g, '')
          const cliList = await dataAdapter.getFullList<Cliente>('clientes', {
            filter: `nome="${nomeLimpo}"`,
          })
          if (cliList[0]) cliente = cliList[0]
        } catch {
          /* intentionally ignored */
        }
      }

      // Preenche dados básicos do orçamento
      setTomadorNome(cliente?.nome || orc.cliente || '')
      const docRaw = (
        cliente?.documento ||
        (orc as any).cliente_documento ||
        (orc as any).documento ||
        ''
      ).toString()
      setTomadorDoc(docRaw)
      setTomadorEmail(cliente?.email || (orc.contato?.includes('@') ? orc.contato : ''))
      setTomadorTelefone(
        cliente?.whatsapp || (!orc.contato?.includes('@') ? orc.contato || '' : ''),
      )

      const endInicial = cliente?.endereco || ''
      setTomadorEndereco(endInicial)
      setTomadorMunicipio(cliente?.cidade || orc.cidade || '')
      const ufDetectada =
        (orc.cidade || '').toUpperCase().includes('/SP') ||
        (orc.cidade || '').toUpperCase().includes('SP')
          ? 'SP'
          : 'SP'
      setTomadorUf(ufDetectada)

      setValor(String(orc.valor_total || 0))
      setDescricao(
        orc.produto_principal
          ? `Serviços de ${orc.produto_principal} conforme orçamento ${orc.numero}`
          : `Serviços conforme orçamento ${orc.numero}`,
      )
      setObservacoes(orc.observacoes || '')
      const sugerido = servs[0]?.id
      if (sugerido) setServicoId(sugerido)

      // Se temos CNPJ (14 dígitos), dispara consulta para preencher dados completos automaticamente
      const apenasNums = docRaw.replace(/\D/g, '')
      if (apenasNums.length === 14) {
        await executarConsultaCnpj(apenasNums, { silencioso: false })
      } else if (docRaw && apenasNums.length !== 14 && apenasNums.length !== 11) {
        toast({
          title: 'Documento do cliente',
          description: `Documento "${docRaw}" importado. Verifique se é um CPF (11 dígitos) ou CNPJ (14 dígitos).`,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Aviso ao carregar orçamento',
        description:
          'Não foi possível carregar todos os dados do cliente. Campos abertos para edição.',
      })
    }
  }

  async function executarConsultaCnpj(
    cnpjDigitos: string,
    opts: { silencioso?: boolean; forcar?: boolean } = {},
  ) {
    const limpo = cnpjDigitos.replace(/\D/g, '')
    if (limpo.length !== 14) return

    setConsultandoCnpj(true)
    try {
      const res = await consultarCnpj(limpo, { forcarRecarregar: opts.forcar })
      if (!res) {
        if (!opts.silencioso) {
          toast({
            title: 'CNPJ não localizado automaticamente',
            description:
              'A consulta pública à Receita não retornou dados para este CNPJ. Os campos permanecem editáveis manualmente.',
          })
        }
        return
      }

      setCnpjConsultadoInfo(res)
      setUltimoCnpjConsultado(limpo)

      // Preenchimento automático dos dados do tomador
      if (res.razao_social) {
        setTomadorNome(res.razao_social)
      }
      if (res.email) {
        setTomadorEmail(res.email)
      }
      if (res.telefone) {
        setTomadorTelefone(res.telefone)
      }
      if (res.logradouro) {
        setTomadorLogradouro(res.logradouro)
      }
      if (res.numero) {
        setTomadorNumero(res.numero)
      }
      if (res.complemento) {
        setTomadorComplemento(res.complemento)
      }
      if (res.bairro) {
        setTomadorBairro(res.bairro)
      }
      if (res.cep) {
        setTomadorCep(res.cep)
      }
      if (res.municipio) {
        setTomadorMunicipio(res.municipio)
      }
      if (res.uf) {
        setTomadorUf(res.uf)
      }
      if (res.codigo_municipio_ibge) {
        setTomadorCodigoMunicipio(res.codigo_municipio_ibge)
      }
      if (res.endereco_completo) {
        setTomadorEndereco(res.endereco_completo)
      }

      toast({
        title: 'Dados da empresa importados via CNPJ',
        description: `${res.razao_social} • ${res.municipio}/${res.uf} (fonte: ${
          res.provedor === 'brasilapi'
            ? 'BrasilAPI'
            : res.provedor === 'minhareceita'
              ? 'Minha Receita'
              : 'Cache'
        })`,
      })
    } catch (err: any) {
      if (!opts.silencioso) {
        toast({
          title: 'Aviso na consulta de CNPJ',
          description: 'Não foi possível consultar o CNPJ agora. Preencha os campos manualmente.',
        })
      }
    } finally {
      setConsultandoCnpj(false)
    }
  }

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) || null,
    [servicos, servicoId],
  )

  const docDigitos = tomadorDoc.replace(/\D/g, '')
  const ehPj = docDigitos.length === 14
  const valorNumero = Number(valor.replace(/\./g, '').replace(',', '.')) || 0

  const impostos = useMemo(() => {
    const aliquotaIss = servicoSelecionado?.aliquota_iss ?? config?.aliquota_iss_padrao ?? 3
    const retencaoServico = servicoSelecionado
      ? {
          reterIrrf: servicoSelecionado.reter_irrf,
          reterCsll: servicoSelecionado.reter_csll,
          reterCofins: servicoSelecionado.reter_cofins,
          reterPis: servicoSelecionado.reter_pis,
        }
      : null
    return calcularImpostos(valorNumero, {
      aliquotaIss,
      issRetido,
      tomadorPessoaJuridica: ehPj || docDigitos.length === 0,
      ...(retencaoServico || {}),
    })
  }, [valorNumero, servicoSelecionado, config, issRetido, ehPj, docDigitos])

  const podeEnviar =
    tomadorNome && docDigitos && validarDocumento(tomadorDoc) && servicoId && valorNumero > 0

  const salvarRascunho = async (): Promise<NFSeNota> => {
    const payloadTomador = {
      tomador_nome: tomadorNome,
      tomador_documento: tomadorDoc,
      tomador_email: tomadorEmail,
      tomador_telefone: tomadorTelefone,
      tomador_endereco: tomadorEndereco,
      tomador_endereco_logradouro: tomadorLogradouro,
      tomador_endereco_numero: tomadorNumero,
      tomador_endereco_complemento: tomadorComplemento,
      tomador_endereco_bairro: tomadorBairro,
      tomador_endereco_cep: tomadorCep,
      tomador_codigo_municipio: tomadorCodigoMunicipio,
      tomador_municipio: tomadorMunicipio,
      tomador_uf: tomadorUf,
      servico: servicoId,
      descricao_servico: descricao,
      observacoes,
      valor_servicos: valorNumero,
      aliquota_iss: impostos.aliquotaIss,
      valor_iss: impostos.valorIss,
      iss_retido: issRetido,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      data_competencia: dataCompetencia,
      codigo_lc116: servicoSelecionado?.codigo_lc116 || '',
    }

    if (notaId) {
      await nfseApi.atualizarNota(notaId, payloadTomador as any)
      const nota = await nfseApi.obterNota(notaId)
      return nota as NFSeNota
    }
    const nota = await nfseApi.criarNotaAvulsa({
      ...payloadTomador,
      orcamento: orcamentoId || null,
      orcamento_numero: (searchParams.get('numero') || '').toString(),
    })
    setNotaId(nota.id)
    return nota
  }

  const handleSalvarRascunho = async () => {
    if (!podeEnviar) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Preencha tomador (CPF/CNPJ válido), serviço e valor.',
      })
      return
    }
    setEnviando(true)
    try {
      await salvarRascunho()
      toast({
        title: 'Rascunho salvo como RPS.',
        description: 'Envie quando quiser em Notas emitidas.',
      })
      navigate('/painel/nfse/notas')
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar rascunho', description: e?.message })
    } finally {
      setEnviando(false)
    }
  }

  const handleEmitir = async () => {
    if (!podeEnviar) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Preencha tomador (CPF/CNPJ válido), serviço e valor maiores que zero.',
      })
      return
    }
    setEnviando(true)
    try {
      const nota = await salvarRascunho()
      // Envio real via Edge Function (mTLS com o certificado A1).
      const res = await nfseApi.enviarNota(nota.id)
      if (!res.ok) {
        await nfseApi.atualizarNota(nota.id, {
          status: 'erro',
          mensagem_erro: res.erro || 'Falha no envio.',
        } as any)
        toast({
          variant: 'destructive',
          title: 'Envio à Receita falhou',
          description:
            res.erro || 'Erro desconhecido. Veja os detalhes na nota — nada foi autorizado.',
        })
        navigate(`/painel/nfse/notas/${nota.id}`)
        return
      }
      await nfseApi.atualizarNota(nota.id, { status: 'enviando' } as any)
      toast({
        title: 'DPS enviada ao sistema nacional',
        description: 'Protocolo gerado. Acompanhe a autorização em Notas emitidas.',
      })
      navigate(`/painel/nfse/notas/${nota.id}`)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na emissão',
        description: e?.message || 'Falha inesperada — nada foi autorizado.',
      })
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl text-[#2C3E50]">Nova NFS-e</h1>
          <p className="text-xs text-[#616F7D] mt-1">
            {orcamentoId
              ? `Pré-preenchida a partir do orçamento ${searchParams.get('numero') || orcamentoId}.`
              : 'Emissão avulsa — padrão nacional NFS-e (DPS).'}
          </p>
        </div>
        {orcamentoId && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#EDF1F5] text-[#2C3E50] font-semibold">
            Origem: orçamento {searchParams.get('numero') || orcamentoId.slice(0, 8)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Tomador */}
          <Card className="border-[#E3E6EA]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="font-heading text-sm text-[#2C3E50]">
                  1. Tomador do serviço
                </CardTitle>
                <p className="text-[11px] text-[#616F7D]">
                  Dados do cliente tomador da NFS-e. CNPJs são consultados e preenchidos
                  automaticamente.
                </p>
              </div>
              {ehPj && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={consultandoCnpj || docDigitos.length !== 14}
                  onClick={() =>
                    executarConsultaCnpj(docDigitos, { forcar: true, silencioso: false })
                  }
                  className="h-8 text-xs border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/5"
                >
                  {consultandoCnpj ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Consultando CNPJ...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 mr-1.5" />
                      Consultar Receita / CNPJ
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {cnpjConsultadoInfo && (
                <div className="p-2.5 rounded-md bg-[#EDF1F5] border border-[#2C3E50]/20 text-xs text-[#2C3E50] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2C3E50] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <p className="font-semibold">
                      {cnpjConsultadoInfo.razao_social}{' '}
                      {cnpjConsultadoInfo.nome_fantasia
                        ? `(${cnpjConsultadoInfo.nome_fantasia})`
                        : ''}
                    </p>
                    <p className="text-[11px] text-[#616F7D]">
                      CNPJ: {cnpjConsultadoInfo.cnpj} • Situação:{' '}
                      {cnpjConsultadoInfo.situacao_cadastral || 'Ativa'} • IBGE:{' '}
                      {cnpjConsultadoInfo.codigo_municipio_ibge || 'Não informado'} • Fonte:{' '}
                      {cnpjConsultadoInfo.provedor === 'brasilapi'
                        ? 'BrasilAPI (Receita Federal)'
                        : cnpjConsultadoInfo.provedor === 'minhareceita'
                          ? 'Minha Receita'
                          : 'Cache local'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">CPF / CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tomadorDoc}
                      onChange={(e) => {
                        const val = e.target.value
                        setTomadorDoc(val)
                        const limpo = val.replace(/\D/g, '')
                        if (limpo.length === 14 && limpo !== ultimoCnpjConsultado) {
                          executarConsultaCnpj(limpo, { silencioso: false })
                        }
                      }}
                      placeholder="00.000.000/0000-00 ou 000.000.000-00"
                      className="text-xs font-mono flex-1"
                    />
                    {ehPj && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={consultandoCnpj || docDigitos.length !== 14}
                        onClick={() =>
                          executarConsultaCnpj(docDigitos, { forcar: true, silencioso: false })
                        }
                        className="h-9 px-3 text-xs"
                        title="Reconsultar CNPJ na Receita Federal"
                      >
                        {consultandoCnpj ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                  {docDigitos.length > 0 && !validarDocumento(tomadorDoc) && (
                    <p className="text-[10px] text-[#C4453C]">Documento inválido.</p>
                  )}
                  {ehPj && (
                    <p className="text-[10px] text-[#616F7D]">
                      Pessoa jurídica: campos preenchidos via consulta oficial da Receita.
                    </p>
                  )}
                  {docDigitos.length === 11 && (
                    <p className="text-[10px] text-[#616F7D]">
                      Pessoa física (CPF): preencha nome e endereço manualmente.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Nome / Razão social *
                  </Label>
                  <Input
                    value={tomadorNome}
                    onChange={(e) => setTomadorNome(e.target.value)}
                    placeholder="Nome completo ou Razão Social"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">E-mail</Label>
                  <Input
                    type="email"
                    value={tomadorEmail}
                    onChange={(e) => setTomadorEmail(e.target.value)}
                    placeholder="email@cliente.com.br"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    value={tomadorTelefone}
                    onChange={(e) => setTomadorTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Endereço completo (linha do tomador)
                  </Label>
                  <Input
                    value={tomadorEndereco}
                    onChange={(e) => setTomadorEndereco(e.target.value)}
                    placeholder="Ex: Av. Brasil, 1500, Sala 102 - Centro"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Logradouro</Label>
                  <Input
                    value={tomadorLogradouro}
                    onChange={(e) => setTomadorLogradouro(e.target.value)}
                    placeholder="Rua, Avenida, etc."
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#2C3E50]">Número</Label>
                    <Input
                      value={tomadorNumero}
                      onChange={(e) => setTomadorNumero(e.target.value)}
                      placeholder="123"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#2C3E50]">Complemento</Label>
                    <Input
                      value={tomadorComplemento}
                      onChange={(e) => setTomadorComplemento(e.target.value)}
                      placeholder="Sala, Apto"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Bairro</Label>
                  <Input
                    value={tomadorBairro}
                    onChange={(e) => setTomadorBairro(e.target.value)}
                    placeholder="Bairro"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">CEP</Label>
                  <Input
                    value={tomadorCep}
                    onChange={(e) => setTomadorCep(e.target.value)}
                    placeholder="00000-000"
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Município</Label>
                  <Input
                    value={tomadorMunicipio}
                    onChange={(e) => setTomadorMunicipio(e.target.value)}
                    placeholder="Nome do município"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#2C3E50]">UF</Label>
                    <Input
                      value={tomadorUf}
                      onChange={(e) => setTomadorUf(e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="SP"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#2C3E50]">Código IBGE</Label>
                    <Input
                      value={tomadorCodigoMunicipio}
                      onChange={(e) => setTomadorCodigoMunicipio(e.target.value.replace(/\D/g, ''))}
                      maxLength={7}
                      placeholder="3548906"
                      className="text-xs font-mono"
                      title="Código do município com 7 dígitos (ex: 3548906 para São Pedro/SP)"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviço e valores */}
          <Card className="border-[#E3E6EA]">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-[#2C3E50]">
                2. Serviço e valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Serviço (LC 116) *</Label>
                  <Select value={servicoId} onValueChange={setServicoId}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.codigo_lc116} • {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Valor dos serviços (R$) *
                  </Label>
                  <Input
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Data de competência
                  </Label>
                  <Input
                    type="date"
                    value={dataCompetencia}
                    onChange={(e) => setDataCompetencia(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    ISS retido pelo tomador
                  </Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch checked={issRetido} onCheckedChange={setIssRetido} />
                    <span className="text-xs text-[#616F7D]">
                      {issRetido ? 'Retido' : 'Não retido'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Discriminação do serviço
                </Label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full text-xs rounded-md border border-[#DEE4EA] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2C3E50]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Observações</Label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full text-xs rounded-md border border-[#DEE4EA] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2C3E50]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo de impostos */}
        <div className="space-y-4">
          <Card className="border-[#E3E6EA] sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-[#2C3E50] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" /> Impostos calculados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Linha
                rotulo="Valor dos serviços"
                valor={formatMoedaNFSe(impostos.baseCalculo)}
                forte
              />
              <Linha
                rotulo={`ISS (${impostos.aliquotaIss}%)${issRetido ? ' • retido' : ''}`}
                valor={formatMoedaNFSe(impostos.valorIss)}
              />
              <div className="border-t border-[#E3E6EA] pt-2 mt-2 space-y-2">
                <Linha
                  rotulo={`IRRF (${impostos.aliquotaIrrf}%)${impostos.irrfDispensado ? ' • dispensado' : ''}`}
                  valor={formatMoedaNFSe(impostos.valorIrrf)}
                />
                <Linha
                  rotulo={`CSLL (${impostos.aliquotaCsll}%)${impostos.retencoesDispensadas ? ' • dispensada' : ''}`}
                  valor={formatMoedaNFSe(impostos.valorCsll)}
                />
                <Linha
                  rotulo={`COFINS (${impostos.aliquotaCofins}%)${impostos.retencoesDispensadas ? ' • dispensada' : ''}`}
                  valor={formatMoedaNFSe(impostos.valorCofins)}
                />
                <Linha
                  rotulo={`PIS (${impostos.aliquotaPis}%)${impostos.retencoesDispensadas ? ' • dispensado' : ''}`}
                  valor={formatMoedaNFSe(impostos.valorPis)}
                />
              </div>
              <div className="border-t border-[#E3E6EA] pt-2 mt-2">
                <Linha
                  rotulo="Total retenções federais"
                  valor={formatMoedaNFSe(impostos.totalRetencoesFederais)}
                />
              </div>
              <div className="border-t border-[#E3E6EA] pt-2 mt-2">
                <Linha
                  rotulo="Valor líquido"
                  valor={formatMoedaNFSe(impostos.valorLiquido)}
                  forte
                />
              </div>
              <p className="text-[10px] text-[#616F7D] pt-1">
                Retenções federais aplicadas apenas para tomador PJ. PIS/COFINS/CSLL só retidos
                quando o serviço individual ultrapassa R$ 215,00; IRRF, quando a retenção atinge R$
                10,00 (limites legais de dispensa). A NFS-e nunca gera financeiro — recebimentos
                continuam sendo lançados manualmente no orçamento.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleEmitir}
              disabled={enviando || !podeEnviar}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {enviando ? 'Enviando...' : 'Emitir NFS-e (enviar à Receita)'}
            </Button>
            <Button
              variant="outline"
              onClick={handleSalvarRascunho}
              disabled={enviando || !podeEnviar}
              className="text-xs h-9 border-[#2C3E50]/30 text-[#2C3E50]"
            >
              Salvar rascunho (RPS)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[#616F7D] ${forte ? 'font-semibold text-[#2C3E50]' : ''}`}>
        {rotulo}
      </span>
      <span className={`tabular-nums ${forte ? 'font-bold text-[#2C3E50]' : 'text-[#2C3E50]'}`}>
        {valor}
      </span>
    </div>
  )
}
