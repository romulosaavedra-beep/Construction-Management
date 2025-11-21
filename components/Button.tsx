import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  // FIX: Add optional 'size' property to support different button sizes.
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

// FIX: Wrapped component with React.forwardRef to allow passing refs to the underlying button element.
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className = '', ...props }, ref) => {
  // FIX: Extracted size-specific classes from baseClasses.
  const baseClasses = "rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e2329] flex items-center justify-center";
  
  const sizeClasses = {
    md: "px-4 py-2 text-sm",
    sm: "px-2 py-1 text-xs",
  };

  const variantClasses = {
    primary: 'bg-[#0084ff] text-white hover:bg-[#0066cc] focus:ring-[#0084ff]',
    secondary: 'bg-[#3a3e45] text-white hover:bg-[#4a4e55] focus:ring-[#3a3e45]',
    danger: 'bg-[#ff4444] text-white hover:bg-[#dd3333] focus:ring-[#ff4444]',
    success: 'bg-[#00cc44] text-white hover:bg-[#00aa38] focus:ring-[#00cc44]',
  };

  return (
    // FIX: Applied size classes to the button.
    <button ref={ref} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
});

// FIX: Added displayName for better debugging with React DevTools.
Button.displayName = 'Button';