import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoadingPage = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('เริ่มต้นระบบ...');
  const navigate = useNavigate();

  useEffect(() => {
    const steps = [
      { progress: 20, status: 'กำลังโหลดส่วนประกอบ...', delay: 300 },
      { progress: 40, status: 'กำลังเตรียมระบบ...', delay: 500 },
      { progress: 60, status: 'กำลังตรวจสอบการเชื่อมต่อ...', delay: 700 },
      { progress: 80, status: 'เกือบเสร็จแล้ว...', delay: 900 },
      { progress: 100, status: 'เสร็จสิ้น!', delay: 1200 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.progress);
        setStatus(step.status);
        currentStep++;
      } else {
        clearInterval(interval);
        // Navigate to auth page after loading
        setTimeout(() => {
          navigate('/auth');
        }, 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [navigate]);

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
        maxWidth: '400px',
        padding: '40px'
      }}>
        {/* Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'hsl(170, 50%, 45%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          fontSize: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          🏥
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: 'hsl(170, 50%, 45%)'
        }}>
          VCHome Hospital
        </h1>
        
        <h2 style={{
          margin: '0 0 30px 0',
          fontSize: '20px',
          color: 'hsl(210, 25%, 15%)',
          fontWeight: '600'
        }}>
          ระบบจัดการวัคซีน
        </h2>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: 'hsl(170, 50%, 45%, 0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'hsl(170, 50%, 45%)',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out'
          }} />
        </div>

        {/* Status */}
        <p style={{
          margin: '0 0 10px 0',
          opacity: '0.7',
          fontSize: '16px'
        }}>
          {status}
        </p>

        {/* Progress Percentage */}
        <p style={{
          margin: '0',
          opacity: '0.5',
          fontSize: '14px'
        }}>
          {progress}%
        </p>

        {/* Hospital Info */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: 'hsl(210, 25%, 40%)',
            lineHeight: '1.5'
          }}>
            โรงพยาบาลโฮม<br />
            ระบบจัดการวัคซีนและนัดหมายการฉีดวัคซีน
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;