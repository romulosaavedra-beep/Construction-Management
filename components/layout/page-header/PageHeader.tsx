'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    marginBottom?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    marginBottom = 'mb-6',
}) => {
    return (
        <div className={marginBottom}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <Icon className="w-8 h-8 text-[var(--ds-primary-500)]" />
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--ds-text-primary)]">
                    {title}
                </h2>
            </div>
            <p className="text-sm text-[var(--ds-text-secondary)] mt-1">{subtitle}</p>
        </div>
    );
};
