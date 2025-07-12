// Utilitário para detecção mobile mais robusta
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // User Agent detection
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'iphone', 'ipad', 'ipod', 'blackberry', 
    'mobile', 'phone', 'tablet', 'touch', 'opera mini'
  ];
  
  const hasKeswordsMatch = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );
  
  // Screen size detection
  const isSmallScreen = window.innerWidth <= 768;
  
  // Touch capability detection
  const hasTouchCapability = 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;
  
  // Orientation detection
  const hasOrientationAPI = 'orientation' in window;
  
  return hasKeswordsMatch || isSmallScreen || hasTouchCapability || hasOrientationAPI;
};

// Forçar aplicação de estilos mobile
export const forceMobileStyles = (): void => {
  if (!isMobileDevice()) return;
  
  // Aplicar meta viewport
  let viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }
  
  // Adicionar classe mobile ao body
  document.body.classList.add('mobile-device');
  
  // Prevenir zoom em inputs
  const style = document.createElement('style');
  style.innerHTML = `
    input, select, textarea {
      font-size: 16px !important;
      transform: scale(1) !important;
    }
    
    .mobile-device {
      -webkit-text-size-adjust: 100% !important;
      -moz-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
      touch-action: manipulation !important;
      overscroll-behavior: contain !important;
    }
    
    .mobile-device * {
      -webkit-overflow-scrolling: touch !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('Mobile styles forcefully applied');
};

// Detectar e aplicar imediatamente
if (typeof window !== 'undefined') {
  // Executar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceMobileStyles);
  } else {
    forceMobileStyles();
  }
}