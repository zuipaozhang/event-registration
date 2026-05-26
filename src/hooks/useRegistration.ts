import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SubmitResponse } from '../types';

export function useRegistration() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(params: {
    name: string;
    phone: string;
    subActivityIds: number[];
    customerManagerId: number;
    themeId: number;
    companions: Array<{ name: string; phone: string; sub_activity_ids: number[] }>;
  }) {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('submit_registration', {
        p_name: params.name,
        p_phone: params.phone,
        p_sub_activity_ids: params.subActivityIds,
        p_customer_manager_id: params.customerManagerId,
        p_theme_id: params.themeId,
        p_companions: params.companions,
      });

      if (rpcErr) throw rpcErr;
      setResult(data as unknown as SubmitResponse);
    } catch (e: any) {
      setError(e.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return { submit, submitting, result, error, reset };
}
