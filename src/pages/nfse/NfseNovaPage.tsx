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
import { FileText, Send, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeConfig, type NFSeNota, type NFSeServico } from '@/services/nfseApi'
import { calcularImpostos, formatMoedaNFSe, validarDocumento } from '@/services/nfse'
import type { Orcamento } from '@/types'
import { dataAdapter } from '@/lib/dataAdapter'

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

  // Formulário
  const [tomadorNome, setTomadorNome] = useState('')
  const [tomadorDoc, setTomadorDoc] = useState('')
  const [tomadorEmail, setTomadorEmail] = useState('')
  const [tomadorEndereco, setTomadorEndereco] = useState('')
  const [tomadorMunicipio, setTomadorMunicipio] = useState('')
  const [tomadorUf, setTomadorUf] = useState('SP')
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
          const orc = await dataAdapter.getFullList<Orcamento>('orcamentos', {
            filter: `id="${orcamentoId}"`,
          })
          if (ativo && orc[0]) preencherDoOrcamento(orc[0], servs)
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

  function preencherDoOrcamento(orc: Orcamento, servs: NFSeServico[]) {
    setTomadorNome(orc.cliente || '')
    const doc = (
      (orc as any).cliente_documento ||
      orc.expand?.cliente_cadastrado?.documento ||
      ''
    ).toString()
    setTomadorDoc(doc)
    setTomadorEmail(orc.expand?.cliente_cadastrado?.email || '')
    setTomadorEndereco(orc.expand?.cliente_cadastrado?.endereco || '')
    setTomadorMunicipio(orc.cidade || '')
    setTomadorUf((orc.cidade || '').includes('/SP') || orc.cidade?.includes('SP') ? 'SP' : 'SP')
    setValor(String(orc.valor_total || 0))
    setDescricao(
      orc.produto_principal
        ? `Serviços de ${orc.produto_principal} conforme orçamento ${orc.numero}`
        : `Serviços conforme orçamento ${orc.numero}`,
    )
    setObservacoes(orc.observacoes || '')
    const sugerido = servs[0]?.id
    if (sugerido) setServicoId(sugerido)
  }

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) || null,
    [servicos, servicoId],
  )

  const docDigitos = tomadorDoc.replace(/\D/g, '')
  const ehPj = docDigitos.length === 14
  const valorNumero = Number(valor.replace(/\./g, '').replace(',', '.')) || 0

  const impostos = useMemo(() => {
    const aliquotaIss = servicoSelecionado?.aliquota_iss ?? config?.aliquota_iss_padrao ?? 2
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
    if (notaId) {
      await nfseApi.atualizarNota(notaId, {
        tomador_nome: tomadorNome,
        tomador_documento: tomadorDoc,
        tomador_email: tomadorEmail,
        tomador_endereco: tomadorEndereco,
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
      } as any)
      const nota = await nfseApi.obterNota(notaId)
      return nota as NFSeNota
    }
    const nota = await nfseApi.criarNotaAvulsa({
      tomador_nome: tomadorNome,
      tomador_documento: tomadorDoc,
      tomador_email: tomadorEmail,
      tomador_endereco: tomadorEndereco,
      tomador_municipio: tomadorMunicipio,
      tomador_uf: tomadorUf,
      servico: servicoId,
      descricao_servico: descricao,
      observacoes,
      valor_servicos: valorNumero,
      aliquota_iss: impostos.aliquotaIss,
      iss_retido: issRetido,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      data_competencia: dataCompetencia,
      codigo_lc116: servicoSelecionado?.codigo_lc116 || '',
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
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-[#2C3E50]">
                1. Tomador do serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Nome / Razão social *
                  </Label>
                  <Input
                    value={tomadorNome}
                    onChange={(e) => setTomadorNome(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">CPF / CNPJ *</Label>
                  <Input
                    value={tomadorDoc}
                    onChange={(e) => setTomadorDoc(e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs font-mono"
                  />
                  {docDigitos.length > 0 && !validarDocumento(tomadorDoc) && (
                    <p className="text-[10px] text-[#C4453C]">Documento inválido.</p>
                  )}
                  {ehPj && (
                    <p className="text-[10px] text-[#616F7D]">
                      Pessoa jurídica: retenções federais aplicáveis.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">E-mail</Label>
                  <Input
                    value={tomadorEmail}
                    onChange={(e) => setTomadorEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Endereço</Label>
                  <Input
                    value={tomadorEndereco}
                    onChange={(e) => setTomadorEndereco(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Município</Label>
                  <Input
                    value={tomadorMunicipio}
                    onChange={(e) => setTomadorMunicipio(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#2C3E50]">UF</Label>
                  <Input
                    value={tomadorUf}
                    onChange={(e) => setTomadorUf(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="text-xs"
                  />
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
                  rotulo={`IRRF (${impostos.aliquotaIrrf}%)`}
                  valor={formatMoedaNFSe(impostos.valorIrrf)}
                />
                <Linha
                  rotulo={`CSLL (${impostos.aliquotaCsll}%)`}
                  valor={formatMoedaNFSe(impostos.valorCsll)}
                />
                <Linha
                  rotulo={`COFINS (${impostos.aliquotaCofins}%)`}
                  valor={formatMoedaNFSe(impostos.valorCofins)}
                />
                <Linha
                  rotulo={`PIS (${impostos.aliquotaPis}%)`}
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
                Retenções federais aplicadas apenas para tomador PJ. A NFS-e nunca gera financeiro —
                recebimentos continuam sendo lançados manualmente no orçamento.
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
