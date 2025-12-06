import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-focus",
    {
        variants: {
            variant: {
                success: [
                    "bg-success-bg",
                    "border border-success",
                    "text-success"
                ],
                error: [
                    "bg-error-bg",
                    "border border-error",
                    "text-error"
                ],
                warning: [
                    "bg-warning-bg",
                    "border border-warning",
                    "text-warning"
                ],
                info: [
                    "bg-info-bg",
                    "border border-info",
                    "text-info"
                ],
                default: [
                    "bg-surface",
                    "border border-border-subtle",
                    "text-secondary"
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
