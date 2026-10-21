import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    danger: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    warning: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    info: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    neutral: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' }
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: current.bg,
      color: current.color,
      border: `1px solid ${current.border}`,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
};
