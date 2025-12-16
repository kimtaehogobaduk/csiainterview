CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'elder'
);


--
-- Name: admin_adjust_mileage(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_adjust_mileage(p_user_id uuid, p_amount integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_current_mileage integer;
BEGIN
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '인증되지 않음');
  END IF;

  IF NOT has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', '관리자 권한 없음');
  END IF;

  SELECT mileage INTO v_current_mileage FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '사용자를 찾을 수 없습니다');
  END IF;

  -- Prevent negative mileage
  IF COALESCE(v_current_mileage, 0) + p_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '마일리지는 음수가 될 수 없습니다. 현재 마일리지: ' || COALESCE(v_current_mileage, 0) || ', 변경 시도: ' || p_amount
    );
  END IF;

  -- Use shared mileage logic (also updates monthly_leaderboard & transactions)
  PERFORM public.award_mileage(p_user_id, p_amount, p_reason, NULL);

  RETURN jsonb_build_object('success', true, 'message', '마일리지가 업데이트되었습니다');
END;
$$;


--
-- Name: award_mileage(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_mileage(p_user_id uuid, p_amount integer, p_reason text, p_session_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update user mileage
  UPDATE public.profiles
  SET mileage = COALESCE(mileage, 0) + p_amount
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.mileage_transactions (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, p_session_id);
  
  -- Update monthly leaderboard (no rank recalculation here)
  INSERT INTO public.monthly_leaderboard (user_id, month, total_mileage)
  VALUES (
    p_user_id,
    TO_CHAR(NOW(), 'YYYY-MM'),
    p_amount
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_mileage = monthly_leaderboard.total_mileage + p_amount,
    updated_at = NOW();
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role);
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: purchase_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchase_item(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_item_price integer;
  v_current_mileage integer;
  v_item_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '로그인이 필요합니다.');
  END IF;

  SELECT price, name INTO v_item_price, v_item_name
  FROM public.profile_items
  WHERE id = p_item_id AND is_available = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '존재하지 않거나 구매할 수 없는 아이템입니다.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'message', '이미 구매한 아이템입니다.');
  END IF;

  SELECT mileage INTO v_current_mileage FROM public.profiles WHERE id = v_user_id;

  IF v_current_mileage < v_item_price THEN
    RETURN jsonb_build_object('success', false, 'message', '마일리지가 부족합니다.');
  END IF;

  UPDATE public.profiles SET mileage = GREATEST(0, mileage - v_item_price) WHERE id = v_user_id;
  INSERT INTO public.user_items (user_id, item_id) VALUES (v_user_id, p_item_id);
  INSERT INTO public.mileage_transactions (user_id, amount, reason) VALUES (v_user_id, -v_item_price, '아이템 구매: ' || v_item_name);

  RETURN jsonb_build_object('success', true, 'message', v_item_name || ' 구매가 완료되었습니다!');
END;
$$;


--
-- Name: trigger_update_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_leaderboard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.update_leaderboard_ranks();
  RETURN NEW;
END;
$$;


--
-- Name: update_leaderboard_ranks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_leaderboard_ranks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- 순위 계산은 이제 애플리케이션 레벨에서 처리합니다.
  RETURN;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    device_info text,
    ip_address text,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    approved_by uuid,
    approved_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval),
    CONSTRAINT admin_approval_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: admin_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_from_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_deleted boolean DEFAULT false,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_pinned boolean DEFAULT false,
    pinned_at timestamp with time zone,
    pinned_by uuid,
    original_content text
);


--
-- Name: essays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.essays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_type text NOT NULL,
    question text NOT NULL,
    answer text,
    ai_feedback text,
    score integer,
    created_at timestamp with time zone DEFAULT now(),
    video_url text,
    CONSTRAINT interview_sessions_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT interview_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['common'::text, 'essay_based'::text])))
);


--
-- Name: mileage_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mileage_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    session_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: monthly_leaderboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_leaderboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    month text NOT NULL,
    total_mileage integer DEFAULT 0 NOT NULL,
    rank integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profile_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    item_type text NOT NULL,
    price integer NOT NULL,
    image_url text,
    config jsonb DEFAULT '{}'::jsonb,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profile_items_item_type_check CHECK ((item_type = ANY (ARRAY['avatar_frame'::text, 'badge'::text, 'theme_color'::text, 'icon'::text]))),
    CONSTRAINT profile_items_price_check CHECK ((price >= 0))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ai_model text DEFAULT 'google/gemini-2.5-flash'::text,
    essay_question_count integer DEFAULT 10,
    mileage integer DEFAULT 0,
    enable_camera boolean DEFAULT false,
    desired_school text DEFAULT 'cheongshim'::text,
    onboarding_completed boolean DEFAULT false,
    CONSTRAINT mileage_non_negative CHECK ((mileage >= 0)),
    CONSTRAINT profiles_essay_question_count_check CHECK (((essay_question_count >= 1) AND (essay_question_count <= 50))),
    CONSTRAINT profiles_mileage_check CHECK ((mileage >= 0))
);


--
-- Name: saved_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question text NOT NULL,
    source text DEFAULT 'essay_based'::text NOT NULL,
    essay text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_approval_requests; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_approval_requests WITH (security_invoker='on') AS
 SELECT id,
    requested_at,
    expires_at,
    approved_at,
    email,
    user_id,
    status
   FROM public.admin_approval_requests;


--
-- Name: user_customization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_customization (
    user_id uuid NOT NULL,
    avatar_frame_id uuid,
    badge_id uuid,
    theme_color text DEFAULT '#0ea5e9'::text,
    custom_icon_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    purchased_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'signup'::text NOT NULL
);


--
-- Name: admin_approval_requests admin_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: admin_messages admin_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: essays essays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.essays
    ADD CONSTRAINT essays_pkey PRIMARY KEY (id);


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);


--
-- Name: mileage_transactions mileage_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mileage_transactions
    ADD CONSTRAINT mileage_transactions_pkey PRIMARY KEY (id);


--
-- Name: monthly_leaderboard monthly_leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_leaderboard
    ADD CONSTRAINT monthly_leaderboard_pkey PRIMARY KEY (id);


--
-- Name: monthly_leaderboard monthly_leaderboard_user_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_leaderboard
    ADD CONSTRAINT monthly_leaderboard_user_id_month_key UNIQUE (user_id, month);


--
-- Name: profile_items profile_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_items
    ADD CONSTRAINT profile_items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: saved_questions saved_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_questions
    ADD CONSTRAINT saved_questions_pkey PRIMARY KEY (id);


--
-- Name: user_customization user_customization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_customization
    ADD CONSTRAINT user_customization_pkey PRIMARY KEY (user_id);


--
-- Name: user_items user_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_item_id_key UNIQUE (user_id, item_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: idx_approval_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_status ON public.admin_approval_requests USING btree (status, expires_at);


--
-- Name: idx_approval_requests_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_user ON public.admin_approval_requests USING btree (user_id, status);


--
-- Name: idx_community_posts_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_posts_order ON public.community_posts USING btree (is_pinned DESC, created_at DESC) WHERE (is_deleted = false);


--
-- Name: idx_community_posts_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_posts_pinned ON public.community_posts USING btree (is_pinned, pinned_at DESC) WHERE (is_pinned = true);


--
-- Name: idx_saved_questions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_questions_created_at ON public.saved_questions USING btree (created_at DESC);


--
-- Name: idx_saved_questions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_questions_user_id ON public.saved_questions USING btree (user_id);


--
-- Name: idx_verification_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_codes_email ON public.verification_codes USING btree (email);


--
-- Name: idx_verification_codes_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_codes_expires_at ON public.verification_codes USING btree (expires_at);


--
-- Name: monthly_leaderboard after_leaderboard_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_leaderboard_update AFTER INSERT OR UPDATE ON public.monthly_leaderboard FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_update_leaderboard();


--
-- Name: community_posts update_community_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: essays update_essays_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON public.essays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: admin_messages admin_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: community_posts community_posts_pinned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES auth.users(id);


--
-- Name: community_posts community_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: essays essays_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.essays
    ADD CONSTRAINT essays_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: interview_sessions interview_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mileage_transactions mileage_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mileage_transactions
    ADD CONSTRAINT mileage_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: monthly_leaderboard monthly_leaderboard_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_leaderboard
    ADD CONSTRAINT monthly_leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_customization user_customization_avatar_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_customization
    ADD CONSTRAINT user_customization_avatar_frame_id_fkey FOREIGN KEY (avatar_frame_id) REFERENCES public.profile_items(id);


--
-- Name: user_customization user_customization_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_customization
    ADD CONSTRAINT user_customization_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.profile_items(id);


--
-- Name: user_customization user_customization_custom_icon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_customization
    ADD CONSTRAINT user_customization_custom_icon_id_fkey FOREIGN KEY (custom_icon_id) REFERENCES public.profile_items(id);


--
-- Name: user_customization user_customization_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_customization
    ADD CONSTRAINT user_customization_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.profile_items(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_messages Admins can create admin messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create admin messages" ON public.admin_messages FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: essays Admins can delete any essay; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any essay" ON public.essays FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: interview_sessions Admins can delete any session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any session" ON public.interview_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_messages Admins can delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete messages" ON public.admin_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_posts Admins can delete posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete posts" ON public.community_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profile_items Admins can manage items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage items" ON public.profile_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: monthly_leaderboard Admins can manage leaderboard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage leaderboard" ON public.monthly_leaderboard USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: essays Admins can update any essay; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any essay" ON public.essays FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_approval_requests Admins can update approval requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update approval requests" ON public.admin_approval_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_approval_requests Admins can view all approval requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all approval requests" ON public.admin_approval_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: essays Admins can view all essays; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all essays" ON public.essays FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: saved_questions Admins can view all saved questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all saved questions" ON public.saved_questions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: interview_sessions Admins can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sessions" ON public.interview_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: mileage_transactions Admins can view all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transactions" ON public.mileage_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_items Admins can view all user items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user items" ON public.user_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_posts Admins can view original content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view original content" ON public.community_posts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: verification_codes Anyone can create verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create verification codes" ON public.verification_codes FOR INSERT WITH CHECK (true);


--
-- Name: profile_items Anyone can view available items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view available items" ON public.profile_items FOR SELECT USING ((is_available = true));


--
-- Name: monthly_leaderboard Anyone can view leaderboard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view leaderboard" ON public.monthly_leaderboard FOR SELECT USING (true);


--
-- Name: community_posts Anyone can view non-deleted posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view non-deleted posts" ON public.community_posts FOR SELECT USING (((is_deleted = false) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: community_posts Authenticated users can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (auth.uid() IS NOT NULL)));


--
-- Name: admin_approval_requests Authenticated users can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create requests" ON public.admin_approval_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_customization Authenticated users can view customizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view customizations" ON public.user_customization FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view public profile info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view public profile info" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: admin_messages Users can create messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages" ON public.admin_messages FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (is_from_admin = false)));


--
-- Name: saved_questions Users can delete own saved questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own saved questions" ON public.saved_questions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_customization Users can insert own customization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own customization" ON public.user_customization FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: saved_questions Users can insert own saved questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own saved questions" ON public.saved_questions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: essays Users can manage own essays; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own essays" ON public.essays USING ((auth.uid() = user_id));


--
-- Name: interview_sessions Users can manage own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own sessions" ON public.interview_sessions USING ((auth.uid() = user_id));


--
-- Name: verification_codes Users can read own verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own verification codes" ON public.verification_codes FOR SELECT USING (((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (email = (auth.jwt() ->> 'email'::text))));


--
-- Name: user_customization Users can update own customization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own customization" ON public.user_customization FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: community_posts Users can update own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_items Users can view own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own items" ON public.user_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.admin_messages FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: admin_approval_requests Users can view own requests via view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own requests via view" ON public.admin_approval_requests FOR SELECT TO authenticated USING (false);


--
-- Name: saved_questions Users can view own saved questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own saved questions" ON public.saved_questions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mileage_transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.mileage_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_approval_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: community_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: essays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

--
-- Name: interview_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: mileage_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mileage_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_leaderboard; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_leaderboard ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_customization; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_customization ENABLE ROW LEVEL SECURITY;

--
-- Name: user_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


