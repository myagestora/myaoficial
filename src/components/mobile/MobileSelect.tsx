import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

interface MobileSelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const MobileSelectContext = React.createContext<MobileSelectContextType | null>(null)

const MobileSelect = ({ value, onValueChange, children, disabled }: MobileSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <MobileSelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </MobileSelectContext.Provider>
  )
}

const MobileSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(MobileSelectContext)
  if (!context) throw new Error("MobileSelectTrigger must be used within MobileSelect")

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
MobileSelectTrigger.displayName = "MobileSelectTrigger"

const MobileSelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(MobileSelectContext)
  if (!context) throw new Error("MobileSelectValue must be used within MobileSelect")

  const { value } = context

  return (
    <span
      ref={ref}
      className={cn("block truncate", !value && "text-muted-foreground", className)}
      {...props}
    >
      {value || placeholder}
    </span>
  )
})
MobileSelectValue.displayName = "MobileSelectValue"

const MobileSelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(MobileSelectContext)
  if (!context) throw new Error("MobileSelectContent must be used within MobileSelect")

  const { isOpen, setIsOpen } = context

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref && 'current' in ref && ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, setIsOpen, ref])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
})
MobileSelectContent.displayName = "MobileSelectContent"

const MobileSelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(MobileSelectContext)
  if (!context) throw new Error("MobileSelectItem must be used within MobileSelect")

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
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
})
MobileSelectItem.displayName = "MobileSelectItem"

const MobileSelectGroup = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>
}

export {
  MobileSelect,
  MobileSelectGroup,
  MobileSelectValue,
  MobileSelectTrigger,
  MobileSelectContent,
  MobileSelectItem,
}