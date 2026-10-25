import React, { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enableWatermark || !src) {
      setDisplaySrc(src)
      return
    }

    // Se já está no cache
    if (watermarkCache.has(src)) {
      setDisplaySrc(watermarkCache.get(src)!)
      return
    }

    // Se a imagem já vier com watermark server-side do domínio original, manter
    if (src.includes('watermark.php')) {
      setDisplaySrc(src)
      return
    }

    let isMounted = true
    setLoading(true)

    aplicarMarcaDagua(src, {
      posicao: 'canto-inferior-direito',
      opacidade: 0.88,
    })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        watermarkCache.set(src, objectUrl)
        if (isMounted) {
          setDisplaySrc(objectUrl)
        }
      })
      .catch((err) => {
        // Fallback gracioso para a imagem original se CORS/Canvas bloquear
        console.debug('Não foi possível aplicar marca d água via canvas:', err)
        if (isMounted) {
          setDisplaySrc(src)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [src, enableWatermark])

  return <img src={displaySrc} alt={alt} crossOrigin="anonymous" className={className} {...props} />
}

export default WatermarkedImage
