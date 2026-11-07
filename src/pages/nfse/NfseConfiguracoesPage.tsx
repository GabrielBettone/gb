/**
 * Página NFS-e • Configurações — dados da empresa (emitente) e alíquotas padrão.
 */
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeEmitente } from '@/services/nfseApi'
import { validarDocumento } from '@/services/nfse'

export const NfseConfiguracoesPage: React.FC = () => {
  const { toast } = useToast()
  const [emitente, setEmitente] = useState<NFSeEmitente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    nfseApi
      .obterEmitente()
      .then(setEmitente)
      .catch((e) =>
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar emitente',
          description: e?.message || 'Verifique o SQL supabase/nfse_schema.sql.',
        }),
      )
      .finally(() => setCarregando(false))
  }, [])

  const salvar = async () => {
    if (!emitente) return
    if (emitente.cnpj && !validarDocumento(emitente.cnpj)) {
      toast({ variant: 'destructive', title: 'CNPJ inválido.' })
      return
    }
    setSalvando(true)
    try {
      const atualizado = await nfseApi.atualizarEmitente({
        razao_social: emitente.razao_social,
        nome_fantasia: emitente.nome_fantasia || '',
        cnpj: emitente.cnpj,
        inscricao_municipal: emitente.inscricao_municipal || '',
        email: emitente.email || '',
        telefone: emitente.telefone || '',
        logradouro: emitente.logradouro || '',
        numero: emitente.numero || '',
        complemento: emitente.complemento || '',
        bairro: emitente.bairro || '',
        cep: emitente.cep || '',
        municipio: emitente.municipio || 'São Pedro',
        uf: emitente.uf || 'SP',
        codigo_municipio_ibge: emitente.codigo_municipio_ibge || '3550407',
      })
      setEmitente(atualizado)
      toast({ title: 'Dados da empresa atualizados.' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <Skeleton className="h-64 w-full" />
  if (!emitente)
    return <p className="text-sm text-[#616F7D]">Emitente não encontrado — rode o SQL de seed.</p>

  const set = (campo: keyof NFSeEmitente, valor: string) =>
    setEmitente({ ...emitente, [campo]: valor })

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl text-[#2C3E50]">NFS-e • Configurações</h1>
        <p className="text-xs text-[#616F7D] mt-1">
          Dados do prestador que irão na DPS (município de incidência do ISS: São Pedro/SP — IBGE
          3550407, definido na tela de Certificado e sistema nacional).
        </p>
      </div>

      <Card className="border-[#E3E6EA]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-[#2C3E50]">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo
              label="Razão social *"
              value={emitente.razao_social}
              onChange={(v) => set('razao_social', v)}
            />
            <Campo
              label="Nome fantasia"
              value={emitente.nome_fantasia || ''}
              onChange={(v) => set('nome_fantasia', v)}
            />
            <Campo label="CNPJ *" value={emitente.cnpj} onChange={(v) => set('cnpj', v)} mono />
            <Campo
              label="Inscrição municipal"
              value={emitente.inscricao_municipal || ''}
              onChange={(v) => set('inscricao_municipal', v)}
              mono
            />
            <Campo label="E-mail" value={emitente.email || ''} onChange={(v) => set('email', v)} />
            <Campo
              label="Telefone"
              value={emitente.telefone || ''}
              onChange={(v) => set('telefone', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E3E6EA]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-[#2C3E50]">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Campo
              label="Logradouro"
              value={emitente.logradouro || ''}
              onChange={(v) => set('logradouro', v)}
            />
            <Campo
              label="Número"
              value={emitente.numero || ''}
              onChange={(v) => set('numero', v)}
            />
            <Campo
              label="Complemento"
              value={emitente.complemento || ''}
              onChange={(v) => set('complemento', v)}
            />
            <Campo
              label="Bairro"
              value={emitente.bairro || ''}
              onChange={(v) => set('bairro', v)}
            />
            <Campo label="CEP" value={emitente.cep || ''} onChange={(v) => set('cep', v)} mono />
            <Campo
              label="Município / UF"
              value={`${emitente.municipio || 'São Pedro'} / ${emitente.uf || 'SP'}`}
              onChange={(v) => {
                const [m, u] = v.split('/')
                if (m) set('municipio', m.trim())
                if (u) set('uf', u.trim())
              }}
            />
          </div>
          <p className="text-[10px] text-[#616F7D]">
            Município/UF do emitente (São Pedro/SP) e as alíquotas padrão por serviço são mantidas
            nas demais telas — serviço a serviço, ou no cadastro do serviço.
          </p>
        </CardContent>
      </Card>

      <Button
        onClick={salvar}
        disabled={salvando}
        className="bg-[#2C3E50] text-[#D4AF37] hover:bg-[#1B2631] font-bold text-xs h-9"
      >
        {salvando ? 'Salvando...' : 'Salvar dados da empresa'}
      </Button>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-[#2C3E50]">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-xs ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}
