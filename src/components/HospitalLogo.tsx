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
          src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png"
          alt="VCHome Hospital Logo"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
};

export default HospitalLogo;
