import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-[var(--ds-radius-full)] px-2.5 py-1 text-[length:var(--ds-text-xs)] font-medium transition-colors focus:outline-none focus:shadow-[var(--ds-focus-ring)]",
    {
        variants: {
            variant: {
                success: [
                    "bg-[var(--ds-success-bg)]",
                    "border border-[var(--ds-success-border)]",
                    "text-[var(--ds-success)]"
                ],
                error: [
                    "bg-[var(--ds-error-bg)]",
                    "border border-[var(--ds-error-border)]",
                    "text-[var(--ds-error)]"
                ],
                warning: [
                    "bg-[var(--ds-warning-bg)]",
                    "border border-[var(--ds-warning-border)]",
                    "text-[var(--ds-warning)]"
                ],
                info: [
                    "bg-[var(--ds-info-bg)]",
                    "border border-[var(--ds-info-border)]",
                    "text-[var(--ds-info)]"
                ],
                default: [
                    "bg-[var(--ds-bg-surface)]",
                    "border border-[var(--ds-border-subtle)]",
                    "text-[var(--ds-text-secondary)]"
                ],
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
