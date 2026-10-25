import React, { useRef, useState } from 'react'
import { Upload, X, ArrowUp, ArrowDown, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { isSelfHostedSupabase } from '@/lib/dataAdapter'
import { supabaseGetPublicUrl } from '@/lib/supabase/client'

export interface MediaItem {
  id?: string
  url: string
  file?: File
  isExistingFile?: boolean
  fileName?: string
}

interface ImageUploaderProps {
  label: string
  helperText?: string
  multiple?: boolean
  values: string[] // URLs ou nomes de arquivos existentes
  onChange: (values: string[], files?: File[]) => void
  collectionName?: string
  recordId?: string
  maxFiles?: number
  aspectRatioClass?: string
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  helperText,
  multiple = false,
  values = [],
  onChange,
  collectionName,
  recordId,
  maxFiles = 20,
  aspectRatioClass = 'aspect-video',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Normalizar itens para pré-visualização
  const resolvePreviewUrl = (val: string) => {
    if (!val) return ''
    if (
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('data:') ||
      val.startsWith('blob:')
    ) {
      return val
    }
    if (isSelfHostedSupabase() && val) {
      const bucket = collectionName?.includes('simulador') ? 'simulador' : 'public-media'
      return supabaseGetPublicUrl(bucket, val)
    }
    if (collectionName && recordId && val) {
      const pbBase = pb.baseUrl || ''
      return `${pbBase.replace(/\/+$/, '')}/api/files/${collectionName}/${recordId}/${val}`
    }
    return val
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const selectedFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'))

    if (selectedFiles.length === 0) return

    setUploading(true)
    try {
      if (!multiple) {
        // Modo único
        const file = selectedFiles[0]
        const blobUrl = URL.createObjectURL(file)
        onChange([blobUrl], [file])
      } else {
        // Modo múltiplo
        const newBlobUrls = selectedFiles.map((f) => URL.createObjectURL(f))
        const updated = [...values, ...newBlobUrls].slice(0, maxFiles)
        onChange(updated, selectedFiles)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (index: number) => {
    const updated = values.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= values.length) return
    const updated = [...values]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#2C3E50]">{label}</Label>
        {helperText && <span className="text-[11px] text-[#616F7D]">{helperText}</span>}
      </div>

      {/* Área de drop e seleção de arquivo */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
            : 'border-[#DEE4EA] hover:border-[#2C3E50]/40 bg-[#FAFAFA]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-1.5 py-2">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
          ) : (
            <Upload className="w-6 h-6 text-[#616F7D]" />
          )}
          <p className="text-xs font-medium text-[#2C3E50]">
            {multiple
              ? 'Clique ou arraste imagens aqui (galeria)'
              : 'Clique ou arraste a imagem aqui'}
          </p>
          <p className="text-[10px] text-[#616F7D]">
            JPG, PNG, WEBP ou SVG (alta qualidade até 15MB)
          </p>
        </div>
      </div>

      {/* Grid de Pré-visualização com Reordenação e Remoção */}
      {values.length > 0 && (
        <div
          className={`grid gap-3 pt-2 ${
            multiple ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1 max-w-[280px]'
          }`}
        >
          {values.map((val, idx) => {
            const previewUrl = resolvePreviewUrl(val)
            return (
              <div
                key={idx}
                className="relative group rounded-xl overflow-hidden border border-[#DEE4EA] bg-[#2C3E50]/5 shadow-xs"
              >
                <div
                  className={`${aspectRatioClass} w-full overflow-hidden flex items-center justify-center bg-black/5`}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[#616F7D]" />
                  )}
                </div>

                {/* Controles de exclusão e ordem no hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1.5">
                  {multiple && idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMove(idx, 'up')
                      }}
                      className="p-1 rounded bg-white/80 hover:bg-white text-[#2C3E50] transition-colors"
                      title="Mover para trás"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {multiple && idx < values.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMove(idx, 'down')
                      }}
                      className="p-1 rounded bg-white/80 hover:bg-white text-[#2C3E50] transition-colors"
                      title="Mover para frente"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(idx)
                    }}
                    className="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="Remover imagem"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {multiple && (
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ImageUploader
