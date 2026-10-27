import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral'
}) => {
  const variants = {
    success: 'bg-[#f0fdf4] text-[#15803d] [border:1px_solid_#bbf7d0]',
    danger: 'bg-[#fef2f2] text-[#b91c1c] [border:1px_solid_#fecaca]',
    warning: 'bg-[#fffbeb] text-[#b45309] [border:1px_solid_#fde68a]',
    info: 'bg-[#eff6ff] text-[#1d4ed8] [border:1px_solid_#bfdbfe]',
    neutral: 'bg-[#f8fafc] text-[#475569] [border:1px_solid_#e2e8f0]'
  };

  const current = variants[variant] || variants.neutral;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 p-[0.15rem_0.5rem] rounded-sm text-[0.75rem] font-semibold',
        current,
        'tracking-[0.01em] whitespace-nowrap'
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};
