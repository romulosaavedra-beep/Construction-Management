'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    breadcrumbs?: { label: string; href?: string }[];
    marginBottom?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    breadcrumbs,
    marginBottom = 'mb-6',
}) => {
    return (
        <div className={marginBottom}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center text-sm text-secondary mb-2">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <span className="mx-2">/</span>}
                            {crumb.href ? (
                                <a href={crumb.href} className="hover:text-primary transition-colors">
                                    {crumb.label}
                                </a>
                            ) : (
                                <span>{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className="flex items-center gap-3">
                {Icon && (
                    <Icon className="w-8 h-8 text-accent-500" />
                )}
                <h2 className="text-xl md:text-2xl font-bold text-primary">
                    {title}
                </h2>
            </div>
            <p className="text-base text-secondary mt-1">{subtitle}</p>
        </div>
    );
};
