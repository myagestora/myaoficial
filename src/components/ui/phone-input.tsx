
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
    const handleChange = (newValue?: string) => {
      console.log('PhoneInput - Valor alterado para:', newValue)
      
      // Limitar caracteres baseado no país
      if (newValue) {
        // Para Brasil: máximo 15 caracteres (+5511999999999)
        // Para outros países: máximo 17 caracteres
        const maxLength = newValue.startsWith('+55') ? 15 : 17
        
        if (newValue.length > maxLength) {
          console.log(`PhoneInput - Valor excede limite de ${maxLength} caracteres, bloqueando`)
          return // Não chama onChange se exceder o limite
        }
      }
      
      onChange?.(newValue)
    }

    return (
      <PhoneInputComponent
        international
        countryCallingCodeEditable={false}
        defaultCountry="BR"
        value={value}
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
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
