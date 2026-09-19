import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "../../lib/utils"

const SelectRoot = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 sm:h-10 w-full items-center justify-between rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-xs sm:text-sm text-[#1d1d1f] placeholder:text-[#858585] focus:outline-none focus:border-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-colors duration-150",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-60 text-[#1d1d1f] shrink-0 ml-1.5" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-[#707070]",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-[#707070]",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-lg border border-[#d2d2d7] bg-white text-[#1d1d1f] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-xs font-semibold text-[#707070]", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-xs sm:text-sm outline-none transition-colors hover:bg-[#f5f5f7] focus:bg-[#f5f5f7] focus:text-[#0071e3] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[#0071e3]" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[#d2d2d7]", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export interface SelectChangeEvent {
  target: {
    value: string
    name?: string
  }
}

export interface SelectProps {
  value?: any
  defaultValue?: any
  onValueChange?: (value: string) => void
  onChange?: (e: SelectChangeEvent) => void
  children?: React.ReactNode
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  "aria-label"?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  dir?: "ltr" | "rtl"
}

interface ParsedOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

function extractOptions(children: React.ReactNode): { hasOptions: boolean; options: ParsedOption[] } {
  const options: ParsedOption[] = []
  let hasOptions = false

  const traverse = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return

      if (child.type === "option") {
        hasOptions = true
        const val = child.props.value !== undefined ? String(child.props.value) : String(child.props.children ?? "")
        options.push({
          value: val,
          label: child.props.children ?? val,
          disabled: child.props.disabled,
        })
      } else if (child.props && child.props.children) {
        traverse(child.props.children)
      }
    })
  }

  traverse(children)
  return { hasOptions, options }
}

/**
 * Select: Komponen utama berbasis Radix UI Select.
 * Jika menerima elemen <option>, otomatis diubah menjadi Radix UI SelectContent & SelectItem.
 * Jika menerima sub-komponen Radix UI (SelectTrigger, SelectContent), dirender langsung.
 */
export const Select: React.FC<SelectProps> = ({
  value,
  defaultValue,
  onValueChange,
  onChange,
  children,
  placeholder = "Pilih salah satu...",
  className,
  triggerClassName,
  disabled,
  required,
  id,
  name,
  "aria-label": ariaLabel,
  open,
  defaultOpen,
  onOpenChange,
  dir,
}) => {
  const { hasOptions, options } = extractOptions(children)

  const handleValueChange = (val: string) => {
    if (onValueChange) onValueChange(val)
    if (onChange) {
      onChange({
        target: {
          value: val,
          name,
        },
      })
    }
  }

  const strValue = value !== undefined && value !== null ? String(value) : undefined
  const strDefaultValue = defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : undefined

  // Jika children berisi <option>, render Radix UI dengan Trigger + Content + Item otomatis
  if (hasOptions) {
    return (
      <SelectPrimitive.Root
        value={strValue}
        defaultValue={strDefaultValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
        name={name}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        dir={dir}
      >
        <SelectTrigger id={id} className={cn(className, triggerClassName)} aria-label={ariaLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>
    )
  }

  // Jika children berisi komposisi Radix UI manual
  return (
    <SelectPrimitive.Root
      value={strValue}
      defaultValue={strDefaultValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
      name={name}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      dir={dir}
    >
      {children}
    </SelectPrimitive.Root>
  )
}

/**
 * DropdownSelect: Komponen praktis untuk opsi berbasis array data [{ value, label }]
 */
export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

export interface DropdownSelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (val: string) => void
  onChange?: (e: SelectChangeEvent) => void
  placeholder?: string
  options: DropdownOption[]
  className?: string
  triggerClassName?: string
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
  "aria-label"?: string
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  defaultValue,
  onValueChange,
  onChange,
  placeholder = "Pilih salah satu...",
  options,
  className,
  triggerClassName,
  disabled,
  required,
  id,
  name,
  "aria-label": ariaLabel,
}) => {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      onChange={onChange}
      disabled={disabled}
      required={required}
      id={id}
      name={name}
      placeholder={placeholder}
      triggerClassName={cn(className, triggerClassName)}
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </Select>
  )
}

/**
 * NativeSelect: Fallback jika suatu saat butuh HTML select element langsung
 */
export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-9 sm:h-10 w-full rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
NativeSelect.displayName = "NativeSelect"

export {
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
