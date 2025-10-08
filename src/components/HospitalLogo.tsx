import React from 'react';

interface HospitalLogoProps {
  className?: string;
  size?: number;
}

export const HospitalLogo: React.FC<HospitalLogoProps> = ({ 
  className = "mx-auto h-32 w-auto object-contain", 
  size = 128 
}) => {
  const logoUrl = `${import.meta.env.BASE_URL}images/hospital-logo.png`;
  
  return (
    <div className={className} style={{ width: size, height: size }}>
      <img 
        src={logoUrl}
        alt="โรงพยาบาลโฮม" 
        className="w-full h-full object-contain"
        onError={(e) => {
          console.log('Logo failed, using SVG fallback');
          // Replace with inline SVG fallback
          const img = e.currentTarget;
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 100 100');
          svg.setAttribute('className', 'w-full h-full');
          svg.innerHTML = `
            <rect width="100" height="100" fill="#0ea5e9" rx="10"/>
            <circle cx="50" cy="35" r="15" fill="white"/>
            <rect x="35" y="50" width="30" height="3" fill="white"/>
            <rect x="40" y="55" width="20" height="3" fill="white"/>
            <rect x="45" y="60" width="10" height="3" fill="white"/>
            <text x="50" y="80" text-anchor="middle" fill="white" font-size="8" font-family="Arial">โรงพยาบาล</text>
            <text x="50" y="90" text-anchor="middle" fill="white" font-size="8" font-family="Arial">โฮม</text>
          `;
          img.parentNode?.replaceChild(svg, img);
        }}
      />
    </div>
  );
};

export default HospitalLogo;