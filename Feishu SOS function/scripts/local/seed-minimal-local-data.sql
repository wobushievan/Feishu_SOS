-- Minimal local seed data for manual verification.
-- Safe to re-run: it upserts one event and resets its feedback rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.safety_check_event
    WHERE id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    INSERT INTO public.safety_check_event (
      id,
      event_type,
      title,
      description,
      notification_scope,
      send_type,
      send_time,
      deadline_time,
      status,
      creator
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'emergency',
      'Local Verification Event',
      'Local seeded event for safety-check verification.',
      '["local-user-1","local-user-2"]',
      'immediate',
      NOW() - INTERVAL '10 minutes',
      NOW() + INTERVAL '3 days',
      'ongoing',
      ROW('local-admin-user')::public.user_profile
    );
  ELSE
    UPDATE public.safety_check_event
    SET
      event_type = 'emergency',
      title = 'Local Verification Event',
      description = 'Local seeded event for safety-check verification.',
      notification_scope = '["local-user-1","local-user-2"]',
      send_type = 'immediate',
      send_time = NOW() - INTERVAL '10 minutes',
      deadline_time = NOW() + INTERVAL '3 days',
      status = 'ongoing',
      creator = ROW('local-admin-user')::public.user_profile,
      _updated_at = CURRENT_TIMESTAMP
    WHERE id = '11111111-1111-1111-1111-111111111111';
  END IF;
END
$$;

DELETE FROM public.employee_feedback
WHERE event_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO public.employee_feedback (
  id,
  event_id,
  employee_id,
  employee_name,
  department,
  feedback_status,
  feedback_time,
  last_notify_time,
  employee_open_id
) VALUES
(
  '22222222-2222-2222-2222-222222222221',
  '11111111-1111-1111-1111-111111111111',
  ROW('local-user-1')::public.user_profile,
  'Local Tester One',
  'People Ops',
  'no_response',
  NULL,
  NOW() - INTERVAL '20 minutes',
  'ou_local_user_1'
),
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  ROW('local-user-2')::public.user_profile,
  'Local Tester Two',
  'Security',
  'safe',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '20 minutes',
  'ou_local_user_2'
);
