import * as React from "react"
import { cn } from "../../lib/utils"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({ children, className }) => (
  <div className={cn("w-full space-y-4", className)}>{children}</div>
)

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 p-1 text-slate-500",
      className
    )}
  >
    {children}
  </div>
)

export const TabsTrigger: React.FC<{
  value: string
  activeValue: string
  onClick: (val: string) => void
  children: React.ReactNode
  className?: string
}> = ({ value, activeValue, onClick, children, className }) => {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-indigo-600 shadow-sm font-bold"
          : "text-slate-600 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<{
  value: string
  activeValue: string
  children: React.ReactNode
  className?: string
}> = ({ value, activeValue, children, className }) => {
  if (value !== activeValue) return null
  return <div className={cn("space-y-4 animate-in fade-in-50 duration-150", className)}>{children}</div>
}
