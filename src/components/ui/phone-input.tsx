
import * as React from "react"
import PhoneInputComponent from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from "@/lib/utils"
import { parsePhoneNumber, CountryCode } from 'libphonenumber-js'

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
      if (!newValue) {
        onChange?.(newValue)
        return
      }

      // Contar apenas dígitos (removendo todos os caracteres não numéricos)
      const digitsOnly = newValue.replace(/\D/g, '')
      
      // Verificar limite baseado no código do país
      if (newValue.startsWith('+55') || digitsOnly.startsWith('55')) {
        // Brasil: máximo 13 dígitos total (55 + 11 dígitos nacionais)
        if (digitsOnly.length > 13) {
          return // Bloqueia a entrada
        }
      } else {
        // Outros países: máximo 15 dígitos total (padrão internacional)
        if (digitsOnly.length > 15) {
          return // Bloqueia a entrada
        }
      }

      // Se chegou até aqui, aceita a mudança
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
