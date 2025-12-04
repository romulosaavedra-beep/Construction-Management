import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
    type?: "error" | "success" | "warning" | "info";
    children?: React.ReactNode;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
    ({ className, type = "error", children, ...props }, ref) => {
        if (!children) return null;

        const icons = {
            error: AlertTriangle,
            success: CheckCircle2,
            warning: AlertCircle,
            info: Info,
        };

        const Icon = icons[type];

        return (
            <p
                ref={ref}
                className={cn(
                    "flex items-center gap-1.5 mt-1.5",
                    "text-[length:var(--ds-text-xs)] font-medium",
                    type === "error" && "text-[var(--ds-error)]",
                    type === "success" && "text-[var(--ds-success)]",
                    type === "warning" && "text-[var(--ds-warning)]",
                    type === "info" && "text-[var(--ds-info)]",
                    className
                )}
                {...props}
            >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span>{children}</span>
            </p>
        );
    }
);
FormMessage.displayName = "FormMessage";

export { FormMessage };
