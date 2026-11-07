/**
 * Página NFS-e • Detalhes da nota — impostos, tomador, retorno do sistema
 * nacional e XML da DPS/NFS-e para baixar.
 */
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Download, RefreshCw, Send, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeNota } from '@/services/nfseApi'
import { formatMoedaNFSe } from '@/services/nfse'
import { StatusBadge } from './NfseInicioPage'

export const NfseDetalhePage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nota, setNota] = useState<NFSeNota | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acao, setAcao] = useState(false)
  const [cancelar, setCancelar] = useState(false)

  const carregar = () => {
    if (!id)
      return nfseApi
        .obterNota(id)
        .then(setNota)
        .catch((e) =>
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar nota',
            description: e?.message,
          }),
        )
        .finally(() => setCarregando(false))
  }

  useEffect(() => {
    carregar()
  }, [id])

  const baixarXml = (xml: string, nome: string) => {
    if (!xml) return
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleEnviar = async () => {
    if (!id) return
    setAcao(true)
    try {
      const res = await nfseApi.enviarNota(id)
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Envio falhou', description: res.erro })
        await nfseApi.atualizarNota(id, {
          status: 'erro',
          mensagem_erro: res.erro || 'Falha no envio.',
        } as any)
        carregar()
      } else {
        toast({ title: 'DPS enviada ao sistema nacional.' })
        await nfseApi.atualizarNota(id, { status: 'enviando' } as any)
        carregar()
      }
    } finally {
      setAcao(false)
    }
  }

  const handleConsultar = async () => {
    if (!id) return
    setAcao(true)
    try {
      const res = await nfseApi.consultarNota(id)
      if (!res.ok)
        toast({ variant: 'destructive', title: 'Consulta falhou', description: res.erro })
      else toast({ title: 'Situação atualizada do sistema nacional.' })
      carregar()
    } finally {
      setAcao(false)
    }
  }

  const handleCancelar = async () => {
    if (!id || !nota) return
    setCancelar(false)
    setAcao(true)
    try {
      // Cancelamento no padrão nacional é uma DP de evento sobre a NFS-e autorizada.
      await nfseApi.atualizarNota(id, {
        status: 'cancelada',
        mensagem_erro: 'Cancelamento solicitado localmente (envie o evento pela Edge Function).',
      } as any)
      const res = await nfseApi.consultarNota(id)
      toast(
        res.ok
          ? { title: 'Cancelamento enviado / situação atualizada.' }
          : { variant: 'destructive', title: 'Cancelamento não confirmado', description: res.erro },
      )
      carregar()
    } finally {
      setAcao(false)
    }
  }

  if (carregando) return <Skeleton className="h-64 w-full" />
  if (!nota)
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#616F7D]">Nota não encontrada.</p>
        <Link to="/painel/nfse/notas" className="text-xs text-[#2C3E50] underline">
          Voltar para notas
        </Link>
      </div>
    )

  const podeEnviar = nota.status === 'rps' || nota.status === 'erro' || nota.status === 'rejeitada'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/painel/nfse/notas')}
            className="h-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-heading text-xl text-[#2C3E50]">
              {nota.numero_nfse
                ? `NFS-e nº ${nota.numero_nfse}`
                : `RPS ${nota.serie_rps}-${nota.numero_rps}`}
            </h1>
            <p className="text-xs text-[#616F7D] mt-0.5">
              Ambiente: {nota.ambiente === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'} •{' '}
              {nota.data_competencia?.split('-').reverse().join('/')}
            </p>
          </div>
        </div>
        <StatusBadge status={nota.status} />
      </div>

      {nota.mensagem_erro && (
        <Card className="border-[#C4453C]/40 bg-[#FBEFEE]">
          <CardContent className="p-4 text-xs text-[#8C2F28] whitespace-pre-line">
            <p className="font-semibold mb-1">Erro retornado pelo sistema nacional:</p>
            {nota.mensagem_erro}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#E3E6EA]">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm text-[#2C3E50]">Tomador</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-[#2C3E50]">
            <p className="font-semibold">{nota.tomador_nome}</p>
            <p className="font-mono">{nota.tomador_documento}</p>
            {nota.tomador_email && <p>{nota.tomador_email}</p>}
            {(nota.tomador_endereco || nota.tomador_municipio) && (
              <p className="text-[#616F7D]">
                {[
                  nota.tomador_endereco,
                  nota.tomador_municipio && `${nota.tomador_municipio}/${nota.tomador_uf}`,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E3E6EA]">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm text-[#2C3E50]">Serviço</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-[#2C3E50]">
            <p>
              <span className="text-[#616F7D]">LC 116:</span>{' '}
              <span className="font-mono">{nota.codigo_lc116 || '—'}</span>
            </p>
            <p className="whitespace-pre-line">{nota.descricao_servico}</p>
            {nota.observacoes && (
              <p className="text-[#616F7D] whitespace-pre-line">{nota.observacoes}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E3E6EA]">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm text-[#2C3E50]">
              Valores e impostos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Linha rotulo="Serviços" valor={formatMoedaNFSe(nota.valor_servicos)} />
            <Linha
              rotulo={`ISS (${nota.aliquota_iss}%)${nota.iss_retido ? ' retido' : ''}`}
              valor={formatMoedaNFSe(nota.valor_iss)}
            />
            <Linha rotulo="IRRF" valor={formatMoedaNFSe(nota.valor_irrf)} />
            <Linha rotulo="CSLL" valor={formatMoedaNFSe(nota.valor_csll)} />
            <Linha rotulo="COFINS" valor={formatMoedaNFSe(nota.valor_cofins)} />
            <Linha rotulo="PIS" valor={formatMoedaNFSe(nota.valor_pis)} />
          </CardContent>
        </Card>

        <Card className="border-[#E3E6EA]">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm text-[#2C3E50]">
              Retorno do sistema nacional
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-[#2C3E50]">
            <Linha rotulo="Protocolo" valor={nota.protocolo || '—'} />
            <Linha rotulo="Nº NFS-e" valor={nota.numero_nfse || '—'} />
            <Linha
              rotulo="Autorizada em"
              valor={
                nota.data_autorizacao
                  ? new Date(nota.data_autorizacao).toLocaleString('pt-BR')
                  : '—'
              }
            />
            {nota.xml_nfse && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-8 border-[#2C3E50]/30 text-[#2C3E50]"
                onClick={() => baixarXml(nota.xml_nfse, `nfse-${nota.numero_nfse || nota.id}.xml`)}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar XML da NFS-e
              </Button>
            )}
            {nota.xml_dps && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 text-xs h-8 border-[#2C3E50]/30 text-[#2C3E50]"
                onClick={() =>
                  baixarXml(nota.xml_dps, `dps-${nota.serie_rps}-${nota.numero_rps}.xml`)
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar XML da DPS
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {podeEnviar && (
          <Button
            onClick={handleEnviar}
            disabled={acao}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> {acao ? 'Enviando...' : 'Enviar DPS à Receita'}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleConsultar}
          disabled={acao}
          className="text-xs h-9 border-[#2C3E50]/30 text-[#2C3E50]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Consultar situação
        </Button>
        {nota.status === 'autorizada' && (
          <Button
            variant="outline"
            onClick={() => setCancelar(true)}
            disabled={acao}
            className="text-xs h-9 border-[#C4453C]/40 text-[#C4453C] hover:bg-[#FBEFEE]"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancelar nota
          </Button>
        )}
      </div>

      <AlertDialog open={cancelar} onOpenChange={setCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Cancelar NFS-e {nota.numero_nfse}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              O cancelamento será solicitado ao sistema nacional. Confirme o prazo do município
              (geralmente até 24h–48h após a autorização).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancelar()
              }}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#616F7D]">{rotulo}</span>
      <span className="text-[#2C3E50] tabular-nums font-medium text-right break-all">{valor}</span>
    </div>
  )
}
