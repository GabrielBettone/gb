import React, { useState, useEffect } from 'react'
import type { OrcamentoConfiguracao } from '@/types'
import {
  obterConfiguracoesOrcamento,
  salvarConfiguracoesOrcamento,
} from '@/services/orcamentoModulo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Save, Building2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AbaConfiguracoes: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [configId, setConfigId] = useState('')

  // Campos
  const [razaoSocial, setRazaoSocial] = useState('Gesso Bettone Comércio e Instalações Eireli')
  const [nomeFantasia, setNomeFantasia] = useState('Gesso Bettone')
  const [cnpj, setCnpj] = useState('32.185.940/0001-72')
  const [cnpjValido, setCnpjValido] = useState(true)
  const [exibirCnpjPadrao, setExibirCnpjPadrao] = useState(true)
  const [compromissoTexto, setCompromissoTexto] = useState('')
  const [telefone, setTelefone] = useState('(19) 99767-1189')
  const [email, setEmail] = useState('contato@gessobettone.com.br')
  const [endereco, setEndereco] = useState('Rua Valentim Amaral, 412 - Centro')
  const [cidade, setCidade] = useState('São Pedro/SP')

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
    carregar()
  }, [])

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
    </form>
  )
}
