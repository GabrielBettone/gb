import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import {
  listarServicos,
  listarCategorias,
  criarServico,
  atualizarServico,
  excluirServico,
  SiteServico,
  SiteCategoria,
} from '@/services/site'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Star, Eye, ExternalLink } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ImageUploader from '@/components/site/ImageUploader'
import { resolverUrlMidia } from '@/lib/watermark'

export const SiteServicosPage: React.FC = () => {
  const [servicos, setServicos] = useState<SiteServico[]>([])
  const [categorias, setCategorias] = useState<SiteCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<SiteServico | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [categoria, setCategoria] = useState('Residencial')
  const [destaque, setDestaque] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [ordem, setOrdem] = useState(1)
  const [descricaoCurta, setDescricaoCurta] = useState('')
  const [descricaoLonga, setDescricaoLonga] = useState('')
  const [imagemPrincipal, setImagemPrincipal] = useState('')
  const [galeriaStr, setGaleriaStr] = useState('')
  const [beneficiosStr, setBeneficiosStr] = useState('')

  // Arquivos físicos selecionados
  const [arquivoPrincipalFile, setArquivoPrincipalFile] = useState<File | undefined>()
  const [arquivosGaleriaFiles, setArquivosGaleriaFiles] = useState<File[]>([])
  const [imagensGaleriaList, setImagensGaleriaList] = useState<string[]>([])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [servs, cats] = await Promise.all([listarServicos(false), listarCategorias(false)])
      setServicos(servs)
      setCategorias(cats)
    } catch {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setSlug('')
    setCategoria(categorias[0]?.nome || 'Residencial')
    setDestaque(false)
    setAtivo(true)
    setOrdem(servicos.length + 1)
    setDescricaoCurta('')
    setDescricaoLonga('')
    setImagemPrincipal('')
    setGaleriaStr('')
    setBeneficiosStr('')
    setArquivoPrincipalFile(undefined)
    setArquivosGaleriaFiles([])
    setImagensGaleriaList([])
    setModalOpen(true)
  }

  const abrirEdicao = (s: SiteServico) => {
    setEditando(s)
    setNome(s.nome)
    setSlug(s.slug)
    setCategoria(s.categoria)
    setDestaque(s.destaque)
    setAtivo(s.ativo)
    setOrdem(s.ordem || 1)
    setDescricaoCurta(s.descricao_curta)
    setDescricaoLonga(s.descricao_longa)

    // Prioriza arquivo nativo ou URL legada
    const princVal = s.arquivo_principal || s.imagem_principal || ''
    setImagemPrincipal(princVal)

    // Combina galeria nativa + galeria legado
    const listaGaleria = [...(s.arquivos_galeria || []), ...(s.galeria || [])].filter(Boolean)
    setImagensGaleriaList(listaGaleria)
    setGaleriaStr((s.galeria || []).join('\n'))

    setArquivoPrincipalFile(undefined)
    setArquivosGaleriaFiles([])
    setBeneficiosStr((s.beneficios || []).join('\n'))
    setModalOpen(true)
  }

  const gerarSlugAuto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleNomeChange = (val: string) => {
    setNome(val)
    if (!editando) {
      setSlug(gerarSlugAuto(val))
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !slug.trim()) {
      toast({ title: 'Preencha nome e slug', variant: 'destructive' })
      return
    }

    const galeria = imagensGaleriaList.filter(
      (url) => !url.startsWith('blob:') && (url.startsWith('http') || !url.includes('/')),
    )
    const beneficios = beneficiosStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const payload: Partial<SiteServico> = {
      nome,
      slug,
      categoria,
      destaque,
      ativo,
      ordem: Number(ordem),
      descricao_curta: descricaoCurta,
      descricao_longa: descricaoLonga,
      imagem_principal: imagemPrincipal.startsWith('blob:') ? '' : imagemPrincipal,
      galeria,
      beneficios,
    }

    const arquivosEnvio = {
      arquivo_principal: arquivoPrincipalFile,
      arquivos_galeria: arquivosGaleriaFiles.length > 0 ? arquivosGaleriaFiles : undefined,
    }

    try {
      if (editando) {
        await atualizarServico(editando.id, payload, arquivosEnvio)
        toast({ title: 'Serviço atualizado com sucesso!' })
      } else {
        await criarServico(payload, arquivosEnvio)
        toast({ title: 'Serviço criado com sucesso!' })
      }
      setModalOpen(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar serviço',
        description: err.message || 'Verifique se o slug é único.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (s: SiteServico) => {
    if (!confirm(`Deseja excluir o serviço "${s.nome}"?`)) return
    try {
      await excluirServico(s.id)
      toast({ title: 'Serviço excluído' })
      carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
              Serviços do Site
            </h1>
            <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
              Gerencie os serviços exibidos na landing pública (/servicos e página inicial).
            </p>
          </div>

          <Button
            onClick={abrirNovo}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-4 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            NOVO SERVIÇO
          </Button>
        </div>

        {/* Tabela de Serviços */}
        <div className="bg-white rounded-2xl border border-[#DEE4EA] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f4f4] text-[#616F7D] font-bold uppercase tracking-wider border-b border-[#DEE4EA]">
                <tr>
                  <th className="py-3 px-4">Ordem</th>
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Destaque</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                      Carregando serviços...
                    </td>
                  </tr>
                ) : servicos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#616F7D]">
                      Nenhum serviço cadastrado.
                    </td>
                  </tr>
                ) : (
                  servicos.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2C3E50]">
                        #{s.ordem || 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {s.arquivo_principal || s.imagem_principal ? (
                            <img
                              src={
                                s.arquivo_principal
                                  ? resolverUrlMidia('site_services', s.id, s.arquivo_principal)
                                  : s.imagem_principal
                              }
                              alt={s.nome}
                              crossOrigin="anonymous"
                              className="w-10 h-10 rounded-lg object-cover border border-[#DEE4EA]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#DEE4EA] flex items-center justify-center text-xs font-bold text-[#616F7D]">
                              SEM FOTO
                            </div>
                          )}
                          <div>
                            <span className="font-heading font-bold text-sm text-[#2C3E50] block">
                              {s.nome}
                            </span>
                            <span className="text-[11px] text-[#616F7D] font-mono">
                              /servicos/{s.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className="border-[#DEE4EA] text-[#2C3E50] text-[11px]"
                        >
                          {s.categoria}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.destaque ? (
                          <Badge className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Star className="w-3 h-3 fill-current" />
                            Destaque
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#616F7D]">Padrão</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.ativo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/servicos/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                            title="Ver página pública"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => abrirEdicao(s)}
                            className="p-1.5 text-[#616F7D] hover:text-[#2C3E50] rounded-lg hover:bg-[#DEE4EA] transition-colors"
                            title="Editar serviço"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluir(s)}
                            className="p-1.5 text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Criar / Editar Serviço */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              {editando ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Nome do Serviço *</Label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Forros de Gesso Tabicado"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Slug (URL) *</Label>
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: forros-de-gesso-tabicado"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    {!categorias.some((c) => c.nome === 'Residencial') && (
                      <SelectItem value="Residencial">Residencial</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Fachadas') && (
                      <SelectItem value="Fachadas">Fachadas</SelectItem>
                    )}
                    {!categorias.some((c) => c.nome === 'Comercial') && (
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">Ordem de exibição</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col justify-end space-y-2 pb-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Destaque (Selo)</Label>
                  <Switch checked={destaque} onCheckedChange={setDestaque} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Ativo no Site</Label>
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Curta (Cards)
              </Label>
              <Textarea
                rows={2}
                value={descricaoCurta}
                onChange={(e) => setDescricaoCurta(e.target.value)}
                placeholder="Resumo em poucas frases para os cards da home e catálogo..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Descrição Longa (Página do Serviço)
              </Label>
              <Textarea
                rows={4}
                value={descricaoLonga}
                onChange={(e) => setDescricaoLonga(e.target.value)}
                placeholder="Texto explicativo completo dos detalhes e benefícios..."
              />
            </div>

            {/* Upload de Imagem Principal (Arquivo ou URL) */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Foto / Capa Principal do Serviço"
                helperText="Envie um arquivo ou use URL compatível"
                multiple={false}
                values={imagemPrincipal ? [imagemPrincipal] : []}
                collectionName="site_services"
                recordId={editando?.id}
                onChange={(vals, files) => {
                  setImagemPrincipal(vals[0] || '')
                  setArquivoPrincipalFile(files?.[0])
                }}
              />
              <div className="pt-1">
                <Label className="text-[11px] text-[#616F7D]">
                  Ou informe uma URL externa direta:
                </Label>
                <Input
                  className="mt-1 text-xs"
                  value={imagemPrincipal.startsWith('blob:') ? '' : imagemPrincipal}
                  onChange={(e) => {
                    setImagemPrincipal(e.target.value)
                    setArquivoPrincipalFile(undefined)
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Upload de Galeria de Fotos */}
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-xl border border-[#DEE4EA]">
              <ImageUploader
                label="Galeria de Fotos do Serviço"
                helperText="Selecione múltiplos arquivos para a galeria"
                multiple={true}
                values={imagensGaleriaList}
                collectionName="site_services"
                recordId={editando?.id}
                onChange={(vals, files) => {
                  setImagensGaleriaList(vals)
                  if (files && files.length > 0) {
                    setArquivosGaleriaFiles((prev) => [...prev, ...files])
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Benefícios / Diferenciais (um por linha)
              </Label>
              <Textarea
                rows={3}
                value={beneficiosStr}
                onChange={(e) => setBeneficiosStr(e.target.value)}
                placeholder="Acabamento tabicado refinado&#10;Isolamento termoacústico"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                Salvar Serviço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SiteServicosPage
