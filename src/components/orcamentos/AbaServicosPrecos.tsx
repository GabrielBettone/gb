import React, { useState, useEffect } from 'react'
import type { OrcamentoServicoItem, ClienteGrupo, UnidadeMedida } from '@/types'
import {
  listarOrcamentoServicos,
  criarOrcamentoServico,
  atualizarOrcamentoServico,
  excluirOrcamentoServico,
  duplicarOrcamentoServico,
} from '@/services/orcamentoModulo'
import { listarUnidadesMedida } from '@/services/unidadesMedida'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { Plus, Search, Copy, Edit2, Trash2, Tag, CheckCircle2, RotateCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AbaServicosPrecosProps {
  grupos: ClienteGrupo[]
}

export const AbaServicosPrecos: React.FC<AbaServicosPrecosProps> = ({ grupos }) => {
  const { toast } = useToast()
  const [servicos, setServicos] = useState<OrcamentoServicoItem[]>([])
  const [unidadesCadastradas, setUnidadesCadastradas] = useState<UnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<OrcamentoServicoItem | null>(null)
  const [itemParaExcluir, setItemParaExcluir] = useState<OrcamentoServicoItem | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [modoCalculo, setModoCalculo] = useState<'area' | 'dimensoes'>('area')
  const [unidade, setUnidade] = useState('m²')
  const [unidadePadraoId, setUnidadePadraoId] = useState<string>('')
  const [precoUnitario, setPrecoUnitario] = useState<string>('100')
  const [descricaoPdf, setDescricaoPdf] = useState('')
  const [ativo, setAtivo] = useState(true)

  const carregar = async () => {
    setLoading(true)
    try {
      const [data, unids] = await Promise.all([
        listarOrcamentoServicos(grupoFiltro),
        listarUnidadesMedida(true).catch(() => []),
      ])
      setServicos(data)
      setUnidadesCadastradas(unids)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar serviços',
        description: e?.message || 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [grupoFiltro])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setGrupoId('todos')
    setModoCalculo('area')
    const unidPadrao = unidadesCadastradas.find((u) => u.padrao) || unidadesCadastradas[0]
    setUnidadePadraoId(unidPadrao ? unidPadrao.id : '')
    setUnidade(unidPadrao ? unidPadrao.sigla : 'm²')
    setPrecoUnitario('120')
    setDescricaoPdf('')
    setAtivo(true)
    setModalOpen(true)
  }

  const abrirEditar = (item: OrcamentoServicoItem) => {
    setEditando(item)
    setNome(item.nome)
    setGrupoId(item.grupo)
    setModoCalculo(item.modo_calculo)
    setUnidade(item.unidade)
    setUnidadePadraoId(item.unidade_padrao_id || '')
    setPrecoUnitario(item.preco_unitario.toString())
    setDescricaoPdf(item.descricao_pdf || '')
    setAtivo(item.ativo)
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !grupoId) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe o nome e o grupo para este serviço.',
      })
      return
    }

    const precoNum = parseFloat(precoUnitario.replace(',', '.')) || 0

    setSalvando(true)
    try {
      if (editando) {
        await atualizarOrcamentoServico(editando.id, {
          nome: nome.trim(),
          grupo: grupoId,
          modo_calculo: modoCalculo,
          unidade: unidade.trim(),
          unidade_padrao_id: unidadePadraoId || undefined,
          preco_unitario: precoNum,
          descricao_pdf: descricaoPdf.trim(),
          ativo,
        })
        toast({ title: 'Serviço atualizado com sucesso!' })
      } else if (grupoId === 'todos') {
        // Criar o item em TODOS os grupos existentes como registros independentes
        if (grupos.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Nenhum grupo cadastrado',
            description: 'Cadastre ao menos um grupo de clientes antes de criar serviços.',
          })
          setSalvando(false)
          return
        }

        const promessas = grupos.map((g) =>
          criarOrcamentoServico({
            nome: nome.trim(),
            grupo: g.id,
            modo_calculo: modoCalculo,
            unidade: unidade.trim(),
            unidade_padrao_id: unidadePadraoId || undefined,
            preco_unitario: precoNum,
            descricao_pdf: descricaoPdf.trim(),
            ativo,
          }),
        )
        await Promise.all(promessas)
        toast({
          title: 'Serviço criado em todos os grupos!',
          description: `Item adicionado individualmente em ${grupos.length} tabela(s) de preços. Cada grupo pode ser editado separadamente.`,
        })
      } else {
        await criarOrcamentoServico({
          nome: nome.trim(),
          grupo: grupoId,
          modo_calculo: modoCalculo,
          unidade: unidade.trim(),
          unidade_padrao_id: unidadePadraoId || undefined,
          preco_unitario: precoNum,
          descricao_pdf: descricaoPdf.trim(),
          ativo,
        })
        toast({ title: 'Novo serviço adicionado à tabela de preços!' })
      }
      setModalOpen(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao salvar serviço de orçamento:', err)
      const msg =
        err?.message?.includes('Failed to') || !err?.message
          ? 'Não foi possível salvar o serviço. Verifique a conexão com o banco e tente novamente.'
          : err.message
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar serviço',
        description: msg,
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleDuplicar = async (item: OrcamentoServicoItem) => {
    try {
      await duplicarOrcamentoServico(item)
      toast({
        title: 'Serviço duplicado!',
        description: `Cópia de "${item.nome}" criada na mesma tabela.`,
      })
      carregar()
    } catch (err: any) {
      console.error('Erro ao duplicar serviço de orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao duplicar',
        description: 'Não foi possível duplicar o serviço. Tente novamente.',
      })
    }
  }

  const handleExcluir = async () => {
    if (!itemParaExcluir) return
    try {
      await excluirOrcamentoServico(itemParaExcluir.id)
      toast({ title: 'Serviço removido com sucesso.' })
      setItemParaExcluir(null)
      carregar()
    } catch (err: any) {
      console.error('Erro ao excluir serviço de orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o serviço. Tente novamente.',
      })
    }
  }

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const filtrados = servicos.filter((s) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      s.nome.toLowerCase().includes(termo) ||
      (s.descricao_pdf || '').toLowerCase().includes(termo) ||
      (s.expand?.grupo?.nome || '').toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-4">
      {/* Barra de Ações & Filtros */}
      <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar serviço por nome ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs bg-white"
            />
          </div>

          <div className="w-full sm:w-52">
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Tabela por Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os Grupos
                </SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">
                    {g.nome} {g.padrao ? '(Padrão)' : ''}
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
            Novo Serviço de Orçamento
          </Button>
        </div>
      </div>

      {/* Grid de Serviços */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 flex flex-col items-center justify-center text-xs text-[#616F7D] space-y-2">
          <div className="w-6 h-6 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
          <span>Carregando tabela de preços...</span>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 text-center text-xs text-[#616F7D]">
          Nenhum serviço encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                item.ativo
                  ? 'border-[#DEE4EA] hover:border-[#2C3E50]/40'
                  : 'border-dashed border-gray-300 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-[#E8EDF2] text-[#2C3E50] border-[#2C3E50]/20 font-semibold"
                      >
                        {item.expand?.grupo?.nome || 'Grupo'}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-700"
                      >
                        {item.modo_calculo === 'area' ? 'Área (m²)' : 'Larg. × Compr.'}
                      </Badge>
                      {!item.ativo && (
                        <Badge variant="destructive" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-heading font-bold text-sm text-[#2C3E50] leading-snug pt-1">
                      {item.nome}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-[#2C3E50] block">
                      {formatMoeda(item.preco_unitario)}
                    </span>
                    <span className="text-[10px] text-[#8A94A0]">por {item.unidade}</span>
                  </div>
                </div>

                {item.descricao_pdf && (
                  <p className="text-[11px] text-[#616F7D] line-clamp-2 mt-2 bg-[#f4f4f4] p-2 rounded border border-[#DEE4EA]/60">
                    <span className="font-semibold text-[#2C3E50]">PDF: </span>
                    {item.descricao_pdf}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-[#DEE4EA] flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicar(item)}
                  className="h-8 text-xs text-[#616F7D] hover:text-[#2C3E50] px-2"
                  title="Duplicar item"
                >
                  <Copy className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
                  Duplicar
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEditar(item)}
                    className="h-8 w-8 p-0 text-[#2C3E50] hover:bg-[#E8EDF2]"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItemParaExcluir(item)}
                    className="h-8 w-8 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              {editando ? 'Editar Serviço de Orçamento' : 'Novo Serviço de Orçamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="p-5 space-y-4 bg-[#f4f4f4]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Nome do Serviço / Item <span className="text-red-500">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Forro de gesso acartonado drywall"
                className="h-9 text-xs bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Grupo de Clientes (Tabela) <span className="text-red-500">*</span>
                </Label>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {!editando && (
                      <SelectItem value="todos" className="text-xs font-semibold text-[#D4AF37]">
                        ✨ Todos os Grupos (criar em todas as tabelas)
                      </SelectItem>
                    )}
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.nome} {g.padrao ? '(Padrão)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Modo de Cálculo <span className="text-red-500">*</span>
                </Label>
                <Select value={modoCalculo} onValueChange={(val: any) => setModoCalculo(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area" className="text-xs">
                      Área direta em m²
                    </SelectItem>
                    <SelectItem value="dimensoes" className="text-xs">
                      Largura × Comprimento
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Unidade Padrão do Serviço
                </Label>
                <Select
                  value={unidadePadraoId || 'nenhuma'}
                  onValueChange={(val) => {
                    if (val === 'nenhuma') {
                      setUnidadePadraoId('')
                    } else {
                      setUnidadePadraoId(val)
                      const unidEncontrada = unidadesCadastradas.find((u) => u.id === val)
                      if (unidEncontrada) {
                        setUnidade(unidEncontrada.sigla)
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione a unidade cadastrada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma" className="text-xs">
                      (Nenhuma pré-selecionada)
                    </SelectItem>
                    {unidadesCadastradas.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.nome} ({u.sigla}) {u.metodo_calculo ? `— ${u.metodo_calculo}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Sigla da Unidade (exibição) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  placeholder="m², m, svç, un"
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Preço Unitário (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={precoUnitario}
                  onChange={(e) => setPrecoUnitario(e.target.value)}
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Detalhada que Aparece no PDF
              </Label>
              <Textarea
                rows={3}
                value={descricaoPdf}
                onChange={(e) => setDescricaoPdf(e.target.value)}
                placeholder="Ex: Forro estruturado FVS com perfis galvanizados e tratamento de juntas..."
                className="text-xs bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#DEE4EA]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#2C3E50] block">Serviço Ativo</span>
                <span className="text-[10px] text-[#616F7D] block">
                  Disponível para novos orçamentos deste grupo
                </span>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
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
                {salvando ? 'Salvando...' : editando ? 'Atualizar Serviço' : 'Criar Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR EXCLUSÃO */}
      <AlertDialog
        open={Boolean(itemParaExcluir)}
        onOpenChange={(open) => !open && setItemParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Excluir Serviço da Tabela?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Tem certeza que deseja remover <strong>{itemParaExcluir?.nome}</strong> da tabela do
              grupo <strong>{itemParaExcluir?.expand?.grupo?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Excluir Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
