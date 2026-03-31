import { useEffect, useRef } from 'react';
import { Application, Sprite, Assets, Container, Graphics } from 'pixi.js';
import type { HiddenObject } from '../types/game';

interface GameCanvasProps {
  imagePath: string;
  objects: HiddenObject[];
  foundIds: Set<string>;
  onObjectFound: (obj: HiddenObject) => void;
}

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

      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';

      sprite.on('pointerdown', (event) => {
        const local = event.getLocalPosition(sprite);
        const px = (local.x / tw) * 100;
        const py = (local.y / th) * 100;

        for (const obj of objectsRef.current) {
          if (foundRef.current.has(obj.id)) continue;
          const { x, y, width, height } = obj.zone;
          if (px >= x && px <= x + width && py >= y && py <= y + height) {
            callbackRef.current(obj);
            return;
          }
        }
      });

      const fitPainting = () => {
        const scale = Math.min(
          app.screen.width / tw,
          app.screen.height / th
        );
        paintingContainer.scale.set(scale);
        paintingContainer.x = (app.screen.width - tw * scale) / 2;
        paintingContainer.y = (app.screen.height - th * scale) / 2;
      };

      fitPainting();

      onResize = () => requestAnimationFrame(fitPainting);
      window.addEventListener('resize', onResize);
    };

    init();

    return () => {
      destroyed = true;
      if (onResize) window.removeEventListener('resize', onResize);
      highlightsRef.current.clear();
      try {
        app.destroy(true);
      } catch {
        /* cleanup safety */
      }
    };
  }, [imagePath, objects]);

  return <div ref={containerRef} className="game-canvas" />;
}
