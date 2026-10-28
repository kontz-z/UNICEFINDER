import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const ROUTE_TITLES = {
  '/': { title: 'Dashboard Geral', subtitle: 'Visão consolidada de itens e devoluções' },
  '/my-items': { title: 'Meus Itens & Reivindicações', subtitle: 'Acompanhe seus itens cadastrados e solicitações' },
  '/new-item': { title: 'Cadastrar Novo Item', subtitle: 'Registre um objeto perdido ou encontrado no campus' },
  '/scanner': { title: 'Escanear QR Code', subtitle: 'Identifique instantaneamente um item pela câmera' },
  '/profile': { title: 'Perfil do Usuário', subtitle: 'Seus dados institucionais e histórico de atividades' },
  '/admin': { title: 'Painel Administrativo', subtitle: 'Aprovação de itens cadastrados e retiradas de balcão' },
  '/logs': { title: 'Logs de Auditoria', subtitle: 'Histórico de eventos e ações executadas no sistema' }
};

export default function Layout() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="layout-loading-screen">
        <div className="spinner-large"></div>
        <p>Carregando UniceFinder...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Get current page header title
  const currentPath = location.pathname;
  let pageInfo = ROUTE_TITLES[currentPath];
  if (!pageInfo) {
    if (currentPath.startsWith('/items/')) {
      pageInfo = { title: 'Detalhes do Objeto', subtitle: 'Informações completas, QR Code e retirada' };
    } else {
      pageInfo = { title: 'UniceFinder', subtitle: 'Gestão Inteligente de Achados e Perdidos' };
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-viewport">
        {/* Top Header Bar */}
        <header className="desktop-topbar">
          <div className="topbar-info">
            <h1 className="topbar-page-title">{pageInfo.title}</h1>
            <p className="topbar-page-subtitle">{pageInfo.subtitle}</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user-pill">
              <span className="user-pill-greeting">Olá, <strong>{user?.name?.split(' ')[0] || 'Usuário'}</strong></span>
              <span className="user-pill-dept">({user?.department || 'Geral'})</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="desktop-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
