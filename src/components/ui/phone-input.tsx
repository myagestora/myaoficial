
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
        // Parse o número para verificar se está válido
        const phoneNumber = parsePhoneNumber(newValue)
        
        if (phoneNumber) {
          // Se o número está completo e válido, aceita
          if (phoneNumber.isValid()) {
            onChange?.(newValue)
            return
          }
          
          // Se não está válido mas é um número parcial do mesmo país, aceita
          const currentCountry = phoneNumber.country
          if (currentCountry) {
            // Verifica se o número não excede o tamanho máximo para o país
            const nationalNumber = phoneNumber.nationalNumber
            const maxLength = getMaxLengthForCountry(currentCountry)
            
            if (nationalNumber.length <= maxLength) {
              onChange?.(newValue)
              return
            }
          }
        }
        
        // Se chegou aqui, o número pode estar sendo digitado
        // Vamos verificar se é uma adição válida ao número atual
        if (value && newValue.length > value.length) {
          // Está adicionando dígitos
          try {
            const currentPhone = parsePhoneNumber(value)
            if (currentPhone?.country) {
              const maxLength = getMaxLengthForCountry(currentPhone.country)
              const currentNationalLength = currentPhone.nationalNumber.length
              
              if (currentNationalLength >= maxLength) {
                // Já atingiu o limite, não aceita mais dígitos
                return
              }
            }
          } catch (e) {
            // Se não conseguir parsear o valor atual, aceita a mudança
          }
        }
        
        onChange?.(newValue)
      } catch (error) {
        // Se não conseguir parsear, aceita a mudança (pode estar sendo digitado)
        onChange?.(newValue)
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
  // Mapeamento dos principais países e seus comprimentos máximos
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
  
  return maxLengths[country] || 15; // 15 é o máximo internacional padrão
}

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
