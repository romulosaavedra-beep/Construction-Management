import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--ds-radius-md)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: [
                    "bg-gradient-to-br from-[var(--ds-primary-500)] to-[var(--ds-primary-600)]",
                    "text-white",
                    "shadow-[var(--ds-shadow-sm)]",
                    "hover:from-[var(--ds-primary-600)] hover:to-[var(--ds-primary-700)]",
                    "hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-md)]",
                    "active:translate-y-0 active:shadow-[var(--ds-shadow-xs)]"
                ],

                default: [
                    "bg-gradient-to-br from-[var(--ds-primary-500)] to-[var(--ds-primary-600)]",
                    "text-white",
                    "shadow-[var(--ds-shadow-sm)]",
                    "hover:from-[var(--ds-primary-600)] hover:to-[var(--ds-primary-700)]",
                    "hover:-translate-y-0.5"
                ],

                secondary: [
                    "bg-[var(--ds-bg-elevated)]",
                    "border border-[var(--ds-border-strong)]",
                    "text-[var(--ds-text-primary)]",
                    "hover:bg-[var(--ds-bg-hover)]",
                    "active:bg-[var(--ds-bg-active)]"
                ],

                ghost: [
                    "text-[var(--ds-text-secondary)]",
                    "hover:bg-[var(--ds-bg-hover)]",
                    "hover:text-[var(--ds-text-primary)]"
                ],

                outline: [
                    "border-2 border-[var(--ds-border-strong)]",
                    "text-[var(--ds-text-primary)]",
                    "hover:bg-[var(--ds-bg-hover)]"
                ],

                destructive: [
                    "bg-[var(--ds-error)]",
                    "text-white",
                    "shadow-[var(--ds-shadow-sm)]",
                    "hover:bg-[var(--ds-error-hover)]",
                    "hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-md)]",
                    "active:translate-y-0"
                ],

                danger: [
                    "bg-[var(--ds-error)]",
                    "text-white",
                    "shadow-[var(--ds-shadow-sm)]",
                    "hover:bg-[var(--ds-error-hover)]",
                    "hover:-translate-y-0.5"
                ],

                success: [
                    "bg-[var(--ds-success)]",
                    "text-white",
                    "shadow-[var(--ds-shadow-sm)]",
                    "hover:bg-[var(--ds-success-hover)]",
                    "hover:-translate-y-0.5"
                ],
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                md: "h-10 px-4 py-2",
                lg: "h-11 px-8 text-base",
                icon: "h-9 w-9 p-0",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, fullWidth, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(
                    buttonVariants({ variant, size }),
                    fullWidth && "w-full",
                    className
                )}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </Comp>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
