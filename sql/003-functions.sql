-- ============================================================================
-- LCBconnect - Triggers and Functions
-- ============================================================================

-- ============================================================================
-- 1. lcb_handle_updated_at() - Auto-set updated_at on update
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER lcb_profiles_updated_at
    BEFORE UPDATE ON lcb_profiles
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_posts_updated_at
    BEFORE UPDATE ON lcb_posts
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_comments_updated_at
    BEFORE UPDATE ON lcb_comments
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_services_updated_at
    BEFORE UPDATE ON lcb_services
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_complaints_updated_at
    BEFORE UPDATE ON lcb_complaints
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_avis_batellerie_updated_at
    BEFORE UPDATE ON lcb_avis_batellerie
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_events_updated_at
    BEFORE UPDATE ON lcb_events
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_directory_updated_at
    BEFORE UPDATE ON lcb_directory
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

CREATE TRIGGER lcb_conversations_updated_at
    BEFORE UPDATE ON lcb_conversations
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_updated_at();

-- ============================================================================
-- 2. lcb_handle_new_user() - Auto-create profile on auth.users insert
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO lcb_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER lcb_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_new_user();

-- ============================================================================
-- 3. lcb_handle_like_count() - Update likes_count on lcb_posts
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lcb_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lcb_posts
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER lcb_likes_count_trigger
    AFTER INSERT OR DELETE ON lcb_likes
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_like_count();

-- ============================================================================
-- 4. lcb_handle_comment_count() - Update comments_count on lcb_posts
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lcb_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lcb_posts
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER lcb_comments_count_trigger
    AFTER INSERT OR DELETE ON lcb_comments
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_comment_count();

-- ============================================================================
-- 5. lcb_handle_registration_count() - Update registrations_count on lcb_events
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_registration_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lcb_events
        SET registrations_count = registrations_count + 1
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lcb_events
        SET registrations_count = GREATEST(registrations_count - 1, 0)
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER lcb_registrations_count_trigger
    AFTER INSERT OR DELETE ON lcb_event_registrations
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_registration_count();

-- ============================================================================
-- 6. lcb_handle_directory_rating() - Recalculate rating on lcb_directory
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_handle_directory_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_directory_id uuid;
    new_avg numeric(2,1);
    new_count int;
BEGIN
    -- Determine which directory entry to update
    IF TG_OP = 'DELETE' THEN
        target_directory_id := OLD.directory_id;
    ELSE
        target_directory_id := NEW.directory_id;
    END IF;

    -- Recalculate from scratch
    SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
        COUNT(*)
    INTO new_avg, new_count
    FROM lcb_directory_reviews
    WHERE directory_id = target_directory_id;

    UPDATE lcb_directory
    SET rating_avg = new_avg,
        rating_count = new_count
    WHERE id = target_directory_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER lcb_directory_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON lcb_directory_reviews
    FOR EACH ROW EXECUTE FUNCTION lcb_handle_directory_rating();
