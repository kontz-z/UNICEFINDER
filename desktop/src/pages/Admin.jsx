import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import './Admin.css';

export default function Admin() {
  const { isEmployee } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingItems, setPendingItems] = useState([]);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal para aprovação de reivindicação com anotações de entrega
  const [selectedClaimForApproval, setSelectedClaimForApproval] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('Retirada realizada e confirmada no balcão de achados e perdidos.');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, claims] = await Promise.all([
        api.getItems({ status: 'pending_approval' }),
        api.getClaims('pending')
      ]);

      setPendingItems(Array.isArray(items) ? items : []);
      setPendingClaims(Array.isArray(claims) ? claims : []);
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
      showToast('Erro ao consultar pendências do sistema.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isEmployee) {
      loadAdminData();
    }
  }, [isEmployee, loadAdminData]);

  if (!isEmployee) {
    return (
      <div className="admin-restricted-box">
        <div className="restricted-icon">🛡️⛔</div>
        <h2>Acesso Restrito a Funcionários</h2>
        <p>
          Esta página é destinada exclusivamente à equipe de atendimento e administração do UniceFinder.
        </p>
        <button onClick={() => navigate('/')} className="btn-return-home">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  // Ações em Itens
  const handleApproveItem = async (item) => {
    if (!window.confirm(`Aprovar a publicação do item "${item.name}"?`)) return;

    setActionLoading(true);
    try {
      await api.approveItem(item.id);
      showToast(`Item "${item.name}" aprovado com sucesso!`, 'success');
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      showToast(err.message || 'Falha ao aprovar item.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectItem = async (item) => {
    if (!window.confirm(`Rejeitar e arquivar o item "${item.name}"?`)) return;

    setActionLoading(true);
    try {
      await api.rejectItem(item.id);
      showToast(`Item "${item.name}" rejeitado.`, 'info');
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      showToast(err.message || 'Falha ao rejeitar item.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Ações em Reivindicações
  const handleOpenApproveClaimModal = (claim) => {
    setSelectedClaimForApproval(claim);
    setDeliveryNotes('Retirada realizada e confirmada no balcão de achados e perdidos.');
  };

  const handleConfirmClaimApproval = async () => {
    if (!selectedClaimForApproval) return;

    setActionLoading(true);
    try {
      await api.approveClaim(selectedClaimForApproval.id, deliveryNotes);
      showToast('Entrega confirmada com sucesso! Objeto marcado como Devolvido.', 'success');
      setPendingClaims((prev) => prev.filter((c) => c.id !== selectedClaimForApproval.id));
      setSelectedClaimForApproval(null);
    } catch (err) {
      showToast(err.message || 'Falha ao confirmar entrega.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClaim = async (claim) => {
    if (!window.confirm(`Rejeitar a reivindicação do aluno ${claim.claimant_name}? O item voltará ao status Disponível.`)) return;

    setActionLoading(true);
    try {
      await api.rejectClaim(claim.id);
      showToast('Reivindicação rejeitada. Item liberado.', 'info');
      setPendingClaims((prev) => prev.filter((c) => c.id !== claim.id));
    } catch (err) {
      showToast(err.message || 'Falha ao rejeitar reivindicação.', 'error');
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
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-page-container">
      {/* Top Controls Header */}
      <div className="admin-header-row">
        <div>
          <h2 className="admin-title">Painel de Moderação & Balcão</h2>
          <p className="admin-subtitle">
            Gerencie itens recém-cadastrados aguardando verificação e libere retiradas de objetos reivindicados
          </p>
        </div>

        <div className="admin-header-actions">
          <button onClick={loadAdminData} className="btn-admin-refresh" disabled={loading}>
            <span>🔄</span> Atualizar Fila
          </button>
          <button onClick={() => navigate('/logs')} className="btn-admin-logs">
            <span>📋</span> Ver Auditoria
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-card">
          <div className="spinner-large"></div>
          <p>Carregando solicitações pendentes...</p>
        </div>
      ) : (
        /* TWO COLUMNS SIDE BY SIDE */
        <div className="admin-two-columns">
          {/* COLUMN 1: PENDING ITEMS */}
          <div className="admin-column">
            <div className="column-header">
              <div className="col-header-title">
                <span className="col-icon">📦</span>
                <h3>Itens Aguardando Aprovação</h3>
              </div>
              <span className="column-count-badge count-amber">
                {pendingItems.length}
              </span>
            </div>

            <div className="column-body">
              {pendingItems.length === 0 ? (
                <div className="column-empty-card">
                  <span className="empty-icon">✅</span>
                  <h4>Nenhum item pendente</h4>
                  <p>Todos os cadastros foram revisados e aprovados.</p>
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="admin-item-card">
                    <div className="admin-card-top">
                      <div className="admin-thumb-wrapper">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} className="admin-thumb" />
                        ) : (
                          <span className="admin-no-thumb">{item.category_icon || '📦'}</span>
                        )}
                      </div>

                      <div className="admin-item-info">
                        <div className="admin-item-title-row">
                          <h4
                            className="clickable-title"
                            onClick={() => navigate(`/items/${item.id}`)}
                            title="Ver detalhes completos"
                          >
                            {item.name}
                          </h4>
                          <span className="admin-id-tag">#{item.id}</span>
                        </div>
                        <p className="admin-item-desc">{item.description || 'Sem descrição.'}</p>
                        <div className="admin-meta-info">
                          <span>📍 {item.location_found}</span>
                          <span>🕒 {formatDate(item.created_at)}</span>
                          <span>👤 {item.found_by_name} ({item.found_by_department || 'Geral'})</span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-card-actions">
                      <button
                        onClick={() => navigate(`/items/${item.id}`)}
                        className="btn-admin-details"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => handleRejectItem(item)}
                        disabled={actionLoading}
                        className="btn-admin-reject"
                      >
                        ✕ Rejeitar
                      </button>
                      <button
                        onClick={() => handleApproveItem(item)}
                        disabled={actionLoading}
                        className="btn-admin-approve"
                      >
                        ✓ Aprovar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: PENDING CLAIMS */}
          <div className="admin-column">
            <div className="column-header">
              <div className="col-header-title">
                <span className="col-icon">🙋</span>
                <h3>Reivindicações Pendentes</h3>
              </div>
              <span className="column-count-badge count-purple">
                {pendingClaims.length}
              </span>
            </div>

            <div className="column-body">
              {pendingClaims.length === 0 ? (
                <div className="column-empty-card">
                  <span className="empty-icon">🤝</span>
                  <h4>Nenhuma reivindicação pendente</h4>
                  <p>Não há solicitações de retirada aguardando confirmação no balcão.</p>
                </div>
              ) : (
                pendingClaims.map((claim) => (
                  <div key={claim.id} className="admin-claim-card">
                    <div className="claim-card-top">
                      <div className="claim-avatar">
                        👤
                      </div>
                      <div className="claim-info">
                        <div className="claim-title-row">
                          <h4>{claim.item_name || `Item #${claim.item_id}`}</h4>
                          <span className="admin-id-tag">Pedido #{claim.id}</span>
                        </div>

                        <div className="claimant-box">
                          <p><strong>Requerente:</strong> {claim.claimant_name}</p>
                          <p><strong>E-mail:</strong> {claim.claimant_email}</p>
                          <p><strong>Setor/Curso:</strong> {claim.claimant_department || '-'}</p>
                          <p><strong>Data da solicitação:</strong> {formatDate(claim.claimed_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="admin-card-actions">
                      <button
                        onClick={() => navigate(`/items/${claim.item_id}`)}
                        className="btn-admin-details"
                      >
                        Ver Objeto
                      </button>
                      <button
                        onClick={() => handleRejectClaim(claim)}
                        disabled={actionLoading}
                        className="btn-admin-reject"
                      >
                        ✕ Rejeitar
                      </button>
                      <button
                        onClick={() => handleOpenApproveClaimModal(claim)}
                        disabled={actionLoading}
                        className="btn-admin-approve btn-approve-delivery"
                      >
                        ✓ Confirmar Entrega
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ENTREGA DE BALCÃO */}
      {selectedClaimForApproval && (
        <div className="modal-overlay" onClick={() => setSelectedClaimForApproval(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Confirmar Entrega de Objeto</h3>
            <p className="modal-description">
              Você está prestes a registrar a entrega do objeto <strong>"{selectedClaimForApproval.item_name}"</strong> para <strong>{selectedClaimForApproval.claimant_name}</strong>.
            </p>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="deliveryNotes" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>
                Observações do Balcão / Documento Apresentado
              </label>
              <textarea
                id="deliveryNotes"
                rows={3}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="form-textarea-input"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={() => setSelectedClaimForApproval(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirm"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                onClick={handleConfirmClaimApproval}
                disabled={actionLoading}
              >
                {actionLoading ? 'Registrando...' : 'Finalizar e Entregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
