import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Header, MobileHeader } from '@/components/layout';
import { Toaster } from '@/components/ui-advanced/toaster';

interface LayoutProps {
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

export const Layout: React.FC<LayoutProps> = ({ isMobileMenuOpen, setMobileMenuOpen }) => {
    return (
        <>
            {/* Toast Notifications System */}
            <Toaster />

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-[999] transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Header */}
            <MobileHeader
                isMobileMenuOpen={isMobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
            />

            {/* Main Layout */}
            <div className="flex h-screen w-screen overflow-hidden bg-[var(--ds-bg-base)]">
                {/* Sidebar Navigation */}
                <Sidebar
                    isMobileMenuOpen={isMobileMenuOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                />

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </>
    );
};
