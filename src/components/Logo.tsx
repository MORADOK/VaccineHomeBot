import React from 'react'

// Use relative path for GitHub Pages compatibility
const getLogoUrl = () => {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const logoPath = 'images/hospital-logo.png'
  return baseUrl + logoPath
}

const resolvedUrl =
  (import.meta.env.VITE_LOGO_URL as string | undefined) || getLogoUrl()

type Props = React.ImgHTMLAttributes<HTMLImageElement>

export default function Logo({ className = 'w-full h-full object-contain object-center', ...rest }: Props) {
  return (
    <img
      src={resolvedUrl}
      alt="โลโก้โรงพยาบาลโฮม"
      className={className}
      onError={(e) => { 
        // Fallback to different logo paths
        const fallbacks = [
          getLogoUrl(),
          '/images/hospital-logo.png',
          '/images/home-hospital-logo.png',
          '/favicon-hospital.png'
        ]
        const currentSrc = (e.currentTarget as HTMLImageElement).src
        const currentIndex = fallbacks.findIndex(url => currentSrc.includes(url.split('/').pop() || ''))
        if (currentIndex < fallbacks.length - 1) {
          (e.currentTarget as HTMLImageElement).src = fallbacks[currentIndex + 1]
        }
      }}
      {...rest}
    />
  )
}
