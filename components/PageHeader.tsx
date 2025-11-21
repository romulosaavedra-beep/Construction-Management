
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      <p className="text-sm text-[#a0a5b0] mt-1">{subtitle}</p>
    </div>
  );
};
