import React from 'react';

const STATUS_CONFIG = {
  // Itens
  pending_approval: {
    label: 'Aguardando aprovação',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    icon: '⏳'
  },
  approved: {
    label: 'Aguardando resposta',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    icon: '🔍'
  },
  claimed: {
    label: 'Reivindicado',
    color: '#6C3FC5',
    bgColor: '#EDE9FE',
    borderColor: '#DDD6FE',
    icon: '🙋'
  },
  collected: {
    label: 'Devolvido',
    color: '#059669',
    bgColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    icon: '✅'
  },
  archived: {
    label: 'Arquivado',
    color: '#4B5563',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    icon: '📁'
  },
  // Claims
  pending: {
    label: 'Pendente de validação',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    icon: '⏳'
  },
  rejected: {
    label: 'Rejeitado',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    icon: '❌'
  }
};

export default function StatusBadge({ status, size = 'medium', className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Desconhecido',
    color: '#4B5563',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    icon: '•'
  };

  return (
    <span
      className={`status-badge status-badge-${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '9999px',
        fontWeight: '600',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        padding: size === 'small' ? '4px 8px' : size === 'large' ? '8px 16px' : '6px 12px',
        fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '0.95rem' : '0.825rem'
      }}
    >
      <span style={{ fontSize: size === 'small' ? '0.7rem' : '0.85rem' }}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
