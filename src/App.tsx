import { useState, useEffect, useCallback, useMemo } from 'react';
import GameCanvas from './components/GameCanvas';
import ObjectList from './components/ObjectList';
import InfoPopup from './components/InfoPopup';
import Editor from './components/Editor';
import AssignmentPage from './components/AssignmentPage';
import type {
  GameData,
  HiddenObject,
  PaintingCatalogItem,
  PaintingInfo,
} from './types/game';
import { loadPaintingConfig } from './utils/paintingConfig';
import './App.css';

type Page = 'game' | 'editor' | 'qr' | 'assignment';

interface RouteState {
  page: Page;
  paintingId: string | null;
}

function parseHash(): RouteState {
  const hash = window.location.hash.replace(/^#/, '').trim();
  if (hash === 'assignment') return { page: 'assignment', paintingId: null };
  if (hash === 'qr') return { page: 'qr', paintingId: null };
  if (hash.startsWith('editor/')) {
    return { page: 'editor', paintingId: decodeURIComponent(hash.slice(7)) || null };
  }
  if (hash === 'editor') return { page: 'editor', paintingId: null };
  if (hash.startsWith('painting/')) {
    return { page: 'game', paintingId: decodeURIComponent(hash.slice(9)) || null };
  }
  return { page: 'game', paintingId: null };
}

function normalizeImagePath(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '');
}

async function resolveWikiImage(painting: PaintingInfo): Promise<string | null> {
  if (!painting.wikiPage) return null;
  const title = encodeURIComponent(painting.wikiPage);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const res = await fetch(url, {
    headers: { 'Api-User-Agent': 'ArtSleuth/1.0 (Terra-Politech project)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.originalimage?.source ?? data.thumbnail?.source ?? null;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseHash());
  const [isMobile, setIsMobile] = useState(() => {
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return coarse || window.innerWidth <= 768;
  });
  const [catalog, setCatalog] = useState<PaintingCatalogItem[]>([]);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [resolvedImage, setResolvedImage] = useState<string | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [activePopup, setActivePopup] = useState<HiddenObject | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(
      '(max-width: 768px), (hover: none) and (pointer: coarse)',
    );
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/paintings-catalog.json')
      .then((res) => res.json())
      .then((data: PaintingCatalogItem[]) => {
        setCatalog(data);
      })
      .catch((err) => {
        setError('Ошибка загрузки каталога картин');
        setLoading(false);
        console.error(err);
      });
  }, []);

  const selectedPaintingId = useMemo(() => {
    if (!catalog.length) return null;
    if (route.paintingId && catalog.some((p) => p.id === route.paintingId)) {
      return route.paintingId;
    }
    return catalog[0].id;
  }, [catalog, route.paintingId]);

  const selectedCatalogItem = useMemo(
    () => catalog.find((p) => p.id === selectedPaintingId) ?? null,
    [catalog, selectedPaintingId],
  );

  useEffect(() => {
    if (!selectedCatalogItem) return;
    fetch(import.meta.env.BASE_URL + selectedCatalogItem.dataPath)
      .then((res) => res.json())
      .then(async (data: GameData) => {
        const cached = loadPaintingConfig(data.painting.id);
        const resolvedData = cached ?? data;
        const staticImage = normalizeImagePath(resolvedData.painting.image);
        if (staticImage) {
          setResolvedImage(staticImage);
        } else {
          try {
            const wikiImage = await resolveWikiImage(resolvedData.painting);
            setResolvedImage(wikiImage);
          } catch {
            setResolvedImage(null);
          }
        }
        setGameData(resolvedData);
        setFoundIds(new Set());
        setShowCompletion(false);
        setActivePopup(null);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError('Ошибка загрузки данных картины');
        setLoading(false);
        console.error(err);
      });
  }, [selectedCatalogItem]);

  useEffect(() => {
    if (route.page !== 'game' || !selectedPaintingId) return;
    const cached = loadPaintingConfig(selectedPaintingId);
    if (!cached) return;
    setGameData(cached);
  }, [route.page, selectedPaintingId]);

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

  const goToEditor = useCallback(
    (paintingId: string | null) => {
      window.location.hash = paintingId ? `#editor/${paintingId}` : '#editor';
    },
    [],
  );

  const goToGame = useCallback((paintingId: string | null) => {
    window.location.hash = paintingId ? `#painting/${paintingId}` : '';
  }, []);

  const goToQr = useCallback(() => {
    window.location.hash = '#qr';
  }, []);

  const goToAssignment = useCallback(() => {
    window.location.hash = '#assignment';
  }, []);

  const onChangePainting = useCallback((id: string) => {
    setLoading(true);
    setResolvedImage(null);
    window.location.hash = `#painting/${id}`;
  }, []);

  if (route.page === 'editor') {
    return <Editor paintingId={selectedPaintingId} onBack={() => goToGame(selectedPaintingId)} />;
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error || !gameData || !selectedPaintingId) {
    return <div className="loading">{error ?? 'Ошибка загрузки'}</div>;
  }

  if (route.page === 'qr') {
    return (
      <div className="qr-page">
        <div className="qr-header">
          <h1>QR-коды по картинам</h1>
          <button className="qr-back-btn" onClick={() => goToGame(selectedPaintingId)}>
            Назад к игре
          </button>
        </div>
        <div className="qr-grid">
          {catalog.map((item) => {
            const gameUrl = `${window.location.origin}${import.meta.env.BASE_URL}#painting/${item.id}`;
            return (
              <article key={item.id} className="qr-card">
                <img
                  src={import.meta.env.BASE_URL + item.qrPath}
                  alt={`QR для картины ${item.title}`}
                  className="qr-image"
                />
                <h3>{item.title}</h3>
                <p>
                  {item.artist}, {item.year}
                </p>
                <a href={gameUrl} target="_blank" rel="noreferrer">
                  Открыть страницу картины
                </a>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (route.page === 'assignment') {
    return <AssignmentPage />;
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
        {resolvedImage ? (
        <GameCanvas
          imagePath={resolvedImage}
          objects={gameData.objects}
          foundIds={foundIds}
          onObjectFound={handleObjectFound}
        />
        ) : (
          <div className="loading">Не удалось загрузить изображение картины</div>
        )}

        <div className={`header${isMobile ? ' mobile-clean' : ''}`}>
          <div className="header-title">
            <span>{gameData.painting.artist}</span>
            {' — '}
            {gameData.painting.title}, {gameData.painting.year}
          </div>
          <div className="header-right">
            {!isMobile && (
              <select
                className="painting-select"
                value={selectedPaintingId}
                onChange={(e) => onChangePainting(e.target.value)}
                title="Выбор картины"
              >
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.artist} — {item.title}
                  </option>
                ))}
              </select>
            )}
            <div className="header-score">
              {foundIds.size} / {gameData.objects.length}
            </div>
            {!isMobile && (
              <>
                <button className="editor-link" onClick={goToAssignment} title="Задание Терра-Политех">
                  Задание 2
                </button>
                <button className="editor-link" onClick={goToQr} title="QR-коды">
                  QR
                </button>
                <button className="editor-link" onClick={() => goToEditor(selectedPaintingId)} title="Редактор зон">
                  &#9881;
                </button>
              </>
            )}
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
                {gameData.painting.artist}. Исследование завершено, но вы можете
                открыть следующую картину и продолжить поиск.
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
