/**
 * Página NFS-e • Início (resumo + atalhos) — módulo incorporado ao painel Gesso Bettone.
 */
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus, ReceiptText, Settings, Certificate, AlertTriangle } from 'lucide-react'
import { nfseApi, type NFSeNota } from '@/services/nfseApi'
import { formatMoedaNFSe } from '@/services/nfse'

export const NfseInicioPage: React.FC = () => {
  const navigate = useNavigate()
  const [notas, setNotas] = useState<NFSeNota[] | null>(null)
  const [erro, setErro] = useState<string>('')

  useEffect(() => {
    nfseApi
      .listarNotas()
      .then(setNotas)
      .catch((e) => setErro(e?.message || 'Falha ao carregar notas.'))
  }, [])

  const autorizadas = (notas || []).filter((n) => n.status === 'autorizada')
  const totalAutorizadas = autorizadas.reduce((acc, n) => acc + (n.valor_servicos || 0), 0)
  const totalIss = autorizadas.reduce((acc, n) => acc + (n.valor_iss || 0), 0)
  const rascunhos = (notas || []).filter((n) => n.status === 'rps')
  const erros = (notas || []).filter((n) => n.status === 'rejeitada' || n.status === 'erro')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[#2C3E50]">NFS-e • Início</h1>
          <p className="text-xs text-[#616F7D] mt-1">
            Resumo das notas fiscais de serviço eletrônicas (padrão nacional da Receita Federal).
          </p>
        </div>
        <Button
          onClick={() => navigate('/painel/nfse/nova')}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Emitir nova NFS-e
        </Button>
      </div>

      {erro && (
        <Card className="border-[#C4453C]/40 bg-[#FBEFEE]">
          <CardContent className="p-4 flex items-start gap-2 text-xs text-[#8C2F28]">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível carregar o módulo NFS-e.</p>
              <p className="mt-1">
                {erro} — se for a primeira vez, rode o SQL{' '}
                <code className="font-mono">supabase/nfse_schema.sql</code> no Supabase (ver
                supabase/nfse/README.md).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Notas autorizadas',
            valor: String(autorizadas.length),
            cor: 'text-emerald-700',
          },
          {
            label: 'Serviços autorizados',
            valor: formatMoedaNFSe(totalAutorizadas),
            cor: 'text-[#2C3E50]',
          },
          { label: 'ISS total', valor: formatMoedaNFSe(totalIss), cor: 'text-[#2C3E50]' },
          { label: 'Rascunhos (RPS)', valor: String(rascunhos.length), cor: 'text-[#616F7D]' },
        ].map((c) => (
          <Card key={c.label} className="border-[#E3E6EA]">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#616F7D]">{c.label}</p>
              {notas === null ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <p className={`font-heading text-xl mt-1 ${c.cor}`}>{c.valor}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Últimas notas */}
      <Card className="border-[#E3E6EA]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-[#2C3E50] flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-[#D4AF37]" /> Últimas notas emitidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notas === null ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notas.length === 0 ? (
            <p className="text-xs text-[#616F7D] py-6 text-center">
              Nenhuma nota emitida ainda. Use “Emitir nova NFS-e” ou o botão “Emitir NFS-e” dentro
              de um orçamento.
            </p>
          ) : (
            <ul className="divide-y divide-[#E3E6EA]">
              {notas.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/painel/nfse/notas/${n.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs hover:bg-[#F4F6F8] px-2 -mx-2 rounded transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#2C3E50] shrink-0" />
                      <span className="truncate text-[#2C3E50] font-medium">
                        {n.numero_nfse
                          ? `NFS-e ${n.numero_nfse}`
                          : `RPS ${n.serie_rps}-${n.numero_rps}`}
                        {n.tomador_nome ? ` • ${n.tomador_nome}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="text-[#2C3E50]">{formatMoedaNFSe(n.valor_servicos)}</span>
                      <StatusBadge status={n.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            to: '/painel/nfse/servicos',
            label: 'Serviços',
            desc: 'Códigos LC 116 e alíquotas',
            icon: ReceiptText,
          },
          {
            to: '/painel/nfse/configuracoes',
            label: 'Configurações',
            desc: 'Dados da empresa e alíquotas',
            icon: Settings,
          },
          {
            to: '/painel/nfse/certificado',
            label: 'Certificado e sistema nacional',
            desc: 'Certificado A1 (.pfx), município e ambiente',
            icon: Certificate,
          },
        ].map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="border-[#E3E6EA] hover:border-[#D4AF37] transition-colors h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <a.icon className="w-5 h-5 text-[#D4AF37] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#2C3E50]">{a.label}</p>
                  <p className="text-[11px] text-[#616F7D] mt-0.5">{a.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {erros.length > 0 && (
        <Card className="border-[#C4453C]/40">
          <CardContent className="p-4 text-xs text-[#8C2F28]">
            <p className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {erros.length} nota(s) com erro/rejeição
            </p>
            <ul className="mt-2 space-y-1">
              {erros.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link to={`/painel/nfse/notas/${n.id}`} className="underline">
                    {n.numero_nfse ? `NFS-e ${n.numero_nfse}` : `RPS ${n.numero_rps}`}
                  </Link>{' '}
                  — {n.mensagem_erro || 'erro desconhecido'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    rps: { label: 'Rascunho (RPS)', cls: 'bg-[#EDF1F5] text-[#5B6470]' },
    enviando: { label: 'Enviando', cls: 'bg-amber-50 text-amber-700' },
    autorizada: { label: 'Autorizada', cls: 'bg-emerald-50 text-emerald-700' },
    rejeitada: { label: 'Rejeitada', cls: 'bg-[#FBEFEE] text-[#8C2F28]' },
    cancelada: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-600' },
    erro: { label: 'Erro', cls: 'bg-[#FBEFEE] text-[#8C2F28]' },
  }
  const item = map[status] || { label: status, cls: 'bg-[#EDF1F5] text-[#5B6470]' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.cls}`}>
      {item.label}
    </span>
  )
}
