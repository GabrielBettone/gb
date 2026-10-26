import React, { useState, useEffect } from 'react'
import SiteTopNav from '@/components/site/SiteTopNav'
import { obterConfiguracoes, salvarConfiguracoes, SiteSettings } from '@/services/site'
import LogoBettone from '@/components/LogoBettone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, X, Save, Check } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const SiteConfiguracoesPage: React.FC = () => {
  // Seção lateral selecionada
  const [secaoAtiva, setSecaoAtiva] = useState<'contato' | 'identidade' | 'cidades'>('contato')

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Campos Contato, conversão e presença digital
  const [nomeSite, setNomeSite] = useState('Gesso Bettone')
  const [razaoSocial, setRazaoSocial] = useState('Gesso Bettone Comércio e Instalações Eireli')
  const [endereco, setEndereco] = useState('')
  const [siteUrl, setSiteUrl] = useState('https://gessobettone.com.br')
  const [whatsappPrincipal, setWhatsappPrincipal] = useState('5519981093379')
  const [emailContato, setEmailContato] = useState('contato@gessobettone.com.br')
  const [mensagemOrcamento, setMensagemOrcamento] = useState(
    'Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento.',
  )
  const [instagram, setInstagram] = useState('https://www.instagram.com/gessobettone_saopedro')
  const [cnpj, setCnpj] = useState('53.242.055/0001-74')
  const [exibirCnpjPdf, setExibirCnpjPdf] = useState(true)
  const [googleSiteVerification, setGoogleSiteVerification] = useState('')
  const [exibirDepoimentos, setExibirDepoimentos] = useState(true)

  // Logo da empresa
  const [logoAtual, setLogoAtual] = useState<string>('')
  const [novoArquivoLogo, setNovoArquivoLogo] = useState<File | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string>('')

  // Cidades atendidas
  const [cidades, setCidades] = useState<string[]>([])
  const [novaCidade, setNovaCidade] = useState('')

  useEffect(() => {
    let isMounted = true
    obterConfiguracoes()
      .then((cfg) => {
        if (!isMounted) return
        setNomeSite(cfg.nome_site || 'Gesso Bettone')
        setRazaoSocial(cfg.razao_social || 'Gesso Bettone Comércio e Instalações Eireli')
        setEndereco(cfg.endereco || '')
        setSiteUrl(cfg.site_url || 'https://gessobettone.com.br')
        setWhatsappPrincipal(cfg.whatsapp_principal || '5519981093379')
        setEmailContato(cfg.email_contato || 'contato@gessobettone.com.br')
        setMensagemOrcamento(
          cfg.mensagem_orcamento ||
            'Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento.',
        )
        setInstagram(cfg.instagram || 'https://www.instagram.com/gessobettone_saopedro')
        setCnpj(cfg.cnpj || '53.242.055/0001-74')
        setExibirCnpjPdf(cfg.exibir_cnpj_pdf !== false)
        setGoogleSiteVerification(cfg.google_site_verification || '')
        setExibirDepoimentos(cfg.exibir_depoimentos !== false)
        setCidades(cfg.cidades_atendidas || [])
        if (cfg.logo_url) {
          setLogoAtual(cfg.logo_url)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const { settings: salvas, warningMissingColumn } = await salvarConfiguracoes(
        {
          nome_site: nomeSite,
          razao_social: razaoSocial.trim(),
          endereco: endereco.trim(),
          site_url: siteUrl.trim(),
          whatsapp_principal: whatsappPrincipal,
          email_contato: emailContato,
          mensagem_orcamento: mensagemOrcamento,
          instagram,
          cnpj,
          exibir_cnpj_pdf: exibirCnpjPdf,
          google_site_verification: googleSiteVerification.trim(),
          exibir_depoimentos: exibirDepoimentos,
          cidades_atendidas: cidades,
        },
        novoArquivoLogo,
      )
      if (salvas.logo_url) {
        setLogoAtual(salvas.logo_url)
      }
      setNovoArquivoLogo(null)
      if (warningMissingColumn) {
        toast({
          title: 'Configurações salvas parcialmente',
          description: warningMissingColumn,
          duration: 10000,
        })
      } else {
        toast({ title: 'Configurações salvas com sucesso!' })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: err?.message || 'Verifique sua conexão ou permissões no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleAdicionarCidade = () => {
    if (!novaCidade.trim()) return
    if (!cidades.includes(novaCidade.trim())) {
      setCidades([...cidades, novaCidade.trim()])
    }
    setNovaCidade('')
  }

  const handleRemoverCidade = (nome: string) => {
    setCidades(cidades.filter((c) => c !== nome))
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* TopNav Geral */}
      <SiteTopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2C3E50]">
            Configurações
          </h1>
        </div>

        {/* Layout de 2 Colunas exatamente como no Print 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Menu Lateral Escuro (Print 1) */}
          <div className="md:col-span-3 bg-[#1B2631] rounded-2xl overflow-hidden shadow-xs border border-[#2C3E50]/60 p-2 space-y-1">
            <button
              type="button"
              onClick={() => setSecaoAtiva('contato')}
              className={`w-full text-left px-4 py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                secaoAtiva === 'contato'
                  ? 'text-white bg-[#2C3E50]/80 pl-5'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {secaoAtiva === 'contato' && (
                <span className="absolute left-1.5 top-2 bottom-2 w-1 bg-[#D4AF37] rounded-full" />
              )}
              Contato, conversão e presença digital
            </button>

            <button
              type="button"
              onClick={() => setSecaoAtiva('identidade')}
              className={`w-full text-left px-4 py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                secaoAtiva === 'identidade'
                  ? 'text-white bg-[#2C3E50]/80 pl-5'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {secaoAtiva === 'identidade' && (
                <span className="absolute left-1.5 top-2 bottom-2 w-1 bg-[#D4AF37] rounded-full" />
              )}
              Logotipo da Empresa
            </button>

            <button
              type="button"
              onClick={() => setSecaoAtiva('cidades')}
              className={`w-full text-left px-4 py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                secaoAtiva === 'cidades'
                  ? 'text-white bg-[#2C3E50]/80 pl-5'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {secaoAtiva === 'cidades' && (
                <span className="absolute left-1.5 top-2 bottom-2 w-1 bg-[#D4AF37] rounded-full" />
              )}
              Cidades atendidas
            </button>

            {/* Link para o controle do Simulador */}
            <a
              href="/painel/site/simulador"
              className="block px-4 py-3 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
            >
              Controles do Simulador IA →
            </a>
            <a
              href="/painel/site"
              className="block px-4 py-3 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Analytics
            </a>
          </div>

          {/* Área Principal de Conteúdo do Print 1 */}
          <div className="md:col-span-9 bg-white rounded-2xl border border-[#DEE4EA] p-6 sm:p-8 shadow-xs">
            {secaoAtiva === 'contato' && (
              <form onSubmit={handleSalvar} className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2C3E50]">
                    Contato, conversão e presença digital
                  </h2>
                  <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
                    Informações usadas pelos botões de orçamento, contatos e identidade
                    institucional do site.
                  </p>
                </div>

                {/* Nome / Título do Site e Razão Social */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Nome / título do site
                  </Label>
                  <Input
                    value={nomeSite}
                    onChange={(e) => setNomeSite(e.target.value)}
                    className="max-w-xl bg-white border-[#DEE4EA]"
                  />
                </div>

                <div className="space-y-1.5 max-w-xl">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Razão social da empresa
                  </Label>
                  <Input
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Ex: Gesso Bettone Comércio e Instalações Eireli"
                    className="bg-white border-[#DEE4EA]"
                  />
                  <p className="text-[11px] text-[#616F7D]">
                    Utilizada em documentos formais e no cabeçalho/dados da empresa emissora no PDF
                    de orçamento (quando a opção de exibir CNPJ estiver ativa).
                  </p>
                </div>

                {/* Endereço da Empresa */}
                <div className="space-y-1.5 max-w-xl">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Endereço da empresa
                  </Label>
                  <Textarea
                    rows={2}
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua Exemplo, 123 — Centro, São Pedro/SP"
                    className="bg-white border-[#DEE4EA]"
                  />
                  <p className="text-[11px] text-[#616F7D]">
                    Exibido no bloco de dados da empresa emissora no PDF do orçamento. Se deixado em
                    branco, a linha de endereço é omitida no PDF.
                  </p>
                </div>

                {/* URL Base do Site para Robots & Sitemap */}
                <div className="space-y-1.5 max-w-xl">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    URL Base do Site (Domínio público para indexação Google)
                  </Label>
                  <Input
                    type="url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://gessobettone.com.br"
                    className="bg-white border-[#DEE4EA]"
                  />
                  <p className="text-[11px] text-[#616F7D]">
                    Usada na geração do sitemap.xml e robots.txt para o Google encontrar todas as
                    páginas e serviços do catálogo.
                  </p>
                </div>

                {/* WhatsApp principal e E-mail de contato em 2 colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#2C3E50]">
                      WhatsApp principal
                    </Label>
                    <Input
                      value={whatsappPrincipal}
                      onChange={(e) => setWhatsappPrincipal(e.target.value)}
                      className="bg-white border-[#DEE4EA]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#2C3E50]">
                      E-mail de contato
                    </Label>
                    <Input
                      type="email"
                      value={emailContato}
                      onChange={(e) => setEmailContato(e.target.value)}
                      className="bg-white border-[#DEE4EA]"
                    />
                  </div>
                </div>

                {/* Mensagem automática do orçamento */}
                <div className="space-y-1.5 max-w-xl">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Mensagem automática do orçamento
                  </Label>
                  <Textarea
                    rows={4}
                    value={mensagemOrcamento}
                    onChange={(e) => setMensagemOrcamento(e.target.value)}
                    className="bg-white border-[#DEE4EA]"
                  />
                </div>

                {/* Instagram e CNPJ em 2 colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#2C3E50]">Instagram</Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="bg-white border-[#DEE4EA]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#2C3E50]">CNPJ</Label>
                    <Input
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="bg-white border-[#DEE4EA]"
                    />
                  </div>
                </div>

                {/* Google Search Console Verification */}
                <div className="space-y-1.5 max-w-xl pt-2">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Código de verificação do Google Search Console
                  </Label>
                  <Input
                    value={googleSiteVerification}
                    onChange={(e) => setGoogleSiteVerification(e.target.value)}
                    placeholder="Ex: abc123xyz456... ou tag meta completa"
                    className="bg-white border-[#DEE4EA] font-mono text-xs"
                  />
                  <p className="text-[11px] text-[#616F7D] leading-relaxed">
                    Copie o código da tag HTML gerada pelo Search Console (apenas o valor de{' '}
                    <code className="bg-[#f4f4f4] px-1 py-0.5 rounded text-[#2C3E50]">
                      content="..."
                    </code>{' '}
                    ou a tag completa). O código será injetado automaticamente como{' '}
                    <code className="bg-[#f4f4f4] px-1 py-0.5 rounded text-[#2C3E50]">
                      &lt;meta name="google-site-verification"&gt;
                    </code>{' '}
                    no cabeçalho do site.
                  </p>
                </div>

                {/* Opções de Exibição (CNPJ no PDF e Depoimentos no site) */}
                <div className="pt-4 border-t border-[#DEE4EA] max-w-xl space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="check-exibir-cnpj-pdf"
                        checked={exibirCnpjPdf}
                        onChange={(e) => setExibirCnpjPdf(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#2C3E50] focus:ring-[#D4AF37]"
                      />
                      <label
                        htmlFor="check-exibir-cnpj-pdf"
                        className="text-xs font-semibold text-[#2C3E50] cursor-pointer"
                      >
                        Exibir CNPJ no orçamento (PDF)
                      </label>
                    </div>
                    <p className="text-[11px] text-[#616F7D] pl-8 leading-relaxed">
                      Quando ativo: exibe a Razão Social em todo lugar no PDF onde antes constava o
                      nome fantasia, além de CNPJ, e-mail e WhatsApp. Quando inativo: exibe o nome
                      fantasia ({nomeSite || 'Gesso Bettone'}), e-mail e WhatsApp, ocultando o CNPJ.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="check-depoimentos"
                        checked={exibirDepoimentos}
                        onChange={(e) => setExibirDepoimentos(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#2C3E50] focus:ring-[#D4AF37]"
                      />
                      <label
                        htmlFor="check-depoimentos"
                        className="text-xs font-semibold text-[#2C3E50] cursor-pointer"
                      >
                        Exibir depoimentos no site público
                      </label>
                    </div>
                    <p className="text-[11px] text-[#616F7D] pl-8 leading-relaxed">
                      Quando desativado, a seção de depoimentos e o botão "Deixe seu depoimento" não
                      aparecem no site público. Os registros permanecem salvos no Admin.
                    </p>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={salvando}
                    className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-xl shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {salvando ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                  </Button>
                </div>
              </form>
            )}

            {secaoAtiva === 'identidade' && (
              <form onSubmit={handleSalvar} className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2C3E50]">
                    Logotipo Oficial da Empresa
                  </h2>
                  <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
                    Envie o logo da Gesso Bettone (SVG, PNG ou JPEG). Ele será utilizado nos
                    cabeçalhos públicos, relatórios de orçamentos em PDF e documentos oficiais.
                  </p>
                </div>

                {/* Exibição Atual */}
                <div className="p-6 rounded-2xl bg-[#f8fafc] border border-[#DEE4EA] flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-40 h-28 bg-white rounded-xl border border-[#DEE4EA] p-3 flex items-center justify-center shadow-xs">
                    <LogoBettone
                      className="max-h-full max-w-full"
                      customLogoUrl={previewLogo || logoAtual || null}
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm font-bold text-[#2C3E50]">
                      {novoArquivoLogo
                        ? 'Novo arquivo pronto para salvar'
                        : logoAtual
                          ? 'Logotipo customizado ativo'
                          : 'Logotipo oficial padrão (Vetor SVG Bettone)'}
                    </h3>
                    <p className="text-xs text-[#616F7D] leading-relaxed">
                      Recomendamos arquivos vetoriais (.SVG) ou imagens de alta resolução com fundo
                      transparente (.PNG). Tamanho máximo: 10MB.
                    </p>

                    <div className="pt-2 flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold shadow-xs transition-colors">
                        <span>Escolher novo arquivo...</span>
                        <input
                          type="file"
                          accept="image/svg+xml,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setNovoArquivoLogo(file)
                              setPreviewLogo(URL.createObjectURL(file))
                            }
                          }}
                        />
                      </label>

                      {novoArquivoLogo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNovoArquivoLogo(null)
                            setPreviewLogo('')
                          }}
                          className="text-xs text-[#C4453C] hover:bg-[#FBEFEE]"
                        >
                          Cancelar alteração
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#DEE4EA]">
                  <Button
                    type="submit"
                    disabled={salvando}
                    className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-xl shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {salvando ? 'Salvando...' : 'SALVAR LOGOTIPO'}
                  </Button>
                </div>
              </form>
            )}

            {secaoAtiva === 'cidades' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2C3E50]">
                    Cidades atendidas
                  </h2>
                  <p className="text-xs sm:text-sm text-[#616F7D] mt-1">
                    Lista de municípios exibidos na seção "Cidades atendidas" da landing pública e
                    rodapé.
                  </p>
                </div>

                {/* Adicionar Cidade */}
                <div className="flex gap-2 max-w-md">
                  <Input
                    value={novaCidade}
                    onChange={(e) => setNovaCidade(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAdicionarCidade()
                      }
                    }}
                    placeholder="Ex: Rio das Pedras/SP"
                    className="bg-white border-[#DEE4EA] text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAdicionarCidade}
                    className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Tags de Cidades */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {cidades.map((cid) => (
                    <div
                      key={cid}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4f4f4] border border-[#DEE4EA] text-xs font-semibold text-[#2C3E50]"
                    >
                      <span>{cid}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverCidade(cid)}
                        className="p-0.5 text-[#616F7D] hover:text-[#C4453C] rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botão Salvar Cidades */}
                <div className="pt-6 border-t border-[#DEE4EA]">
                  <Button
                    onClick={handleSalvar}
                    disabled={salvando}
                    className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-10 px-6 rounded-xl shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {salvando ? 'Salvando...' : 'SALVAR CIDADES'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SiteConfiguracoesPage
