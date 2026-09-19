import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs sm:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#0071e3] text-white shadow-2xs hover:bg-[#0077ed]",
        destructive: "bg-rose-600 text-white shadow-2xs hover:bg-rose-700",
        outline: "border border-[#d2d2d7] bg-white text-[#1d1d1f] shadow-2xs hover:bg-[#f5f5f7]",
        secondary: "bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] hover:bg-[#e2e2e5]",
        ghost: "hover:bg-[#f5f5f7] hover:text-[#1d1d1f]",
        link: "text-[#0066cc] underline-offset-4 hover:underline",
        emerald: "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700",
      },
      size: {
        default: "h-9 sm:h-10 px-4 py-2",
        sm: "h-7 sm:h-8 rounded-md px-2.5 text-xs",
        lg: "h-10 sm:h-11 rounded-lg px-6",
        icon: "h-9 w-9 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
