import React, { useState, useEffect } from 'react'
import type { OrcamentoConfiguracao, UnidadeMedida } from '@/types'
import {
  obterConfiguracoesOrcamento,
  salvarConfiguracoesOrcamento,
} from '@/services/orcamentoModulo'
import {
  listarUnidadesMedida,
  criarUnidadeMedida,
  atualizarUnidadeMedida,
  excluirUnidadeMedida,
} from '@/services/unidadesMedida'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save,
  Building2,
  ShieldCheck,
  AlertCircle,
  Ruler,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AbaConfiguracoes: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [configId, setConfigId] = useState('')

  // Campos
  const [razaoSocial, setRazaoSocial] = useState('Gesso Bettone Comércio e Instalações Eireli')
  const [nomeFantasia, setNomeFantasia] = useState('Gesso Bettone')
  const [linhaDescritiva, setLinhaDescritiva] = useState('')
  const [cnpj, setCnpj] = useState('32.185.940/0001-72')
  const [cnpjValido, setCnpjValido] = useState(true)
  const [exibirCnpjPadrao, setExibirCnpjPadrao] = useState(true)
  const [compromissoTexto, setCompromissoTexto] = useState('')
  const [telefone, setTelefone] = useState('(19) 99767-1189')
  const [email, setEmail] = useState('contato@gessobettone.com.br')
  const [endereco, setEndereco] = useState('Rua Valentim Amaral, 412 - Centro')
  const [cidade, setCidade] = useState('São Pedro/SP')

  // Unidades de Medida
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [modalUnidadeOpen, setModalUnidadeOpen] = useState(false)
  const [salvandoUnidade, setSalvandoUnidade] = useState(false)
  const [unidadeEditando, setUnidadeEditando] = useState<UnidadeMedida | null>(null)
  const [unidadeParaExcluir, setUnidadeParaExcluir] = useState<UnidadeMedida | null>(null)
  const [excluindoUnidade, setExcluindoUnidade] = useState(false)

  // Form de Unidade
  const [formUnidadeNome, setFormUnidadeNome] = useState('')
  const [formUnidadeSigla, setFormUnidadeSigla] = useState('')
  const [formUnidadeMetodo, setFormUnidadeMetodo] = useState<'AxB' | '(A+B)x2' | 'livre' | string>(
    'AxB',
  )
  const [formUnidadeMetodoCustom, setFormUnidadeMetodoCustom] = useState('')
  const [formUnidadeOrdem, setFormUnidadeOrdem] = useState<number>(0)
  const [formUnidadeAtivo, setFormUnidadeAtivo] = useState(true)

  // Validador simples de CNPJ (14 dígitos)
  const validarCNPJ = (val: string) => {
    const limpo = val.replace(/\D/g, '')
    if (limpo.length === 0) return true // Vazio permitido
    return limpo.length === 14
  }

  useEffect(() => {
    async function carregar() {
      try {
        const cfg = await obterConfiguracoesOrcamento()
        if (cfg) {
          setConfigId(cfg.id)
          setRazaoSocial(cfg.razao_social || 'Gesso Bettone Comércio e Instalações Eireli')
          setNomeFantasia(cfg.nome_fantasia || 'Gesso Bettone')
          setLinhaDescritiva(cfg.linha_descritiva || '')
          setCnpj(cfg.cnpj || '32.185.940/0001-72')
          setExibirCnpjPadrao(cfg.exibir_cnpj_padrao ?? true)
          const comp = Array.isArray(cfg.nosso_compromisso)
            ? cfg.nosso_compromisso.join('\n')
            : typeof cfg.nosso_compromisso === 'string'
              ? cfg.nosso_compromisso
              : ''
          setCompromissoTexto(comp)
          setTelefone(cfg.telefone || '(19) 99767-1189')
          setEmail(cfg.email || 'contato@gessobettone.com.br')
          setEndereco(cfg.endereco || 'Rua Valentim Amaral, 412 - Centro')
          setCidade(cfg.cidade || 'São Pedro/SP')
        }
      } catch (e: any) {
        console.error('Erro ao carregar configurações:', e)
      } finally {
        setLoading(false)
      }
    }

    carregarUnidades()
    carregar()
  }, [])

  const carregarUnidades = async () => {
    setLoadingUnidades(true)
    try {
      const lista = await listarUnidadesMedida(false)
      setUnidades(lista)
    } catch (err) {
      console.error('Erro ao carregar unidades de medida:', err)
    } finally {
      setLoadingUnidades(false)
    }
  }

  const abrirNovaUnidade = () => {
    setUnidadeEditando(null)
    setFormUnidadeNome('')
    setFormUnidadeSigla('')
    setFormUnidadeMetodo('AxB')
    setFormUnidadeMetodoCustom('')
    setFormUnidadeOrdem(unidades.length + 1)
    setFormUnidadeAtivo(true)
    setModalUnidadeOpen(true)
  }

  const abrirEdicaoUnidade = (u: UnidadeMedida) => {
    setUnidadeEditando(u)
    setFormUnidadeNome(u.nome)
    setFormUnidadeSigla(u.sigla)
    const m = (u.metodo_calculo || '').trim()
    if (!m) {
      setFormUnidadeMetodo('livre')
      setFormUnidadeMetodoCustom('')
    } else if (m === 'AxB' || m.toUpperCase() === 'AXB') {
      setFormUnidadeMetodo('AxB')
      setFormUnidadeMetodoCustom('')
    } else if (m === '(A+B)x2' || m === '(a+b)x2') {
      setFormUnidadeMetodo('(A+B)x2')
      setFormUnidadeMetodoCustom('')
    } else {
      setFormUnidadeMetodo('custom')
      setFormUnidadeMetodoCustom(m)
    }
    setFormUnidadeOrdem(u.ordem ?? 0)
    setFormUnidadeAtivo(u.ativo ?? true)
    setModalUnidadeOpen(true)
  }

  const handleSalvarUnidade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formUnidadeNome.trim() || !formUnidadeSigla.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe o nome e a sigla da unidade de medida.',
      })
      return
    }

    let metodoFinal = ''
    if (formUnidadeMetodo === 'AxB') metodoFinal = 'AxB'
    else if (formUnidadeMetodo === '(A+B)x2') metodoFinal = '(A+B)x2'
    else if (formUnidadeMetodo === 'custom') metodoFinal = formUnidadeMetodoCustom.trim()
    else metodoFinal = '' // 'livre'

    setSalvandoUnidade(true)
    try {
      if (unidadeEditando) {
        await atualizarUnidadeMedida(unidadeEditando.id, {
          nome: formUnidadeNome.trim(),
          sigla: formUnidadeSigla.trim(),
          metodo_calculo: metodoFinal,
          ordem: Number(formUnidadeOrdem) || 0,
          ativo: formUnidadeAtivo,
        })
        toast({
          title: 'Unidade atualizada',
          description: `A unidade "${formUnidadeSigla}" foi salva com sucesso.`,
        })
      } else {
        await criarUnidadeMedida({
          nome: formUnidadeNome.trim(),
          sigla: formUnidadeSigla.trim(),
          metodo_calculo: metodoFinal,
          ordem: Number(formUnidadeOrdem) || unidades.length + 1,
          ativo: formUnidadeAtivo,
          padrao: false,
        })
        toast({
          title: 'Unidade cadastrada',
          description: `A nova unidade "${formUnidadeSigla}" foi criada com sucesso.`,
        })
      }
      setModalUnidadeOpen(false)
      carregarUnidades()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar unidade',
        description: err?.message || 'Não foi possível salvar a unidade de medida.',
      })
    } finally {
      setSalvandoUnidade(false)
    }
  }

  const handleExcluirUnidade = async () => {
    if (!unidadeParaExcluir) return
    setExcluindoUnidade(true)
    try {
      await excluirUnidadeMedida(unidadeParaExcluir.id)
      toast({
        title: 'Unidade excluída',
        description: `A unidade "${unidadeParaExcluir.sigla}" foi removida.`,
      })
      setUnidadeParaExcluir(null)
      carregarUnidades()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir unidade',
        description: err?.message || 'Não foi possível excluir a unidade.',
      })
    } finally {
      setExcluindoUnidade(false)
    }
  }

  const handleCnpjChange = (val: string) => {
    setCnpj(val)
    setCnpjValido(validarCNPJ(val))
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cnpj && !validarCNPJ(cnpj)) {
      toast({
        variant: 'destructive',
        title: 'CNPJ inválido',
        description: 'O CNPJ deve conter 14 dígitos (ex.: 00.000.000/0000-00).',
      })
      return
    }

    const compromissoArray = compromissoTexto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    setSalvando(true)
    try {
      const salvas = await salvarConfiguracoesOrcamento({
        id: configId || undefined,
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim(),
        linha_descritiva: linhaDescritiva.trim(),
        cnpj: cnpj.trim(),
        exibir_cnpj_padrao: exibirCnpjPadrao,
        nosso_compromisso: compromissoArray,
        telefone: telefone.trim(),
        email: email.trim(),
        endereco: endereco.trim(),
        cidade: cidade.trim(),
      })
      if (salvas?.id) {
        setConfigId(salvas.id)
      }
      toast({
        title: 'Configurações salvas com sucesso!',
        description: 'Os dados da empresa e o compromisso foram atualizados para os próximos PDFs.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
        Carregando configurações...
      </div>
    )
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6 max-w-4xl">
      {/* BLOCO: UNIDADES DE MEDIDA & MÉTODOS DE CÁLCULO */}
      <div className="bg-white p-5 rounded-xl border border-[#DEE4EA] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DEE4EA]">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#2C3E50]" />
            <div>
              <h3 className="font-heading font-bold text-sm text-[#2C3E50]">
                Unidades de Medida &amp; Fórmulas de Cálculo
              </h3>
              <p className="text-xs text-[#616F7D]">
                Alimenta os seletores de unidades e o cálculo dimensional nos orçamentos e vendas.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={abrirNovaUnidade}
            className="h-8 text-xs bg-[#2C3E50] hover:bg-[#1B2631] text-white font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
            Nova unidade
          </Button>
        </div>

        {loadingUnidades ? (
          <div className="py-6 text-center text-xs text-[#616F7D]">
            Carregando unidades de medida...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DEE4EA] text-[#616F7D] font-semibold">
                  <th className="py-2 px-2">Sigla</th>
                  <th className="py-2 px-2">Nome</th>
                  <th className="py-2 px-2">Método de Cálculo</th>
                  <th className="py-2 px-2 text-center">Status</th>
                  <th className="py-2 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]/60">
                {unidades.map((u) => {
                  const metodo = (u.metodo_calculo || '').trim()
                  let badgeMetodo = 'Livre (sem fórmula dimensional)'
                  let badgeCor = 'bg-gray-100 text-gray-700'
                  if (metodo.toLowerCase() === 'axb') {
                    badgeMetodo = 'Área: A × B (Largura × Altura)'
                    badgeCor = 'bg-blue-50 text-blue-700 border border-blue-200'
                  } else if (metodo.toLowerCase().includes('(a+b)')) {
                    badgeMetodo = 'Perímetro: (A + B) × 2'
                    badgeCor = 'bg-amber-50 text-amber-800 border border-amber-200'
                  } else if (metodo) {
                    badgeMetodo = `Personalizado: ${metodo}`
                    badgeCor = 'bg-purple-50 text-purple-700 border border-purple-200'
                  }

                  return (
                    <tr key={u.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-2.5 px-2 font-mono font-bold text-[#2C3E50]">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#f4f4f4] border border-[#DEE4EA]">
                          {u.sigla}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-medium text-[#2C3E50]">
                        {u.nome}
                        {u.padrao && (
                          <span className="ml-2 text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                            (Padrão)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${badgeCor}`}
                        >
                          {badgeMetodo}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {u.ativo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inativa
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEdicaoUnidade(u)}
                            className="h-7 w-7 p-0 text-[#616F7D] hover:text-[#2C3E50]"
                            title="Editar unidade"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setUnidadeParaExcluir(u)}
                            className="h-7 w-7 p-0 text-[#616F7D] hover:text-red-600"
                            title="Excluir unidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl border border-[#DEE4EA] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#DEE4EA]">
          <Building2 className="w-5 h-5 text-[#2C3E50]" />
          <div>
            <h3 className="font-heading font-bold text-sm text-[#2C3E50]">
              Dados Institucionais da Empresa no Orçamento & PDF
            </h3>
            <p className="text-xs text-[#616F7D]">
              Estas informações encabeçam e assinam as propostas comerciais e orçamentos exportados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#2C3E50]">Razão Social</Label>
            <Input
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Gesso Bettone Comércio e Instalações Eireli"
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#2C3E50]">Nome Fantasia</Label>
            <Input
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Gesso Bettone"
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-[#2C3E50]">Linha descritiva no PDF</Label>
            <Input
              value={linhaDescritiva}
              onChange={(e) => setLinhaDescritiva(e.target.value)}
              placeholder="Ex: Comércio & Instalações de Gesso, Drywall e Acabamentos Finos"
              className="h-9 text-xs bg-white"
            />
            <p className="text-[11px] text-[#616F7D] leading-relaxed">
              Texto exibido sob o nome da empresa no orçamento impresso
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#2C3E50]">CNPJ da Empresa</Label>
              {!cnpjValido && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Formato deve ter 14 dígitos
                </span>
              )}
            </div>
            <Input
              value={cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              placeholder="32.185.940/0001-72"
              className={`h-9 text-xs bg-white ${!cnpjValido ? 'border-red-400' : ''}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#2C3E50]">Telefone / WhatsApp</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(19) 99767-1189"
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#2C3E50]">E-mail de Contato</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@gessobettone.com.br"
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#2C3E50]">Cidade / UF</Label>
            <Input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="São Pedro/SP"
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-[#2C3E50]">Endereço Completo</Label>
            <Input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua Valentim Amaral, 412 - Centro"
              className="h-9 text-xs bg-white"
            />
          </div>
        </div>

        {/* Interruptor Exibir CNPJ */}
        <div className="flex items-center justify-between p-3 bg-[#f4f4f4] rounded-lg border border-[#DEE4EA]">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[#2C3E50] block">
              Exibir CNPJ no Orçamento por Padrão
            </span>
            <span className="text-[10px] text-[#616F7D] block">
              Pode ser alternado individualmente em cada orçamento no formulário
            </span>
          </div>
          <Switch checked={exibirCnpjPadrao} onCheckedChange={setExibirCnpjPadrao} />
        </div>
      </div>

      {/* BLOCO: NOSSO COMPROMISSO */}
      <div className="bg-white p-5 rounded-xl border border-[#DEE4EA] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#DEE4EA]">
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          <div>
            <h3 className="font-heading font-bold text-sm text-[#2C3E50]">
              Texto "Nosso Compromisso" (Cláusulas & Garantias no PDF)
            </h3>
            <p className="text-xs text-[#616F7D]">
              Cada linha digitada abaixo se torna um item com marcador exclusivo no PDF do
              orçamento.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#2C3E50]">
            Linhas de Compromisso (Uma por linha)
          </Label>
          <Textarea
            rows={6}
            value={compromissoTexto}
            onChange={(e) => setCompromissoTexto(e.target.value)}
            placeholder="Utilização de matérias-primas e gesso de alta pureza certificados pelas normas ABNT&#10;Mão de obra altamente qualificada com experiência de mais de 15 anos no mercado&#10;Cumprimento rigoroso do cronograma de início e entrega acordado&#10;Garantia estrutural de 5 anos sobre os serviços executados"
            className="text-xs bg-white resize-none font-mono leading-relaxed"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={salvando}
          className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar Configurações do Orçamento'}
        </Button>
      </div>

      {/* MODAL CRIAR / EDITAR UNIDADE DE MEDIDA */}
      <Dialog open={modalUnidadeOpen} onOpenChange={setModalUnidadeOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-sm text-[#2C3E50] flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#D4AF37]" />
              {unidadeEditando ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#616F7D]">
              Cadastre o nome, a sigla exibida nas propostas e a fórmula dimensional aplicada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Nome da Unidade *</Label>
                <Input
                  value={formUnidadeNome}
                  onChange={(e) => setFormUnidadeNome(e.target.value)}
                  placeholder="Ex: Metros quadrados, Horas"
                  className="h-8 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Sigla *</Label>
                <Input
                  value={formUnidadeSigla}
                  onChange={(e) => setFormUnidadeSigla(e.target.value)}
                  placeholder="m², un, h"
                  className="h-8 text-xs bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Método de Cálculo Automático
              </Label>
              <Select value={formUnidadeMetodo} onValueChange={(val) => setFormUnidadeMetodo(val)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AxB" className="text-xs">
                    AxB — Multiplicação de Dimensões (Largura × Altura)
                  </SelectItem>
                  <SelectItem value="(A+B)x2" className="text-xs">
                    (A+B)x2 — Perímetro / Metros Lineares
                  </SelectItem>
                  <SelectItem value="livre" className="text-xs">
                    Vazio / Livre — Digitação direta da quantidade (ex: svç, un, vb)
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs">
                    Outra fórmula personalizada
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formUnidadeMetodo === 'custom' && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Fórmula Personalizada
                </Label>
                <Input
                  value={formUnidadeMetodoCustom}
                  onChange={(e) => setFormUnidadeMetodoCustom(e.target.value)}
                  placeholder="Ex: AxBxC"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem de exibição</Label>
                <Input
                  type="number"
                  min="0"
                  value={formUnidadeOrdem}
                  onChange={(e) => setFormUnidadeOrdem(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f4f4f4] border border-[#DEE4EA] self-end">
                <span className="text-xs font-semibold text-[#2C3E50]">Ativa</span>
                <Switch checked={formUnidadeAtivo} onCheckedChange={setFormUnidadeAtivo} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalUnidadeOpen(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarUnidade}
              disabled={salvandoUnidade}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-8"
            >
              {salvandoUnidade ? 'Salvando...' : 'Salvar Unidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DE EXCLUSÃO DE UNIDADE */}
      <AlertDialog
        open={Boolean(unidadeParaExcluir)}
        onOpenChange={(open) => !open && setUnidadeParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-[#2C3E50]">
              Confirmar exclusão da unidade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Tem certeza que deseja excluir a unidade &quot;{unidadeParaExcluir?.nome}&quot; (
              {unidadeParaExcluir?.sigla})? Se houver itens vinculados, recomendamos apenas
              desativá-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirUnidade}
              disabled={excluindoUnidade}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8"
            >
              {excluindoUnidade ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
