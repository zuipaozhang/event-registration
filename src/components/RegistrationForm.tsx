import { useState } from 'react';
import type { CompanionInput, SubActivityWithCounts, CustomerManager } from '../types';
import SubActivityPicker from './SubActivityPicker';
import CustomerManagerSelect from './CustomerManagerSelect';
import CompanionCard from './CompanionCard';
import { useRegistration } from '../hooks/useRegistration';

interface Props {
  themeId: number;
  themeTitle: string;
  subActivities: SubActivityWithCounts[];
  customerManagers: CustomerManager[];
}

let tempIdCounter = 0;
function nextTempId() {
  return `comp-${Date.now()}-${++tempIdCounter}`;
}

export default function RegistrationForm({ themeId, themeTitle, subActivities, customerManagers }: Props) {
  const { submit, submitting, result, error: submitError, reset } = useRegistration();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);
  const [customerManagerId, setCustomerManagerId] = useState<number | null>(null);
  const [companions, setCompanions] = useState<CompanionInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = '请填写姓名';
    if (!phone.trim()) errs.phone = '请填写手机号';
    else if (!/^1[3-9]\d{9}$/.test(phone.trim())) errs.phone = '请输入正确的手机号';
    if (selectedSubIds.length === 0) errs.subActivities = '请至少选择一个活动场次';
    if (customerManagerId === null) errs.customerManager = '请选择客户经理';

    companions.forEach((c) => {
      if (!c.name.trim()) errs[`comp-name-${c.tempId}`] = '请填写同行人姓名';
      if (!c.phone.trim()) errs[`comp-phone-${c.tempId}`] = '请填写同行人手机号';
      else if (!/^1[3-9]\d{9}$/.test(c.phone.trim())) errs[`comp-phone-${c.tempId}`] = '手机号格式不正确';
      if (c.selectedSubIds.length === 0) errs[`comp-sub-${c.tempId}`] = '请选择活动场次';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !customerManagerId) return;

    await submit({
      name: name.trim(),
      phone: phone.trim(),
      subActivityIds: selectedSubIds,
      customerManagerId,
      themeId,
      companions: companions.map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        sub_activity_ids: c.selectedSubIds,
      })),
    });
  }

  function addCompanion() {
    setCompanions([...companions, { tempId: nextTempId(), name: '', phone: '', selectedSubIds: [] }]);
  }

  function removeCompanion(tempId: string) {
    setCompanions(companions.filter((c) => c.tempId !== tempId));
  }

  function updateCompanion(updated: CompanionInput) {
    setCompanions(companions.map((c) => (c.tempId === updated.tempId ? updated : c)));
  }

  if (result) {
    return (
      <div>
        <div className="card result-card">
          <div className="icon">✅</div>
          <h2>报名提交成功</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '8px 0 16px' }}>{themeTitle}</p>

          <div>
            {result.records.map((r, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                {r.role === 'companion' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 6 }}>
                    同行人
                  </span>
                )}
                <span className="status-tag status-tag--confirmed" style={{ marginLeft: 8 }}>
                  报名成功
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn btn-outline" onClick={reset}>
            重新报名
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>报名信息</h2>

        <div className="form-group">
          <label htmlFor="main-name">姓名</label>
          <input
            id="main-name"
            type="text"
            placeholder="请输入姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="main-phone">手机号</label>
          <input
            id="main-phone"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <div className="form-error">{errors.phone}</div>}
        </div>

        <div className="form-group">
          <label>参加活动场次（可多选）</label>
          <SubActivityPicker
            subActivities={subActivities}
            selectedIds={selectedSubIds}
            onChange={(ids) => {
              setSelectedSubIds(ids);
              if (errors.subActivities) setErrors((prev) => ({ ...prev, subActivities: '' }));
            }}
            idPrefix="main"
          />
          {errors.subActivities && <div className="form-error">{errors.subActivities}</div>}
        </div>

        <CustomerManagerSelect
          managers={customerManagers}
          value={customerManagerId}
          onChange={(id) => {
            setCustomerManagerId(id);
            if (errors.customerManager) setErrors((prev) => ({ ...prev, customerManager: '' }));
          }}
          error={errors.customerManager}
        />
      </div>

      {companions.length > 0 && (
        <div>
          <div className="section-header">同行人员</div>
          {companions.map((c, i) => (
            <CompanionCard
              key={c.tempId}
              companion={c}
              index={i}
              subActivities={subActivities}
              onUpdate={updateCompanion}
              onRemove={() => removeCompanion(c.tempId)}
            />
          ))}
        </div>
      )}

      {submitError && <div className="error-banner">{submitError}</div>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline btn-block"
          onClick={addCompanion}
          disabled={submitting}
        >
          + 添加同行人员
        </button>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '14px 20px', fontSize: '1.05rem' }}
        >
          {submitting ? '提交中...' : '提交报名'}
        </button>
      </div>
    </div>
  );
}
