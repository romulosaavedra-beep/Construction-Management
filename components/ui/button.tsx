import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: [
                    "bg-gradient-to-br from-accent-500 to-accent-600",
                    "text-white",
                    "shadow-sm",
                    "hover:from-accent-600 hover:to-accent-700",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "active:translate-y-0 active:shadow-xs"
                ],

                default: [
                    "bg-gradient-to-br from-accent-500 to-accent-600",
                    "text-white",
                    "shadow-sm",
                    "hover:from-accent-600 hover:to-accent-700",
                    "hover:-translate-y-0.5"
                ],

                secondary: [
                    "bg-elevated",
                    "border border-border-strong",
                    "text-primary",
                    "hover:bg-base", // mapped to --ds-bg-hover? No, base is --ds-bg-base. Need to check hover mapping.
                    "active:bg-surface" // active is --ds-bg-active
                ],

                ghost: [
                    "text-secondary",
                    "hover:bg-base", // check hover mapping
                    "hover:text-primary"
                ],

                outline: [
                    "border-2 border-border-strong",
                    "text-primary",
                    "hover:bg-base"
                ],

                destructive: [
                    "bg-error",
                    "text-white",
                    "shadow-sm",
                    "hover:bg-red-600", // error-hover not mapped?
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "active:translate-y-0"
                ],

                danger: [
                    "bg-error",
                    "text-white",
                    "shadow-sm",
                    "hover:bg-red-600",
                    "hover:-translate-y-0.5"
                ],

                success: [
                    "bg-success",
                    "text-white",
                    "shadow-sm",
                    "hover:bg-green-600", // success-hover not mapped?
                    "hover:-translate-y-0.5"
                ],
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-sm",
                md: "h-10 px-4 py-2",
                lg: "h-11 px-8 text-lg",
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
