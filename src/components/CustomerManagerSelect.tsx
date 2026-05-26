import type { CustomerManager } from '../types';

interface Props {
  managers: CustomerManager[];
  value: number | null;
  onChange: (id: number) => void;
  error?: string;
}

export default function CustomerManagerSelect({ managers, value, onChange, error }: Props) {
  if (managers.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>暂无客户经理可选</p>;
  }

  return (
    <div className="form-group">
      <label htmlFor="cm-select">所属客户经理</label>
      <select
        id="cm-select"
        className={error ? 'error' : ''}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>
          请选择客户经理
        </option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
