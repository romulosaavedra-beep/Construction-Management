'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { NAVIGATION_ITEMS, LAYOUT_ICONS } from '@/config/navigation.config';
import { SIDEBAR_CONSTANTS } from '../_shared/constants';
import type { Module } from '../_shared/types';
import { APP_CONFIG } from '@/config/app.config';
import { cn } from '@/lib/utils';

interface SidebarProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeModule,
    setActiveModule,
    isMobileMenuOpen,
    setMobileMenuOpen,
}) => {
    const [isPinned, setIsPinned] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Persistir estado do sidebar
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(SIDEBAR_CONSTANTS.storageKey);
        if (saved) {
            const preferences = JSON.parse(saved);
            setIsPinned(preferences.isPinned ?? true);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem(
            SIDEBAR_CONSTANTS.storageKey,
            JSON.stringify({ isPinned, isCollapsed: false })
        );
    }, [isPinned, mounted]);

    const isExpanded = isPinned;

    const handleNavItemClick = (moduleId: Module) => {
        setActiveModule(moduleId);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileMenuOpen(false);
        }
    };

    const NavIcon = LAYOUT_ICONS.chevronLeft;
    const ToggleIcon = isPinned ? LAYOUT_ICONS.chevronLeft : LAYOUT_ICONS.chevronRight;

    if (!mounted) return null;

    return (
        <TooltipProvider>
            <aside
                className={cn(
                    'sidebar',
                    'bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] flex flex-col z-[1000] transition-all duration-300 ease-in-out',
                    'fixed md:relative inset-y-0 left-0 transform',
                    isMobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full w-72',
                    'md:translate-x-0',
                    isExpanded ? 'md:w-64' : 'md:w-[70px]',
                    'lg:flex border-r border-[var(--ds-border-default)]'
                )}
            >
                {/* Logo Section */}
                <div
                    className={cn(
                        'flex items-center border-b border-[var(--ds-border-default)] transition-all duration-300',
                        isExpanded ? 'p-5 h-[60px]' : 'p-0 h-[60px] justify-center'
                    )}
                >
                    <Building2 className="w-6 h-6 text-[var(--ds-primary-500)] flex-shrink-0" />

                    <h1
                        className={cn(
                            'text-base font-bold whitespace-nowrap ml-3 overflow-hidden transition-opacity duration-200',
                            isExpanded ? 'opacity-100' : 'opacity-0 md:hidden',
                            'md:block'
                        )}
                    >
                        {APP_CONFIG.company.displayName}
                    </h1>
                </div>

                {/* Collapse/Expand Toggle (Desktop Only) */}
                <div
                    className={cn(
                        'hidden md:flex items-center justify-center cursor-pointer border-b border-[var(--ds-border-default)] hover:bg-[var(--ds-bg-surface)] transition-all duration-200 group',
                        isExpanded ? 'py-2' : 'py-3'
                    )}
                    onClick={() => setIsPinned(!isPinned)}
                    title={isPinned ? 'Recolher menu' : 'Expandir menu'}
                >
                    <div className={cn('flex items-center gap-2 transition-all duration-200', isExpanded && 'px-4')}>
                        {isPinned ? (
                            <ChevronLeft className="w-4 h-4 text-[var(--ds-text-secondary)]" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--ds-text-secondary)]" />
                        )}

                        {isExpanded && (
                            <span className="text-xs text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text-primary)] transition-colors">
                                {isPinned ? 'Recolher' : 'Expandir'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    <ul className="space-y-1">
                        {NAVIGATION_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeModule === item.id;

                            return (
                                <li key={item.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => handleNavItemClick(item.id)}
                                                className={cn(
                                                    'sidebar__nav-item w-full flex items-center gap-3 h-12 px-5 transition-all duration-200 ease-in-out text-left',
                                                    !isExpanded && 'md:justify-center md:px-0',
                                                    isActive
                                                        ? 'sidebar__nav-item--active bg-[var(--ds-primary-bg)] border-l-4 border-[var(--ds-primary-500)] text-[var(--ds-text-primary)]'
                                                        : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-surface)]'
                                                )}
                                                title={!isExpanded ? item.label : undefined}
                                            >
                                                <Icon className="w-5 h-5 flex-shrink-0" />

                                                <span
                                                    className={cn(
                                                        'whitespace-nowrap transition-all duration-200',
                                                        isExpanded
                                                            ? 'opacity-100 w-auto'
                                                            : 'opacity-0 w-0 overflow-hidden md:hidden'
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                            </button>
                                        </TooltipTrigger>

                                        {!isExpanded && (
                                            <TooltipContent side="right">{item.label}</TooltipContent>
                                        )}
                                    </Tooltip>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>
        </TooltipProvider>
    );
};
