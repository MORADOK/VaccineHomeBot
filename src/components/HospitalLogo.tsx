import React from 'react';

interface HospitalLogoProps {
  className?: string;
  size?: number;
}

export const HospitalLogo: React.FC<HospitalLogoProps> = ({
  className = "mx-auto",
  size = 128
}) => {
  // Get proper base URL for GitHub Pages
  const baseUrl = import.meta.env.BASE_URL || '/'
  const basePath = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  
  return (
    <div className={className} style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-white/50 to-transparent p-2 backdrop-blur-sm">
        <img
          src={basePath + "images/hospital-logo.png"}
          alt="รพ.โฮม - VCHome Hospital Logo"
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            // Fallback to other hospital logos if main logo fails
            const target = e.target as HTMLImageElement;
            const fallbacks = [
              basePath + 'images/home-hospital-logo.png',
              basePath + 'images/home-hospital-logo.svg',
              basePath + 'favicon-hospital.png'
            ];
            
            const currentSrc = target.src;
            let nextIndex = -1;
            
            if (currentSrc.includes('hospital-logo.png')) {
              nextIndex = 0;
            } else if (currentSrc.includes('home-hospital-logo.png')) {
              nextIndex = 1;
            } else if (currentSrc.includes('home-hospital-logo.svg')) {
              nextIndex = 2;
            }
            
            if (nextIndex >= 0 && nextIndex < fallbacks.length) {
              target.src = fallbacks[nextIndex];
            }
          }}
        />
      </div>
    </div>
  );
};

export default HospitalLogo;
