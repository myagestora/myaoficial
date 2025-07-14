// Utilitário para detecção mobile mais robusta
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // User Agent detection
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'iphone', 'ipad', 'ipod', 'blackberry', 
    'mobile', 'phone', 'tablet', 'touch', 'opera mini'
  ];
  
  const hasKeywordsMatch = mobileKeywords.some(keyword => 
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
  
  return hasKeywordsMatch || isSmallScreen || hasTouchCapability || hasOrientationAPI;
};

// Detectar especificamente iOS/Safari
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detectar Safari
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/chrome|chromium|edg/.test(userAgent);
};

// Função simplificada apenas para detecção
export const forceMobileStyles = (): void => {
  console.log('Mobile detection called');
};