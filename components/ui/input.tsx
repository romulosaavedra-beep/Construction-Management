import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    helperText?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, helperText, icon, fullWidth, ...props }, ref) => {
        return (
            <div className={cn(fullWidth && "w-full", "relative")}>
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)]">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-[var(--ds-radius-md)] px-3 py-2",
                        "bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)]",
                        "text-[var(--ds-text-primary)] text-sm",
                        "placeholder:text-[var(--ds-text-tertiary)]",
                        "transition-all duration-200",
                        "hover:border-[var(--ds-border-subtle)] hover:bg-[var(--ds-bg-hover)]",
                        "focus-visible:outline-none focus-visible:border-[var(--ds-primary-500)]",
                        "focus-visible:shadow-[var(--ds-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--ds-bg-muted)]",
                        error && [
                            "border-[var(--ds-error)]",
                            "focus-visible:border-[var(--ds-error)]",
                            "focus-visible:shadow-[var(--ds-focus-ring-error)]"
                        ],
                        icon && "pl-10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-[var(--ds-text-secondary)]">{helperText}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
