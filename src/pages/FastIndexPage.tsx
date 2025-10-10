import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FastIndexPage = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fast loading simulation
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setLoading(false);
          return 100;
        }
        return prev + 20;
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  const handleQuickAccess = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '90%'
        }}>
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px'
          }}>
            🏥
          </div>

          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: '#0ea5e9'
          }}>
            VCHome Hospital
          </h1>

          <p style={{
            margin: '0 0 30px 0',
            color: '#64748b',
            fontSize: '16px'
          }}>
            ระบบจัดการวัคซีน
          </p>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '15px'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)',
              transition: 'width 0.2s ease'
            }} />
          </div>

          <p style={{
            margin: '0',
            color: '#0ea5e9',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {progress}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '50px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            🏥
          </div>

          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '36px',
            fontWeight: '700',
            color: '#0ea5e9'
          }}>
            VCHome Hospital
          </h1>

          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            color: '#64748b',
            fontWeight: '500'
          }}>
            ระบบจัดการวัคซีน
          </h2>

          <p style={{
            margin: '0',
            fontSize: '16px',
            color: '#64748b',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            เลือกระบบที่คุณต้องการเข้าใช้งาน
          </p>
        </div>

        {/* Quick Access Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Admin Card */}
          <div
            onClick={() => handleQuickAccess('/admin')}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e2e8f0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔧</div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#0ea5e9'
            }}>
              ระบบผู้ดูแล
            </h3>
            <p style={{
              margin: '0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              จัดการระบบและตั้งค่าทั่วไป
            </p>
          </div>

          {/* Staff Card */}
          <div
            onClick={() => handleQuickAccess('/staff-portal')}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e2e8f0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>👩‍⚕️</div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#10b981'
            }}>
              เจ้าหน้าที่
            </h3>
            <p style={{
              margin: '0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              จัดการนัดหมายและข้อมูลผู้ป่วย
            </p>
          </div>

          {/* Patient Card */}
          <div
            onClick={() => handleQuickAccess('/patient-portal')}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e2e8f0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>👤</div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#8b5cf6'
            }}>
              ผู้ป่วย
            </h3>
            <p style={{
              margin: '0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              ลงทะเบียนและตรวจสอบสถานะวัคซีน
            </p>
          </div>

          {/* LINE Bot Card */}
          <div
            onClick={() => handleQuickAccess('/line-bot')}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e2e8f0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🤖</div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#f59e0b'
            }}>
              LINE Bot
            </h3>
            <p style={{
              margin: '0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              ระบบแชทบอทและการแจ้งเตือน
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <p style={{
            margin: '0',
            color: '#64748b',
            fontSize: '14px'
          }}>
            VCHome Hospital Management System v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default FastIndexPage;