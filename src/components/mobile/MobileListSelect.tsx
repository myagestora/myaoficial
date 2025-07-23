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
    isLabel?: boolean
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
    <div className="w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.color && (
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className={cn("block truncate", !value && "text-muted-foreground")}>
            {displayValue}
          </span>
        </div>
        <div className={cn("h-4 w-4 opacity-50 transition-transform flex-shrink-0 ml-2", isOpen && "rotate-180")}>
          ▼
        </div>
      </button>

      {/* Options List - Pushes content down when open */}
      {isOpen && (
        <div className="mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-fade-in">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = value === option.value
              const isLabel = option.isLabel;
              
              if (isLabel) {
                return (
                  <div
                    key={option.value}
                    className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none cursor-default opacity-80"
                    style={{ pointerEvents: 'none' }}
                  >
                    {option.content || option.label}
                  </div>
                );
              }
              return (
                <div
                  key={option.value}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center py-2 pl-8 pr-3 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onValueChange?.(option.value)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option.color && (
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate">{option.content || option.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { MobileListSelect }