import React, { useState, useEffect } from 'react'
import type { Cliente, ClienteGrupo, Orcamento } from '@/types'
import {
  listarClientes,
  criarCliente,
  atualizarCliente,
  excluirCliente,
} from '@/services/orcamentoModulo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  RotateCw,
  FolderOpen,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AbaClientesProps {
  grupos: ClienteGrupo[]
  orcamentos: Orcamento[]
  onSelecionarOrcamento?: (orc: Orcamento) => void
}

export const AbaClientes: React.FC<AbaClientesProps> = ({
  grupos,
  orcamentos,
  onSelecionarOrcamento,
}) => {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [documento, setDocumento] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('São Pedro')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await listarClientes()
      setClientes(data)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: e?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setGrupoId(grupos[0]?.id || '')
    setDocumento('')
    setWhatsapp('')
    setEmail('')
    setCidade('São Pedro')
    setEndereco('')
    setObservacoes('')
    setModalOpen(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setNome(c.nome)
    setGrupoId(c.grupo)
    setDocumento(c.documento || '')
    setWhatsapp(c.whatsapp || '')
    setEmail(c.email || '')
    setCidade(c.cidade || 'São Pedro')
    setEndereco(c.endereco || '')
    setObservacoes(c.observacoes || '')
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !grupoId) {
      toast({
        variant: 'destructive',
        title: 'Nome e Grupo obrigatórios',
        description: 'Todo cliente precisa estar vinculado a um grupo de preços.',
      })
      return
    }

    setSalvando(true)
    try {
      if (editando) {
        await atualizarCliente(editando.id, {
          nome: nome.trim(),
          grupo: grupoId,
          documento: documento.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          cidade: cidade.trim(),
          endereco: endereco.trim(),
          observacoes: observacoes.trim(),
        })
        toast({ title: 'Cliente atualizado com sucesso!' })
      } else {
        await criarCliente({
          nome: nome.trim(),
          grupo: grupoId,
          documento: documento.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          cidade: cidade.trim(),
          endereco: endereco.trim(),
          observacoes: observacoes.trim(),
        })
        toast({ title: 'Cliente cadastrado com sucesso!' })
      }
      setModalOpen(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível salvar o cliente. Verifique a conexão com o banco e tente novamente.'
          : err.message
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cliente',
        description: msg,
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!clienteParaExcluir) return
    try {
      await excluirCliente(clienteParaExcluir.id)
      toast({ title: 'Cliente excluído com sucesso.' })
      setClienteParaExcluir(null)
      carregar()
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o cliente. Tente novamente.',
      })
    }
  }

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const filtrados = clientes.filter((c) => {
    if (grupoFiltro !== 'todos' && c.grupo !== grupoFiltro) return false
    if (!busca) return true
    const t = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(t) ||
      (c.documento || '').toLowerCase().includes(t) ||
      (c.cidade || '').toLowerCase().includes(t) ||
      (c.whatsapp || '').toLowerCase().includes(t) ||
      (c.email || '').toLowerCase().includes(t)
    )
  })

  // Retorna orçamentos vinculados a um cliente (por ID ou correspondência de nome)
  const getOrcamentosDoCliente = (cliente: Cliente) => {
    return orcamentos.filter(
      (o) =>
        o.cliente_cadastrado === cliente.id ||
        (o.cliente || '').toLowerCase().includes(cliente.nome.toLowerCase()) ||
        cliente.nome.toLowerCase().includes((o.cliente || '').toLowerCase()),
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações & Filtros */}
      <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, WhatsApp ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs bg-white"
            />
          </div>

          <div className="w-full sm:w-52">
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Filtrar por Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os Grupos
                </SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            className="h-9 text-xs border-[#DEE4EA] text-[#616F7D]"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1" />
            Recarregar
          </Button>

          <Button
            size="sm"
            onClick={abrirNovo}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 flex flex-col items-center justify-center text-xs text-[#616F7D] space-y-2">
          <div className="w-6 h-6 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
          <span>Carregando clientes cadastrados...</span>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
          Nenhum cliente cadastrado no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((cliente) => {
            const orcs = getOrcamentosDoCliente(cliente)
            const valorTotalOrcado = orcs.reduce((acc, o) => acc + (o.valor_total || 0), 0)

            return (
              <div
                key={cliente.id}
                className="bg-white rounded-xl border border-[#DEE4EA] p-4 shadow-xs flex flex-col justify-between hover:border-[#2C3E50]/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-[#E8EDF2] text-[#2C3E50] border-[#2C3E50]/20 font-semibold mb-1"
                      >
                        Tabela: {cliente.expand?.grupo?.nome || 'Geral'}
                      </Badge>
                      <h3 className="font-heading font-bold text-sm text-[#2C3E50] leading-tight">
                        {cliente.nome}
                      </h3>
                      {cliente.documento && (
                        <span className="text-[11px] text-[#8A94A0] block">
                          CPF/CNPJ: {cliente.documento}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2C3E50] block">
                        {orcs.length} {orcs.length === 1 ? 'orçamento' : 'orçamentos'}
                      </span>
                      {valorTotalOrcado > 0 && (
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          {formatMoeda(valorTotalOrcado)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-[#616F7D] my-3 pt-2 border-t border-[#DEE4EA]/60">
                    {cliente.whatsapp && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                        <span>{cliente.whatsapp}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.cidade && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                        <span>
                          {cliente.cidade} {cliente.endereco ? `— ${cliente.endereco}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#DEE4EA] flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setClienteHistorico(cliente)}
                    className="h-8 text-xs text-[#2C3E50] hover:bg-[#E8EDF2] px-2 font-medium"
                  >
                    <FolderOpen className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
                    Ver Histórico ({orcs.length})
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditar(cliente)}
                      className="h-8 w-8 p-0 text-[#2C3E50] hover:bg-[#E8EDF2]"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setClienteParaExcluir(cliente)}
                      className="h-8 w-8 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL HISTÓRICO DE ORÇAMENTOS DO CLIENTE */}
      <Dialog
        open={Boolean(clienteHistorico)}
        onOpenChange={(open) => !open && setClienteHistorico(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#D4AF37]" />
              Histórico de Orçamentos — {clienteHistorico?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-3 bg-[#f4f4f4]">
            {clienteHistorico && getOrcamentosDoCliente(clienteHistorico).length === 0 ? (
              <div className="p-8 text-center text-xs text-[#616F7D] bg-white rounded-xl border border-[#DEE4EA]">
                Nenhum orçamento vinculado a este cliente ainda.
              </div>
            ) : (
              clienteHistorico &&
              getOrcamentosDoCliente(clienteHistorico).map((orc) => (
                <div
                  key={orc.id}
                  className="bg-white p-3.5 rounded-xl border border-[#DEE4EA] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#2C3E50]">{orc.numero}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {orc.status}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-[#616F7D] block">
                      Canal: {orc.canal_origem} • Cidade: {orc.cidade || 'São Pedro'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#2C3E50]">
                      {formatMoeda(orc.valor_total)}
                    </span>
                    {onSelecionarOrcamento && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onSelecionarOrcamento(orc)
                          setClienteHistorico(null)
                        }}
                        className="text-xs h-7 border-[#2C3E50]/30"
                      >
                        Abrir
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAR / EDITAR CLIENTE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="p-5 space-y-4 bg-[#f4f4f4]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Nome do Cliente / Empresa <span className="text-red-500">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo (Alphaville) ou Senac"
                className="h-9 text-xs bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Grupo de Clientes <span className="text-red-500">*</span>
                </Label>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.nome} {g.padrao ? '(Padrão)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-[#8A94A0] block">
                  Define a tabela de preços aplicada neste cliente.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">CPF ou CNPJ</Label>
                <Input
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="000.000.000-00 ou CNPJ"
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">WhatsApp / Celular</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(19) 99876-1234"
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#2C3E50]">Cidade</Label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Pedro"
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Endereço / Local da Obra
                </Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro, Condomínio"
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">Observações Internas</Label>
              <Textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Preferências, especificidades do projeto..."
                className="text-xs bg-white resize-none"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
              >
                {salvando ? 'Salvando...' : editando ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR EXCLUSÃO */}
      <AlertDialog
        open={Boolean(clienteParaExcluir)}
        onOpenChange={(open) => !open && setClienteParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Excluir Cliente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Tem certeza que deseja remover o cadastro de{' '}
              <strong>{clienteParaExcluir?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Excluir Cadastro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
