
import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  return (
    <div className="w-full bg-[#3a3e45] rounded-full h-2.5">
      <div 
        className="bg-[#00cc44] h-2.5 rounded-full transition-all duration-500" 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
