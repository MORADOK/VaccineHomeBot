import React from 'react';

export const DebugInfo: React.FC = () => {
  if (import.meta.env.PROD) return null; // Only show in development
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>BASE_URL: {import.meta.env.BASE_URL}</div>
      <div>MODE: {import.meta.env.MODE}</div>
      <div>PROD: {import.meta.env.PROD ? 'true' : 'false'}</div>
      <div>Logo URL: {`${import.meta.env.BASE_URL}images/hospital-logo.png`}</div>
    </div>
  );
};

export default DebugInfo;