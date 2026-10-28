import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ItemDetail from './pages/ItemDetail';
import NewItem from './pages/NewItem';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Logs from './pages/Logs';
import Scanner from './pages/Scanner';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Dashboard Shell */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/my-items" element={<Profile defaultTab="items" />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/new-item" element={<NewItem />} />
              <Route path="/items/:id" element={<ItemDetail />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/logs" element={<Logs />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
