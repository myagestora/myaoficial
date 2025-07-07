
import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CpfInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, onChange, value, ...props }, ref) => {
    const formatCPF = (value: string) => {
      if (!value) return value
      const cpf = value.replace(/[^\d]/g, '')
      const cpfLength = cpf.length
      
      if (cpfLength < 4) return cpf
      if (cpfLength < 7) {
        return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
      }
      if (cpfLength < 10) {
        return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
      }
      return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value)
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
        type="text"
        className={cn(className)}
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder="000.000.000-00"
        maxLength={14}
        {...props}
      />
    )
  }
)
CpfInput.displayName = "CpfInput"

export { CpfInput }
