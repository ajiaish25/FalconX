import * as React from "react"
import ReactDOM from "react-dom"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  className?: string
  children: React.ReactNode
  searchable?: boolean
}

interface SelectItemProps {
  value: string
  className?: string
  children: React.ReactNode
  disabled?: boolean
  searchText?: string
}

interface SelectValueProps {
  placeholder?: string
}

// Global state to track open Select instances
let openSelectId: string | null = null
const openSelectCallbacks = new Map<string, () => void>()

// Global event to close all Select dropdowns
export const closeAllSelects = () => {
  window.dispatchEvent(new CustomEvent('closeAllSelects'))
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
  searchQuery: string
  setSearchQuery: (query: string) => void
  items: Map<string, { label: string; disabled: boolean }>
  registerItem: (value: string, label: string, disabled: boolean) => void
  selectId: string
} | null>(null)

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [items, setItems] = React.useState<Map<string, { label: string; disabled: boolean }>>(new Map())
  const selectId = React.useMemo(() => `select-${Math.random().toString(36).substr(2, 9)}`, [])

  const registerItem = (value: string, label: string, disabled: boolean) => {
    setItems(prev => {
      const newMap = new Map(prev)
      newMap.set(value, { label, disabled })
      return newMap
    })
  }

  const handleSetIsOpen = React.useCallback((open: boolean) => {
    if (open) {
      // Close any other open Select
      if (openSelectId && openSelectId !== selectId) {
        const closeCallback = openSelectCallbacks.get(openSelectId)
        if (closeCallback) {
          closeCallback()
        }
      }
      openSelectId = selectId
      openSelectCallbacks.set(selectId, () => setIsOpen(false))
    } else {
      if (openSelectId === selectId) {
        openSelectId = null
      }
      openSelectCallbacks.delete(selectId)
    }
    setIsOpen(open)
  }, [selectId])

  React.useEffect(() => {
    const handleCloseAll = () => {
      if (isOpen && selectId === openSelectId) {
        setIsOpen(false)
      }
    }
    
    // Listen for close all event
    window.addEventListener('closeAllSelects', handleCloseAll)
    
    return () => {
      window.removeEventListener('closeAllSelects', handleCloseAll)
      // Cleanup on unmount
      if (openSelectId === selectId) {
        openSelectId = null
      }
      openSelectCallbacks.delete(selectId)
    }
  }, [selectId, isOpen])

  return (
    <SelectContext.Provider 
      value={{ 
        value, 
        onValueChange, 
        isOpen, 
        setIsOpen: handleSetIsOpen, 
        triggerRef,
        searchQuery,
        setSearchQuery,
        items,
        registerItem,
        selectId
      }}
    >
      <div className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectTrigger must be used within Select")

    // Use both the forwarded ref and the context trigger ref
    React.useImperativeHandle(ref, () => context.triggerRef.current!)

    return (
      <button
        ref={context.triggerRef}
        type="button"
        data-select-trigger
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          context.setIsOpen(!context.isOpen)
        }}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 text-gray-500 dark:text-gray-400" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder = "Select an option..." }: SelectValueProps) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")

  // Look up the label from the items map instead of showing the raw value
  const selectedItem = context.value ? context.items.get(context.value) : null
  const displayText = selectedItem ? selectedItem.label : (context.value || placeholder)

  return (
    <span className={`text-sm ${context.value ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
      {displayText}
    </span>
  )
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, searchable = true, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectContent must be used within Select")
    const contentRef = React.useRef<HTMLDivElement>(null)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    React.useEffect(() => {
      if (!context.isOpen) return

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        
        // Check if click is outside the content and not on the trigger
        if (contentRef.current && context.triggerRef.current) {
          const isClickInsideContent = contentRef.current.contains(target)
          const isClickOnTrigger = context.triggerRef.current.contains(target) || 
                                   target.closest('[data-select-trigger]') ||
                                   target === context.triggerRef.current
          
          // Close if click is outside both content and trigger
          if (!isClickInsideContent && !isClickOnTrigger) {
            context.setIsOpen(false)
            context.setSearchQuery("")
          }
        } else if (contentRef.current) {
          // If trigger ref is not available, just check content
          const isClickInsideContent = contentRef.current.contains(target)
          if (!isClickInsideContent) {
            context.setIsOpen(false)
            context.setSearchQuery("")
          }
        }
      }

      // Delay to avoid closing immediately after opening
      const timeoutId = setTimeout(() => {
        // Use capture phase to catch clicks early
        document.addEventListener('mousedown', handleClickOutside, true)
        document.addEventListener('click', handleClickOutside, true)
        
        // Focus search input when dropdown opens
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 10)
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
        document.removeEventListener('click', handleClickOutside, true)
      }
    }, [context.isOpen, context, searchable])

    // Calculate position with viewport boundary detection and collision avoidance
    React.useEffect(() => {
      if (context.isOpen && context.triggerRef.current) {
        const updatePosition = () => {
          if (!context.triggerRef.current) return
          
          const rect = context.triggerRef.current.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const viewportWidth = window.innerWidth
          const dropdownHeight = 300 // maxHeight from style
          const dropdownWidth = Math.max(rect.width, 200) // min-w-[8rem] = 128px, but we'll use at least 200px
          
          // Calculate vertical position - prefer below, but flip to above if not enough space
          let top = rect.bottom + window.scrollY + 4 // 4px gap
          if (rect.bottom + dropdownHeight + 4 > viewportHeight + window.scrollY && rect.top > dropdownHeight) {
            // Not enough space below, flip to above
            top = rect.top + window.scrollY - dropdownHeight - 4 // 4px gap
          }
          
          // Calculate horizontal position - ensure it doesn't go off screen
          let left = rect.left + window.scrollX
          if (left + dropdownWidth > viewportWidth + window.scrollX) {
            // Would overflow right, align to right edge
            left = viewportWidth + window.scrollX - dropdownWidth - 8 // 8px margin
          }
          if (left < window.scrollX) {
            // Would overflow left, align to left edge
            left = window.scrollX + 8 // 8px margin
          }
          
          setPosition({ top, left })
        }
        
        updatePosition()
        
        // Update position on scroll and resize
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)
        
        return () => {
          window.removeEventListener('scroll', updatePosition, true)
          window.removeEventListener('resize', updatePosition)
        }
      }
    }, [context.isOpen, context.triggerRef])

    if (!context.isOpen) return null

    // Render as portal for proper z-index and positioning
    return ReactDOM.createPortal(
      <>
        {/* Backdrop overlay to isolate dropdown from background - only captures clicks outside */}
        <div
          className="fixed inset-0 z-[9999]"
          style={{
            backgroundColor: 'transparent',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => {
            // Only close if clicking directly on backdrop, not on dropdown
            if (e.target === e.currentTarget) {
              context.setIsOpen(false)
              context.setSearchQuery("")
            }
          }}
        />
        {/* Dropdown container - isolated frame */}
        <div
          ref={contentRef}
          className={cn(
            "fixed min-w-[8rem] rounded-lg border-2 shadow-2xl z-[10000]",
            "bg-white dark:bg-gray-800",
            "border-gray-200 dark:border-gray-700",
            "text-gray-900 dark:text-gray-100",
            "backdrop-blur-sm",
            className
          )}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            width: 'max-content',
            minWidth: '200px',
            isolation: 'isolate',
            contain: 'layout style paint',
            ...(props as any).style,
            zIndex: (props as any).style?.zIndex || 10000,
            pointerEvents: 'auto',
            backgroundColor: (props as any).style?.backgroundColor || undefined,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
        {/* Search Box */}
        {searchable && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={context.searchQuery}
                onChange={(e) => {
                  context.setSearchQuery(e.target.value)
                  e.stopPropagation()
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    context.setIsOpen(false)
                    context.setSearchQuery("")
                  }
                }}
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {context.searchQuery && (
                <button
                  onClick={() => {
                    context.setSearchQuery("")
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Items Container */}
        <div 
          className="overflow-y-auto flex-1 rounded-b-lg"
          style={{
            backgroundColor: 'inherit'
          }}
        >
          {children}
        </div>
      </div>
      </>,
      document.body
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled = false, searchText, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectItem must be used within Select")

    // Register item on mount
    React.useEffect(() => {
      const label = searchText || (typeof children === 'string' ? children : String(children))
      context.registerItem(value, label, disabled)
    }, [value, disabled, searchText, children, context])

    // Determine if item matches search query
    const matchesSearch = React.useMemo(() => {
      if (!context.searchQuery) return true
      
      const label = searchText || (typeof children === 'string' ? children : String(children))
      return label.toLowerCase().includes(context.searchQuery.toLowerCase())
    }, [context.searchQuery, searchText, children])

    // Don't render if doesn't match search
    if (!matchesSearch) return null

    const handleClick = (e: React.MouseEvent) => {
      if (disabled) return
      
      e.preventDefault()
      e.stopPropagation()
      
      console.log('SelectItem clicked:', value)
      
      // Update value and close immediately
      context.onValueChange(value)
      context.setIsOpen(false)
      context.setSearchQuery("")
    }

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={value === context.value}
        data-state={value === context.value ? 'checked' : 'unchecked'}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm transition-colors",
          !disabled && "hover:bg-gray-100 dark:hover:bg-gray-700",
          value === context.value ? "bg-blue-50 dark:bg-blue-900" : "text-gray-900 dark:text-gray-100",
          disabled && "pointer-events-none opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        data-disabled={disabled}
        {...props}
      >
        {children}
        {value === context.value && (
          <div className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
          </div>
        )}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
}