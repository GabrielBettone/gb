/**
 * Página NFS-e • Notas emitidas — lista com status de envio e valores.
 */
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeNota } from '@/services/nfseApi'
import { formatMoedaNFSe } from '@/services/nfse'
import { StatusBadge } from './NfseInicioPage'

export const NfseNotasPage: React.FC = () => {
  const { toast } = useToast()
  const [notas, setNotas] = useState<NFSeNota[] | null>(null)
  const [consultando, setConsultando] = useState<string>('')

  const carregar = () => {
    nfseApi
      .listarNotas()
      .then(setNotas)
      .catch((e) =>
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar notas',
          description: e?.message || 'Verifique o SQL supabase/nfse_schema.sql.',
        }),
      )
  }

  useEffect(carregar, [])

  const consultar = async (n: NFSeNota) => {
    setConsultando(n.id)
    try {
      const res = await nfseApi.consultarNota(n.id)
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Consulta falhou', description: res.erro })
      } else {
        toast({ title: 'Situação consultada no sistema nacional.' })
      }
    } finally {
      setConsultando('')
      carregar()
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[#2C3E50]">NFS-e • Notas emitidas</h1>
          <p className="text-xs text-[#616F7D] mt-1">
            Status de envio de cada nota ao sistema nacional da Receita Federal.
          </p>
        </div>
        <Button
          onClick={() => (window.location.href = '/painel/nfse/nova')}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova NFS-e
        </Button>
      </div>

      <Card className="border-[#E3E6EA]">
        <CardContent className="p-0">
          {notas === null ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notas.length === 0 ? (
            <p className="text-xs text-[#616F7D] py-10 text-center">Nenhuma nota emitida ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E3E6EA] text-left text-[#616F7D]">
                    <th className="px-4 py-2.5 font-semibold">Nota / RPS</th>
                    <th className="px-4 py-2.5 font-semibold">Tomador</th>
                    <th className="px-4 py-2.5 font-semibold">Competência</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Serviços</th>
                    <th className="px-4 py-2.5 font-semibold text-right">ISS</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-[#E3E6EA]/60 last:border-0 hover:bg-[#F4F6F8]"
                    >
                      <td className="px-4 py-2.5 font-medium text-[#2C3E50]">
                        {n.numero_nfse
                          ? `NFS-e ${n.numero_nfse}`
                          : `RPS ${n.serie_rps}-${n.numero_rps}`}
                        {n.orcamento_numero && (
                          <span className="block text-[10px] text-[#616F7D]">
                            Orçamento {n.orcamento_numero}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#2C3E50]">{n.tomador_nome}</td>
                      <td className="px-4 py-2.5 text-[#616F7D]">
                        {n.data_competencia?.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#2C3E50]">
                        {formatMoedaNFSe(n.valor_servicos)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#616F7D]">
                        {formatMoedaNFSe(n.valor_iss)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {(n.status === 'rps' ||
                          n.status === 'erro' ||
                          n.status === 'rejeitada') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs mr-1 border-[#2C3E50]/30 text-[#2C3E50]"
                            disabled={consultando === n.id}
                            onClick={() => consultar(n)}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${consultando === n.id ? 'animate-spin' : ''}`}
                            />
                          </Button>
                        )}
                        <Link
                          to={`/painel/nfse/notas/${n.id}`}
                          className="inline-flex items-center gap-1 text-[#2C3E50] hover:text-[#D4AF37] font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" /> Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
