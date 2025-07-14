import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileListSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: Array<{
    value: string
    label: string
    content?: React.ReactNode
  }>
}

const MobileListSelect = ({ value, onValueChange, placeholder, options }: MobileListSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  return (
    <div className="space-y-2">
      {/* Trigger Button */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("block truncate", !value && "text-muted-foreground")}>
          {displayValue}
        </span>
        <div className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")}>
          ▼
        </div>
      </button>

      {/* Options List */}
      {isOpen && (
        <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-1">
            {options.map((option) => {
              const isSelected = value === option.value
              
              return (
                <div
                  key={option.value}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md py-3 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onValueChange?.(option.value)
                    setIsOpen(false)
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  {option.content || option.label}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { MobileListSelect }