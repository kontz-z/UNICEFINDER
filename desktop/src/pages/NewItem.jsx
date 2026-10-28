import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useToast } from '../components/Toast';
import './NewItem.css';

const COMMON_LOCATIONS = [
  'Biblioteca Central',
  'Restaurante Universitário / Cantina',
  'Bloco A - Térreo',
  'Bloco B - Laboratórios',
  'Quadra Poliesportiva',
  'Auditório Principal',
  'Estacionamento'
];

export default function NewItem() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationFound, setLocationFound] = useState('');
  const [foundAt, setFoundAt] = useState(() => {
    // Current local datetime string for input datetime-local
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    async function loadCats() {
      try {
        const data = await api.getCategories();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setCategoryId(String(data[0].id));
        }
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      }
    }
    loadCats();
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione apenas arquivos de imagem (PNG, JPG, JPEG).', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem excede o tamanho máximo de 10MB.', 'error');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Informe o nome do objeto.', 'warning');
      return;
    }

    if (!locationFound.trim()) {
      showToast('Informe o local onde o objeto foi encontrado.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (categoryId) formData.append('category_id', categoryId);
      formData.append('location_found', locationFound.trim());
      if (foundAt) formData.append('found_at', new Date(foundAt).toISOString());
      if (photoFile) formData.append('photo', photoFile);

      const res = await api.createItem(formData);
      showToast('Objeto cadastrado com sucesso! Aguardando aprovação.', 'success');
      
      const newId = res.item?.id || res.id;
      if (newId) {
        navigate(`/items/${newId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Erro ao cadastrar item:', err);
      showToast(err.message || 'Falha ao cadastrar item. Verifique os dados.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-item-container">
      <div className="new-item-card">
        <div className="card-header-section">
          <div className="header-icon-box">📦➕</div>
          <div>
            <h2 className="new-item-heading">Cadastrar Objeto Encontrado</h2>
            <p className="new-item-subheading">
              Preencha os detalhes do item achado no campus para que o proprietário possa identificá-lo
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="new-item-form">
          <div className="new-item-grid">
            {/* LEFT COLUMN: Photo Upload & Drag-and-Drop */}
            <div className="photo-upload-column">
              <label className="field-label">Fotografia do Objeto</label>

              <div
                className={`photo-dropzone ${isDragging ? 'dragging' : ''} ${photoPreview ? 'has-preview' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !photoPreview && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                />

                {photoPreview ? (
                  <div className="preview-container">
                    <img src={photoPreview} alt="Prévia do objeto" className="preview-img" />
                    <button
                      type="button"
                      className="btn-remove-preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto();
                      }}
                      title="Remover foto"
                    >
                      ✕ Remover Foto
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-content">
                    <div className="dropzone-icon">📷</div>
                    <span className="dropzone-title">
                      Arraste e solte uma foto aqui
                    </span>
                    <span className="dropzone-sub">
                      ou clique para selecionar do computador
                    </span>
                    <span className="dropzone-limit">PNG, JPG ou WEBP até 10MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Form Fields */}
            <div className="form-fields-column">
              {/* Item Name */}
              <div className="form-field-group">
                <label htmlFor="itemName" className="field-label">
                  Nome do Objeto *
                </label>
                <input
                  id="itemName"
                  type="text"
                  placeholder="Ex.: Carteira de couro preta, Garrafa térmica azul..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-text-input"
                  required
                />
              </div>

              {/* Category & Found Date */}
              <div className="form-two-fields">
                <div className="form-field-group">
                  <label htmlFor="itemCategory" className="field-label">
                    Categoria
                  </label>
                  <select
                    id="itemCategory"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select-input"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '🏷️'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label htmlFor="foundAt" className="field-label">
                    Data e Hora em que foi Encontrado
                  </label>
                  <input
                    id="foundAt"
                    type="datetime-local"
                    value={foundAt}
                    onChange={(e) => setFoundAt(e.target.value)}
                    className="form-text-input"
                  />
                </div>
              </div>

              {/* Location Found with quick chips */}
              <div className="form-field-group">
                <label htmlFor="locationFound" className="field-label">
                  Local Onde Foi Encontrado *
                </label>
                <input
                  id="locationFound"
                  type="text"
                  placeholder="Ex.: Bloco C, sala 204, próximo à mesa dos fundos"
                  value={locationFound}
                  onChange={(e) => setLocationFound(e.target.value)}
                  className="form-text-input"
                  required
                />

                <div className="quick-locations">
                  <span className="quick-loc-label">Sugestões rápidas:</span>
                  <div className="quick-loc-chips">
                    {COMMON_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className="chip-loc"
                        onClick={() => setLocationFound(loc)}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-field-group">
                <label htmlFor="itemDescription" className="field-label">
                  Descrição Detalhada
                </label>
                <textarea
                  id="itemDescription"
                  rows={4}
                  placeholder="Descreva detalhes específicos que ajudem a comprovar a posse (marca, marcas de uso, chaveiro, adesivos, conteúdo visível)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea-input"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="new-item-form-actions">
            <button
              type="button"
              className="btn-form-cancel"
              onClick={() => navigate('/')}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-form-submit"
              disabled={submitting}
            >
              {submitting ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span> Cadastrando Objeto...
                </span>
              ) : (
                'Salvar e Publicar Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
