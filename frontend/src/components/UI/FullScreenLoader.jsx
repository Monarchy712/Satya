import './FullScreenLoader.css';

export default function FullScreenLoader({ isVisible, text = 'Loading...' }) {
  if (!isVisible) return null;

  return (
    <div className="fs-loader-overlay">
      <div className="fs-loader-card">
        <div className="fs-loader-spinner"></div>
        <div className="fs-loader-text">{text}</div>
      </div>
    </div>
  );
}
