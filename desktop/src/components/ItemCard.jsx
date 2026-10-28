import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ItemCard({ item, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    } else {
      navigate(`/items/${item.id}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="item-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="item-card-image-wrapper">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="item-card-img"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('item-card-no-img');
            }}
          />
        ) : (
          <div className="item-card-placeholder">
            <span className="placeholder-icon">{item.category_icon || '📦'}</span>
            <span className="placeholder-text">Sem foto cadastrada</span>
          </div>
        )}

        <div className="item-card-badge-overlay">
          <StatusBadge status={item.status} size="small" />
        </div>

        {item.category_name && (
          <div className="item-card-category-overlay">
            <span>{item.category_icon || '🏷️'}</span>
            <span>{item.category_name}</span>
          </div>
        )}
      </div>

      <div className="item-card-content">
        <h3 className="item-card-title" title={item.name}>
          {item.name}
        </h3>

        {item.description && (
          <p className="item-card-description" title={item.description}>
            {item.description}
          </p>
        )}

        <div className="item-card-meta">
          <div className="item-meta-row">
            <span className="meta-icon">📍</span>
            <span className="meta-text" title={item.location_found}>
              {item.location_found}
            </span>
          </div>

          <div className="item-meta-row">
            <span className="meta-icon">📅</span>
            <span className="meta-text">
              {formatDate(item.found_at || item.created_at)}
            </span>
          </div>

          <div className="item-meta-row finder-row">
            <span className="meta-icon">👤</span>
            <span className="meta-text">
              Encontrado por: <strong>{item.found_by_name || 'Anônimo'}</strong>
            </span>
          </div>
        </div>

        <div className="item-card-footer">
          <span className="item-id-tag">#{item.id}</span>
          <span className="view-detail-link">Ver detalhes &rarr;</span>
        </div>
      </div>
    </div>
  );
}
