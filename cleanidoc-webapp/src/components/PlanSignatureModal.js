import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import './PlanSignatureModal.css';

function PlanSignatureModal({ 
  onClose, 
  onSign, 
  signerType, // 'admin' or 'customer'
  planName,
  currentSignatures 
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e40af';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) {
      alert('Bitte unterschreiben Sie zuerst');
      return;
    }

    if (!signerName.trim()) {
      alert('Bitte geben Sie Ihren Namen ein');
      return;
    }

    if (signerType === 'customer' && !signerEmail.trim()) {
      alert('Bitte geben Sie Ihre E-Mail ein');
      return;
    }

    if (!agreedToTerms) {
      alert('Bitte akzeptieren Sie die Bedingungen');
      return;
    }

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas.toDataURL('image/png');

    try {
      await onSign({
        signatureDataUrl,
        signerName,
        signerEmail,
        signerType,
      });
    } catch (error) {
      console.error('Fehler beim Signieren:', error);
      alert('Fehler: ' + error.message);
    }
  };

  const getTitle = () => {
    if (signerType === 'admin') return 'Plan als Admin unterzeichnen';
    return 'Plan als Kunde unterzeichnen';
  };

  const getDescription = () => {
    if (signerType === 'admin') {
      return 'Sie unterzeichnen diesen Reinigungsplan als Administrator-Genehmigung.';
    }
    return 'Sie unterzeichnen diesen Reinigungsplan als Kundenbestätigung und Zustimmung.';
  };

  return (
    <div className="signature-modal-overlay" onClick={onClose}>
      <div className="signature-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signature-modal-header">
          <div>
            <h2>{getTitle()}</h2>
            <p className="plan-name">Plan: {planName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="signature-modal-body">
          <div className="info-section">
            <p className="description">{getDescription()}</p>
          </div>

          {/* Signature Canvas */}
          <div className="canvas-section">
            <label>Unterschrift *</label>
            <p className="hint">Unterschreiben Sie mit der Maus oder dem Touchpad</p>
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="signature-canvas"
            />
            <button
              type="button"
              className="btn-clear-signature"
              onClick={clearSignature}
            >
              Löschen
            </button>
          </div>

          {/* Signer Info */}
          <div className="signer-info-section">
            <div className="form-group">
              <label>Vollständiger Name *</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Max Mustermann"
              />
            </div>

            {signerType === 'customer' && (
              <div className="form-group">
                <label>E-Mail-Adresse *</label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="max@beispiel.de"
                />
              </div>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="terms-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                Ich bestätige, dass ich diesen Plan gelesen und verstanden habe und der Durchführung zustimme.
              </span>
            </label>
          </div>

          {/* Current Signatures Display */}
          {currentSignatures && (
            <div className="current-signatures">
              <h4>Status der Unterschriften</h4>
              <div className="signatures-list">
                {currentSignatures.admin_signed && (
                  <div className="signature-status signed">
                    ✓ Admin unterzeichnet von {currentSignatures.admin_signer_name}
                  </div>
                )}
                {currentSignatures.customer_signed && (
                  <div className="signature-status signed">
                    ✓ Kunde unterzeichnet von {currentSignatures.customer_signer_name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="signature-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="btn-primary"
            onClick={handleSign}
            disabled={!hasSignature || !signerName.trim() || !agreedToTerms}
          >
            Unterzeichnen
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanSignatureModal;
