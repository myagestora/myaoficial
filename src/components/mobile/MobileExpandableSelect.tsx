import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileExpandableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  placeholder?: string
}

interface MobileExpandableSelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  placeholder?: string
}

const MobileExpandableSelectContext = React.createContext<MobileExpandableSelectContextType | null>(null)

const MobileExpandableSelect = ({ value, onValueChange, children, placeholder }: MobileExpandableSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <MobileExpandableSelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}>
      <div className="space-y-2">
        {children}
      </div>
    </MobileExpandableSelectContext.Provider>
  )
}

const MobileExpandableSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(MobileExpandableSelectContext)
  if (!context) throw new Error("MobileExpandableSelectTrigger must be used within MobileExpandableSelect")

  const { isOpen, setIsOpen } = context

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  )
})
MobileExpandableSelectTrigger.displayName = "MobileExpandableSelectTrigger"

const MobileExpandableSelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(MobileExpandableSelectContext)
  if (!context) throw new Error("MobileExpandableSelectValue must be used within MobileExpandableSelect")

  const { value, placeholder } = context
  const [selectedLabel, setSelectedLabel] = React.useState<string>("")

  React.useEffect(() => {
    if (value) {
      // Encontrar o label do valor selecionado
      const findSelectedLabel = () => {
        const optionsContainer = document.querySelector(`[data-expandable-select-options]`)
        if (optionsContainer) {
          const selectedOption = optionsContainer.querySelector(`[data-value="${value}"]`)
          if (selectedOption) {
            setSelectedLabel(selectedOption.textContent || "")
          }
        }
      }
      // Delay para garantir que os options foram renderizados
      setTimeout(findSelectedLabel, 0)
    } else {
      setSelectedLabel("")
    }
  }, [value])

  return (
    <span
      ref={ref}
      className={cn("block truncate", !value && "text-muted-foreground", className)}
      {...props}
    >
      {selectedLabel || placeholder}
    </span>
  )
})
MobileExpandableSelectValue.displayName = "MobileExpandableSelectValue"

const MobileExpandableSelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(MobileExpandableSelectContext)
  if (!context) throw new Error("MobileExpandableSelectContent must be used within MobileExpandableSelect")

  const { isOpen } = context

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95",
        className
      )}
      data-expandable-select-options
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
})
MobileExpandableSelectContent.displayName = "MobileExpandableSelectContent"

const MobileExpandableSelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(MobileExpandableSelectContext)
  if (!context) throw new Error("MobileExpandableSelectItem must be used within MobileExpandableSelect")

  const { value: selectedValue, onValueChange, setIsOpen } = context
  const isSelected = selectedValue === value

  const handleClick = () => {
    onValueChange?.(value)
    setIsOpen(false)
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-3 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      onClick={handleClick}
      data-value={value}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
})
MobileExpandableSelectItem.displayName = "MobileExpandableSelectItem"

export {
  MobileExpandableSelect,
  MobileExpandableSelectValue,
  MobileExpandableSelectTrigger,
  MobileExpandableSelectContent,
  MobileExpandableSelectItem,
}