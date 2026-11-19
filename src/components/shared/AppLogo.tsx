import React from 'react';
import { cn } from '@/lib/utils/cn';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'md', className, onClick }) => {
  const sizes = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  return (
    <img
      src="/icons/icon-192.png?v=4"
      alt="ForeverYoung Logo"
      onClick={onClick}
      className={cn(
        'object-cover shadow-sm ring-1 ring-white/15 shrink-0 select-none transition-transform duration-200 ease-out active:scale-95',
        onClick && 'cursor-pointer hover:scale-[1.03]',
        sizes[size],
        className
      )}
    />
  );
};
