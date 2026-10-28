import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import './Profile.css';

export default function Profile({ defaultTab }) {
  const { user, isEmployee } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = defaultTab || queryParams.get('tab') || 'items';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState({ published: 0, returned: 0 });
  const [myItems, setMyItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [api.getMyItems(), api.getMyClaims()];
      if (user?.id) {
        promises.push(api.getUserStats(user.id));
      }

      const results = await Promise.all(promises);
      setMyItems(Array.isArray(results[0]) ? results[0] : []);
      setMyClaims(Array.isArray(results[1]) ? results[1] : []);
      if (results[2]) {
        setStats(results[2]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do perfil:', err);
      showToast('Erro ao carregar itens do perfil.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="profile-container">
      {/* 1. TOP USER CARD & STATS */}
      <div className="profile-overview-card">
        <div className="profile-info-left">
          <div className="profile-avatar-large">
            {getInitials(user?.name)}
          </div>
          <div className="profile-user-texts">
            <div className="profile-name-row">
              <h2 className="profile-full-name">{user?.name || 'Usuário'}</h2>
              <span className={`profile-role-tag ${isEmployee ? 'role-employee' : 'role-user'}`}>
                {isEmployee ? '🛡️ Funcionário Autorizado' : '👤 Usuário / Aluno'}
              </span>
            </div>
            <p className="profile-email">✉️ {user?.email || '-'}</p>
            <p className="profile-dept">🏛️ Setor / Curso: <strong>{user?.department || 'Geral'}</strong></p>
          </div>
        </div>

        {/* User Stats Counter */}
        <div className="profile-stats-right">
          <div className="user-stat-box">
            <span className="user-stat-num">{stats.published ?? 0}</span>
            <span className="user-stat-label">Itens Cadastrados</span>
          </div>

          <div className="user-stat-box">
            <span className="user-stat-num text-green">{stats.returned ?? 0}</span>
            <span className="user-stat-label">Devolvidos com Sucesso</span>
          </div>
        </div>
      </div>

      {/* 2. PROFILE TABS */}
      <div className="profile-tabs-card">
        <div className="profile-tabs-header">
          <button
            className={`profile-tab-button ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <span>📦</span>
            <span>Meus Itens Cadastrados</span>
            <span className="tab-badge">{myItems.length}</span>
          </button>

          <button
            className={`profile-tab-button ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            <span>🙋</span>
            <span>Minhas Reivindicações</span>
            <span className="tab-badge">{myClaims.length}</span>
          </button>
        </div>

        {/* 3. TAB CONTENT */}
        <div className="profile-tab-body">
          {loading ? (
            <div className="tab-loading-state">
              <div className="spinner-large"></div>
              <p>Carregando registros...</p>
            </div>
          ) : activeTab === 'items' ? (
            /* LIST OF USER ITEMS */
            myItems.length === 0 ? (
              <div className="tab-empty-state">
                <span className="empty-emoji">📦</span>
                <h3>Nenhum item cadastrado</h3>
                <p>Você ainda não registrou nenhum objeto encontrado no campus.</p>
                <button
                  onClick={() => navigate('/new-item')}
                  className="btn-create-first-item"
                >
                  ➕ Cadastrar Primeiro Item
                </button>
              </div>
            ) : (
              <div className="profile-table-wrapper">
                <table className="profile-data-table">
                  <thead>
                    <tr>
                      <th>Objeto</th>
                      <th>Local Encontrado</th>
                      <th>Data de Registro</th>
                      <th>Status Atual</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myItems.map((item) => (
                      <tr key={item.id}>
                        <td className="table-item-cell">
                          <div className="item-thumb-box">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.name} className="table-thumb" />
                            ) : (
                              <span>📦</span>
                            )}
                          </div>
                          <div>
                            <strong>{item.name}</strong>
                            <div className="sub-tag">#{item.id}</div>
                          </div>
                        </td>
                        <td>{item.location_found}</td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>
                          <StatusBadge status={item.status} size="small" />
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/items/${item.id}`)}
                            className="btn-view-item"
                          >
                            Ver Detalhes &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* LIST OF USER CLAIMS */
            myClaims.length === 0 ? (
              <div className="tab-empty-state">
                <span className="empty-emoji">🙋</span>
                <h3>Nenhuma reivindicação realizada</h3>
                <p>Você ainda não solicitou a retirada de nenhum objeto perdido.</p>
                <button
                  onClick={() => navigate('/')}
                  className="btn-create-first-item"
                >
                  🔍 Buscar Meus Pertences
                </button>
              </div>
            ) : (
              <div className="profile-table-wrapper">
                <table className="profile-data-table">
                  <thead>
                    <tr>
                      <th>Objeto Reivindicado</th>
                      <th>Data do Pedido</th>
                      <th>Status da Solicitação</th>
                      <th>Status do Objeto</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="table-item-cell">
                          <div className="item-thumb-box">
                            {claim.photo_url ? (
                              <img src={claim.photo_url} alt={claim.item_name} className="table-thumb" />
                            ) : (
                              <span>📦</span>
                            )}
                          </div>
                          <div>
                            <strong>{claim.item_name || `Item #${claim.item_id}`}</strong>
                            <div className="sub-tag">Reivindicação #{claim.id}</div>
                          </div>
                        </td>
                        <td>{formatDate(claim.claimed_at)}</td>
                        <td>
                          <StatusBadge status={claim.status} size="small" />
                        </td>
                        <td>
                          <StatusBadge status={claim.item_status || 'claimed'} size="small" />
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/items/${claim.item_id}`)}
                            className="btn-view-item"
                          >
                            Ver Objeto &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
