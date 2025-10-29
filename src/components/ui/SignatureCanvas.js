import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import './SignatureCanvas.css';

function SignatureCanvas({ onSign, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = e => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = e => {
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
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas.toDataURL('image/png');
    onSign(signatureDataUrl);
  };

  return (
    <div className="signature-modal-overlay" onClick={onCancel}>
      <div className="signature-modal" onClick={e => e.stopPropagation()}>
        <div className="signature-header">
          <h2>Unterschrift</h2>
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>

        <div className="signature-content">
          <p>Bitte unterzeichne mit der Maus:</p>
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="signature-canvas"
          />
        </div>

        <div className="signature-footer">
          <button className="btn-secondary" onClick={clearCanvas}>
            Löschen
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={handleSign}>
            Unterzeichnen
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignatureCanvas;
