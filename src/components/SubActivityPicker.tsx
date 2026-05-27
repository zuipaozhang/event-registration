import type { SubActivityWithCounts } from '../types';

interface Props {
  subActivities: SubActivityWithCounts[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  idPrefix?: string;
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
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
        const isFull = sa.confirmed_count >= sa.max_capacity;
        const isLocked = sa.confirmed_count >= sa.max_capacity && !selected;

        return (
          <label
            key={sa.id}
            className={`checkbox-item ${selected ? 'checkbox-item--selected' : ''} ${isLocked ? 'checkbox-item--full' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={isLocked}
              onChange={() => toggle(sa.id)}
              id={`${idPrefix}-${sa.id}`}
            />
            <span className="checkbox-label-content">
              <span className="title">{sa.title}</span>
              <span className="meta">
                {formatDate(sa.start_date)}
                {sa.end_date && sa.end_date !== sa.start_date ? ` - ${formatDate(sa.end_date)}` : ''}
              </span>
              {isFull ? (
                <span className="badge badge--full">已报满（咨询客户经理增加名额）</span>
              ) : (
                <span className="badge badge--available">已报 {sa.confirmed_count}/{sa.max_capacity}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
