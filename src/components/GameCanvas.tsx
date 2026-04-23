import { useEffect, useRef, useCallback } from 'react';
import { Application, Sprite, Assets, Container, Graphics } from 'pixi.js';
import type { HiddenObject } from '../types/game';

interface GameCanvasProps {
  imagePath: string;
  objects: HiddenObject[];
  foundIds: Set<string>;
  onObjectFound: (obj: HiddenObject) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const PAN_THRESHOLD = 8;

export default function GameCanvas({
  imagePath,
  objects,
  foundIds,
  onObjectFound,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<Map<string, Graphics>>(new Map());
  const callbackRef = useRef(onObjectFound);
  const foundRef = useRef(foundIds);
  const objectsRef = useRef(objects);

  callbackRef.current = onObjectFound;
  foundRef.current = foundIds;
  objectsRef.current = objects;

  useEffect(() => {
    for (const [id, g] of highlightsRef.current) {
      g.visible = foundIds.has(id);
    }
  }, [foundIds]);

  const requestFullscreen = useCallback(() => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    const isFullscreen = Boolean(
      doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement,
    );

    if (isFullscreen) {
      const exit =
        doc.exitFullscreen ??
        doc.webkitExitFullscreen ??
        doc.msExitFullscreen;
      exit?.call(doc);
      return;
    }

    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const req =
      el.requestFullscreen ??
      el.webkitRequestFullscreen ??
      el.msRequestFullscreen;
    req?.call(el).catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();
    let destroyed = false;
    let onResize: (() => void) | null = null;

    const init = async () => {
      await app.init({
        resizeTo: containerRef.current!,
        background: 0x1a1410,
        antialias: true,
        autoDensity: true,
      });

      if (destroyed) return;

      containerRef.current!.appendChild(app.canvas);
      app.canvas.style.touchAction = 'none';

      const texture = await Assets.load(imagePath);
      if (destroyed) return;

      const paintingContainer = new Container();
      app.stage.addChild(paintingContainer);

      const sprite = new Sprite(texture);
      paintingContainer.addChild(sprite);

      const tw = sprite.texture.width;
      const th = sprite.texture.height;

      for (const obj of objects) {
        const { x, y, width, height } = obj.zone;
        const zx = (x / 100) * tw;
        const zy = (y / 100) * th;
        const zw = (width / 100) * tw;
        const zh = (height / 100) * th;

        const highlight = new Graphics();
        highlight.roundRect(zx, zy, zw, zh, 4);
        highlight.fill({ color: 0xc8a96e, alpha: 0.2 });
        highlight.roundRect(zx, zy, zw, zh, 4);
        highlight.stroke({ width: 3, color: 0xc8a96e });
        highlight.visible = foundRef.current.has(obj.id);
        paintingContainer.addChild(highlight);
        highlightsRef.current.set(obj.id, highlight);
      }

      let baseScale = 1;
      let zoom = 1;
      let panX = 0;
      let panY = 0;

      const fitPainting = () => {
        baseScale = Math.min(
          app.screen.width / tw,
          app.screen.height / th,
        );
        applyTransform();
      };

      const clampPan = () => {
        const sw = app.screen.width;
        const sh = app.screen.height;
        const pw = tw * baseScale * zoom;
        const ph = th * baseScale * zoom;

        if (pw <= sw) {
          panX = 0;
        } else {
          const maxPan = (pw - sw) / 2;
          panX = Math.max(-maxPan, Math.min(maxPan, panX));
        }

        if (ph <= sh) {
          panY = 0;
        } else {
          const maxPan = (ph - sh) / 2;
          panY = Math.max(-maxPan, Math.min(maxPan, panY));
        }
      };

      const applyTransform = () => {
        const s = baseScale * zoom;
        paintingContainer.scale.set(s);
        clampPan();
        paintingContainer.x = (app.screen.width - tw * s) / 2 + panX;
        paintingContainer.y = (app.screen.height - th * s) / 2 + panY;
      };

      fitPainting();

      // ── Pointer tracking for distinguishing tap from drag ──

      let pointerDownPos: { x: number; y: number } | null = null;
      let didPan = false;

      // ── Mouse wheel zoom ──

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = zoom;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));

        const rect = app.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cx = app.screen.width / 2;
        const cy = app.screen.height / 2;
        const factor = zoom / oldZoom;

        panX = (panX + mx - cx) * factor - (mx - cx);
        panY = (panY + my - cy) * factor - (my - cy);

        applyTransform();
      };

      app.canvas.addEventListener('wheel', onWheel, { passive: false });

      // ── Mouse drag pan ──

      let mouseDragging = false;
      let mouseLastX = 0;
      let mouseLastY = 0;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        mouseDragging = true;
        mouseLastX = e.clientX;
        mouseLastY = e.clientY;
        pointerDownPos = { x: e.clientX, y: e.clientY };
        didPan = false;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!mouseDragging) return;
        const dx = e.clientX - mouseLastX;
        const dy = e.clientY - mouseLastY;
        mouseLastX = e.clientX;
        mouseLastY = e.clientY;

        if (
          pointerDownPos &&
          (Math.abs(e.clientX - pointerDownPos.x) > PAN_THRESHOLD ||
            Math.abs(e.clientY - pointerDownPos.y) > PAN_THRESHOLD)
        ) {
          didPan = true;
        }

        if (zoom > 1) {
          panX += dx;
          panY += dy;
          applyTransform();
        }
      };

      const onMouseUp = (e: MouseEvent) => {
        if (!mouseDragging) return;
        mouseDragging = false;

        if (!didPan && pointerDownPos) {
          handleTap(e.clientX, e.clientY);
        }
        pointerDownPos = null;
      };

      app.canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      // ── Touch: single-finger pan + two-finger pinch-zoom ──

      let activeTouches: Touch[] = [];
      let lastTouchDist = 0;
      let lastTouchCenterX = 0;
      let lastTouchCenterY = 0;
      let touchStartPos: { x: number; y: number } | null = null;
      let touchStartTime = 0;
      let touchDidPan = false;
      let touchTapCandidate = false;

      const getTouchDist = (t1: Touch, t2: Touch) =>
        Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      const getTouchCenter = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      });

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        activeTouches = Array.from(e.touches);
        if (activeTouches.length === 1) {
          const t = activeTouches[0];
          lastTouchCenterX = t.clientX;
          lastTouchCenterY = t.clientY;
          touchStartPos = { x: t.clientX, y: t.clientY };
          touchStartTime = Date.now();
          touchDidPan = false;
          touchTapCandidate = true;
        } else if (activeTouches.length === 2) {
          lastTouchDist = getTouchDist(activeTouches[0], activeTouches[1]);
          const c = getTouchCenter(activeTouches[0], activeTouches[1]);
          lastTouchCenterX = c.x;
          lastTouchCenterY = c.y;
          touchDidPan = true;
          touchTapCandidate = false;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        activeTouches = Array.from(e.touches);

        if (activeTouches.length === 1) {
          const t = activeTouches[0];
          const dx = t.clientX - lastTouchCenterX;
          const dy = t.clientY - lastTouchCenterY;
          lastTouchCenterX = t.clientX;
          lastTouchCenterY = t.clientY;

          if (
            touchStartPos &&
            (Math.abs(t.clientX - touchStartPos.x) > PAN_THRESHOLD ||
              Math.abs(t.clientY - touchStartPos.y) > PAN_THRESHOLD)
          ) {
            touchDidPan = true;
            touchTapCandidate = false;
          }

          if (zoom > 1) {
            panX += dx;
            panY += dy;
            applyTransform();
          }
        } else if (activeTouches.length === 2) {
          touchDidPan = true;
          const dist = getTouchDist(activeTouches[0], activeTouches[1]);
          if (dist <= 0) return;
          if (lastTouchDist <= 0) {
            lastTouchDist = dist;
            return;
          }
          const c = getTouchCenter(activeTouches[0], activeTouches[1]);

          const oldZoom = zoom;
          const scale = dist / lastTouchDist;
          zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));

          const rect = app.canvas.getBoundingClientRect();
          const mx = c.x - rect.left;
          const my = c.y - rect.top;
          const cx = app.screen.width / 2;
          const cy = app.screen.height / 2;
          const factor = zoom / oldZoom;

          panX = (panX + mx - cx) * factor - (mx - cx) + (c.x - lastTouchCenterX);
          panY = (panY + my - cy) * factor - (my - cy) + (c.y - lastTouchCenterY);

          lastTouchDist = dist;
          lastTouchCenterX = c.x;
          lastTouchCenterY = c.y;
          applyTransform();
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const endedTouch = e.changedTouches[0];
        if (
          touchTapCandidate &&
          !touchDidPan &&
          touchStartPos &&
          e.touches.length === 0 &&
          Date.now() - touchStartTime < 350 &&
          endedTouch
        ) {
          handleTap(endedTouch.clientX, endedTouch.clientY);
        }

        activeTouches = Array.from(e.touches);
        if (activeTouches.length === 1) {
          lastTouchCenterX = activeTouches[0].clientX;
          lastTouchCenterY = activeTouches[0].clientY;
          touchStartPos = {
            x: activeTouches[0].clientX,
            y: activeTouches[0].clientY,
          };
          touchStartTime = Date.now();
          touchDidPan = false;
          touchTapCandidate = true;
        } else {
          touchStartPos = null;
          touchTapCandidate = false;
          if (activeTouches.length < 2) {
            lastTouchDist = 0;
          }
        }
      };

      app.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      app.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      app.canvas.addEventListener('touchend', onTouchEnd, { passive: false });

      // ── Tap handler (shared by mouse and touch) ──

      const handleTap = (clientX: number, clientY: number) => {
        const rect = app.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        const s = baseScale * zoom;
        const ox = (app.screen.width - tw * s) / 2 + panX;
        const oy = (app.screen.height - th * s) / 2 + panY;

        const localX = (canvasX - ox) / s;
        const localY = (canvasY - oy) / s;

        if (localX < 0 || localX > tw || localY < 0 || localY > th) return;

        const px = (localX / tw) * 100;
        const py = (localY / th) * 100;

        for (const obj of objectsRef.current) {
          if (foundRef.current.has(obj.id)) continue;
          const { x, y, width, height } = obj.zone;
          if (px >= x && px <= x + width && py >= y && py <= y + height) {
            callbackRef.current(obj);
            return;
          }
        }
      };

      // ── Remove PixiJS built-in pointer listener (we handle it ourselves) ──
      sprite.eventMode = 'none';

      onResize = () => requestAnimationFrame(fitPainting);
      window.addEventListener('resize', onResize);

      return () => {
        app.canvas.removeEventListener('wheel', onWheel);
        app.canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        app.canvas.removeEventListener('touchstart', onTouchStart);
        app.canvas.removeEventListener('touchmove', onTouchMove);
        app.canvas.removeEventListener('touchend', onTouchEnd);
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((c) => {
      cleanup = c;
    });

    return () => {
      destroyed = true;
      if (onResize) window.removeEventListener('resize', onResize);
      cleanup?.();
      highlightsRef.current.clear();
      try {
        app.destroy(true);
      } catch {
        /* cleanup safety */
      }
    };
  }, [imagePath, objects]);

  return (
    <>
      <div ref={containerRef} className="game-canvas" />
      <button
        className="fullscreen-btn"
        onClick={requestFullscreen}
        title="Полный экран"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </>
  );
}
