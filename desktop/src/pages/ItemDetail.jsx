import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import './ItemDetail.css';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isEmployee } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState(null);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await api.getItemById(id);
      setItem(data);

      if (data.status === 'collected') {
        try {
          const colData = await api.getItemCollection(id);
          setCollection(colData);
        } catch {
          // Registro de coleta opcional se ainda não populado
        }
      }
    } catch (err) {
      console.error('Erro ao buscar item:', err);
      showToast('Item não encontrado ou indisponível.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  // Ações do Usuário: Reivindicar Item
  const handleClaim = async () => {
    setActionLoading(true);
    try {
      await api.createClaim(item.id);
      showToast('Reivindicação enviada com sucesso! Compareça ao balcão com documento.', 'success');
      setShowClaimModal(false);
      loadItem();
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar reivindicação.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Ações de Funcionário: Aprovar / Rejeitar
  const handleApprove = async () => {
    if (!window.confirm(`Deseja aprovar o item "${item.name}"? Ele ficará visível publicamente para reivindicações.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.approveItem(item.id);
      showToast('Item aprovado com sucesso!', 'success');
      loadItem();
    } catch (err) {
      showToast(err.message || 'Erro ao aprovar item.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Tem certeza de que deseja rejeitar e arquivar o item "${item.name}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.rejectItem(item.id);
      showToast('Item rejeitado e arquivado.', 'info');
      loadItem();
    } catch (err) {
      showToast(err.message || 'Erro ao rejeitar item.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="item-detail-loading">
        <div className="spinner-large"></div>
        <p>Carregando detalhes do objeto #{id}...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="item-detail-notfound">
        <h2>Objeto não encontrado</h2>
        <p>O item solicitado não existe ou foi removido do sistema.</p>
        <button onClick={() => navigate('/')} className="btn-back">
          &larr; Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const isFinder = user && user.id === item.found_by_user_id;

  return (
    <div className="item-detail-container">
      {/* Top Navigation Row */}
      <div className="detail-top-nav">
        <button onClick={() => navigate(-1)} className="btn-back-link">
          &larr; Voltar
        </button>
        <div className="detail-id-badge">ID do Objeto: #{item.id}</div>
      </div>

      {/* Two-Column Grid */}
      <div className="detail-two-columns">
        {/* LEFT COLUMN: Photo & QR Code */}
        <div className="detail-left-col">
          <div className="detail-photo-card">
            {item.photo_url ? (
              <img
                src={item.photo_url}
                alt={item.name}
                className="detail-photo-img"
              />
            ) : (
              <div className="detail-photo-empty">
                <span className="empty-photo-icon">{item.category_icon || '📦'}</span>
                <span>Nenhuma foto anexada a este item</span>
              </div>
            )}
          </div>

          {/* QR Code Card */}
          <div className="detail-qr-card">
            <div className="qr-header">
              <span className="qr-title-icon">📷</span>
              <div>
                <h4 className="qr-title">QR Code Identificador</h4>
                <p className="qr-subtitle">Imprima para etiquetar este objeto fisicamente</p>
              </div>
            </div>

            <div className="qr-image-container">
              <img
                src={api.getItemQrCodeUrl(item.id)}
                alt={`QR Code do Item #${item.id}`}
                className="qr-img"
              />
            </div>

            <a
              href={api.getItemQrCodeUrl(item.id)}
              download={`qrcode-item-${item.id}.png`}
              target="_blank"
              rel="noreferrer"
              className="btn-download-qr"
            >
              📥 Baixar Imagem do QR Code
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Item Details & Actions */}
        <div className="detail-right-col">
          <div className="detail-info-card">
            {/* Badges Bar */}
            <div className="detail-badges-bar">
              <StatusBadge status={item.status} size="large" />
              {item.category_name && (
                <div className="detail-category-pill">
                  <span>{item.category_icon || '🏷️'}</span>
                  <span>{item.category_name}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="detail-item-title">{item.name}</h1>

            {/* Description */}
            <div className="detail-section">
              <h3 className="section-label">Descrição do Objeto</h3>
              <p className="detail-description-text">
                {item.description || 'Nenhuma descrição detalhada fornecida.'}
              </p>
            </div>

            {/* Meta Information List */}
            <div className="detail-meta-grid">
              <div className="meta-grid-item">
                <span className="meta-grid-icon">📍</span>
                <div>
                  <span className="meta-grid-label">Local Encontrado</span>
                  <strong className="meta-grid-val">{item.location_found}</strong>
                </div>
              </div>

              <div className="meta-grid-item">
                <span className="meta-grid-icon">📅</span>
                <div>
                  <span className="meta-grid-label">Data em que foi Encontrado</span>
                  <strong className="meta-grid-val">{formatDate(item.found_at)}</strong>
                </div>
              </div>

              <div className="meta-grid-item">
                <span className="meta-grid-icon">👤</span>
                <div>
                  <span className="meta-grid-label">Cadastrado por</span>
                  <strong className="meta-grid-val">
                    {item.found_by_name || 'Usuário'}
                  </strong>
                  {item.found_by_department && (
                    <span className="meta-grid-sub">{item.found_by_department}</span>
                  )}
                </div>
              </div>

              <div className="meta-grid-item">
                <span className="meta-grid-icon">🕒</span>
                <div>
                  <span className="meta-grid-label">Data de Registro no Sistema</span>
                  <strong className="meta-grid-val">{formatDate(item.created_at)}</strong>
                </div>
              </div>

              {item.approved_by_name && (
                <div className="meta-grid-item">
                  <span className="meta-grid-icon">🛡️</span>
                  <div>
                    <span className="meta-grid-label">Aprovado pelo Funcionário</span>
                    <strong className="meta-grid-val">{item.approved_by_name}</strong>
                    {item.approved_at && (
                      <span className="meta-grid-sub">{formatDate(item.approved_at)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collection Info (if returned) */}
            {collection && (
              <div className="detail-collection-card">
                <div className="collection-card-header">
                  <span className="col-icon">✅</span>
                  <div>
                    <h4>Registro de Devolução Concluída</h4>
                    <p>Este objeto já foi entregue e retirado no balcão.</p>
                  </div>
                </div>
                <div className="collection-details-list">
                  <p><strong>Entregue para:</strong> {collection.collected_by_name} ({collection.collected_by_email})</p>
                  <p><strong>Departamento do recebedor:</strong> {collection.collected_by_department || '-'}</p>
                  <p><strong>Confirmado por:</strong> {collection.confirmed_by_name}</p>
                  <p><strong>Data de entrega:</strong> {formatDate(collection.collected_at)}</p>
                  {collection.notes && <p><strong>Observações da entrega:</strong> {collection.notes}</p>}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS AREA */}
            <div className="detail-actions-area">
              {/* Employee review buttons if item is pending */}
              {isEmployee && item.status === 'pending_approval' && (
                <div className="employee-review-actions">
                  <div className="review-prompt-notice">
                    🛡️ <strong>Atenção Funcionário:</strong> Este item está pendente de aprovação antes de ficar visível na busca pública.
                  </div>
                  <div className="review-btn-row">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="btn-approve-action"
                    >
                      ✅ Aprovar Cadastro
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="btn-reject-action"
                    >
                      ❌ Rejeitar e Arquivar
                    </button>
                  </div>
                </div>
              )}

              {/* User claim button if item is approved */}
              {item.status === 'approved' && !isFinder && (
                <div className="claim-action-box">
                  <p className="claim-hint-text">
                    Reconheceu este objeto como seu? Clique abaixo para abrir uma solicitação de reivindicação.
                  </p>
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="btn-claim-primary"
                  >
                    🙋 Este objeto é meu (Reivindicar)
                  </button>
                </div>
              )}

              {isFinder && (
                <div className="finder-self-notice">
                  ℹ️ Você foi quem cadastrou este objeto como encontrado.
                </div>
              )}

              {item.status === 'claimed' && (
                <div className="status-notice-box notice-claimed">
                  ⏳ <strong>Objeto em processo de reivindicação:</strong> Aguardando comparecimento ao balcão e confirmação por um funcionário.
                </div>
              )}

              {item.status === 'collected' && (
                <div className="status-notice-box notice-collected">
                  🎉 <strong>Processo concluído:</strong> Este objeto já foi devolvido ao seu respectivo proprietário.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Claim Confirmation Modal */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Reivindicar Objeto #{item.id}</h3>
            <p className="modal-description">
              Ao confirmar a solicitação para <strong>"{item.name}"</strong>, o item mudará para o status <em>Reivindicado</em>. Você deverá comparecer ao balcão de achados e perdidos com documento oficial para comprovar a posse e retirar o item.
            </p>

            <div className="modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowClaimModal(false)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirm"
                onClick={handleClaim}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processando...' : 'Confirmar Reivindicação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
