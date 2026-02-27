-- ============================================================================
-- LCBconnect - Storage Buckets and Policies
-- ============================================================================

-- ============================================================================
-- Create Storage Buckets
-- ============================================================================

-- 1. lcb-avatars - Public bucket for profile avatars (2MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lcb-avatars',
    'lcb-avatars',
    true,
    2097152,  -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- 2. lcb-photos - Public bucket for post/service photos (10MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lcb-photos',
    'lcb-photos',
    true,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- 3. lcb-documents - Private bucket for association documents (50MB, PDF only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lcb-documents',
    'lcb-documents',
    false,
    52428800,  -- 50MB
    ARRAY['application/pdf']
);

-- 4. lcb-attachments - Private bucket for message attachments (10MB, any type)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lcb-attachments',
    'lcb-attachments',
    false,
    10485760,  -- 10MB
    NULL  -- any mime type
);

-- ============================================================================
-- Storage RLS Policies - lcb-avatars
-- ============================================================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'lcb-avatars');

-- Approved users can upload their own avatar (folder = user id)
CREATE POLICY "avatars_insert_own"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'lcb-avatars'
        AND lcb_is_approved(auth.uid())
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own avatar
CREATE POLICY "avatars_update_own"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'lcb-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own avatar
CREATE POLICY "avatars_delete_own"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'lcb-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- Storage RLS Policies - lcb-photos
-- ============================================================================

-- Anyone can view photos (public bucket)
CREATE POLICY "photos_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'lcb-photos');

-- Approved users can upload photos (folder = user id)
CREATE POLICY "photos_insert_approved"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'lcb-photos'
        AND lcb_is_approved(auth.uid())
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own photos
CREATE POLICY "photos_update_own"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'lcb-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own photos
CREATE POLICY "photos_delete_own"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'lcb-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- Storage RLS Policies - lcb-documents
-- ============================================================================

-- Approved users can read documents
CREATE POLICY "documents_select_approved"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'lcb-documents'
        AND lcb_is_approved(auth.uid())
    );

-- CA/Bureau can upload documents
CREATE POLICY "documents_insert_ca_bureau"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'lcb-documents'
        AND lcb_is_ca_or_bureau(auth.uid())
    );

-- CA/Bureau can update documents
CREATE POLICY "documents_update_ca_bureau"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'lcb-documents'
        AND lcb_is_ca_or_bureau(auth.uid())
    );

-- CA/Bureau can delete documents
CREATE POLICY "documents_delete_ca_bureau"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'lcb-documents'
        AND lcb_is_ca_or_bureau(auth.uid())
    );

-- ============================================================================
-- Storage RLS Policies - lcb-attachments
-- ============================================================================

-- Approved users can read attachments (conversation-level access is handled at app level)
CREATE POLICY "attachments_select_approved"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'lcb-attachments'
        AND lcb_is_approved(auth.uid())
    );

-- Approved users can upload attachments (folder = user id)
CREATE POLICY "attachments_insert_approved"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'lcb-attachments'
        AND lcb_is_approved(auth.uid())
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own attachments
CREATE POLICY "attachments_update_own"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'lcb-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own attachments
CREATE POLICY "attachments_delete_own"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'lcb-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
