import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import type { Produto, CanalVenda } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess?: () => void
  isFirstVisitEmpty?: boolean
}

interface RawRow {
  [key: string]: string
}

const CANAIS_VALIDOS: CanalVenda[] = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onOpenChange,
  onImportSuccess,
  isFirstVisitEmpty = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [files, setFiles] = useState<File[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<{
    data: string
    cliente: string
    produto: string
    canal: string
    cidade: string
    valor: string
  }>({
    data: '',
    cliente: '',
    produto: '',
    canal: '',
    cidade: '',
    valor: '',
  })
  const [skipInvalid, setSkipInvalid] = useState(true)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ total: number; skipped: number } | null>(null)

  const { toast } = useToast()
  const navigate = useNavigate()

  const resetModal = () => {
    setStep(1)
    setFiles([])
    setHeaders([])
    setRawRows([])
    setMapping({
      data: '',
      cliente: '',
      produto: '',
      canal: '',
      cidade: '',
      valor: '',
    })
    setSkipInvalid(true)
    setImporting(false)
    setProgress(0)
    setDuplicateWarning(null)
    setImportResult(null)
  }

  // Parse CSV simples no cliente com suporte a aspas e vírgula/ponto-e-vírgula
  const parseCSV = (text: string): { headers: string[]; rows: RawRow[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length === 0) return { headers: [], rows: [] }

    // Detectar separador (; ou ,)
    const firstLine = lines[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const semiCount = (firstLine.match(/;/g) || []).length
    const separator = semiCount > commaCount ? ';' : ','

    const splitLine = (line: string): string[] => {
      const result: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === separator && !inQuotes) {
          result.push(cur.trim())
          cur = ''
        } else {
          cur += char
        }
      }
      result.push(cur.trim())
      return result.map((item) => item.replace(/^"|"$/g, '').trim())
    }

    const rawHeaders = splitLine(lines[0])
    const rows: RawRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i])
      if (cols.length === 0 || cols.every((c) => !c)) continue
      const rowObj: RawRow = {}
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = cols[idx] || ''
      })
      rows.push(rowObj)
    }

    return { headers: rawHeaders, rows }
  }

  const handleFileChange = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    const newFiles = Array.from(selectedFiles).slice(0, 5)

    // Validar extensões e tamanho (máx 25 MB)
    for (const f of newFiles) {
      if (f.size > 25 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: `O arquivo ${f.name} ultrapassa o limite de 25 MB.`,
        })
        return
      }
      const ext = f.name.toLowerCase().split('.').pop()
      if (ext !== 'csv' && ext !== 'xlsx') {
        toast({
          variant: 'destructive',
          title: 'Formato não suportado',
          description: `Apenas planilhas CSV e Excel (.xlsx) são aceitas.`,
        })
        return
      }
    }

    setFiles(newFiles)
    const primaryFile = newFiles[0]

    // Verificar se já foi importado antes
    try {
      const checkDuplicado = await pb.collection('importacoes').getList(1, 1, {
        filter: `arquivo = "${primaryFile.name}"`,
        sort: '-data',
      })
      if (checkDuplicado.items.length > 0) {
        const dataImport = new Date(checkDuplicado.items[0].data).toLocaleDateString('pt-BR')
        setDuplicateWarning(
          `Este arquivo já foi importado em ${dataImport} — importar mesmo assim?`,
        )
      } else {
        setDuplicateWarning(null)
      }
    } catch {
      /* intentionally ignored */
    }

    // Processar leitura de CSV (ou texto estruturado)
    const ext = primaryFile.name.toLowerCase().split('.').pop()
    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { headers: parsedHeaders, rows } = parseCSV(text)
        setHeaders(parsedHeaders)
        setRawRows(rows)
        autoDetectMapping(parsedHeaders)
        setStep(2)
      }
      reader.readAsText(primaryFile, 'UTF-8')
    } else {
      // Para XLSX sem biblioteca pesada, lê como array buffer ou trata CSV exportado
      // Fallback gracioso: lê cabeçalhos e linhas se for CSV ou orienta
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        // Tenta interpretar texto
        const { headers: parsedHeaders, rows } = parseCSV(text)
        if (parsedHeaders.length > 0 && rows.length > 0) {
          setHeaders(parsedHeaders)
          setRawRows(rows)
          autoDetectMapping(parsedHeaders)
          setStep(2)
        } else {
          toast({
            title: 'Dica de importação',
            description:
              'Para arquivos .xlsx complexos, recomendamos salvar como CSV (separado por vírgulas).',
          })
          setStep(2)
        }
      }
      reader.readAsText(primaryFile)
    }
  }

  const autoDetectMapping = (colHeaders: string[]) => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    const detected: typeof mapping = {
      data: '',
      cliente: '',
      produto: '',
      canal: '',
      cidade: '',
      valor: '',
    }

    colHeaders.forEach((h) => {
      const n = normalize(h)
      if (!detected.data && (n.includes('data') || n.includes('date') || n.includes('dia'))) {
        detected.data = h
      } else if (
        !detected.cliente &&
        (n.includes('cliente') || n.includes('comprador') || n.includes('nome'))
      ) {
        detected.cliente = h
      } else if (
        !detected.produto &&
        (n.includes('produto') || n.includes('servico') || n.includes('item'))
      ) {
        detected.produto = h
      } else if (
        !detected.canal &&
        (n.includes('canal') || n.includes('origem') || n.includes('meio'))
      ) {
        detected.canal = h
      } else if (
        !detected.cidade &&
        (n.includes('cidade') || n.includes('municipio') || n.includes('local'))
      ) {
        detected.cidade = h
      } else if (
        !detected.valor &&
        (n.includes('valor') ||
          n.includes('total') ||
          n.includes('preco') ||
          n.includes('faturamento'))
      ) {
        detected.valor = h
      }
    })

    setMapping(detected)
  }

  // Parse do valor numérico brasileiro ("1.234,56" ou "1234.56")
  const parseValorBR = (valStr: string): number => {
    if (!valStr) return NaN
    let clean = valStr.toString().replace(/[R$\s]/g, '')
    // Se tiver vírgula e ponto (ex 1.234,56), tira ponto e troca vírgula por ponto
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.')
    }
    return parseFloat(clean)
  }

  // Normaliza e parseia data (DD/MM/AAAA ou AAAA-MM-DD)
  const parseDataBR = (dateStr: string): string | null => {
    if (!dateStr) return null
    const clean = dateStr.trim()
    // DD/MM/AAAA
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(clean)) {
      const parts = clean.split('/')
      const dia = parts[0].padStart(2, '0')
      const mes = parts[1].padStart(2, '0')
      const ano = parts[2].substring(0, 4)
      return `${ano}-${mes}-${dia} 12:00:00.000Z`
    }
    // AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      return `${clean.substring(0, 10)} 12:00:00.000Z`
    }
    const d = new Date(clean)
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    }
    return null
  }

  // Normaliza canal
  const parseCanal = (val: string): CanalVenda => {
    const n = (val || '').toLowerCase()
    if (n.includes('whats') || n.includes('zap')) return 'WhatsApp'
    if (n.includes('mail') || n.includes('e-mail')) return 'E-mail'
    if (n.includes('insta')) return 'Instagram'
    return 'Loja física'
  }

  // Validação da linha mapeada
  const validateRow = (row: RawRow) => {
    const rawData = row[mapping.data]
    const rawCliente = row[mapping.cliente]
    const rawProduto = row[mapping.produto]
    const rawCanal = row[mapping.canal]
    const rawValor = row[mapping.valor]

    const parsedDate = parseDataBR(rawData)
    const parsedValor = parseValorBR(rawValor)

    const isValid =
      Boolean(parsedDate) &&
      Boolean(rawCliente?.trim()) &&
      Boolean(rawProduto?.trim()) &&
      Boolean(rawCanal?.trim()) &&
      !isNaN(parsedValor) &&
      parsedValor > 0

    return {
      isValid,
      parsedDate,
      cliente: (rawCliente || '').trim(),
      produtoNome: (rawProduto || '').trim(),
      canal: parseCanal(rawCanal),
      cidade: (row[mapping.cidade] || '').trim(),
      valor: parsedValor,
    }
  }

  const validRowsCount = rawRows.filter((r) => validateRow(r).isValid).length
  const invalidRowsCount = rawRows.length - validRowsCount

  const handleImport = async () => {
    if (!mapping.data || !mapping.cliente || !mapping.produto || !mapping.canal || !mapping.valor) {
      toast({
        variant: 'destructive',
        title: 'Mapeamento incompleto',
        description: 'Vincule todas as colunas obrigatórias para prosseguir.',
      })
      return
    }

    setImporting(true)
    setProgress(5)

    try {
      // 1. Carrega produtos existentes ou cria novos conforme necessário
      const produtosExistentes = await pb.collection<Produto>('produtos').getFullList({
        sort: 'nome',
      })
      const prodMap = new Map<string, string>()
      produtosExistentes.forEach((p) => {
        prodMap.set(p.nome.toLowerCase().trim(), p.id)
      })

      const rowsToProcess = rawRows.map((r) => validateRow(r))
      const targetRows = skipInvalid ? rowsToProcess.filter((r) => r.isValid) : rowsToProcess

      let criados = 0
      let ignorados = 0

      // Garante produtos
      for (const r of targetRows) {
        if (!r.isValid && !skipInvalid) continue
        const prodKey = r.produtoNome.toLowerCase()
        if (!prodMap.has(prodKey) && r.produtoNome) {
          try {
            const newProd = await pb.collection('produtos').create({
              nome: r.produtoNome,
              descricao: 'Cadastrado automaticamente via importação de planilha.',
              ativo: true,
            })
            prodMap.set(prodKey, newProd.id)
          } catch {
            /* intentionally ignored */
          }
        }
      }

      setProgress(25)

      // 2. Insere as vendas
      const total = targetRows.length
      for (let i = 0; i < total; i++) {
        const item = targetRows[i]
        if (!item.isValid) {
          ignorados++
          continue
        }

        const prodId = prodMap.get(item.produtoNome.toLowerCase()) || produtosExistentes[0]?.id
        if (!prodId) {
          ignorados++
          continue
        }

        try {
          await pb.collection('vendas').create({
            data: item.parsedDate,
            cliente: item.cliente,
            produto: prodId,
            canal: item.canal,
            cidade: item.cidade || 'São Pedro',
            valor: item.valor,
          })
          criados++
        } catch (_) {
          ignorados++
        }

        if (i % 5 === 0 || i === total - 1) {
          setProgress(25 + Math.round(((i + 1) / total) * 70))
        }
      }

      // 3. Registra em importações
      if (files[0]) {
        await pb.collection('importacoes').create({
          data: new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
          arquivo: files[0].name,
          total_registros: criados,
        })
      }

      setProgress(100)
      setImportResult({ total: criados, skipped: ignorados })
      toast({
        title: 'Importação concluída!',
        description: `${criados} vendas registradas com sucesso.`,
      })
      if (onImportSuccess) onImportSuccess()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Falha na importação',
        description: eObj?.message || 'Ocorreu um erro ao persistir as vendas.',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!importing) {
          onOpenChange(val)
          if (!val) resetModal()
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white border-[#E3E6EA] rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-[#2C3E50] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" />
            Importação de Planilha de Vendas
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            {isFirstVisitEmpty
              ? 'Conecte sua planilha de vendas para começar a análise de dados da Gesso Bettone.'
              : 'Importe arquivos CSV ou Excel (.xlsx) com o histórico de vendas.'}
          </DialogDescription>
        </DialogHeader>

        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDuplicateWarning(null)}
              className="h-6 px-2 text-amber-700 hover:bg-amber-100"
            >
              Ignorar
            </Button>
          </div>
        )}

        {/* ETAPA 1: UPLOAD */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFileChange(e.dataTransfer.files)
              }}
              className="border-2 border-dashed border-[#DEE4EA] hover:border-[#2C3E50] bg-[#f4f4f4] hover:bg-[#E8EDF2]/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative"
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2C3E50] mb-3 border border-[#DEE4EA]">
                <UploadCloud className="w-7 h-7 text-[#2C3E50]" />
              </div>
              <h4 className="text-sm font-semibold text-[#22272A] mb-1">
                Arraste seus arquivos aqui ou clique para selecionar
              </h4>
              <p className="text-xs text-[#5B6470] max-w-sm">
                Suporta planilhas CSV e Excel (.xlsx). Envie até 5 arquivos de no máximo 25 MB cada.
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Arquivos selecionados:
                </Label>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#E3E6EA] bg-white text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-4 h-4 text-[#2C3E50]" />
                      <span className="font-medium truncate">{file.name}</span>
                      <span className="text-[#8A94A0]">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles([])}
                      className="h-7 w-7 p-0 text-[#C4453C]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
        {step === 2 && !importResult && (
          <div className="space-y-5 py-2">
            <div className="p-3 bg-[#E8EDF2] text-[#2C3E50] rounded-lg text-xs font-medium">
              Identificamos automaticamente as colunas da planilha. Revise ou ajuste o vínculo de
              cada campo obrigatório.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Data <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={mapping.data}
                  onValueChange={(val) => setMapping((m) => ({ ...m, data: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={mapping.cliente}
                  onValueChange={(val) => setMapping((m) => ({ ...m, cliente: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Produto <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={mapping.produto}
                  onValueChange={(val) => setMapping((m) => ({ ...m, produto: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Canal de Venda <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={mapping.canal}
                  onValueChange={(val) => setMapping((m) => ({ ...m, canal: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Valor (R$) <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={mapping.valor}
                  onValueChange={(val) => setMapping((m) => ({ ...m, valor: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Cidade <span className="text-[#8A94A0]">(opcional)</span>
                </Label>
                <Select
                  value={mapping.cidade}
                  onValueChange={(val) => setMapping((m) => ({ ...m, cidade: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">
                      -- Não mapear --
                    </SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pré-visualização das 10 primeiras linhas */}
            <div className="pt-2">
              <Label className="text-xs font-semibold text-[#22272A] block mb-2">
                Pré-visualização dos dados (primeiras 10 linhas):
              </Label>
              <div className="border border-[#E3E6EA] rounded-lg overflow-x-auto max-h-48 text-xs">
                <Table>
                  <TableHeader className="bg-[#F6F7F9]">
                    <TableRow>
                      <TableHead className="text-xs py-2">Data</TableHead>
                      <TableHead className="text-xs py-2">Cliente</TableHead>
                      <TableHead className="text-xs py-2">Produto</TableHead>
                      <TableHead className="text-xs py-2">Canal</TableHead>
                      <TableHead className="text-xs py-2">Cidade</TableHead>
                      <TableHead className="text-xs py-2 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.slice(0, 10).map((row, idx) => {
                      const res = validateRow(row)
                      return (
                        <TableRow key={idx} className={!res.isValid ? 'bg-red-50/50' : ''}>
                          <TableCell className="py-1.5">{row[mapping.data] || '-'}</TableCell>
                          <TableCell className="py-1.5 font-medium">
                            {row[mapping.cliente] || '-'}
                          </TableCell>
                          <TableCell className="py-1.5">{row[mapping.produto] || '-'}</TableCell>
                          <TableCell className="py-1.5">{row[mapping.canal] || '-'}</TableCell>
                          <TableCell className="py-1.5">{row[mapping.cidade] || '-'}</TableCell>
                          <TableCell className="py-1.5 text-right font-medium">
                            {row[mapping.valor] || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: REVISÃO & PROGRESSO */}
        {step === 3 && !importResult && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#2E7D5B]/30 bg-[#EAF6EF] text-[#2E7D5B]">
                <p className="text-xs font-medium">Registros válidos</p>
                <p className="text-2xl font-bold mt-1">{validRowsCount}</p>
                <p className="text-[11px] mt-0.5 text-[#2E7D5B]/80">
                  Prontos para inclusão imediata
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#C4453C]/30 bg-[#FBEFEE] text-[#C4453C]">
                <p className="text-xs font-medium">Registros com inconsistência</p>
                <p className="text-2xl font-bold mt-1">{invalidRowsCount}</p>
                <p className="text-[11px] mt-0.5 text-[#C4453C]/80">
                  Campos vazios ou valor inválido
                </p>
              </div>
            </div>

            {invalidRowsCount > 0 && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="skipInvalid"
                  checked={skipInvalid}
                  onCheckedChange={(checked) => setSkipInvalid(Boolean(checked))}
                />
                <label
                  htmlFor="skipInvalid"
                  className="text-xs font-medium text-[#22272A] cursor-pointer"
                >
                  Pular registros inválidos e importar apenas as linhas válidas
                </label>
              </div>
            )}

            {importing && (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-xs text-[#5B6470]">
                  <span>Importando vendas...</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-[#E7EFEA]" />
              </div>
            )}
          </div>
        )}

        {/* RESULTADO FINAL DA IMPORTAÇÃO */}
        {importResult && (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#EAF6EF] text-[#2E7D5B] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#2C3E50]">
                Importação Concluída com Sucesso!
              </h3>{' '}
              <p className="text-xs text-[#5B6470] mt-1">
                Foram importadas <strong>{importResult.total}</strong> vendas.
                {importResult.skipped > 0 &&
                  ` (${importResult.skipped} linhas com pendência ignoradas)`}
              </p>
            </div>
            <Button
              className="bg-[#2C3E50] hover:bg-[#1B2631] text-white px-6 font-semibold"
              onClick={() => {
                onOpenChange(false)
                resetModal()
                navigate('/')
              }}
            >
              Ver dashboard
            </Button>
          </div>
        )}

        {!importResult && (
          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t border-[#E3E6EA]">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                disabled={importing}
                className="text-xs"
              >
                Voltar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-[#5B6470]"
              >
                Cancelar
              </Button>
            )}

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => {
                  if (files.length === 0) {
                    toast({
                      variant: 'destructive',
                      title: 'Nenhum arquivo',
                      description: 'Selecione uma planilha para avançar.',
                    })
                    return
                  }
                  setStep(2)
                }}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                Avançar
              </Button>
            )}

            {step === 2 && (
              <Button
                size="sm"
                onClick={() => setStep(3)}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                Revisar importação
              </Button>
            )}

            {step === 3 && (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || (validRowsCount === 0 && skipInvalid)}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Importar vendas'
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
