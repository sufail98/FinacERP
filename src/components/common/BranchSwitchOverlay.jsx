import { useState, useEffect } from 'react';

// Check immediately (outside component) to avoid flash
const getInitialShowState = () => {
  if (typeof window === 'undefined') return false;
  if (!window.electronAPI) return false;
  return sessionStorage.getItem('branchSwitching') === 'true';
};

const BranchSwitchOverlay = () => {
  // Initialize with the correct value immediately
  const [show, setShow] = useState(getInitialShowState);

  useEffect(() => {
    if (!show) return;

    // Clear flag and hide overlay after app is ready
    const timer = setTimeout(() => {
      sessionStorage.removeItem('branchSwitching');
      setShow(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [show]);

  // Don't render anything if not showing
  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        backgroundImage: 'url(./assets/images/paralax.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999,
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <img
          src="./assets/images/finac_splashlogo.png"
          alt="Logo"
          style={{
            width: '180px',
            marginBottom: '30px',
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
            animation: 'fadeIn 0.5s ease-out',
          }}
          onError={(e) => (e.target.style.display = 'none')}
        />

        <p
          style={{
            color: '#ffffff',
            fontSize: '16px',
            marginBottom: '20px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          Switching Branch...
        </p>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default BranchSwitchOverlay;