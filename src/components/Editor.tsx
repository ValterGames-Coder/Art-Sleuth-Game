import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameData, HiddenObject, Zone } from '../types/game';
import './Editor.css';

type DragMode = 'move' | 'resize' | null;

interface DragState {
  objectId: string;
  mode: DragMode;
  startMouse: { x: number; y: number };
  startZone: Zone;
}

export default function Editor({
  onBack,
  paintingId,
}: {
  onBack: () => void;
  paintingId: string | null;
}) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<HiddenObject | null>(null);
  const [showCoords, setShowCoords] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const path = paintingId
      ? `data/paintings/${paintingId}.json`
      : 'data/painting-data.json';
    fetch(import.meta.env.BASE_URL + path)
      .then((r) => r.json())
      .then((d: GameData) => setGameData(d))
      .catch(() => alert('Ошибка загрузки данных'));
  }, [paintingId]);

  const getImageRect = useCallback(() => {
    if (!imageRef.current) return null;
    return imageRef.current.getBoundingClientRect();
  }, []);

  const pctToPixel = useCallback(
    (zone: Zone) => {
      const rect = getImageRect();
      if (!rect) return { left: 0, top: 0, width: 0, height: 0 };
      return {
        left: (zone.x / 100) * rect.width,
        top: (zone.y / 100) * rect.height,
        width: (zone.width / 100) * rect.width,
        height: (zone.height / 100) * rect.height,
      };
    },
    [getImageRect],
  );

  const updateObjectZone = useCallback(
    (id: string, zone: Zone) => {
      if (!gameData) return;
      setGameData({
        ...gameData,
        objects: gameData.objects.map((o) =>
          o.id === id ? { ...o, zone } : o,
        ),
      });
    },
    [gameData],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, objectId: string, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      const obj = gameData?.objects.find((o) => o.id === objectId);
      if (!obj) return;
      setSelectedId(objectId);
      dragRef.current = {
        objectId,
        mode,
        startMouse: { x: e.clientX, y: e.clientY },
        startZone: { ...obj.zone },
      };
    },
    [gameData],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !drag.mode) return;
      const rect = getImageRect();
      if (!rect) return;

      const dx = e.clientX - drag.startMouse.x;
      const dy = e.clientY - drag.startMouse.y;
      const dxPct = (dx / rect.width) * 100;
      const dyPct = (dy / rect.height) * 100;

      let newZone: Zone;

      if (drag.mode === 'move') {
        newZone = {
          x: Math.max(0, Math.min(100 - drag.startZone.width, drag.startZone.x + dxPct)),
          y: Math.max(0, Math.min(100 - drag.startZone.height, drag.startZone.y + dyPct)),
          width: drag.startZone.width,
          height: drag.startZone.height,
        };
      } else {
        newZone = {
          x: drag.startZone.x,
          y: drag.startZone.y,
          width: Math.max(1, drag.startZone.width + dxPct),
          height: Math.max(1, drag.startZone.height + dyPct),
        };
      }

      updateObjectZone(drag.objectId, {
        x: round2(newZone.x),
        y: round2(newZone.y),
        width: round2(newZone.width),
        height: round2(newZone.height),
      });
      forceRender((n) => n + 1);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getImageRect, updateObjectZone]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!gameData || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;

      for (const obj of gameData.objects) {
        const z = obj.zone;
        if (px >= z.x && px <= z.x + z.width && py >= z.y && py <= z.y + z.height) {
          setSelectedId(obj.id);
          return;
        }
      }
      setSelectedId(null);
    },
    [gameData],
  );

  const addObject = useCallback(() => {
    if (!gameData) return;
    const id = `obj_${Date.now()}`;
    const newObj: HiddenObject = {
      id,
      name: 'Новый объект',
      zone: { x: 40, y: 40, width: 10, height: 10 },
      fact: {
        title: 'Заголовок факта',
        description: 'Описание факта об объекте.',
        source: 'Источник',
      },
    };
    setGameData({ ...gameData, objects: [...gameData.objects, newObj] });
    setSelectedId(id);
  }, [gameData]);

  const deleteObject = useCallback(
    (id: string) => {
      if (!gameData) return;
      setGameData({
        ...gameData,
        objects: gameData.objects.filter((o) => o.id !== id),
      });
      if (selectedId === id) setSelectedId(null);
    },
    [gameData, selectedId],
  );

  const exportJSON = useCallback(() => {
    if (!gameData) return;
    const json = JSON.stringify(gameData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameData.painting.id || 'painting'}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [gameData]);

  const copyJSON = useCallback(() => {
    if (!gameData) return;
    navigator.clipboard
      .writeText(JSON.stringify(gameData, null, 2))
      .then(() => alert('JSON скопирован в буфер обмена'));
  }, [gameData]);

  const openEditModal = useCallback(
    (obj: HiddenObject) => {
      setEditingObject({ ...obj, fact: { ...obj.fact }, zone: { ...obj.zone } });
    },
    [],
  );

  const saveEditModal = useCallback(() => {
    if (!gameData || !editingObject) return;
    setGameData({
      ...gameData,
      objects: gameData.objects.map((o) =>
        o.id === editingObject.id ? editingObject : o,
      ),
    });
    setEditingObject(null);
  }, [gameData, editingObject]);

  if (!gameData) {
    return <div className="editor-loading">Загрузка...</div>;
  }

  const selected = gameData.objects.find((o) => o.id === selectedId);

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button className="editor-btn editor-btn-back" onClick={onBack}>
          Назад к игре
        </button>
        <h1 className="editor-title">Редактор зон</h1>
        <div className="editor-toolbar-actions">
          <label className="editor-toggle">
            <input
              type="checkbox"
              checked={showCoords}
              onChange={(e) => setShowCoords(e.target.checked)}
            />
            Координаты
          </label>
          <button className="editor-btn" onClick={addObject}>
            Добавить
          </button>
          <button className="editor-btn" onClick={copyJSON}>
            Копировать JSON
          </button>
          <button className="editor-btn editor-btn-primary" onClick={exportJSON}>
            Скачать JSON
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-canvas-area">
          <div className="editor-image-wrapper" ref={wrapperRef}>
            <img
              ref={imageRef}
              src={import.meta.env.BASE_URL + gameData.painting.image}
              alt={gameData.painting.title}
              className="editor-image"
              draggable={false}
              onClick={handleImageClick}
            />
            {gameData.objects.map((obj) => {
              const px = pctToPixel(obj.zone);
              const isSelected = obj.id === selectedId;
              return (
                <div
                  key={obj.id}
                  className={`editor-zone${isSelected ? ' selected' : ''}`}
                  style={{
                    left: px.left,
                    top: px.top,
                    width: px.width,
                    height: px.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, obj.id, 'move')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(obj.id);
                  }}
                >
                  {showCoords && (
                    <span className="editor-zone-label">{obj.name}</span>
                  )}
                  <div
                    className="editor-zone-handle"
                    onMouseDown={(e) => handleMouseDown(e, obj.id, 'resize')}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="editor-sidebar">
          <h3 className="editor-sidebar-title">Объекты</h3>
          <div className="editor-object-list">
            {gameData.objects.map((obj) => (
              <div
                key={obj.id}
                className={`editor-object-row${obj.id === selectedId ? ' active' : ''}`}
                onClick={() => setSelectedId(obj.id)}
              >
                <span className="editor-object-name">{obj.name}</span>
                <div className="editor-object-actions">
                  <button
                    className="editor-icon-btn"
                    title="Редактировать"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(obj);
                    }}
                  >
                    &#9998;
                  </button>
                  <button
                    className="editor-icon-btn editor-icon-btn-danger"
                    title="Удалить"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteObject(obj.id);
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="editor-details">
              <h4 className="editor-details-title">{selected.name}</h4>
              <div className="editor-coords">
                <div className="editor-coord-row">
                  <label>X:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selected.zone.x}
                    onChange={(e) =>
                      updateObjectZone(selected.id, {
                        ...selected.zone,
                        x: Number(e.target.value),
                      })
                    }
                  />
                  <label>Y:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selected.zone.y}
                    onChange={(e) =>
                      updateObjectZone(selected.id, {
                        ...selected.zone,
                        y: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="editor-coord-row">
                  <label>W:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selected.zone.width}
                    onChange={(e) =>
                      updateObjectZone(selected.id, {
                        ...selected.zone,
                        width: Number(e.target.value),
                      })
                    }
                  />
                  <label>H:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selected.zone.height}
                    onChange={(e) =>
                      updateObjectZone(selected.id, {
                        ...selected.zone,
                        height: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <button
                className="editor-btn editor-btn-small"
                onClick={() => openEditModal(selected)}
              >
                Редактировать текст
              </button>
            </div>
          )}
        </div>
      </div>

      {editingObject && (
        <div className="editor-modal-overlay" onClick={() => setEditingObject(null)}>
          <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Редактирование: {editingObject.name}</h3>
            <div className="editor-form">
              <label>Название объекта</label>
              <input
                type="text"
                value={editingObject.name}
                onChange={(e) =>
                  setEditingObject({ ...editingObject, name: e.target.value })
                }
              />
              <label>Заголовок факта</label>
              <input
                type="text"
                value={editingObject.fact.title}
                onChange={(e) =>
                  setEditingObject({
                    ...editingObject,
                    fact: { ...editingObject.fact, title: e.target.value },
                  })
                }
              />
              <label>Описание</label>
              <textarea
                rows={5}
                value={editingObject.fact.description}
                onChange={(e) =>
                  setEditingObject({
                    ...editingObject,
                    fact: { ...editingObject.fact, description: e.target.value },
                  })
                }
              />
              <label>Источник</label>
              <input
                type="text"
                value={editingObject.fact.source}
                onChange={(e) =>
                  setEditingObject({
                    ...editingObject,
                    fact: { ...editingObject.fact, source: e.target.value },
                  })
                }
              />
            </div>
            <div className="editor-modal-actions">
              <button className="editor-btn" onClick={() => setEditingObject(null)}>
                Отмена
              </button>
              <button className="editor-btn editor-btn-primary" onClick={saveEditModal}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
