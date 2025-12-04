import * as React from "react";
import { cn } from "@/lib/utils";

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
    icon?: React.ReactNode;
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
    ({ className, label, icon, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("relative py-4", className)}
                {...props}
            >
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full h-px bg-gradient-to-r from-transparent via-[var(--ds-border-subtle)] to-transparent" />
                </div>
                {(label || icon) && (
                    <div className="relative flex justify-center">
                        <span className="flex items-center gap-1.5 bg-[var(--ds-bg-elevated)] px-3 text-[length:var(--ds-text-xs)] font-semibold uppercase tracking-wider text-[var(--ds-text-tertiary)]">
                            {icon}
                            {label}
                        </span>
                    </div>
                )}
            </div>
        );
    }
);
Divider.displayName = "Divider";

export { Divider };
