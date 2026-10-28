import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './Logs.css';

const ACTION_MAP = {
  LOGIN: { label: '🔑 Login', color: '#2563EB', bg: '#DBEAFE' },
  LOGOUT: { label: '🚪 Logout', color: '#6B7280', bg: '#F3F4F6' },
  REGISTER: { label: '👤 Cadastro', color: '#059669', bg: '#D1FAE5' },
  CREATE_ITEM: { label: '📦 Item Cadastrado', color: '#7C3AED', bg: '#EDE9FE' },
  APPROVE_ITEM: { label: '✅ Item Aprovado', color: '#059669', bg: '#D1FAE5' },
  REJECT_ITEM: { label: '❌ Item Rejeitado', color: '#DC2626', bg: '#FEE2E2' },
  CREATE_CLAIM: { label: '🙋 Reivindicação', color: '#D97706', bg: '#FEF3C7' },
  APPROVE_CLAIM: { label: '✅ Devolução Aprovada', color: '#059669', bg: '#D1FAE5' },
  REJECT_CLAIM: { label: '❌ Devolução Rejeitada', color: '#DC2626', bg: '#FEE2E2' },
  COLLECT_ITEM: { label: '📥 Coleta Registrada', color: '#0D9488', bg: '#CCFBF1' }
};

export default function Logs() {
  const { isEmployee } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [actionsList, setActionsList] = useState([]);
  const [selectedAction, setSelectedAction] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load Action Types on Mount
  useEffect(() => {
    async function loadActions() {
      try {
        const data = await api.getLogActions();
        if (Array.isArray(data)) {
          setActionsList(data);
        }
      } catch (err) {
        console.error('Erro ao carregar tipos de ações:', err);
      }
    }
    if (isEmployee) {
      loadActions();
    }
  }, [isEmployee]);

  // Load Logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLogs({
        action: selectedAction,
        limit,
        offset
      });

      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotalCount(data.total || 0);
      } else {
        setLogs([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      showToast('Falha ao obter logs de auditoria.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedAction, limit, offset, showToast]);

  useEffect(() => {
    if (isEmployee) {
      loadLogs();
    }
  }, [isEmployee, loadLogs]);

  if (!isEmployee) {
    return (
      <div className="logs-restricted-box">
        <div className="restricted-icon">📋🔒</div>
        <h2>Acesso aos Logs Restrito</h2>
        <p>Os registros de auditoria do sistema são visíveis apenas por funcionários autorizados.</p>
        <button onClick={() => navigate('/')} className="btn-return-home">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const handleActionChange = (e) => {
    setSelectedAction(e.target.value);
    setOffset(0); // Reset to first page
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setOffset(0);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      setOffset(offset + limit);
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
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="logs-page-container">
      {/* Top Filter and Info Card */}
      <div className="logs-filter-card">
        <div className="logs-title-info">
          <h2 className="logs-title">Trilha de Auditoria & Segurança</h2>
          <p className="logs-subtitle">
            Histórico completo de autenticações, cadastros, alterações e devoluções realizadas
          </p>
        </div>

        <div className="logs-filter-controls">
          <div className="filter-group">
            <label htmlFor="filterAction">Filtrar por Ação:</label>
            <select
              id="filterAction"
              value={selectedAction}
              onChange={handleActionChange}
              className="select-action-type"
            >
              <option value="all">Todas as Ações ({totalCount})</option>
              {actionsList.map((act) => (
                <option key={act} value={act}>
                  {ACTION_MAP[act]?.label || act}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filterLimit">Por Página:</label>
            <select
              id="filterLimit"
              value={limit}
              onChange={handleLimitChange}
              className="select-limit"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button onClick={loadLogs} className="btn-logs-refresh" disabled={loading}>
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="logs-table-card">
        {loading ? (
          <div className="logs-loading-state">
            <div className="spinner-large"></div>
            <p>Carregando eventos de auditoria...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="logs-empty-state">
            <span className="empty-icon">📋</span>
            <h3>Nenhum registro encontrado</h3>
            <p>Nenhuma ação registrada para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-data-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Data / Horário</th>
                  <th style={{ width: '180px' }}>Tipo de Ação</th>
                  <th style={{ width: '220px' }}>Usuário Responsável</th>
                  <th>Detalhes da Operação</th>
                  <th style={{ width: '140px' }}>Endereço IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actMeta = ACTION_MAP[log.action] || {
                    label: log.action,
                    color: '#4B5563',
                    bg: '#F3F4F6'
                  };

                  return (
                    <tr key={log.id}>
                      <td className="log-time-cell">
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <span
                          className="log-action-badge"
                          style={{
                            color: actMeta.color,
                            backgroundColor: actMeta.bg,
                            border: `1px solid ${actMeta.color}33`
                          }}
                        >
                          {actMeta.label}
                        </span>
                      </td>
                      <td className="log-user-cell">
                        <strong>{log.user_name || 'Sistema / Anônimo'}</strong>
                        {log.user_email && <span className="log-user-email">{log.user_email}</span>}
                      </td>
                      <td className="log-details-cell">
                        <span className="log-details-text">{log.details || '-'}</span>
                        {log.entity_type && log.entity_id && (
                          <span className="log-entity-tag">
                            {log.entity_type} #{log.entity_id}
                          </span>
                        )}
                      </td>
                      <td className="log-ip-cell">
                        <code>{log.ip_address || '-'}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="logs-pagination-footer">
          <div className="pagination-count-info">
            Mostrando <strong>{logs.length > 0 ? offset + 1 : 0}</strong> até{' '}
            <strong>{Math.min(offset + limit, totalCount)}</strong> de <strong>{totalCount}</strong> eventos
          </div>

          <div className="pagination-controls">
            <button
              onClick={handlePrevPage}
              disabled={offset === 0 || loading}
              className="btn-page-nav"
            >
              &larr; Anterior
            </button>
            <span className="page-indicator">
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              onClick={handleNextPage}
              disabled={offset + limit >= totalCount || loading}
              className="btn-page-nav"
            >
              Próxima &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
