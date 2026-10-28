import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import * as api from '../api';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import './Scanner.css';

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [fetchingItem, setFetchingItem] = useState(false);
  const [manualId, setManualId] = useState('');
  const [scannerError, setScannerError] = useState(null);

  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Helper to extract item ID from QR decoded text
  const extractItemId = (text) => {
    if (!text) return null;
    const trimmed = text.trim();

    // Direct number
    if (/^\d+$/.test(trimmed)) return trimmed;

    // JSON format: {"id": 12}
    try {
      const obj = JSON.parse(trimmed);
      if (obj && obj.id) return String(obj.id);
    } catch {
      // not JSON
    }

    // Query param ?id=12 or &id=12
    const queryMatch = trimmed.match(/[?&]id=(\d+)/i);
    if (queryMatch) return queryMatch[1];

    // URL path /items/12
    const pathMatch = trimmed.match(/\/items\/(\d+)/i);
    if (pathMatch) return pathMatch[1];

    // Prefix item:12
    const prefixMatch = trimmed.match(/item:(\d+)/i);
    if (prefixMatch) return prefixMatch[1];

    return null;
  };

  const handleItemDetected = async (rawCode) => {
    const itemId = extractItemId(rawCode);
    if (!itemId) {
      showToast(`Código QR não reconhecido como item do UniceFinder: "${rawCode}"`, 'warning');
      return;
    }

    // Stop scanning while showing result
    stopCamera();

    setFetchingItem(true);
    try {
      const item = await api.getItemById(itemId);
      setScannedItem(item);
      showToast(`Item #${item.id} localizado com sucesso!`, 'success');
    } catch (err) {
      showToast(`Item #${itemId} não encontrado no banco de dados.`, 'error');
    } finally {
      setFetchingItem(false);
    }
  };

  // Get cameras list on mount
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].id);
        }
      } catch (err) {
        console.warn('Não foi possível enumerar câmeras:', err);
      }
    }
    getDevices();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (cameraIdToUse) => {
    setScannerError(null);
    setScannedItem(null);

    const targetCamera = cameraIdToUse || selectedCameraId;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-container');
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      const cameraParam = targetCamera ? targetCamera : { facingMode: 'environment' };

      await scannerRef.current.start(
        cameraParam,
        config,
        (decodedText) => {
          handleItemDetected(decodedText);
        },
        (error) => {
          // ignore soft hunt frame errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Falha ao iniciar câmera:', err);
      setScannerError('Não foi possível acessar a câmera. Verifique as permissões de vídeo do navegador.');
      setIsScanning(false);
      showToast('Câmera indisponível ou permissão negada.', 'warning');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Erro ao parar câmera:', err);
      }
      setIsScanning(false);
    }
  };

  const handleToggleScan = () => {
    if (isScanning) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    setFetchingItem(true);
    try {
      const item = await api.getItemById(manualId.trim());
      setScannedItem(item);
      showToast(`Item #${item.id} localizado!`, 'success');
      setManualId('');
    } catch (err) {
      showToast(`Item #${manualId} não encontrado.`, 'error');
    } finally {
      setFetchingItem(false);
    }
  };

  return (
    <div className="scanner-page-container">
      <div className="scanner-main-card">
        {/* Header */}
        <div className="scanner-header">
          <div className="scanner-header-icon">📷✨</div>
          <div>
            <h2 className="scanner-heading">Leitor de QR Code</h2>
            <p className="scanner-subheading">
              Aponte a câmera para a etiqueta colada no objeto para consultar imediatamente suas informações
            </p>
          </div>
        </div>

        {/* Camera Control Bar */}
        <div className="scanner-controls-bar">
          {cameras.length > 1 && (
            <div className="camera-select-wrap">
              <label htmlFor="camSelect">Câmera:</label>
              <select
                id="camSelect"
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  if (isScanning) {
                    stopCamera().then(() => startCamera(e.target.value));
                  }
                }}
                className="camera-dropdown"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Câmera ${c.id.substring(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleToggleScan}
            className={`btn-toggle-camera ${isScanning ? 'btn-stop-cam' : 'btn-start-cam'}`}
          >
            <span>{isScanning ? '⏹️ Desativar Câmera' : '▶️ Ativar Câmera'}</span>
          </button>
        </div>

        {/* Scanner Viewer Area */}
        <div className="scanner-viewport-wrapper">
          <div id="qr-reader-container" className="qr-reader-box"></div>

          {!isScanning && !scannedItem && (
            <div className="camera-idle-placeholder">
              <span className="idle-cam-icon">📷</span>
              <p className="idle-title">Câmera desativada</p>
              <p className="idle-sub">Clique em "Ativar Câmera" acima para iniciar a leitura por vídeo.</p>
              <button onClick={() => startCamera()} className="btn-activate-shortcut">
                Ativar Agora
              </button>
            </div>
          )}

          {scannerError && (
            <div className="camera-error-banner">
              <span>⚠️ {scannerError}</span>
            </div>
          )}
        </div>

        {/* SCANNED ITEM RESULT CARD */}
        {scannedItem && (
          <div className="scanned-result-card">
            <div className="result-header">
              <span className="result-badge-label">🎯 Objeto Reconhecido</span>
              <StatusBadge status={scannedItem.status} />
            </div>

            <div className="result-body">
              <div className="result-thumb-box">
                {scannedItem.photo_url ? (
                  <img src={scannedItem.photo_url} alt={scannedItem.name} className="result-thumb" />
                ) : (
                  <span className="result-placeholder-icon">
                    {scannedItem.category_icon || '📦'}
                  </span>
                )}
              </div>

              <div className="result-info">
                <h3 className="result-title">{scannedItem.name}</h3>
                <p className="result-desc">{scannedItem.description || 'Sem descrição adicional.'}</p>
                <div className="result-meta-row">
                  <span>📍 {scannedItem.location_found}</span>
                  <span>🏷️ {scannedItem.category_name || 'Geral'}</span>
                  <span>👤 Encontrado por: {scannedItem.found_by_name}</span>
                </div>
              </div>
            </div>

            <div className="result-actions">
              <button
                onClick={() => {
                  setScannedItem(null);
                  startCamera();
                }}
                className="btn-scan-again"
              >
                🔄 Escanear Outro
              </button>
              <button
                onClick={() => navigate(`/items/${scannedItem.id}`)}
                className="btn-view-full-item"
              >
                Ver Detalhes do Objeto &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Fallback Manual Search */}
        <div className="manual-search-section">
          <div className="manual-divider">
            <span>OU BUSQUE PELO ID DIRETO DO OBJETO</span>
          </div>

          <form onSubmit={handleManualSearch} className="manual-search-form">
            <div className="manual-input-wrap">
              <span className="manual-prefix">#</span>
              <input
                type="number"
                placeholder="Exemplo: 12"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="manual-input"
              />
            </div>
            <button
              type="submit"
              className="btn-manual-submit"
              disabled={fetchingItem || !manualId.trim()}
            >
              {fetchingItem ? 'Consultando...' : 'Buscar Objeto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
