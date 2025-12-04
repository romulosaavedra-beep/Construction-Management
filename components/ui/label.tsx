import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "block mb-1.5",
      "text-[length:var(--ds-text-sm)] font-medium leading-none",
      "text-[var(--ds-text-secondary)]",
      "tracking-wide",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-[var(--ds-error)]">*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";

export { Label };
