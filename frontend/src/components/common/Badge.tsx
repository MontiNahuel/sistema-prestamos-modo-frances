import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    success: { bg: '#d1fae5', color: '#065f46' },
    danger: { bg: '#fee2e2', color: '#991b1b' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    info: { bg: '#dbeafe', color: '#1e40af' },
    neutral: { bg: '#f3f4f6', color: '#374151' }
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span style={{
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: current.bg,
      color: current.color,
      display: 'inline-block'
    }}>
      {children}
    </span>
  );
};
