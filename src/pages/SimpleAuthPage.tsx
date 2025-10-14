import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SimpleAuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGuestAccess = () => {
    setIsLoading(true);
    // Simulate quick loading
    setTimeout(() => {
      navigate('/admin');
    }, 500);
  };

  const handleStaffLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/auth-full'); // Redirect to real login page
    }, 500);
  };

  const handlePatientPortal = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/patient-portal');
    }, 500);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'hsl(210, 40%, 98%)'
    }}>
      <div style={{
        textAlign: 'center',
        color: 'hsl(210, 25%, 15%)',
        maxWidth: '500px',
        padding: '40px'
      }}>
        {/* Logo */}
        <div style={{
          width: '100px',
          height: '100px',
          background: 'hsl(170, 50%, 45%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          fontSize: '50px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          🏥
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '32px',
          fontWeight: '700',
          color: 'hsl(170, 50%, 45%)'
        }}>
          VCHome Hospital
        </h1>
        
        <h2 style={{
          margin: '0 0 40px 0',
          fontSize: '24px',
          color: 'hsl(210, 25%, 15%)',
          fontWeight: '600'
        }}>
          ระบบจัดการวัคซีน
        </h2>

        {/* Quick Access Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <button
            onClick={handleGuestAccess}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              background: 'hsl(170, 50%, 45%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : '🔧 เข้าสู่ระบบผู้ดูแล'}
          </button>

          <button
            onClick={handleStaffLogin}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              background: 'white',
              color: 'hsl(170, 50%, 45%)',
              border: '2px solid hsl(170, 50%, 45%)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : '👩‍⚕️ เจ้าหน้าที่'}
          </button>

          <button
            onClick={handlePatientPortal}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              background: 'white',
              color: 'hsl(170, 50%, 45%)',
              border: '2px solid hsl(170, 50%, 45%)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : '👤 ผู้ป่วย'}
          </button>
        </div>

        {/* Info */}
        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: 'hsl(170, 50%, 45%)',
            fontSize: '18px'
          }}>
            🚀 เข้าใช้งานด่วน
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: 'hsl(210, 25%, 40%)',
            lineHeight: '1.5'
          }}>
            เลือกประเภทผู้ใช้งานเพื่อเข้าสู่ระบบ<br />
            ระบบจะนำคุณไปยังหน้าที่เหมาะสม
          </p>
        </div>

        <p style={{
          margin: '0',
          opacity: '0.5',
          fontSize: '13px'
        }}>
          VCHome Hospital Management System v1.0.0
        </p>
      </div>
    </div>
  );
};

export default SimpleAuthPage;