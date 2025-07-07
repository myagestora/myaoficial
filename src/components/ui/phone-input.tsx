
import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, onChange, value, ...props }, ref) => {
    const formatPhoneNumber = (value: string) => {
      if (!value) return value
      const phoneNumber = value.replace(/[^\d]/g, '')
      const phoneNumberLength = phoneNumber.length
      
      if (phoneNumberLength < 3) return phoneNumber
      if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`
      }
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value)
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: formatted
          }
        }
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>)
      }
    }

    return (
      <Input
        type="tel"
        className={cn(className)}
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder="(11) 99999-9999"
        maxLength={15}
        {...props}
      />
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
