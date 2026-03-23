-- Minimal local database bootstrap derived from server/database/schema.ts
-- Purpose: make the current safety-check and translation modules runnable
-- against a plain local PostgreSQL instance without platform-managed schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Role bootstrap is intentionally kept out of this script because local_user
-- does not have CREATEROLE on a plain PostgreSQL instance. Pre-create the
-- platform roles as an admin user before applying this file when needed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_profile'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.user_profile AS (
      user_id text
    );
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO local_user;
GRANT USAGE ON TYPE public.user_profile TO local_user;

CREATE TABLE IF NOT EXISTS public.translation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace varchar(50) NOT NULL,
  language varchar(10) NOT NULL,
  key_path varchar(500) NOT NULL,
  value text NOT NULL,
  _created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by public.user_profile,
  _updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by public.user_profile
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_translation_unique
  ON public.translation (namespace, language, key_path);
CREATE INDEX IF NOT EXISTS idx_translation_language
  ON public.translation (language);
CREATE INDEX IF NOT EXISTS idx_translation_namespace
  ON public.translation (namespace);

CREATE TABLE IF NOT EXISTS public.safety_check_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  notification_scope text NOT NULL,
  send_type varchar(255) NOT NULL DEFAULT 'immediate',
  send_time timestamptz NOT NULL,
  deadline_time timestamptz NOT NULL,
  status varchar(255) NOT NULL DEFAULT 'draft',
  creator public.user_profile NOT NULL,
  _created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by public.user_profile,
  _updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by public.user_profile
);

CREATE INDEX IF NOT EXISTS idx_safety_check_event_creator
  ON public.safety_check_event (((creator).user_id));
CREATE INDEX IF NOT EXISTS idx_safety_check_event_send_time
  ON public.safety_check_event (send_time);
CREATE INDEX IF NOT EXISTS idx_safety_check_event_status
  ON public.safety_check_event (status);

CREATE TABLE IF NOT EXISTS public.employee_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.safety_check_event(id) ON DELETE CASCADE,
  employee_id public.user_profile NOT NULL,
  employee_name varchar(255) NOT NULL,
  department varchar(255),
  feedback_status varchar(255) NOT NULL DEFAULT 'no_response',
  feedback_time timestamptz,
  last_notify_time timestamptz,
  _created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by public.user_profile,
  _updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by public.user_profile,
  employee_open_id varchar(255)
);

CREATE INDEX IF NOT EXISTS idx_employee_feedback_employee
  ON public.employee_feedback (((employee_id).user_id));
CREATE INDEX IF NOT EXISTS idx_employee_feedback_event_id
  ON public.employee_feedback (event_id);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_open_id
  ON public.employee_feedback (employee_open_id);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_status
  ON public.employee_feedback (feedback_status);

ALTER TABLE public.translation OWNER TO local_user;
ALTER TABLE public.safety_check_event OWNER TO local_user;
ALTER TABLE public.employee_feedback OWNER TO local_user;

GRANT ALL PRIVILEGES ON TABLE public.translation TO local_user;
GRANT ALL PRIVILEGES ON TABLE public.safety_check_event TO local_user;
GRANT ALL PRIVILEGES ON TABLE public.employee_feedback TO local_user;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon_') THEN
    GRANT USAGE ON SCHEMA public TO anon_;
    GRANT USAGE ON TYPE public.user_profile TO anon_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.translation TO anon_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.safety_check_event TO anon_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_feedback TO anon_;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_') THEN
    GRANT USAGE ON SCHEMA public TO authenticated_;
    GRANT USAGE ON TYPE public.user_profile TO authenticated_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.translation TO authenticated_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.safety_check_event TO authenticated_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_feedback TO authenticated_;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role_') THEN
    GRANT USAGE ON SCHEMA public TO service_role_;
    GRANT USAGE ON TYPE public.user_profile TO service_role_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.translation TO service_role_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.safety_check_event TO service_role_;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_feedback TO service_role_;
  END IF;
END
$$;
