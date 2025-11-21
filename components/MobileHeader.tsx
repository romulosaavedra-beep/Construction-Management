
import React from 'react';

interface MobileHeaderProps {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (isOpen: boolean) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ isMobileMenuOpen, setMobileMenuOpen }) => {
  return (
    <div className="md:hidden flex items-center justify-between bg-[#1a1d24] h-[60px] px-4 border-b border-[#3a3e45] z-[1001] sticky top-0">
      <button 
        className="hamburger z-20"
        aria-label="Menu"
        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
      >
        <div className={`h-0.5 w-6 bg-white rounded transition-all duration-300 ${isMobileMenuOpen ? 'transform rotate-45 translate-y-[7px]' : ''}`}></div>
        <div className={`h-0.5 w-6 bg-white rounded my-1.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
        <div className={`h-0.5 w-6 bg-white rounded transition-all duration-300 ${isMobileMenuOpen ? 'transform -rotate-45 -translate-y-[7px]' : ''}`}></div>
      </button>
      <h1 className="text-lg font-bold">🏗️ Gestão de Obras</h1>
      <div className="w-6"></div> {/* Spacer */}
    </div>
  );
};
