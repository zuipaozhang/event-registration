import type { CompanionInput, SubActivityWithCounts } from '../types';
import SubActivityPicker from './SubActivityPicker';

interface Props {
  companion: CompanionInput;
  index: number;
  subActivities: SubActivityWithCounts[];
  onUpdate: (updated: CompanionInput) => void;
  onRemove: () => void;
}

export default function CompanionCard({ companion, index, subActivities, onUpdate, onRemove }: Props) {
  const prefix = `comp-${companion.tempId}`;

  return (
    <div className="companion-card">
      <div className="companion-card__header">
        <span className="companion-card__title">同行人员 {index + 1}</span>
        <button type="button" className="btn btn-danger" onClick={onRemove}>
          移除
        </button>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-name`}>姓名</label>
        <input
          id={`${prefix}-name`}
          type="text"
          placeholder="请输入同行人姓名"
          value={companion.name}
          onChange={(e) => onUpdate({ ...companion, name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-phone`}>手机号</label>
        <input
          id={`${prefix}-phone`}
          type="tel"
          placeholder="请输入手机号"
          value={companion.phone}
          onChange={(e) => onUpdate({ ...companion, phone: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>参加活动场次</label>
        <SubActivityPicker
          subActivities={subActivities}
          selectedIds={companion.selectedSubIds}
          onChange={(ids) => onUpdate({ ...companion, selectedSubIds: ids })}
          idPrefix={prefix}
        />
      </div>
    </div>
  );
}
