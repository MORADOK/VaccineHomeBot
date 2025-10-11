import React from 'react';

export const ScrollToTop = () => {
  const [scrollPercent, setScrollPercent] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollPercent(scrolled);
    };

    // Debug info
    console.log('ScrollToTop initialized');
    console.log('Document height:', document.documentElement.scrollHeight);
    console.log('Window height:', document.documentElement.clientHeight);
    console.log('Scrollable height:', document.documentElement.scrollHeight - document.documentElement.clientHeight);

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      id="scroll-helper"
      style={{
        position: 'fixed',
        right: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 999999,
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '50px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '3px solid #14b8a6',
      }}
    >
      {/* Up Button */}
      <button
        onClick={() => {
          console.log('Scrolling to top...');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }}
        style={{
          display: 'block',
          width: '50px',
          height: '50px',
          margin: '0 0 12px 0',
          padding: '0',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: '#14b8a6',
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(20,184,166,0.4)',
        }}
      >
        ↑
      </button>

      {/* Progress Bar */}
      <div
        style={{
          width: '16px',
          height: '220px',
          margin: '0 17px',
          backgroundColor: '#e5e7eb',
          borderRadius: '10px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${scrollPercent}%`,
            backgroundColor: '#14b8a6',
            transition: 'height 0.1s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${scrollPercent}%`,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '40px',
            backgroundColor: '#0891b2',
            borderRadius: '12px',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Down Button */}
      <button
        onClick={() => {
          console.log('Scrolling to bottom...');
          const maxScroll = document.documentElement.scrollHeight;
          window.scrollTo({ top: maxScroll, behavior: 'smooth' });
          document.documentElement.scrollTop = maxScroll;
          document.body.scrollTop = maxScroll;
        }}
        style={{
          display: 'block',
          width: '50px',
          height: '50px',
          margin: '12px 0 0 0',
          padding: '0',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: '#0891b2',
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(8,145,178,0.4)',
        }}
      >
        ↓
      </button>

      {/* Percentage */}
      <div
        style={{
          marginTop: '12px',
          padding: '6px 12px',
          backgroundColor: '#ccfbf1',
          color: '#0f766e',
          fontSize: '13px',
          fontWeight: 'bold',
          borderRadius: '20px',
          textAlign: 'center',
          border: '2px solid #14b8a6',
        }}
      >
        {Math.round(scrollPercent)}%
      </div>
    </div>
  );
};

export default ScrollToTop;
