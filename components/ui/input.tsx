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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-md px-3 py-2",
                        "bg-surface border border-border",
                        "text-primary text-sm",
                        "placeholder:text-secondary",
                        "transition-all duration-200",
                        "hover:border-border-subtle hover:bg-base",
                        "focus-visible:outline-none focus-visible:border-primary",
                        "focus-visible:ring-2 focus-visible:ring-focus",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-base",
                        error && [
                            "border-error",
                            "focus-visible:border-error",
                            "focus-visible:ring-error" // assuming ring-error exists or I should use ring-red-500
                        ],
                        icon && "pl-10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-secondary">{helperText}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
