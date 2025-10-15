import React from 'react';

interface HospitalLogoProps {
  className?: string;
  size?: number;
}

export const HospitalLogo: React.FC<HospitalLogoProps> = ({
  className = "mx-auto",
  size = 128
}) => {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-white/50 to-transparent p-2 backdrop-blur-sm">
        <img
          src="/images/hospital-logo.png"
          alt="VCHome Hospital Logo"
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            // Fallback to other hospital logos if main logo fails
            const target = e.target as HTMLImageElement;
            if (target.src.includes('hospital-logo.png')) {
              target.src = '/images/home-hospital-logo.png';
            } else if (target.src.includes('home-hospital-logo.png')) {
              target.src = '/images/home-hospital-logo.svg';
            } else if (target.src.includes('home-hospital-logo.svg')) {
              target.src = '/favicon-hospital.png';
            }
          }}
        />
      </div>
    </div>
  );
};

export default HospitalLogo;
