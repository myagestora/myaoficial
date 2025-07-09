
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

      try {
        const phoneNumber = parsePhoneNumber(newValue)
        
        if (phoneNumber?.country) {
          const maxLength = getMaxLengthForCountry(phoneNumber.country)
          const nationalNumber = phoneNumber.nationalNumber
          
          // Bloqueia se exceder o limite máximo
          if (nationalNumber.length > maxLength) {
            return // Não aceita a mudança
          }
        }
        
        // Se não tem país detectado mas o valor anterior tinha, verifica pelo país anterior
        if (!phoneNumber?.country && value) {
          try {
            const previousPhone = parsePhoneNumber(value)
            if (previousPhone?.country) {
              const maxLength = getMaxLengthForCountry(previousPhone.country)
              // Conta apenas os dígitos numéricos (remove espaços, parênteses, etc)
              const digitsOnly = newValue.replace(/\D/g, '')
              const countryCode = previousPhone.countryCallingCode
              const nationalDigits = digitsOnly.replace(new RegExp(`^${countryCode}`), '')
              
              if (nationalDigits.length > maxLength) {
                return // Não aceita a mudança
              }
            }
          } catch (e) {
            // Se não conseguir parsear o valor anterior, permite a mudança
          }
        }
        
        onChange?.(newValue)
      } catch (error) {
        // Em caso de erro no parsing, só aceita se não estiver excedendo um limite básico
        const digitsOnly = newValue.replace(/\D/g, '')
        if (digitsOnly.length <= 15) { // Limite internacional máximo
          onChange?.(newValue)
        }
      }
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

// Função auxiliar para obter o comprimento máximo do número nacional por país
const getMaxLengthForCountry = (country: CountryCode): number => {
  const maxLengths: Record<string, number> = {
    'BR': 11, // Brasil: 11 dígitos (ex: 11987654321)
    'US': 10, // EUA: 10 dígitos
    'CA': 10, // Canadá: 10 dígitos
    'GB': 11, // Reino Unido: até 11 dígitos
    'DE': 12, // Alemanha: até 12 dígitos
    'FR': 10, // França: 10 dígitos
    'IT': 11, // Itália: até 11 dígitos
    'ES': 9,  // Espanha: 9 dígitos
    'PT': 9,  // Portugal: 9 dígitos
    'AR': 11, // Argentina: até 11 dígitos
    'MX': 10, // México: 10 dígitos
    'CL': 9,  // Chile: 9 dígitos
    'CO': 10, // Colômbia: 10 dígitos
    'PE': 9,  // Peru: 9 dígitos
    'UY': 9,  // Uruguai: 9 dígitos
    'PY': 9,  // Paraguai: 9 dígitos
    'BO': 8,  // Bolívia: 8 dígitos
    'EC': 9,  // Equador: 9 dígitos
    'VE': 11, // Venezuela: 11 dígitos
  }
  
  return maxLengths[country] || 15;
}

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
