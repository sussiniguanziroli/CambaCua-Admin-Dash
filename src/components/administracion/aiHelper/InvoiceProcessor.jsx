import React, { useState } from 'react';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { processInvoiceImage } from './geminiService';
import InvoiceReview from './InvoiceReview';

const InvoiceProcessor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setExtractedData(null);
    } else {
      setError('Por favor selecciona una imagen válida');
    }
  };
  

  const handleProcess = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);

    const result = await processInvoiceImage(selectedFile);

    setProcessing(false);

    if (result.success) {
      setExtractedData(result.data);
    } else {
      setError(result.error);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setError(null);
  };

  if (extractedData) {
    return (
      <InvoiceReview 
        data={extractedData} 
        onBack={handleReset}
        imageUrl={previewUrl}
      />
    );
  }

  return (
    <div className="invoice-processor">
      <h2>Procesar Factura de Stock</h2>
      <p className="subtitle">Sube una foto de la factura y el sistema extraerá automáticamente los productos</p>

      <div className="upload-section">
        {!previewUrl ? (
          <label className="upload-area">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <FaCloudUploadAlt className="upload-icon" />
            <p>Haz click o arrastra una imagen aquí</p>
            <span className="file-types">JPG, PNG, HEIC</span>
          </label>
        ) : (
          <div className="preview-container">
            <img src={previewUrl} alt="Preview" className="image-preview" />
            <button className="change-image-btn" onClick={handleReset}>
              Cambiar imagen
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {previewUrl && !processing && (
        <button 
          className="process-button"
          onClick={handleProcess}
        >
          <FaCheckCircle />
          Procesar Factura
        </button>
      )}

      {processing && (
        <div className="processing-indicator">
          <FaSpinner className="spinner" />
          <p>Analizando factura...</p>
          <span className="processing-detail">Esto puede tomar unos segundos</span>
        </div>
      )}
    </div>
  );
};

export default InvoiceProcessor;