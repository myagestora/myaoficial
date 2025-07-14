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
  itemsRegistry: Map<string, string>
  registerItem: (itemValue: string, itemLabel: string) => void
}

const MobileExpandableSelectContext = React.createContext<MobileExpandableSelectContextType | null>(null)

const MobileExpandableSelect = ({ value, onValueChange, children, placeholder }: MobileExpandableSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [itemsRegistry, setItemsRegistry] = React.useState<Map<string, string>>(new Map())

  // Registrar um item no mapa
  const registerItem = React.useCallback((itemValue: string, itemLabel: string) => {
    setItemsRegistry(prev => {
      const newMap = new Map(prev)
      newMap.set(itemValue, itemLabel)
      return newMap
    })
  }, [])

  return (
    <MobileExpandableSelectContext.Provider value={{ 
      value, 
      onValueChange, 
      isOpen, 
      setIsOpen, 
      placeholder,
      itemsRegistry,
      registerItem
    }}>
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

  const { value, placeholder, itemsRegistry } = context

  // Obter o label diretamente do registry
  const selectedLabel = value && itemsRegistry.has(value) ? itemsRegistry.get(value) : ""

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
  React.HTMLAttributes<HTMLDivElement> & { value: string; label?: string }
>(({ className, children, value, label, ...props }, ref) => {
  const context = React.useContext(MobileExpandableSelectContext)
  if (!context) throw new Error("MobileExpandableSelectItem must be used within MobileExpandableSelect")

  const { value: selectedValue, onValueChange, setIsOpen, registerItem } = context
  const isSelected = selectedValue === value

  // Extrair o texto do children para usar como label
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return String(node)
    if (React.isValidElement(node)) {
      if (typeof node.props.children === 'string') return node.props.children
      if (Array.isArray(node.props.children)) {
        return node.props.children.map(getTextContent).join(' ')
      }
      return getTextContent(node.props.children)
    }
    if (Array.isArray(node)) {
      return node.map(getTextContent).join(' ')
    }
    return ''
  }

  const itemLabel = label || getTextContent(children)

  // Registrar este item no mapa quando montado
  React.useEffect(() => {
    if (itemLabel) {
      registerItem(value, itemLabel)
    }
  }, [value, itemLabel, registerItem])

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