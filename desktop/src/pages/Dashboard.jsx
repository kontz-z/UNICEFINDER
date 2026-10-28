import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import ItemCard from '../components/ItemCard';
import { useToast } from '../components/Toast';
import './Dashboard.css';

const STATUS_TABS = [
  { id: 'all', label: 'Todos os Itens', icon: '📋' },
  { id: 'approved', label: 'Disponíveis', icon: '🔍' },
  { id: 'pending_approval', label: 'Aguardando Aprovação', icon: '⏳' },
  { id: 'claimed', label: 'Reivindicados', icon: '🙋' },
  { id: 'collected', label: 'Devolvidos', icon: '✅' }
];

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    items_today: 0,
    total_returns: 0,
    resolved_percent: 0
  });
  const [categories, setCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [itemsRes, statsRes, catsRes] = await Promise.all([
        api.getItems({
          status: selectedStatus,
          category_id: selectedCategory,
          search: searchQuery
        }),
        api.getItemStats(),
        api.getCategories()
      ]);

      setItems(Array.isArray(itemsRes) ? itemsRes : []);
      if (statsRes) setStats(statsRes);
      if (Array.isArray(catsRes)) setCategories(catsRes);
    } catch (err) {
      console.error('Erro ao carregar itens do dashboard:', err);
      showToast('Não foi possível carregar os itens.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, selectedCategory, searchQuery, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  return (
    <div className="dashboard-container">
      {/* 1. STATS CARDS ROW */}
      <section className="stats-cards-row">
        <div className="stat-card stat-today">
          <div className="stat-card-icon-wrap bg-purple-soft">
            <span className="stat-icon">📦</span>
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Itens Hoje</span>
            <div className="stat-value">{stats.items_today ?? 0}</div>
            <span className="stat-desc">Novos registros no campus</span>
          </div>
        </div>

        <div className="stat-card stat-returns">
          <div className="stat-card-icon-wrap bg-green-soft">
            <span className="stat-icon">🤝</span>
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Devoluções Concluídas</span>
            <div className="stat-value">{stats.total_returns ?? 0}</div>
            <span className="stat-desc">Itens devolvidos aos donos</span>
          </div>
        </div>

        <div className="stat-card stat-percent">
          <div className="stat-card-icon-wrap bg-blue-soft">
            <span className="stat-icon">🎯</span>
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Taxa de Resolução</span>
            <div className="stat-value">{stats.resolved_percent ?? 0}%</div>
            <span className="stat-desc">Eficácia do sistema</span>
          </div>
        </div>

        <div className="stat-card stat-total">
          <div className="stat-card-icon-wrap bg-amber-soft">
            <span className="stat-icon">🏷️</span>
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Itens Listados</span>
            <div className="stat-value">{items.length}</div>
            <span className="stat-desc">Filtrados atualmente</span>
          </div>
        </div>
      </section>

      {/* 2. CONTROLS BAR: SEARCH & FILTERS */}
      <section className="dashboard-controls-card">
        {/* Top Control Bar: Search + Quick Actions */}
        <div className="controls-header">
          <div className="search-bar-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nome, descrição ou local onde foi encontrado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Limpar busca"
              >
                ×
              </button>
            )}
          </div>

          <div className="controls-actions">
            <button
              onClick={() => loadData(true)}
              className="btn-refresh"
              disabled={refreshing}
              title="Atualizar dados"
            >
              <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={() => navigate('/new-item')}
              className="btn-create-item"
            >
              <span>➕</span>
              <span>Novo Item</span>
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="status-tabs-row" role="tablist">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selectedStatus === tab.id}
              className={`status-tab-btn ${selectedStatus === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedStatus(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Category Chips Bar */}
        <div className="category-chips-row">
          <span className="chips-title">Categorias:</span>
          <div className="chips-scroll-wrap">
            <button
              className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${selectedCategory === String(cat.id) ? 'active' : ''}`}
                onClick={() => setSelectedCategory(String(cat.id))}
              >
                <span className="cat-icon">{cat.icon || '🏷️'}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ITEMS GRID OR EMPTY STATE */}
      <section className="dashboard-items-section">
        <div className="items-section-header">
          <h2 className="items-section-title">
            Objetos Registrados
            <span className="items-count-badge">{items.length}</span>
          </h2>
          {(selectedStatus !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button onClick={handleResetFilters} className="btn-clear-all-filters">
              Limpar todos os filtros ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="dashboard-loading-state">
            <div className="spinner-large"></div>
            <p>Buscando itens no sistema...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-icon-wrap">📦🔍</div>
            <h3>Nenhum item encontrado</h3>
            <p>
              Não localizamos nenhum objeto com os critérios de filtro selecionados.
            </p>
            <div className="empty-actions">
              <button onClick={handleResetFilters} className="btn-secondary-action">
                Limpar Filtros
              </button>
              <button onClick={() => navigate('/new-item')} className="btn-primary-action">
                Cadastrar Novo Item
              </button>
            </div>
          </div>
        ) : (
          <div className="items-responsive-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Button for Fast Item Registration */}
      <button
        onClick={() => navigate('/new-item')}
        className="dashboard-fab"
        title="Cadastrar Novo Item"
        aria-label="Cadastrar Novo Item"
      >
        <span className="fab-icon">➕</span>
        <span className="fab-text">Novo Item</span>
      </button>
    </div>
  );
}
