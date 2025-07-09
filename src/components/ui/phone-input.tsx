
import * as React from "react"
import PhoneInputComponent from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  value?: string
  onChange?: (value?: string) => void
  className?: string
  id?: string
  required?: boolean
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || '')
    const [isBlocked, setIsBlocked] = React.useState(false)

    // Sincronizar valor interno com valor externo
    React.useEffect(() => {
      setInternalValue(value || '')
      setIsBlocked(false)
    }, [value])

    const handleChange = (newValue?: string) => {
      console.log('PhoneInput - Tentativa de alterar para:', newValue)
      
      // Se o valor for vazio, permitir
      if (!newValue || newValue === '') {
        console.log('PhoneInput - Valor vazio, permitindo')
        setInternalValue('')
        setIsBlocked(false)
        onChange?.('')
        return
      }
      
      // Verificar limite baseado no país
      const maxLength = newValue.startsWith('+55') ? 15 : 17
      
      // Se exceder o limite, bloquear completamente
      if (newValue.length > maxLength) {
        console.log(`PhoneInput - Valor excede limite de ${maxLength} caracteres (${newValue.length}), BLOQUEANDO COMPLETAMENTE`)
        setIsBlocked(true)
        // Não atualizar nada, manter o valor anterior
        return
      }
      
      // Se estava bloqueado mas agora está dentro do limite, desbloquear
      if (isBlocked && newValue.length <= maxLength) {
        console.log('PhoneInput - Desbloqueando, valor dentro do limite')
        setIsBlocked(false)
      }
      
      // Se não está bloqueado, aceitar o valor
      if (!isBlocked) {
        console.log('PhoneInput - Valor aceito:', newValue)
        setInternalValue(newValue)
        onChange?.(newValue)
      }
    }

    // Interceptar eventos de teclado para bloquear na fonte
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Se já atingiu o limite e não é uma tecla de controle, bloquear
      if (internalValue && internalValue.length >= (internalValue.startsWith('+55') ? 15 : 17)) {
        // Permitir apenas teclas de controle como Backspace, Delete, Arrow keys, etc.
        const allowedKeys = [
          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End', 'Tab', 'Enter', 'Escape'
        ]
        
        if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
          console.log('PhoneInput - Bloqueando tecla:', e.key)
          e.preventDefault()
        }
      }
    }

    return (
      <div onKeyDown={handleKeyDown}>
        <PhoneInputComponent
          international
          countryCallingCodeEditable={false}
          defaultCountry="BR"
          value={internalValue}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-foreground",
            "[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:outline-0 [&_.PhoneInputInput]:text-foreground [&_.PhoneInputInput]:placeholder-muted-foreground",
            "[&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:text-foreground",
            "[&_.PhoneInputCountrySelectArrow]:fill-muted-foreground",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
