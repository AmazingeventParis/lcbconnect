-- ============================================================================
-- LCBconnect - Row Level Security Policies
-- ============================================================================

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get user role from lcb_profiles
CREATE OR REPLACE FUNCTION lcb_get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM lcb_profiles WHERE id = uid;
$$;

-- Check if user is approved
CREATE OR REPLACE FUNCTION lcb_is_approved(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lcb_profiles WHERE id = uid AND status = 'approved'
    );
$$;

-- Check if user is CA or Bureau
CREATE OR REPLACE FUNCTION lcb_is_ca_or_bureau(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lcb_profiles
        WHERE id = uid AND status = 'approved' AND role IN ('ca', 'bureau')
    );
$$;

-- Check if user is Bureau
CREATE OR REPLACE FUNCTION lcb_is_bureau(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lcb_profiles
        WHERE id = uid AND status = 'approved' AND role = 'bureau'
    );
$$;

-- Helper: check role hierarchy (bureau > ca > membre)
CREATE OR REPLACE FUNCTION lcb_role_level(r text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE r
        WHEN 'bureau' THEN 3
        WHEN 'ca' THEN 2
        WHEN 'membre' THEN 1
        ELSE 0
    END;
$$;

-- ============================================================================
-- 1. lcb_profiles policies
-- ============================================================================
CREATE POLICY "profiles_select_approved"
    ON lcb_profiles FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "profiles_update_own"
    ON lcb_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_service_role"
    ON lcb_profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'service_role'
    );

-- ============================================================================
-- 2. lcb_posts policies
-- ============================================================================
CREATE POLICY "posts_select_approved"
    ON lcb_posts FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "posts_insert_approved"
    ON lcb_posts FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "posts_update_author_or_bureau"
    ON lcb_posts FOR UPDATE
    USING (
        author_id = auth.uid()
        OR lcb_is_bureau(auth.uid())
    )
    WITH CHECK (
        author_id = auth.uid()
        OR lcb_is_bureau(auth.uid())
    );

CREATE POLICY "posts_delete_author_or_bureau"
    ON lcb_posts FOR DELETE
    USING (author_id = auth.uid() OR lcb_is_bureau(auth.uid()));

-- ============================================================================
-- 3. lcb_comments policies
-- ============================================================================
CREATE POLICY "comments_select_approved"
    ON lcb_comments FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "comments_insert_approved"
    ON lcb_comments FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "comments_update_own"
    ON lcb_comments FOR UPDATE
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_delete_own"
    ON lcb_comments FOR DELETE
    USING (author_id = auth.uid());

-- ============================================================================
-- 4. lcb_likes policies
-- ============================================================================
CREATE POLICY "likes_select_approved"
    ON lcb_likes FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "likes_insert_approved"
    ON lcb_likes FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "likes_delete_own"
    ON lcb_likes FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- 5. lcb_reports policies
-- ============================================================================
CREATE POLICY "reports_insert_approved"
    ON lcb_reports FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND reporter_id = auth.uid()
    );

CREATE POLICY "reports_select_ca_bureau"
    ON lcb_reports FOR SELECT
    USING (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "reports_update_ca_bureau"
    ON lcb_reports FOR UPDATE
    USING (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "reports_delete_ca_bureau"
    ON lcb_reports FOR DELETE
    USING (lcb_is_ca_or_bureau(auth.uid()));

-- ============================================================================
-- 6. lcb_services policies
-- ============================================================================
CREATE POLICY "services_select_approved"
    ON lcb_services FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "services_insert_approved"
    ON lcb_services FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "services_update_author_or_ca"
    ON lcb_services FOR UPDATE
    USING (
        author_id = auth.uid()
        OR lcb_is_ca_or_bureau(auth.uid())
    )
    WITH CHECK (
        author_id = auth.uid()
        OR lcb_is_ca_or_bureau(auth.uid())
    );

-- ============================================================================
-- 7. lcb_complaints policies
-- ============================================================================
CREATE POLICY "complaints_select_approved"
    ON lcb_complaints FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "complaints_insert_approved"
    ON lcb_complaints FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "complaints_update_author_or_ca"
    ON lcb_complaints FOR UPDATE
    USING (
        author_id = auth.uid()
        OR lcb_is_ca_or_bureau(auth.uid())
    )
    WITH CHECK (
        author_id = auth.uid()
        OR lcb_is_ca_or_bureau(auth.uid())
    );

-- ============================================================================
-- 8. lcb_avis_batellerie policies
-- ============================================================================
CREATE POLICY "avis_select_approved"
    ON lcb_avis_batellerie FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "avis_insert_bureau"
    ON lcb_avis_batellerie FOR INSERT
    WITH CHECK (
        lcb_is_bureau(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "avis_update_bureau"
    ON lcb_avis_batellerie FOR UPDATE
    USING (lcb_is_bureau(auth.uid()));

CREATE POLICY "avis_delete_bureau"
    ON lcb_avis_batellerie FOR DELETE
    USING (lcb_is_bureau(auth.uid()));

-- ============================================================================
-- 9. lcb_documents policies
-- ============================================================================
CREATE POLICY "documents_select_by_role"
    ON lcb_documents FOR SELECT
    USING (
        lcb_is_approved(auth.uid())
        AND lcb_role_level(lcb_get_user_role(auth.uid())) >= lcb_role_level(min_role)
    );

CREATE POLICY "documents_insert_ca_bureau"
    ON lcb_documents FOR INSERT
    WITH CHECK (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "documents_update_ca_bureau"
    ON lcb_documents FOR UPDATE
    USING (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "documents_delete_ca_bureau"
    ON lcb_documents FOR DELETE
    USING (lcb_is_ca_or_bureau(auth.uid()));

-- ============================================================================
-- 10. lcb_events policies
-- ============================================================================
CREATE POLICY "events_select_approved"
    ON lcb_events FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "events_insert_ca_bureau"
    ON lcb_events FOR INSERT
    WITH CHECK (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "events_update_ca_bureau"
    ON lcb_events FOR UPDATE
    USING (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "events_delete_ca_bureau"
    ON lcb_events FOR DELETE
    USING (lcb_is_ca_or_bureau(auth.uid()));

-- ============================================================================
-- 11. lcb_event_registrations policies
-- ============================================================================
CREATE POLICY "event_registrations_select_approved"
    ON lcb_event_registrations FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "event_registrations_insert_approved"
    ON lcb_event_registrations FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "event_registrations_delete_own"
    ON lcb_event_registrations FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- 12. lcb_directory policies
-- ============================================================================
CREATE POLICY "directory_select_approved_entries"
    ON lcb_directory FOR SELECT
    USING (
        lcb_is_approved(auth.uid())
        AND (is_approved = true OR created_by = auth.uid() OR lcb_is_ca_or_bureau(auth.uid()))
    );

CREATE POLICY "directory_insert_approved"
    ON lcb_directory FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "directory_update_ca_bureau"
    ON lcb_directory FOR UPDATE
    USING (lcb_is_ca_or_bureau(auth.uid()));

CREATE POLICY "directory_delete_ca_bureau"
    ON lcb_directory FOR DELETE
    USING (lcb_is_ca_or_bureau(auth.uid()));

-- ============================================================================
-- 13. lcb_directory_reviews policies
-- ============================================================================
CREATE POLICY "directory_reviews_select_approved"
    ON lcb_directory_reviews FOR SELECT
    USING (lcb_is_approved(auth.uid()));

CREATE POLICY "directory_reviews_insert_approved"
    ON lcb_directory_reviews FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND author_id = auth.uid()
    );

CREATE POLICY "directory_reviews_delete_ca_bureau"
    ON lcb_directory_reviews FOR DELETE
    USING (lcb_is_ca_or_bureau(auth.uid()));

-- ============================================================================
-- Helper: Check conversation membership (SECURITY DEFINER to avoid
-- infinite recursion when policies on lcb_conversation_members
-- reference the same table in subqueries)
-- ============================================================================
CREATE OR REPLACE FUNCTION lcb_is_conversation_member(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lcb_conversation_members
        WHERE conversation_id = conv_id AND user_id = uid
    );
$$;

-- ============================================================================
-- 14. lcb_conversations policies
-- ============================================================================
CREATE POLICY "conversations_select_member"
    ON lcb_conversations FOR SELECT
    USING (lcb_is_conversation_member(id, auth.uid()));

CREATE POLICY "conversations_select_channels"
    ON lcb_conversations FOR SELECT
    USING (
        group_type IN ('channel', 'channel_ca')
        AND lcb_is_approved(auth.uid())
    );

CREATE POLICY "conversations_insert_approved"
    ON lcb_conversations FOR INSERT
    WITH CHECK (
        lcb_is_approved(auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "conversations_update_member"
    ON lcb_conversations FOR UPDATE
    USING (lcb_is_conversation_member(id, auth.uid()));

-- ============================================================================
-- 15. lcb_conversation_members policies
-- ============================================================================
CREATE POLICY "conversation_members_select_own"
    ON lcb_conversation_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "conversation_members_select_same_conv"
    ON lcb_conversation_members FOR SELECT
    USING (lcb_is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "conversation_members_insert_approved"
    ON lcb_conversation_members FOR INSERT
    WITH CHECK (lcb_is_approved(auth.uid()));

CREATE POLICY "conversation_members_update_own"
    ON lcb_conversation_members FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "conversation_members_delete_own"
    ON lcb_conversation_members FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- 16. lcb_messages policies
-- ============================================================================
CREATE POLICY "messages_select_member"
    ON lcb_messages FOR SELECT
    USING (lcb_is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "messages_insert_member"
    ON lcb_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND lcb_is_conversation_member(conversation_id, auth.uid())
    );

-- ============================================================================
-- 17. lcb_notifications policies
-- ============================================================================
CREATE POLICY "notifications_select_own"
    ON lcb_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
    ON lcb_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_service_role"
    ON lcb_notifications FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR auth.role() = 'service_role'
    );
