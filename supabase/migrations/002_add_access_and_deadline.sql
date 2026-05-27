-- ============================================================
-- 002: 访问码 + 报名截止时间 + is_active 校验
-- 在 Supabase SQL Editor 执行，不会丢失已有数据
-- ============================================================

-- 新增字段
ALTER TABLE activity_themes ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE activity_themes ADD COLUMN IF NOT EXISTS registration_deadline date;

-- 更新提交报名函数：容量逻辑（满额允许超额 2 人，超出拒绝）
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
  v_main_id              int;
  v_sub_id               int;
  v_capacity             int;
  v_confirmed            int;
  v_comp                 jsonb;
  v_comp_id              int;
  v_comp_sub_ids         int[];
  v_comp_sub_id          int;
  v_comp_allowed         boolean;
  v_results              jsonb[] := '{}'::jsonb;
  v_theme_active         boolean;
  v_theme_deadline       timestamptz;
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

  -- 逐个检查子活动名额（允许超额 2 人）
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

    IF v_confirmed >= v_capacity + 2 THEN
      RAISE EXCEPTION '该场次已报满，请刷新页面查看最新场次';
    END IF;
  END LOOP;

  -- 写入主报名人
  INSERT INTO registrations (name, phone, sub_activity_ids, customer_manager_id, theme_id, status)
  VALUES (p_name, p_phone, p_sub_activity_ids, p_customer_manager_id, p_theme_id, 'confirmed')
  RETURNING id INTO v_main_id;

  v_results := array_append(v_results, jsonb_build_object(
    'id', v_main_id, 'name', p_name, 'status', 'confirmed', 'role', 'main'
  ));

  -- 循环写入同行人
  IF p_companions IS NOT NULL AND jsonb_array_length(p_companions) > 0 THEN
    FOR v_comp IN SELECT * FROM jsonb_array_elements(p_companions)
    LOOP
      v_comp_sub_ids := ARRAY(SELECT jsonb_array_elements_text(v_comp->'sub_activity_ids')::int);
      v_comp_allowed := true;

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

        IF v_confirmed >= v_capacity + 2 THEN
          v_comp_allowed := false;
        END IF;
      END LOOP;

      IF NOT v_comp_allowed THEN
        RAISE EXCEPTION '该场次已报满，请刷新页面查看最新场次';
      END IF;

      INSERT INTO registrations (name, phone, sub_activity_ids, parent_id, theme_id, status)
      VALUES (
        v_comp->>'name',
        v_comp->>'phone',
        v_comp_sub_ids,
        v_main_id,
        p_theme_id,
        'confirmed'
      )
      RETURNING id INTO v_comp_id;

      v_results := array_append(v_results, jsonb_build_object(
        'id', v_comp_id, 'name', v_comp->>'name', 'status', 'confirmed', 'role', 'companion'
      ));
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'records', to_jsonb(v_results));
END;
$$;
