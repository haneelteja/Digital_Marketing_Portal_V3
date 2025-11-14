-- Database Schema for Future Enhancements
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Third-Party Integration Configurations
-- ============================================

CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'CUSTOM')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON public.integration_configs(type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_enabled ON public.integration_configs(enabled) WHERE enabled = true;

-- Integration posting history
CREATE TABLE IF NOT EXISTS public.integration_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integration_configs(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.calendar_entries(id) ON DELETE SET NULL,
  campaign_upload_id UUID REFERENCES public.campaign_uploads(id) ON DELETE SET NULL,
  external_id TEXT, -- ID from third-party platform
  status TEXT NOT NULL CHECK (status IN ('pending', 'posted', 'failed', 'scheduled')),
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_posts_integration ON public.integration_posts(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_posts_status ON public.integration_posts(status);
CREATE INDEX IF NOT EXISTS idx_integration_posts_post ON public.integration_posts(post_id);

-- RLS Policies for integration_configs
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_configs_service_role ON public.integration_configs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for integration_posts
ALTER TABLE public.integration_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_posts_service_role ON public.integration_posts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 2. AI Calendar Generation
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_calendar_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  generated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly')),
  ai_provider TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  entries_generated INTEGER DEFAULT 0,
  entries_saved INTEGER DEFAULT 0,
  error_message TEXT,
  request_metadata JSONB DEFAULT '{}',
  result_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_calendar_generations_client ON public.ai_calendar_generations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_calendar_generations_status ON public.ai_calendar_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_calendar_generations_created_by ON public.ai_calendar_generations(generated_by);

-- RLS Policies
ALTER TABLE public.ai_calendar_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_calendar_generations_service_role ON public.ai_calendar_generations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. Enhanced Notifications Management
-- ============================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- Variables that can be replaced
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON public.notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_enabled ON public.notification_templates(enabled) WHERE enabled = true;

-- Notification Rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- POST_ADDED, APPROVAL, etc.
  conditions JSONB DEFAULT '{}', -- Conditions for triggering
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE CASCADE,
  recipients TEXT NOT NULL CHECK (recipients IN ('all', 'client', 'admin', 'custom')),
  custom_recipients UUID[] DEFAULT '{}', -- User IDs for custom recipients
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON public.notification_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON public.notification_rules(enabled) WHERE enabled = true;

-- Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  types JSONB DEFAULT '{}', -- Notification type preferences
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- RLS Policies
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_service_role ON public.notification_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notification_rules_service_role ON public.notification_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notification_preferences_service_role ON public.notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 4. Update existing tables for integration
-- ============================================

-- Add integration tracking to calendar_entries
ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS integration_status JSONB DEFAULT '{}'; -- Track posting status per platform

-- Add AI generation metadata to calendar_entries
ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_generation_id UUID REFERENCES public.ai_calendar_generations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_entries_ai_generated ON public.calendar_entries(ai_generated) WHERE ai_generated = true;

-- ============================================
-- 5. Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Comments for Documentation
-- ============================================

COMMENT ON TABLE public.integration_configs IS 'Stores configuration for third-party platform integrations';
COMMENT ON TABLE public.integration_posts IS 'Tracks posts sent to third-party platforms';
COMMENT ON TABLE public.ai_calendar_generations IS 'Tracks AI-generated calendar content';
COMMENT ON TABLE public.notification_templates IS 'Templates for notification messages';
COMMENT ON TABLE public.notification_rules IS 'Rules for when and how to send notifications';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification delivery';




