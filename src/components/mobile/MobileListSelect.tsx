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
    color?: string
    content?: React.ReactNode
  }>
}

const MobileListSelect = ({ value, onValueChange, placeholder, options }: MobileListSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.color && (
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className={cn("block truncate", !value && "text-muted-foreground")}>
            {displayValue}
          </span>
        </div>
        <div className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")}>
          ▼
        </div>
      </button>

      {/* Options List */}
      {isOpen && (
        <div className="absolute top-full mt-1 z-50 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-1 max-h-60 overflow-y-auto">
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
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.content || option.label}</span>
                  </div>
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