import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-8 h-8 text-[#0084ff]" />}
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-sm text-[#a0a5b0] mt-1">{subtitle}</p>
    </div>
  );
};
