'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Building2 } from 'lucide-react';
import { APP_CONFIG } from '@/config/app.config';

interface MobileHeaderProps {
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (isOpen: boolean) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    isMobileMenuOpen,
    setMobileMenuOpen,
}) => {
    return (
        <div className="mobile-header md:hidden flex items-center justify-between bg-[var(--ds-bg-base)] h-[60px] px-4 border-b border-[var(--ds-border-default)] z-[1001] sticky top-0">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
                className="h-10 w-10"
            >
                {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <Menu className="w-5 h-5" />
                )}
            </Button>

            <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--ds-primary-500)]" />
                <h1 className="text-base font-bold text-[var(--ds-text-primary)]">
                    {APP_CONFIG.app.title}
                </h1>
            </div>

            <div className="w-10" />
        </div>
    );
};
