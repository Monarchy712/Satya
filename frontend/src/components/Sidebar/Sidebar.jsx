import { contractors } from '../../data/contractors';
import './Sidebar.css';

export default function Sidebar({ activeContractorId, onContractorClick }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h3 className="sidebar__title">CONTRACTORS DIRECTORY</h3>
      </div>
      <div className="sidebar__list">
        {contractors.map(c => (
          <button
            key={c.id}
            className={`sidebar__item ${activeContractorId === c.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onContractorClick(c.id)}
          >
            <span className="sidebar__item-name">{c.name}</span>
            <span className="sidebar__item-badge">{c.activeContracts}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
