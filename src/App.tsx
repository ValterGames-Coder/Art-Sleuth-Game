import { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import ObjectList from './components/ObjectList';
import InfoPopup from './components/InfoPopup';
import Editor from './components/Editor';
import type { GameData, HiddenObject } from './types/game';
import './App.css';

export default function App() {
  const [page, setPage] = useState<'game' | 'editor'>(() => {
    return window.location.hash === '#editor' ? 'editor' : 'game';
  });
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [activePopup, setActivePopup] = useState<HiddenObject | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => {
      setPage(window.location.hash === '#editor' ? 'editor' : 'game');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetch('./data/painting-data.json')
      .then((res) => res.json())
      .then((data: GameData) => {
        setGameData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Ошибка загрузки данных');
        setLoading(false);
        console.error(err);
      });
  }, []);

  const handleObjectFound = useCallback(
    (obj: HiddenObject) => {
      setFoundIds((prev) => {
        const next = new Set(prev);
        next.add(obj.id);
        if (gameData && next.size === gameData.objects.length) {
          setTimeout(() => setShowCompletion(true), 600);
        }
        return next;
      });
      setActivePopup(obj);
    },
    [gameData],
  );

  const handleClosePopup = useCallback(() => {
    setActivePopup(null);
  }, []);

  const handleRestart = useCallback(() => {
    setFoundIds(new Set());
    setShowCompletion(false);
  }, []);

  const goToEditor = useCallback(() => {
    window.location.hash = '#editor';
  }, []);

  const goToGame = useCallback(() => {
    window.location.hash = '';
    setFoundIds(new Set());
    setShowCompletion(false);
    setActivePopup(null);
    fetch('/data/painting-data.json')
      .then((res) => res.json())
      .then((data: GameData) => setGameData(data))
      .catch(() => {});
  }, []);

  if (page === 'editor') {
    return <Editor onBack={goToGame} />;
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error || !gameData) {
    return <div className="loading">{error ?? 'Ошибка загрузки'}</div>;
  }

  return (
    <div className="app">
      <div className="portrait-warning">
        <div className="rotate-icon" />
        <p className="portrait-warning-text">
          Поверните устройство
          <br />
          горизонтально
        </p>
      </div>

      <div className="app-content">
        <GameCanvas
          imagePath={gameData.painting.image}
          objects={gameData.objects}
          foundIds={foundIds}
          onObjectFound={handleObjectFound}
        />

        <div className="header">
          <div className="header-title">
            <span>{gameData.painting.artist}</span>
            {' — '}
            {gameData.painting.title}, {gameData.painting.year}
          </div>
          <div className="header-right">
            <div className="header-score">
              {foundIds.size} / {gameData.objects.length}
            </div>
            <button className="editor-link" onClick={goToEditor} title="Редактор зон">
              &#9881;
            </button>
          </div>
        </div>

        <ObjectList objects={gameData.objects} foundIds={foundIds} />

        {activePopup && (
          <InfoPopup object={activePopup} onClose={handleClosePopup} />
        )}

        {showCompletion && !activePopup && (
          <div className="completion-overlay">
            <div
              className="completion-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="completion-title">Все предметы найдены!</h2>
              <p className="completion-text">
                Вы раскрыли тайные смыслы картины
                &laquo;{gameData.painting.title}&raquo; кисти{' '}
                {gameData.painting.artist}. Каждая деталь этого полотна хранит
                мудрость нидерландских пословиц XVI века.
              </p>
              <button className="completion-btn" onClick={handleRestart}>
                Начать заново
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
