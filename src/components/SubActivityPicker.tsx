import type { SubActivityWithCounts } from '../types';

interface Props {
  subActivities: SubActivityWithCounts[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  idPrefix?: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SubActivityPicker({ subActivities, selectedIds, onChange, idPrefix = 'sa' }: Props) {
  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((v) => v !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="checkbox-group">
      {subActivities.map((sa) => {
        const selected = selectedIds.includes(sa.id);
        const isFull = sa.confirmed_count >= sa.max_capacity && !selected;

        return (
          <label
            key={sa.id}
            className={`checkbox-item ${selected ? 'checkbox-item--selected' : ''} ${isFull ? 'checkbox-item--full' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={isFull}
              onChange={() => toggle(sa.id)}
              id={`${idPrefix}-${sa.id}`}
            />
            <span className="checkbox-label-content">
              <span className="title">{sa.title}</span>
              <span className="meta">
                {formatTime(sa.start_time)}
                {sa.end_time ? ` - ${formatTime(sa.end_time)}` : ''}
              </span>
              {isFull ? (
                <span className="badge badge--full">名额已满，进入候补</span>
              ) : (
                <span className="badge badge--available">
                  已报 {sa.confirmed_count}/{sa.max_capacity}
                  {sa.waitlist_count > 0 ? ` · 候补 ${sa.waitlist_count}` : ''}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
