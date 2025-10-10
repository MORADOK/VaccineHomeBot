import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SystemStatus {
    loading: boolean;
    progress: number;
    status: string;
    error?: string;
}

const MainIndexPage = () => {
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        loading: true,
        progress: 0,
        status: 'เริ่มต้นระบบ...'
    });

    const [showMainMenu, setShowMainMenu] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Simulate system initialization with realistic progress
        const initSteps = [
            { progress: 10, status: 'กำลังโหลดส่วนประกอบหลัก...', delay: 200 },
            { progress: 25, status: 'กำลังเตรียมระบบฐานข้อมูล...', delay: 400 },
            { progress: 40, status: 'กำลังตรวจสอบการเชื่อมต่อ...', delay: 300 },
            { progress: 60, status: 'กำลังโหลดส่วนติดต่อผู้ใช้...', delay: 350 },
            { progress: 80, status: 'กำลังเตรียมระบบความปลอดภัย...', delay: 250 },
            { progress: 95, status: 'เกือบเสร็จแล้ว...', delay: 200 },
            { progress: 100, status: 'ระบบพร้อมใช้งาน!', delay: 300 }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < initSteps.length) {
                const step = initSteps[currentStep];
                setSystemStatus(prev => ({
                    ...prev,
                    progress: step.progress,
                    status: step.status
                }));
                currentStep++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setSystemStatus(prev => ({ ...prev, loading: false }));
                    setShowMainMenu(true);
                }, 500);
            }
        }, 300);

        return () => clearInterval(interval);
    }, []);

    const handleNavigation = (path: string, label: string) => {
        setSystemStatus(prev => ({
            ...prev,
            loading: true,
            progress: 0,
            status: `กำลังเปิด${label}...`
        }));

        // Simulate loading before navigation
        setTimeout(() => {
            navigate(path);
        }, 800);
    };

    const quickAccessItems = [
        {
            id: 'admin',
            title: 'ระบบผู้ดูแล',
            description: 'จัดการระบบและตั้งค่าทั่วไป',
            icon: '🔧',
            path: '/admin',
            color: 'hsl(170, 50%, 45%)',
            bgColor: 'hsl(170, 50%, 45%, 0.1)'
        },
        {
            id: 'staff',
            title: 'เจ้าหน้าที่',
            description: 'จัดการนัดหมายและข้อมูลผู้ป่วย',
            icon: '👩‍⚕️',
            path: '/staff-portal',
            color: 'hsl(210, 85%, 60%)',
            bgColor: 'hsl(210, 85%, 60%, 0.1)'
        },
        {
            id: 'patient',
            title: 'ผู้ป่วย',
            description: 'ลงทะเบียนและตรวจสอบสถานะวัคซีน',
            icon: '👤',
            path: '/patient-portal',
            color: 'hsl(145, 75%, 45%)',
            bgColor: 'hsl(145, 75%, 45%, 0.1)'
        },
        {
            id: 'linebot',
            title: 'LINE Bot',
            description: 'ระบบแชทบอทและการแจ้งเตือน',
            icon: '🤖',
            path: '/line-bot',
            color: 'hsl(40, 85%, 55%)',
            bgColor: 'hsl(40, 85%, 55%, 0.1)'
        }
    ];

    if (systemStatus.loading || !showMainMenu) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: 'linear-gradient(135deg, hsl(210, 40%, 98%) 0%, hsl(170, 30%, 95%) 100%)'
            }}>
                <div style={{
                    textAlign: 'center',
                    color: 'hsl(210, 25%, 15%)',
                    maxWidth: '450px',
                    padding: '50px 40px',
                    background: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    border: '1px solid hsl(210, 30%, 90%)'
                }}>
                    {/* Animated Logo */}
                    <div style={{
                        width: '120px',
                        height: '120px',
                        background: 'linear-gradient(135deg, hsl(170, 50%, 45%) 0%, hsl(170, 60%, 55%) 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 30px',
                        fontSize: '60px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}>
                        🏥
                    </div>

                    {/* Title */}
                    <h1 style={{
                        margin: '0 0 10px 0',
                        fontSize: '32px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, hsl(170, 50%, 45%) 0%, hsl(170, 60%, 55%) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        VCHome Hospital
                    </h1>

                    <h2 style={{
                        margin: '0 0 40px 0',
                        fontSize: '20px',
                        color: 'hsl(210, 25%, 40%)',
                        fontWeight: '500'
                    }}>
                        ระบบจัดการวัคซีน
                    </h2>

                    {/* Progress Section */}
                    <div style={{ marginBottom: '30px' }}>
                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: '12px',
                            background: 'hsl(210, 30%, 95%)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            border: '1px solid hsl(210, 30%, 90%)'
                        }}>
                            <div style={{
                                width: `${systemStatus.progress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, hsl(170, 50%, 45%) 0%, hsl(170, 60%, 55%) 100%)',
                                borderRadius: '6px',
                                transition: 'width 0.3s ease-out',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} />
                        </div>

                        {/* Status Text */}
                        <p style={{
                            margin: '0 0 10px 0',
                            fontSize: '16px',
                            color: 'hsl(210, 25%, 30%)',
                            fontWeight: '500'
                        }}>
                            {systemStatus.status}
                        </p>

                        {/* Progress Percentage */}
                        <p style={{
                            margin: '0',
                            fontSize: '24px',
                            fontWeight: '700',
                            color: 'hsl(170, 50%, 45%)'
                        }}>
                            {systemStatus.progress}%
                        </p>
                    </div>

                    {/* Loading Animation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '20px'
                    }}>
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    background: 'hsl(170, 50%, 45%)',
                                    borderRadius: '50%',
                                    animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                                }}
                            />
                        ))}
                    </div>

                    {/* Hospital Info */}
                    <div style={{
                        padding: '20px',
                        background: 'hsl(210, 40%, 98%)',
                        borderRadius: '12px',
                        border: '1px solid hsl(210, 30%, 90%)'
                    }}>
                        <p style={{
                            margin: '0',
                            fontSize: '14px',
                            color: 'hsl(210, 25%, 50%)',
                            lineHeight: '1.6'
                        }}>
                            โรงพยาบาลโฮม<br />
                            ระบบจัดการวัคซีนและนัดหมายการฉีดวัคซีน<br />
                            <strong>เวอร์ชัน 1.0.0</strong>
                        </p>
                    </div>

                    {/* CSS Animations */}
                    <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          `}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: 'linear-gradient(135deg, hsl(210, 40%, 98%) 0%, hsl(170, 30%, 95%) 100%)',
            padding: '40px 20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '50px'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'linear-gradient(135deg, hsl(170, 50%, 45%) 0%, hsl(170, 60%, 55%) 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 30px',
                        fontSize: '50px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                    }}>
                        🏥
                    </div>

                    <h1 style={{
                        margin: '0 0 10px 0',
                        fontSize: '42px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, hsl(170, 50%, 45%) 0%, hsl(170, 60%, 55%) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        VCHome Hospital
                    </h1>

                    <h2 style={{
                        margin: '0 0 15px 0',
                        fontSize: '24px',
                        color: 'hsl(210, 25%, 30%)',
                        fontWeight: '600'
                    }}>
                        ระบบจัดการวัคซีน
                    </h2>

                    <p style={{
                        margin: '0 auto',
                        fontSize: '18px',
                        color: 'hsl(210, 25%, 50%)',
                        maxWidth: '600px',
                        lineHeight: '1.6'
                    }}>
                        ระบบจัดการที่ครบครันสำหรับการดูแลผู้ป่วยและการจัดการวัคซีน
                    </p>
                </div>

                {/* Quick Access Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '25px',
                    marginBottom: '50px'
                }}>
                    {quickAccessItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNavigation(item.path, item.title)}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '30px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                                border: '1px solid hsl(210, 30%, 90%)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 15px 45px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                            }}
                        >
                            {/* Background Accent */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '100px',
                                height: '100px',
                                background: item.bgColor,
                                borderRadius: '50%',
                                transform: 'translate(30px, -30px)'
                            }} />

                            {/* Icon */}
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                {item.icon}
                            </div>

                            {/* Content */}
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h3 style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '22px',
                                    fontWeight: '700',
                                    color: item.color
                                }}>
                                    {item.title}
                                </h3>

                                <p style={{
                                    margin: '0',
                                    fontSize: '16px',
                                    color: 'hsl(210, 25%, 50%)',
                                    lineHeight: '1.5'
                                }}>
                                    {item.description}
                                </p>
                            </div>

                            {/* Arrow Icon */}
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                right: '20px',
                                fontSize: '20px',
                                color: item.color,
                                opacity: 0.7
                            }}>
                                →
                            </div>
                        </div>
                    ))}
                </div>

                {/* System Info */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    border: '1px solid hsl(210, 30%, 90%)',
                    textAlign: 'center'
                }}>
                    <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: '20px',
                        color: 'hsl(170, 50%, 45%)',
                        fontWeight: '600'
                    }}>
                        ℹ️ ข้อมูลระบบ
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        textAlign: 'left'
                    }}>
                        <div>
                            <strong style={{ color: 'hsl(210, 25%, 30%)' }}>เวอร์ชัน:</strong>
                            <span style={{ marginLeft: '10px', color: 'hsl(210, 25%, 50%)' }}>1.0.0</span>
                        </div>
                        <div>
                            <strong style={{ color: 'hsl(210, 25%, 30%)' }}>สถานะ:</strong>
                            <span style={{ marginLeft: '10px', color: 'hsl(145, 75%, 45%)' }}>🟢 ออนไลน์</span>
                        </div>
                        <div>
                            <strong style={{ color: 'hsl(210, 25%, 30%)' }}>อัพเดทล่าสุด:</strong>
                            <span style={{ marginLeft: '10px', color: 'hsl(210, 25%, 50%)' }}>9 ตุลาคม 2025</span>
                        </div>
                        <div>
                            <strong style={{ color: 'hsl(210, 25%, 30%)' }}>ผู้พัฒนา:</strong>
                            <span style={{ marginLeft: '10px', color: 'hsl(210, 25%, 50%)' }}>VCHome Team</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '40px',
                    padding: '20px',
                    color: 'hsl(210, 25%, 60%)',
                    fontSize: '14px'
                }}>
                    <p style={{ margin: '0' }}>
                        © 2025 VCHome Hospital Management System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MainIndexPage;