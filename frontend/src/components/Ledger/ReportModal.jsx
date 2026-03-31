import React, { useState } from 'react';
import axios from 'axios';
import { submitReport, validateReport } from '../../utils/api';
import './ReportModal.css';

export default function ReportModal({ contract, onClose }) {
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 🔑 Pinata Keys (from teammate's source)
  const PINATA_API_KEY = "cbe8505e82a50b088525";
  const PINATA_SECRET_KEY = "35e2636d1a81f2673f53ed1938100037b995cc53aaa16bed6b844e1f57b39fec";

  const handleFileChange = (e) => {
    setFiles(e.target.files);
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
      setError("Please upload at least one image");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    setIsSubmitting(true);
    setError('');
    setStatus("Analysing images with AI...");

    try {
      // 0. ML Validation Step (Real)
      // Pass the selected files for multi-image validation
      const mlResult = await validateReport(files);
      
      if (!mlResult.success) {
        if (mlResult.banned) {
          setError(`🚨 FRAUD DETECTED: ${mlResult.message}`);
          setTimeout(() => window.location.href = '/login', 5000);
        } else {
          setError(`AI Validation failed: ${mlResult.message}`);
        }
        return;
      }

      setStatus(`AI Analysis: ${Math.round(mlResult.score)}/100 Score. Uploading...`);
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

      setStatus("Finalizing report bundle...");

      // 2. Upload JSON metadata
      const reportData = {
        timestamp,
        contract_id: contract.id,
        description,
        images: imagesData,
      };
      
      const finalCID = await uploadJSON(reportData, `${timestamp}.json`);

      setStatus("Recording on blockchain...");

      // 3. Submit to our backend (which handles the blockchain tx)
      // Passing the confidence score from ML step for blockchain scaling
      await submitReport(contract.id, finalCID, mlResult.score);

      setStatus("✅ Report securely recorded!");
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit report. Please try again.");
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal">
        <button className="report-modal__close" onClick={onClose} disabled={isSubmitting}>×</button>
        
        <h2 className="report-modal__title">Report Project Issue</h2>
        <p className="report-modal__subtitle">
          Submit photos and details of issues for contract: <strong>{contract.id}</strong>
        </p>

        <form onSubmit={handleSubmit} className="report-modal__form">
          <div className="report-modal__input-group">
            <label className="report-modal__label">Upload Photos</label>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="report-modal__file-input"
              accept="image/*"
              disabled={isSubmitting}
            />
          </div>

          <div className="report-modal__input-group">
            <label className="report-modal__label">Issue Description</label>
            <textarea
              className="report-modal__textarea"
              placeholder="Describe the visible damage or issues..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {error && <div className="report-modal__status error">{error}</div>}
          {status && <div className="report-modal__status">{status}</div>}

          <button 
            type="submit" 
            className="report-modal__submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Submit Report"}
          </button>
        </form>

        <p className="report-modal__disclaimer">
          Reports are immutable and validated via ML on the Satya network.
        </p>
      </div>
    </div>
  );
}
