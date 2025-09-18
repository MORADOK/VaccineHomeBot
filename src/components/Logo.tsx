import React from 'react'
import logoBundled from '/images/hospital-logo.png'

const resolvedUrl =
  (import.meta.env.VITE_LOGO_URL as string | undefined) || logoBundled

type Props = React.ImgHTMLAttributes<HTMLImageElement>

export default function Logo({ className = 'w-full h-full object-contain object-center', ...rest }: Props) {
  return (
    <img
      src={resolvedUrl}
      alt="โลโก้โรงพยาบาลโฮม"
      className={className}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoBundled }}
      {...rest}
    />
  )
}
