'use client';

import React from 'react';

interface SaavedraLogoProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_MAP = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
} as const;

export const SaavedraLogo: React.FC<SaavedraLogoProps> = ({
    size = 'md',
    className = '',
}) => {
    return (
        <img
            src="/logos/saavedra-logo.svg"
            alt="SAAVEDRA ENGENHARIA"
            className={`${SIZE_MAP[size]} ${className}`}
            loading="lazy"
        />
    );
};
