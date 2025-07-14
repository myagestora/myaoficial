import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  screenWidth: number;
  hasTouch: boolean;
}

export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        userAgent: '',
        screenWidth: 1024,
        hasTouch: false,
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detecção mais específica para diferentes tipos de dispositivos
    const isTablet = /ipad|tablet|kindle|playbook|silk/i.test(userAgent) ||
                    (hasTouch && screenWidth >= 768 && screenWidth <= 1024);
    
    const isMobilePhone = /android|iphone|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent) ||
                         (hasTouch && screenWidth < 768);
    
    const isMobile = isMobilePhone || isTablet;
    const isDesktop = !isMobile;

    return {
      isMobile: isMobilePhone, // Apenas telefones móveis
      isTablet,
      isDesktop,
      userAgent,
      screenWidth,
      hasTouch,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isTablet = /ipad|tablet|kindle|playbook|silk/i.test(userAgent) ||
                      (hasTouch && screenWidth >= 768 && screenWidth <= 1024);
      
      const isMobilePhone = /android|iphone|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent) ||
                           (hasTouch && screenWidth < 768);
      
      const isMobile = isMobilePhone || isTablet;
      const isDesktop = !isMobile;

      setDetection({
        isMobile: isMobilePhone,
        isTablet,
        isDesktop,
        userAgent,
        screenWidth,
        hasTouch,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return detection;
}

export function shouldUseMobileLayout(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Detecção AGRESSIVA para Android
  const isAndroid = /android/i.test(userAgent);
  const isMobileUA = /android|iphone|ipod|blackberry|iemobile|opera mini|mobile|samsung|lg|htc|motorola|nokia/i.test(userAgent);
  const isSmallScreen = screenWidth <= 768;
  const hasOrientation = typeof window.orientation !== 'undefined';
  
  // FORÇA Android SEMPRE usar mobile layout
  if (isAndroid) {
    console.log('🔥 ANDROID DETECTADO - FORÇANDO MOBILE LAYOUT');
    return true;
  }
  
  const result = isMobileUA || (hasTouch && isSmallScreen) || hasOrientation;
  
  console.log('📱 Mobile Detection v6 FORCE ANDROID:', { 
    userAgent: userAgent.substring(0, 50) + '...', 
    isAndroid: `🔥 ${isAndroid}`, 
    isMobileUA, 
    isSmallScreen, 
    hasTouch, 
    hasOrientation, 
    screenWidth,
    result: isAndroid ? '🔥 ANDROID FORCED TRUE' : result
  });
  
  return result;
}