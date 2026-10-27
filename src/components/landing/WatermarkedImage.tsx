import React, { useState, useEffect } from 'react'
import logoPngAsset from '@/assets/logo-gesso-bettone-eb5aa.png'
import { aplicarMarcaDagua } from '@/lib/watermark'

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  className?: string
  enableWatermark?: boolean
}

// Cache em memória para evitar reprocessamento repetido de imagem já carimbada
const watermarkCache = new Map<string, string>()

export const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  className,
  enableWatermark = true,
  ...props
}) => {
  const [displaySrc, setDisplaySrc] = useState<string>(src)
  const [isWatermarkedInPixel, setIsWatermarkedInPixel] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
    if (!enableWatermark || !src) {
      setDisplaySrc(src)
      setIsWatermarkedInPixel(false)
      return
    }

    // Se já está no cache
    if (watermarkCache.has(src)) {
      setDisplaySrc(watermarkCache.get(src)!)
      setIsWatermarkedInPixel(true)
      return
    }

    // Se a imagem já vier com watermark server-side do domínio original, já tem marca d'água impressa
    if (src.includes('watermark.php')) {
      setDisplaySrc(src)
      setIsWatermarkedInPixel(true)
      return
    }

    let isMounted = true

    aplicarMarcaDagua(src, {
      posicao: 'canto-inferior-direito',
      opacidade: 0.88,
    })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        watermarkCache.set(src, objectUrl)
        if (isMounted) {
          setDisplaySrc(objectUrl)
          setIsWatermarkedInPixel(true)
        }
      })
      .catch((err) => {
        // Fallback gracioso: usa a imagem original e o overlay HTML/SVG garante a marca visualmente
        console.debug('Marca d água aplicada via overlay CSS/SVG:', err)
        if (isMounted) {
          setDisplaySrc(src)
          setIsWatermarkedInPixel(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [src, enableWatermark])

  if (!displaySrc || hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-[#2C3E50]/10 via-[#2C3E50]/5 to-[#D4AF37]/10 flex flex-col items-center justify-center text-center p-4 select-none ${className || ''}`}
      >
        <span className="font-heading text-xs font-semibold text-[#2C3E50]/60 uppercase tracking-wider">
          Gesso Bettone
        </span>
        <span className="text-[10px] text-[#616F7D]/70 mt-0.5 line-clamp-1">
          {alt || 'Acabamento sob medida'}
        </span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <img
        src={displaySrc}
        alt={alt}
        crossOrigin="anonymous"
        onError={() => setHasError(true)}
        className={className}
        {...props}
      />

      {/* Selo/Marca D'água Elegante Garantido: traz o logotipo oficial da Gesso Bettone + texto nítido */}
      {enableWatermark && !isWatermarkedInPixel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C252B]/90 backdrop-blur-sm border border-[#D4AF37]/75 shadow-lg select-none transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-[#D4AF37]/60 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            <img
              src={logoPngAsset}
              alt=""
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-xs font-bold text-white tracking-wide font-sans drop-shadow-xs">
              Gesso Bettone
            </span>
            <span className="text-[9px] font-semibold text-[#D4AF37] tracking-wider mt-0.5">
              Gesso &amp; Drywall • Alto Padrão
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WatermarkedImage
