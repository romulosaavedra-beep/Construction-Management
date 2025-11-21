
import React from 'react';

interface CardHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, children }) => (
  <div className="mb-5 flex flex-wrap justify-between items-center gap-4">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[#1e2329] p-4 sm:p-6 rounded-lg shadow-lg mb-6 ${className}`}>
      {children}
    </div>
  );
};
