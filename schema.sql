-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.allowed_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  email text NOT NULL,
  first_name text,
  CONSTRAINT allowed_emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.architects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type USER-DEFINED NOT NULL DEFAULT 'individual'::architect_type,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT architects_pkey PRIMARY KEY (id),
  CONSTRAINT architects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.building_architects (
  building_id uuid NOT NULL,
  architect_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT building_architects_pkey PRIMARY KEY (building_id, architect_id),
  CONSTRAINT building_architects_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_architects_architect_id_fkey FOREIGN KEY (architect_id) REFERENCES public.architects(id)
);
CREATE TABLE public.buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location USER-DEFINED NOT NULL,
  address text,
  architects ARRAY,
  styles ARRAY,
  description text,
  main_image_url text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  year_completed integer,
  city text,
  country text,
  CONSTRAINT buildings_pkey PRIMARY KEY (id),
  CONSTRAINT buildings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  interaction_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT comments_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_backlog_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'Medium'::text CHECK (priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text])),
  status text NOT NULL DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Scheduled'::text, 'Archived'::text])),
  admin_note text,
  cycle_id uuid,
  building_id uuid NOT NULL,
  CONSTRAINT group_backlog_items_pkey PRIMARY KEY (id),
  CONSTRAINT group_backlog_items_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.group_cycles(id),
  CONSTRAINT group_backlog_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_backlog_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT group_backlog_items_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);
CREATE TABLE public.group_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  group_id uuid NOT NULL,
  host_notes text,
  status text,
  CONSTRAINT group_cycles_pkey PRIMARY KEY (id),
  CONSTRAINT group_cycles_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'invited'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  note text,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_private_info (
  group_id uuid NOT NULL,
  home_base text,
  CONSTRAINT group_private_info_pkey PRIMARY KEY (group_id),
  CONSTRAINT group_private_info_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  title text,
  description text,
  session_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  resources jsonb DEFAULT '[]'::jsonb,
  cycle_id uuid,
  host_notes text,
  status text DEFAULT 'published'::text,
  location text,
  session_type text DEFAULT 'physical'::text,
  meeting_link text,
  CONSTRAINT group_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT group_sessions_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.group_cycles(id),
  CONSTRAINT group_sessions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  cover_url text,
  slug text NOT NULL UNIQUE,
  stats_cache jsonb DEFAULT '{}'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  active_tabs ARRAY,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  interaction_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);
CREATE TABLE public.login_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['follow'::text, 'like'::text, 'comment'::text, 'group_invitation'::text, 'recommendation'::text, 'new_session'::text, 'friend_joined'::text, 'suggest_follow'::text, 'session_reminder'::text, 'group_activity'::text, 'join_request'::text, 'visit_request'::text])),
  resource_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  session_id uuid,
  group_id uuid,
  recommendation_id uuid,
  metadata jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT notifications_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id),
  CONSTRAINT notifications_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.user_buildings(id),
  CONSTRAINT notifications_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_sessions(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  is_correct boolean DEFAULT false,
  order_index integer DEFAULT 0,
  content_type text NOT NULL DEFAULT 'text'::text,
  media_url text,
  option_text text,
  building_id uuid,
  CONSTRAINT poll_options_pkey PRIMARY KEY (id),
  CONSTRAINT poll_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.poll_questions(id),
  CONSTRAINT poll_options_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);
CREATE TABLE public.poll_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  question_text text NOT NULL,
  order_index integer DEFAULT 0,
  allow_custom_answer boolean DEFAULT false,
  min_selections integer DEFAULT 1,
  max_selections integer DEFAULT 1,
  is_live_active boolean DEFAULT false,
  is_revealed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  response_type text NOT NULL DEFAULT 'text'::text,
  media_type text,
  media_url text,
  media_data jsonb,
  CONSTRAINT poll_questions_pkey PRIMARY KEY (id),
  CONSTRAINT poll_questions_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id)
);
CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  question_id uuid NOT NULL,
  option_id uuid,
  user_id uuid NOT NULL,
  custom_answer text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id),
  CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id),
  CONSTRAINT poll_votes_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.poll_questions(id),
  CONSTRAINT poll_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  session_id uuid,
  cycle_id uuid,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::poll_status,
  type USER-DEFINED NOT NULL DEFAULT 'general'::poll_type,
  allow_multiple_votes boolean DEFAULT false,
  show_results_before_close boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  slug text,
  CONSTRAINT polls_pkey PRIMARY KEY (id),
  CONSTRAINT polls_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT polls_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.group_cycles(id),
  CONSTRAINT polls_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT polls_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_sessions(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text CHECK (char_length(username) >= 3),
  avatar_url text,
  bio text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  country text,
  invited_by text,
  subscribed_platforms ARRAY DEFAULT '{}'::text[],
  favorites jsonb DEFAULT '[]'::jsonb,
  location text,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  role text DEFAULT 'user'::text,
  last_online timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  building_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'ignored'::text, 'visit_with'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT recommendations_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_recommender_id_fkey FOREIGN KEY (recommender_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.saved_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT saved_views_pkey PRIMARY KEY (id),
  CONSTRAINT saved_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_buildings (
  session_id uuid NOT NULL,
  building_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_main boolean DEFAULT false,
  CONSTRAINT session_buildings_pkey PRIMARY KEY (id),
  CONSTRAINT session_buildings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_sessions(id),
  CONSTRAINT session_buildings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);
CREATE TABLE public.session_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  content text NOT NULL,
  CONSTRAINT session_comments_pkey PRIMARY KEY (id),
  CONSTRAINT session_comments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_sessions(id),
  CONSTRAINT session_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  CONSTRAINT session_likes_pkey PRIMARY KEY (id),
  CONSTRAINT session_likes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_sessions(id),
  CONSTRAINT session_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.user_buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  content text,
  tags ARRAY,
  visibility text DEFAULT 'public'::text CHECK (visibility = ANY (ARRAY['public'::text, 'contacts'::text, 'private'::text])),
  status text NOT NULL DEFAULT 'visited'::text CHECK (status = ANY (ARRAY['pending'::text, 'visited'::text, 'ignored'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  visited_at timestamp with time zone,
  group_id uuid,
  edited_at timestamp with time zone DEFAULT now(),
  building_id uuid NOT NULL,
  CONSTRAINT user_buildings_pkey PRIMARY KEY (id),
  CONSTRAINT user_buildings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_buildings_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT user_buildings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);
