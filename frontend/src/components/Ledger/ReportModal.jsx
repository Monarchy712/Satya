import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { submitReport, validateReport } from '../../utils/api';
import LoadingOverlay from '../UI/LoadingOverlay';
import LoadingSpinner from '../UI/LoadingSpinner';
import './ReportModal.css';

export default function ReportModal({ contract, onClose }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 🔑 Pinata Keys
  const PINATA_API_KEY = "cbe8505e82a50b088525";
  const PINATA_SECRET_KEY = "35e2636d1a81f2673f53ed1938100037b995cc53aaa16bed6b844e1f57b39fec";

  // Cleanup previews on unmount
  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // Revoke old previews
    previews.forEach(url => URL.revokeObjectURL(url));
    
    // Generate new previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    setError('');
  };

  const uploadFile = async (file, fileName) => {
    const formData = new FormData();
    const renamedFile = new File([file], fileName, { type: file.type });
    formData.append("file", renamedFile);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );
    return res.data.IpfsHash;
  };

  const uploadJSON = async (data, fileName) => {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataMetadata: { name: fileName },
        pinataContent: data,
      },
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );
    return res.data.IpfsHash;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!files.length) {
      setError("Evidence required. Please upload at least one photo.");
      return;
    }
    if (!description.trim()) {
      setError("Description required. Please provide clarifying details.");
      return;
    }

    setIsSubmitting(true);
    setError('');
    setStatus("Analysing images with AI...");

    try {
      // 0. ML Validation Step
      const mlResult = await validateReport(files, contract.address || contract.id);
      
      if (!mlResult.success) {
        if (mlResult.banned) {
          setError(`🚨 DATA FRAUD ALERT: ${mlResult.message}`);
          setTimeout(() => window.location.href = '/login', 5000);
        } else {
          setError(`Neural Verification Rejected: ${mlResult.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      setStatus(`Neural Integrity Confirmed: ${Math.round(mlResult.score)}% Confidence.`);
      const timestamp = Date.now();
      let imagesData = [];

      // 1. Upload images
      for (let i = 0; i < files.length; i++) {
        const ext = files[i].name.split(".").pop() || "jpg";
        const fileName = `${timestamp}_${i + 1}.${ext}`;
        const cid = await uploadFile(files[i], fileName);
        
        imagesData.push({
          name: `${timestamp}_${i + 1}`,
          url: `ipfs://${cid}`,
        });
      }

      setStatus("Packaging immutable report bundle...");

      // 2. Upload JSON metadata
      const reportData = {
        timestamp,
        contract_id: contract.id,
        description,
        images: imagesData,
        ai_score: mlResult.score
      };
      
      const finalCID = await uploadJSON(reportData, `${timestamp}.json`);
      setStatus("Commiting to Satya Blockchain...");

      // 3. Submit to backend
      await submitReport(contract.id, finalCID, mlResult.score);

      setSuccess(true);
      setStatus("Report securely recorded in the transparency ledger.");
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Network error. Please check your connection and try again.");
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <LoadingOverlay active={isSubmitting} context="citizen_report" message={status} />
      
      <div className={`report-modal ${success ? 'report-modal--success' : ''}`}>
        <button 
          className="report-modal__close" 
          onClick={onClose} 
          disabled={isSubmitting}
        >
          &times;
        </button>
        
        <header className="report-modal__header">
          <div className="report-modal__icon">🛡️</div>
          <div>
            <h2 className="report-modal__title">Public Transparency Report</h2>
            <p className="report-modal__subtitle">
              Authenticating project state for asset: <span className="report-modal__id">{contract.id}</span>
            </p>
          </div>
        </header>

        {!success ? (
          <form onSubmit={handleSubmit} className="report-modal__form">
            <div className="report-modal__section">
              <div className="report-modal__label-row">
                <label className="report-modal__label">Upload Evidence</label>
                <span className="report-modal__label-hint">Photos must be clear/unfiltered</span>
              </div>
              
              <div className="report-modal__file-zone">
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="report-modal__file-input"
                  id="report-file-input"
                  accept="image/*"
                  disabled={isSubmitting}
                />
                <label htmlFor="report-file-input" className="report-modal__file-trigger">
                  <span>📸</span> Select Photos to Analyze
                </label>
              </div>

              {previews.length > 0 && (
                <div className="report-modal__preview-grid">
                  {previews.map((url, i) => (
                    <div key={i} className="report-modal__preview-item">
                      <img src={url} alt={`preview-${i}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="report-modal__section">
              <label className="report-modal__label">Observational Details</label>
              <textarea
                className="report-modal__textarea"
                placeholder="Describe any visible deviations from the project specification..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            {error && <div className="report-modal__error">⚠️ {error}</div>}

            <button 
              type="submit" 
              className="report-modal__submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoadingSpinner size="18px" color="white" label="Synchronizing..." /> : "Validate & Submit Report"}
            </button>
          </form>
        ) : (
          <div className="report-modal__success-msg">
            <div className="report-modal__success-icon">✓</div>
            <h3>Authentication Successful</h3>
            <p>Your report has been committed to the decentralized transparency ledger. Our committee will review the AI-validated evidence shortly.</p>
          </div>
        )}

        <footer className="report-modal__footer">
          <p>
            <strong>Note:</strong> All reports are processed by the Satya Neural Engine and recorded permanently on the blockchain. False reports may lead to account suspension.
          </p>
        </footer>
      </div>
    </div>
  );
}
