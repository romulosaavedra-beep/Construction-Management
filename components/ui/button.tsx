// components/ui/button.tsx
import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'destructive' | 'default';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    fullWidth?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            fullWidth = false,
            loading = false,
            icon,
            asChild = false,
            children,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : 'button';

        const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variantStyles = {
            primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
            default: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500', // Alias para primary
            secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
            outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
            ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
            destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500', // Alias para danger
            success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        };

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm gap-1.5 h-8',
            md: 'px-4 py-2 text-base gap-2 h-10',
            lg: 'px-6 py-3 text-lg gap-2.5 h-12',
            icon: 'h-10 w-10 p-0',
        };

        const widthStyle = fullWidth ? 'w-full' : '';

        const classes = cn(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            widthStyle,
            className
        );

        return (
            <Comp
                ref={ref}
                className={classes}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                    icon
                )}
                {children}
            </Comp>
        );
    }
);

Button.displayName = 'Button';

export { Button as default };
