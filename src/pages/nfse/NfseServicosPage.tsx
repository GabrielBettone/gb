/**
 * Página NFS-e • Serviços (LC 116) — lista/cadastro com alíquota de ISS e retenções.
 */
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, ReceiptText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { nfseApi, type NFSeServico } from '@/services/nfseApi'
import { SERVICOS_PRE_CADASTRADOS } from '@/services/nfse'

const vazio: Partial<NFSeServico> = {
  nome: '',
  codigo_lc116: '',
  descricao: '',
  aliquota_iss: 2,
  reter_irrf: false,
  reter_csll: false,
  reter_cofins: false,
  reter_pis: false,
  ativo: true,
}

export const NfseServicosPage: React.FC = () => {
  const { toast } = useToast()
  const [servicos, setServicos] = useState<NFSeServico[] | null>(null)
  const [open, setOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<NFSeServico>>(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const carregar = () => {
    nfseApi
      .listarServicos(false)
      .then(setServicos)
      .catch((e) =>
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar serviços',
          description: e?.message || 'Rode o SQL supabase/nfse_schema.sql no Supabase.',
        }),
      )
  }

  useEffect(carregar, [])

  const abrirNovo = () => {
    setForm(vazio)
    setEditandoId(null)
    setOpen(true)
  }

  const abrirEdicao = (s: NFSeServico) => {
    setForm({ ...s })
    setEditandoId(s.id)
    setOpen(true)
  }

  const salvar = async () => {
    if (!form.nome || !form.codigo_lc116) {
      toast({
        variant: 'destructive',
        title: 'Preencha nome e código LC 116',
        description: 'Ex.: código "7.04" para instalação de forros e drywall.',
      })
      return
    }
    setSalvando(true)
    try {
      if (editandoId) {
        await nfseApi.atualizarServico(editandoId, form)
      } else {
        await nfseApi.criarServico(form)
      }
      toast({ title: editandoId ? 'Serviço atualizado.' : 'Serviço criado.' })
      setOpen(false)
      carregar()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message })
    } finally {
      setSalvando(false)
    }
  }

  const alternarAtivo = async (s: NFSeServico) => {
    await nfseApi.atualizarServico(s.id, { ativo: !s.ativo })
    carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[#2C3E50]">NFS-e • Serviços</h1>
          <p className="text-xs text-[#616F7D] mt-1">
            Lista de serviços com código da LC 116/2003, alíquota de ISS e retenções federais.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo serviço
        </Button>
      </div>

      {/* Sugestões derivadas dos CNAEs (gesso/drywall) para agilizar o cadastro */}
      {servicos !== null && servicos.length === 0 && (
        <Card className="border-[#E3E6EA] bg-[#F4F6F8]">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-[#2C3E50] flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#D4AF37]" /> Sugestões para gesso/drywall (LC
              116)
            </p>
            <div className="flex flex-wrap gap-2">
              {SERVICOS_PRE_CADASTRADOS.map((s) => (
                <button
                  key={s.nome}
                  type="button"
                  onClick={() => {
                    setForm({ ...vazio, ...s, aliquota_iss: s.aliquota_iss_padrao })
                    setEditandoId(null)
                    setOpen(true)
                  }}
                  className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#2C3E50]/20 text-[#2C3E50] hover:bg-white hover:border-[#D4AF37] transition-colors"
                >
                  {s.codigo_lc116} • {s.nome}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#E3E6EA]">
        <CardContent className="p-0">
          {servicos === null ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E3E6EA] text-left text-[#616F7D]">
                    <th className="px-4 py-2.5 font-semibold">Serviço</th>
                    <th className="px-4 py-2.5 font-semibold">LC 116</th>
                    <th className="px-4 py-2.5 font-semibold">ISS (%)</th>
                    <th className="px-4 py-2.5 font-semibold">Retenções federais</th>
                    <th className="px-4 py-2.5 font-semibold">Ativo</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {servicos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#616F7D]">
                        Nenhum serviço cadastrado.
                      </td>
                    </tr>
                  )}
                  {servicos.map((s) => (
                    <tr key={s.id} className="border-b border-[#E3E6EA]/60 last:border-0">
                      <td className="px-4 py-2.5 text-[#2C3E50]">
                        <span className="font-medium">{s.nome}</span>
                        {s.descricao && (
                          <span className="block text-[11px] text-[#616F7D]">{s.descricao}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#2C3E50]">{s.codigo_lc116}</td>
                      <td className="px-4 py-2.5 text-[#2C3E50]">{s.aliquota_iss}%</td>
                      <td className="px-4 py-2.5 text-[#616F7D]">
                        {[
                          s.reter_irrf && 'IRRF',
                          s.reter_csll && 'CSLL',
                          s.reter_cofins && 'COFINS',
                          s.reter_pis && 'PIS',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Nenhuma'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Switch checked={s.ativo} onCheckedChange={() => alternarAtivo(s)} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => abrirEdicao(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal cadastro/edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#2C3E50]">
              {editandoId ? 'Editar serviço' : 'Novo serviço NFS-e'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Código da LC 116/2003 (lista anexa) e alíquota de ISS do município de incidência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#2C3E50]">Nome do serviço *</Label>
              <Input
                value={form.nome || ''}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Aplicação de forro de gesso"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Código LC 116 *</Label>
                <Input
                  value={form.codigo_lc116 || ''}
                  onChange={(e) => setForm({ ...form, codigo_lc116: e.target.value })}
                  placeholder="7.04"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Alíquota ISS (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.aliquota_iss ?? 2}
                  onChange={(e) => setForm({ ...form, aliquota_iss: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#2C3E50]">Descrição (DPS)</Label>
              <textarea
                value={form.descricao || ''}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={3}
                className="w-full text-xs rounded-md border border-[#DEE4EA] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2C3E50]"
                placeholder="Discriminação que irá na nota..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(
                [
                  ['reter_irrf', 'Reter IRRF'],
                  ['reter_csll', 'Reter CSLL'],
                  ['reter_cofins', 'Reter COFINS'],
                  ['reter_pis', 'Reter PIS'],
                ] as const
              ).map(([campo, rotulo]) => (
                <label key={campo} className="flex items-center gap-2 text-xs text-[#2C3E50]">
                  <Switch
                    checked={Boolean(form[campo])}
                    onCheckedChange={(v) => setForm({ ...form, [campo]: v })}
                  />
                  {rotulo}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={salvar}
              disabled={salvando}
              className="bg-[#2C3E50] text-[#D4AF37] hover:bg-[#1B2631] font-bold text-xs"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
