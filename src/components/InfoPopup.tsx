import type { HiddenObject } from '../types/game';

interface InfoPopupProps {
  object: HiddenObject;
  onClose: () => void;
}

export default function InfoPopup({ object, onClose }: InfoPopupProps) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="popup-badge">Найдено</div>
          <h2 className="popup-title">{object.fact.title}</h2>
        </div>
        <div className="popup-body">
          <p className="popup-description">{object.fact.description}</p>
          <p className="popup-source">{object.fact.source}</p>
        </div>
        <div className="popup-footer">
          <button className="popup-close-btn" onClick={onClose}>
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
