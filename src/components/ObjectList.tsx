import type { HiddenObject } from '../types/game';

interface ObjectListProps {
  objects: HiddenObject[];
  foundIds: Set<string>;
}

export default function ObjectList({ objects, foundIds }: ObjectListProps) {
  return (
    <div className="object-list">
      {objects.map((obj, i) => (
        <span key={obj.id}>
          <span className={`object-item${foundIds.has(obj.id) ? ' found' : ''}`}>
            {obj.name}
          </span>
          {i < objects.length - 1 && (
            <span className="object-separator">{' \u2022 '}</span>
          )}
        </span>
      ))}
    </div>
  );
}
