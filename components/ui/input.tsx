// src/components/ui/Input.tsx
import React from 'react';
import { constructionProTheme } from '@/lib/theme/colors';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    icon,
    fullWidth = false,
    className = '',
    ...props
}) => {
    const baseStyles = `px-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 text-[${constructionProTheme.text.primary}]`;
    const errorStyles = error
        ? `border-[${constructionProTheme.status.critical.main}] focus:ring-[${constructionProTheme.status.critical.main}]`
        : `border-[${constructionProTheme.border.medium}] focus:ring-[${constructionProTheme.primary.main}] focus:border-[${constructionProTheme.primary.main}]`;
    const widthStyle = fullWidth ? 'w-full' : '';

    return (
        <div className={`${widthStyle} ${className}`}>
            {label && (
                <label className={`block text-sm font-medium text-[${constructionProTheme.text.primary}] mb-1.5`}>
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[${constructionProTheme.text.tertiary}]">
                        {icon}
                    </div>
                )}
                <input
                    className={`${baseStyles} ${errorStyles} ${icon ? 'pl-10' : ''} ${widthStyle}`}
                    {...props}
                />
            </div>
            {error && (
                <p className={`mt-1 text-sm text-[${constructionProTheme.status.critical.main}]`}>{error}</p>
            )}
            {helperText && !error && (
                <p className={`mt-1 text-sm text-[${constructionProTheme.text.secondary}]`}>{helperText}</p>
            )}
        </div>
    );
};
