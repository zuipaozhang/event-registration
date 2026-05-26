import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityTheme, SubActivityWithCounts, CustomerManager } from '../types';

export function useActivityTheme(slug: string, accessCode?: string | null) {
  const [theme, setTheme] = useState<ActivityTheme | null>(null);
  const [subActivities, setSubActivities] = useState<SubActivityWithCounts[]>([]);
  const [customerManagers, setCustomerManagers] = useState<CustomerManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setClosed(false);

        // 加载活动主题（不限制 is_active，便于展示关闭状态）
        const { data: themeData, error: themeErr } = await supabase
          .from('activity_themes')
          .select('*')
          .eq('slug', slug)
          .single();

        if (themeErr || !themeData) throw new Error('活动不存在');
        if (cancelled) return;

        // 检查访问码
        if (themeData.access_code) {
          if (!accessCode || accessCode !== themeData.access_code) {
            throw new Error('访问码错误');
          }
        }

        // 检查活动是否关闭
        if (!themeData.is_active) {
          setClosed(true);
          setTheme(themeData);
          setLoading(false);
          return;
        }

        // 检查报名截止时间
        if (themeData.registration_deadline && new Date(themeData.registration_deadline) < new Date()) {
          setClosed(true);
          setTheme(themeData);
          setLoading(false);
          return;
        }

        setTheme(themeData);

        const { data: subData, error: subErr } = await supabase
          .from('sub_activities')
          .select('*')
          .eq('theme_id', themeData.id)
          .order('start_time', { ascending: true });

        if (subErr) throw subErr;

        const { data: countData, error: countErr } = await supabase
          .rpc('get_sub_activity_counts', { p_theme_id: themeData.id });

        if (countErr) throw countErr;

        const countMap = new Map<number, { confirmed_count: number; waitlist_count: number }>();
        (countData || []).forEach((r: any) => {
          countMap.set(r.sub_activity_id, {
            confirmed_count: Number(r.confirmed_count),
            waitlist_count: Number(r.waitlist_count),
          });
        });

        const merged: SubActivityWithCounts[] = (subData || []).map((sa) => {
          const counts = countMap.get(sa.id) || { confirmed_count: 0, waitlist_count: 0 };
          return { ...sa, ...counts };
        });

        if (cancelled) return;
        setSubActivities(merged);

        const { data: mgrData, error: mgrErr } = await supabase
          .from('customer_managers')
          .select('id, name, phone')
          .eq('is_active', true)
          .order('id', { ascending: true });

        if (mgrErr) throw mgrErr;
        if (cancelled) return;
        setCustomerManagers(mgrData || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, accessCode]);

  return { theme, subActivities, customerManagers, loading, error, closed };
}
