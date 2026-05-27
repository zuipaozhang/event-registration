-- ============================================================
-- 线下活动报名系统 — 数据库建表 + 业务函数
-- ============================================================

-- 先删除旧表（按依赖顺序，先删子表再删主表）
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS sub_activities CASCADE;
DROP TABLE IF EXISTS activity_themes CASCADE;
DROP TABLE IF EXISTS customer_managers CASCADE;
DROP FUNCTION IF EXISTS submit_registration CASCADE;
DROP FUNCTION IF EXISTS get_sub_activity_counts CASCADE;

-- 1. 客户经理表
CREATE TABLE IF NOT EXISTS customer_managers (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  phone      text,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. 活动主题表
CREATE TABLE IF NOT EXISTS activity_themes (
  id                     serial PRIMARY KEY,
  title                  text NOT NULL,
  event_date             date NOT NULL,
  slug                   text UNIQUE NOT NULL,
  access_code            text,
  registration_deadline  date,
  is_active              boolean DEFAULT true,
  created_at             timestamptz DEFAULT now()
);

-- 3. 活动子主题表
CREATE TABLE IF NOT EXISTS sub_activities (
  id           serial PRIMARY KEY,
  theme_id     int NOT NULL REFERENCES activity_themes(id) ON DELETE CASCADE,
  title        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date,
  max_capacity int DEFAULT 10,
  created_at   timestamptz DEFAULT now()
);

-- 4. 报名记录表
CREATE TABLE IF NOT EXISTS registrations (
  id                  serial PRIMARY KEY,
  name                text NOT NULL,
  phone               text NOT NULL,
  sub_activity_ids    int[] NOT NULL,
  customer_manager_id int REFERENCES customer_managers(id),
  parent_id           int REFERENCES registrations(id),
  theme_id            int NOT NULL REFERENCES activity_themes(id),
  status              text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist')),
  registered_at       timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_registrations_theme ON registrations(theme_id);
CREATE INDEX IF NOT EXISTS idx_registrations_parent ON registrations(parent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_sub_activities ON registrations USING GIN(sub_activity_ids);
CREATE INDEX IF NOT EXISTS idx_sub_activities_theme ON sub_activities(theme_id);


-- ============================================================
-- 提交报名函数
-- ============================================================
CREATE OR REPLACE FUNCTION submit_registration(
  p_name                text,
  p_phone               text,
  p_sub_activity_ids    int[],
  p_customer_manager_id int,
  p_theme_id            int,
  p_companions          jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_main_id          int;
  v_status           text;
  v_sub_id           int;
  v_capacity         int;
  v_confirmed        int;
  v_sub_statuses     jsonb := '{}'::jsonb;
  v_comp             jsonb;
  v_comp_id          int;
  v_comp_sub_ids     int[];
  v_comp_sub_id      int;
  v_comp_status      text;
  v_comp_all_conf    boolean;
  v_results          jsonb[] := '{}'::jsonb;
  v_theme_active     boolean;
  v_theme_deadline   timestamptz;
BEGIN
  -- 校验活动是否有效
  SELECT is_active, registration_deadline INTO v_theme_active, v_theme_deadline
  FROM activity_themes WHERE id = p_theme_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '活动不存在';
  END IF;

  IF NOT v_theme_active THEN
    RAISE EXCEPTION '报名已截止';
  END IF;

  IF v_theme_deadline IS NOT NULL AND now() > v_theme_deadline THEN
    RAISE EXCEPTION '报名已截止';
  END IF;

  -- 逐个检查子活动名额
  FOREACH v_sub_id IN ARRAY p_sub_activity_ids
  LOOP
    SELECT max_capacity INTO v_capacity FROM sub_activities WHERE id = v_sub_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION '子活动 % 不存在', v_sub_id;
    END IF;

    SELECT COUNT(*) INTO v_confirmed
    FROM registrations
    WHERE sub_activity_ids @> ARRAY[v_sub_id]
      AND status = 'confirmed';

    IF v_confirmed < v_capacity THEN
      v_sub_statuses := v_sub_statuses || jsonb_build_object(v_sub_id::text, 'confirmed');
    ELSE
      v_sub_statuses := v_sub_statuses || jsonb_build_object(v_sub_id::text, 'waitlist');
    END IF;
  END LOOP;

  -- 主报名人状态
  IF v_sub_statuses::text LIKE '%confirmed%' THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'waitlist';
  END IF;

  -- 写入主报名人
  INSERT INTO registrations (name, phone, sub_activity_ids, customer_manager_id, theme_id, status)
  VALUES (p_name, p_phone, p_sub_activity_ids, p_customer_manager_id, p_theme_id, v_status)
  RETURNING id INTO v_main_id;

  v_results := array_append(v_results, jsonb_build_object(
    'id', v_main_id, 'name', p_name, 'status', v_status, 'role', 'main'
  ));

  -- 循环写入同行人
  IF p_companions IS NOT NULL AND jsonb_array_length(p_companions) > 0 THEN
    FOR v_comp IN SELECT * FROM jsonb_array_elements(p_companions)
    LOOP
      v_comp_sub_ids := ARRAY(SELECT jsonb_array_elements_text(v_comp->'sub_activity_ids')::int);
      v_comp_all_conf := true;

      FOREACH v_comp_sub_id IN ARRAY v_comp_sub_ids
      LOOP
        SELECT max_capacity INTO v_capacity FROM sub_activities WHERE id = v_comp_sub_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION '子活动 % 不存在', v_comp_sub_id;
        END IF;

        SELECT COUNT(*) INTO v_confirmed
        FROM registrations
        WHERE sub_activity_ids @> ARRAY[v_comp_sub_id]
          AND status = 'confirmed';

        IF v_confirmed < v_capacity THEN
          NULL;
        ELSE
          v_comp_all_conf := false;
        END IF;
      END LOOP;

      v_comp_status := CASE WHEN v_comp_all_conf THEN 'confirmed' ELSE 'waitlist' END;

      INSERT INTO registrations (name, phone, sub_activity_ids, parent_id, theme_id, status)
      VALUES (
        v_comp->>'name',
        v_comp->>'phone',
        v_comp_sub_ids,
        v_main_id,
        p_theme_id,
        v_comp_status
      )
      RETURNING id INTO v_comp_id;

      v_results := array_append(v_results, jsonb_build_object(
        'id', v_comp_id, 'name', v_comp->>'name', 'status', v_comp_status, 'role', 'companion'
      ));
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'records', to_jsonb(v_results));
END;
$$;


-- ============================================================
-- 查询子活动当前报名人数
-- ============================================================
CREATE OR REPLACE FUNCTION get_sub_activity_counts(p_theme_id int)
RETURNS TABLE(sub_activity_id int, confirmed_count bigint, waitlist_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sa.id,
    COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0),
    COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'waitlist'), 0)
  FROM sub_activities sa
  LEFT JOIN registrations r ON r.sub_activity_ids @> ARRAY[sa.id]
    AND r.theme_id = sa.theme_id
  WHERE sa.theme_id = p_theme_id
  GROUP BY sa.id;
$$;


-- ============================================================
-- RLS 策略：允许公开读取/写入
-- ============================================================
ALTER TABLE customer_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许公开读取客户经理" ON customer_managers;
CREATE POLICY "允许公开读取客户经理" ON customer_managers FOR SELECT USING (true);

ALTER TABLE activity_themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许公开读取活动主题" ON activity_themes;
CREATE POLICY "允许公开读取活动主题" ON activity_themes FOR SELECT USING (true);

ALTER TABLE sub_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许公开读取子活动" ON sub_activities;
CREATE POLICY "允许公开读取子活动" ON sub_activities FOR SELECT USING (true);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许公开读取报名记录" ON registrations;
CREATE POLICY "允许公开读取报名记录" ON registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许公开写入报名记录" ON registrations;
CREATE POLICY "允许公开写入报名记录" ON registrations FOR INSERT WITH CHECK (true);


-- ============================================================
-- 种子数据
-- ============================================================
TRUNCATE TABLE customer_managers, activity_themes, sub_activities RESTART IDENTITY CASCADE;

INSERT INTO customer_managers (name, phone) VALUES
  ('张三', '13800000001'),
  ('李四', '13800000002'),
  ('王五', '13800000003');

INSERT INTO activity_themes (title, event_date, slug) VALUES
  ('2026年度技术开放日', '2026-06-15', 'tech-open-day-2026');

INSERT INTO sub_activities (theme_id, title, start_date, end_date) VALUES
  (1, 'AI 专场',    '2026-06-15', '2026-06-15'),
  (1, '云计算专场',   '2026-06-15', '2026-06-15'),
  (1, '前端技术专场', '2026-06-15', '2026-06-15');
