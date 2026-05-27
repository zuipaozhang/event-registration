-- ============================================================
-- 003: 时间字段改为 date 类型（只精确到日）
-- 在 Supabase SQL Editor 执行
-- ============================================================

ALTER TABLE sub_activities ALTER COLUMN start_time TYPE date USING start_time::date;
ALTER TABLE sub_activities ALTER COLUMN end_time TYPE date USING end_time::date;
ALTER TABLE sub_activities RENAME COLUMN start_time TO start_date;
ALTER TABLE sub_activities RENAME COLUMN end_time TO end_date;

ALTER TABLE activity_themes ALTER COLUMN registration_deadline TYPE date USING registration_deadline::date;
