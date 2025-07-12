import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Função para detectar mobile de forma mais robusta
const detectMobile = (): boolean => {
  if (typeof window === "undefined") return false
  
  // Múltiplas formas de detectar mobile
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isMobileScreen = window.innerWidth < MOBILE_BREAKPOINT
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Se qualquer uma das condições for verdadeira, considera mobile
  return isMobileUserAgent || isMobileScreen || isTouchDevice
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => detectMobile())

  React.useEffect(() => {
    // Forçar redetecção imediata
    setIsMobile(detectMobile())
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(detectMobile())
    }
    
    mql.addEventListener("change", onChange)
    
    // Também escutar mudanças de orientação
    window.addEventListener('orientationchange', onChange)
    window.addEventListener('resize', onChange)
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener('orientationchange', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  return isMobile
}
