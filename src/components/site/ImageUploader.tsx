import React, { useRef, useState } from 'react'
import {
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Loader2,
  GripVertical,
} from 'lucide-react'
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

  // Estado para drag-and-drop de reordenação (HTML5 Drag + Pointer/Touch)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const touchDragRef = useRef<{
    index: number
    active: boolean
    element: HTMLElement | null
    startX: number
    startY: number
  }>({
    index: -1,
    active: false,
    element: null,
    startX: 0,
    startY: 0,
  })

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
      const clean = val.replace(/^\/+/, '')
      if (clean.startsWith('simulador/')) {
        return supabaseGetPublicUrl('simulador', clean.slice('simulador/'.length))
      }
      if (clean.startsWith('public-media/')) {
        return supabaseGetPublicUrl('public-media', clean.slice('public-media/'.length))
      }
      const bucket = collectionName?.includes('simulador') ? 'simulador' : 'public-media'
      return supabaseGetPublicUrl(bucket, clean)
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

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= values.length ||
      toIndex >= values.length
    ) {
      return
    }
    const updated = [...values]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(updated)
  }

  // Pointer events para suporte a toque suave no mobile
  const handlePointerDown = (index: number, e: React.PointerEvent<HTMLElement>) => {
    if (!multiple) return
    const target = e.target as HTMLElement
    // Se clicou num botão de remover/mover, não iniciar drag
    if (target.closest('button')) return

    touchDragRef.current = {
      index,
      active: true,
      element: e.currentTarget,
      startX: e.clientX,
      startY: e.clientY,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!touchDragRef.current.active) return
    const dist = Math.hypot(
      e.clientX - touchDragRef.current.startX,
      e.clientY - touchDragRef.current.startY,
    )
    if (dist > 8 && draggingIndex === null) {
      setDraggingIndex(touchDragRef.current.index)
    }

    if (touchDragRef.current.active && draggingIndex !== null) {
      // Descobre sobre qual elemento está passando
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY)
      const card = elemBelow?.closest('[data-image-index]') as HTMLElement | null
      if (card && card.dataset.imageIndex !== undefined) {
        const targetIdx = parseInt(card.dataset.imageIndex, 10)
        if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
          setDragOverIndex(targetIdx)
        }
      }
    }
  }

  const handlePointerUp = () => {
    if (touchDragRef.current.active) {
      if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
        reorderItems(draggingIndex, dragOverIndex)
      }
      touchDragRef.current = { index: -1, active: false, element: null, startX: 0, startY: 0 }
      setDraggingIndex(null)
      setDragOverIndex(null)
    }
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
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`grid gap-3 pt-2 ${
            multiple ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1 max-w-[280px]'
          }`}
        >
          {values.map((val, idx) => {
            const previewUrl = resolvePreviewUrl(val)
            const isDragging = draggingIndex === idx
            const isOver = dragOverIndex === idx && draggingIndex !== idx

            return (
              <div
                key={idx}
                data-image-index={idx}
                draggable={multiple}
                onDragStart={(e) => {
                  if (!multiple) return
                  setDraggingIndex(idx)
                  e.dataTransfer.setData('text/plain', String(idx))
                }}
                onDragOver={(e) => {
                  if (!multiple) return
                  e.preventDefault()
                  if (dragOverIndex !== idx) setDragOverIndex(idx)
                }}
                onDragLeave={() => {
                  if (!multiple) return
                  if (dragOverIndex === idx) setDragOverIndex(null)
                }}
                onDrop={(e) => {
                  if (!multiple) return
                  e.preventDefault()
                  const from = draggingIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10)
                  if (!isNaN(from)) {
                    reorderItems(from, idx)
                  }
                  setDraggingIndex(null)
                  setDragOverIndex(null)
                }}
                onDragEnd={() => {
                  setDraggingIndex(null)
                  setDragOverIndex(null)
                }}
                onPointerDown={(e) => handlePointerDown(idx, e)}
                className={`relative group rounded-xl overflow-hidden border bg-[#2C3E50]/5 shadow-xs transition-all touch-none select-none ${
                  isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                } ${
                  isOver
                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37] scale-102 shadow-md'
                    : 'border-[#DEE4EA]'
                } ${multiple ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div
                  className={`${aspectRatioClass} w-full overflow-hidden flex items-center justify-center bg-black/5`}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[#616F7D]" />
                  )}
                </div>

                {/* Ícone sutil de arraste visível no canto superior esquerdo para reforçar drag-and-drop */}
                {multiple && (
                  <div
                    className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/60 text-white/90 shadow-xs flex items-center justify-center z-10 pointer-events-none"
                    title="Arrastar para reordenar"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Botão de exclusão sempre acessível no mobile e no desktop */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(idx)
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-sm transition-all z-20"
                  title="Remover imagem"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Controles de ordem secundários no hover para acessibilidade desktop */}
                {multiple && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 z-10">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMove(idx, 'up')
                        }}
                        className="p-1 rounded bg-white/90 hover:bg-white text-[#2C3E50] transition-colors"
                        title="Mover para trás"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {idx < values.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMove(idx, 'down')
                        }}
                        className="p-1 rounded bg-white/90 hover:bg-white text-[#2C3E50] transition-colors"
                        title="Mover para frente"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {multiple && (
                  <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
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
