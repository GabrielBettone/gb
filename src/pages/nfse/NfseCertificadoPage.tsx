/**
 * Página NFS-e • Certificado e sistema nacional — upload do A1 (.pfx) com senha,
 * município de incidência do ISS e ambiente (homologação/produção).
 */
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { KeyRound, ShieldCheck, UploadCloud } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeCertStatus, type NFSeConfig } from '@/services/nfseApi'

export const NfseCertificadoPage: React.FC = () => {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [config, setConfig] = useState<NFSeConfig | null>(null)
  const [cert, setCert] = useState<
    (NFSeCertStatus & { instalado?: boolean; vencido?: boolean; titular?: string }) | null
  >(null)
  const [carregando, setCarregando] = useState(true)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([nfseApi.obterConfig(), nfseApi.statusCertificado()])
      .then(([c, s]) => {
        setConfig(c)
        setCert({ ...s, instalado: (s as any).instalado ?? (s as any).existe ?? false })
      })
      .catch((e) =>
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar configuração',
          description: e?.message || 'Verifique o SQL supabase/nfse_schema.sql.',
        }),
      )
      .finally(() => setCarregando(false))
  }, [])

  const salvarAmbiente = async (producao: boolean) => {
    if (!config) return
    const atualizada = await nfseApi.atualizarConfig({
      ambiente: producao ? 'producao' : 'homologacao',
    })
    setConfig(atualizada)
    toast({
      title: `Ambiente alterado para ${producao ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}.`,
      description: producao
        ? 'Atenção: notas enviadas neste ambiente têm valor fiscal real.'
        : 'Notas de teste sem valor fiscal.',
    })
  }

  const salvarMunicipio = async (valor: string) => {
    if (!config) return
    const atualizada = await nfseApi.atualizarConfig({ municipio_iss: valor })
    setConfig(atualizada)
    toast({ title: 'Município de incidência do ISS atualizado.' })
  }

  const enviarCertificado = async () => {
    if (!arquivo || !senha) {
      toast({
        variant: 'destructive',
        title: 'Selecione o arquivo .pfx e informe a senha',
        description: 'A senha é cifrada no servidor e nunca fica no navegador.',
      })
      return
    }
    setSalvando(true)
    try {
      const res = await nfseApi.enviarCertificado(arquivo, senha)
      if (res.ok) {
        toast({
          title: 'Certificado instalado',
          description: res.vencido
            ? `Atenção: venceu em ${res.valido_ate}. Renove antes de emitir.`
            : `Válido até ${res.valido_ate}.`,
        })
        setSenha('')
        setArquivo(null)
        if (inputRef.current) inputRef.current.value = ''
        const s = await nfseApi.statusCertificado()
        setCert({ ...s, instalado: (s as any).instalado ?? (s as any).existe ?? true })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao processar certificado',
          description: res.erro,
        })
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no upload',
        description: e?.message || 'Verifique se a Edge Function foi implantada.',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl text-[#2C3E50]">Certificado e sistema nacional</h1>
        <p className="text-xs text-[#616F7D] mt-1">
          O certificado A1 é processado somente na Edge Function (mTLS com a Receita). Senha cifrada
          no servidor; chaves nunca são logadas nem retornadas ao navegador.
        </p>
      </div>

      {/* Certificado A1 */}
      <Card className="border-[#E3E6EA]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-[#2C3E50] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#D4AF37]" /> Certificado A1 (e-CNPJ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cert?.instalado && (
            <div
              className={`text-xs rounded-md px-3 py-2 ${
                cert.vencido ? 'bg-[#FBEFEE] text-[#8C2F28]' : 'bg-[#EFF7EF] text-[#2F6B33]'
              }`}
            >
              {cert.vencido ? '⚠ VENCIDO' : '✓ Instalado'} — vence em {cert.valido_ate}
              {cert.titular && ` • ${cert.titular}`}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2C3E50]">Arquivo .pfx</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-xs rounded-md border border-dashed border-[#2C3E50]/30 px-3 py-2.5 text-[#616F7D] hover:border-[#D4AF37]">
                  <UploadCloud className="w-4 h-4" />
                  {arquivo ? arquivo.name : 'Clique para selecionar o arquivo .pfx'}
                </div>
              </label>
            </div>
          </div>
          <div className="space-y-1 max-w-xs">
            <Label className="text-xs font-semibold text-[#2C3E50]">Senha do certificado</Label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="text-xs"
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={enviarCertificado}
            disabled={salvando}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />{' '}
            {salvando ? 'Processando...' : 'Instalar certificado'}
          </Button>
        </CardContent>
      </Card>

      {/* Ambiente e município */}
      <Card className="border-[#E3E6EA]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-[#2C3E50]">
            Sistema nacional NFS-e
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 max-w-md">
            <div>
              <p className="text-xs font-semibold text-[#2C3E50]">Ambiente de PRODUÇÃO</p>
              <p className="text-[10px] text-[#616F7D]">
                {config?.ambiente === 'producao'
                  ? 'Ativo — envios reais com valor fiscal.'
                  : 'Desativado — tudo vai para homologação.'}
              </p>
            </div>
            <Switch
              checked={config?.ambiente === 'producao'}
              onCheckedChange={salvarAmbiente}
              disabled={!config}
            />
          </div>
          <div className="space-y-1 max-w-md">
            <Label className="text-xs font-semibold text-[#2C3E50]">
              Município de incidência do ISS
            </Label>
            <Input
              value={config?.municipio_iss || ''}
              onChange={(e) =>
                setConfig(config ? { ...config, municipio_iss: e.target.value } : config)
              }
              onBlur={(e) =>
                e.target.value &&
                e.target.value !== config?.municipio_iss &&
                salvarMunicipio(e.target.value)
              }
              className="text-xs"
              placeholder="São Pedro/SP — IBGE 3550407"
            />
            <p className="text-[10px] text-[#616F7D]">Padrão: São Pedro/SP (IBGE 3550407).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
