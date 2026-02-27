-- ============================================================================
-- LCBconnect - Schema Definition
-- La Cerise sur le Bateau - Community App
-- All tables use lcb_ prefix (shared Supabase instance)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. lcb_profiles - Extends auth.users
-- ============================================================================
CREATE TABLE lcb_profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email       text,
    full_name   text,
    role        text NOT NULL DEFAULT 'membre' CHECK (role IN ('membre', 'ca', 'bureau')),
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    boat_name   text,
    boat_type   text,
    mooring_port text,
    phone       text,
    bio         text,
    avatar_url  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_profiles_role ON lcb_profiles (role);
CREATE INDEX idx_lcb_profiles_status ON lcb_profiles (status);
CREATE INDEX idx_lcb_profiles_mooring_port ON lcb_profiles (mooring_port);

ALTER TABLE lcb_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. lcb_posts - Community feed posts
-- ============================================================================
CREATE TABLE lcb_posts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id           uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    type                text NOT NULL CHECK (type IN ('standard', 'service', 'plainte', 'officiel_bureau', 'avis_batellerie')),
    title               text,
    content             text NOT NULL,
    photos              text[] DEFAULT '{}',
    is_pinned           boolean NOT NULL DEFAULT false,
    likes_count         int NOT NULL DEFAULT 0,
    comments_count      int NOT NULL DEFAULT 0,
    linked_service_id   uuid,
    linked_complaint_id uuid,
    linked_avis_id      uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_posts_author ON lcb_posts (author_id);
CREATE INDEX idx_lcb_posts_type ON lcb_posts (type);
CREATE INDEX idx_lcb_posts_created_at ON lcb_posts (created_at DESC);
CREATE INDEX idx_lcb_posts_is_pinned ON lcb_posts (is_pinned) WHERE is_pinned = true;

ALTER TABLE lcb_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. lcb_comments - Threaded comments on posts
-- ============================================================================
CREATE TABLE lcb_comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     uuid NOT NULL REFERENCES lcb_posts (id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    parent_id   uuid REFERENCES lcb_comments (id) ON DELETE CASCADE,
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_comments_post ON lcb_comments (post_id);
CREATE INDEX idx_lcb_comments_author ON lcb_comments (author_id);
CREATE INDEX idx_lcb_comments_parent ON lcb_comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_lcb_comments_created_at ON lcb_comments (post_id, created_at);

ALTER TABLE lcb_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. lcb_likes - Post likes (unique per user per post)
-- ============================================================================
CREATE TABLE lcb_likes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     uuid NOT NULL REFERENCES lcb_posts (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX idx_lcb_likes_post ON lcb_likes (post_id);
CREATE INDEX idx_lcb_likes_user ON lcb_likes (user_id);

ALTER TABLE lcb_likes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. lcb_reports - Content reporting
-- ============================================================================
CREATE TABLE lcb_reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    post_id     uuid REFERENCES lcb_posts (id) ON DELETE SET NULL,
    comment_id  uuid REFERENCES lcb_comments (id) ON DELETE SET NULL,
    reason      text NOT NULL,
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    reviewed_by uuid REFERENCES lcb_profiles (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_reports_status ON lcb_reports (status);
CREATE INDEX idx_lcb_reports_reporter ON lcb_reports (reporter_id);
CREATE INDEX idx_lcb_reports_post ON lcb_reports (post_id) WHERE post_id IS NOT NULL;

ALTER TABLE lcb_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. lcb_services - Mutual aid / service exchange
-- ============================================================================
CREATE TABLE lcb_services (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    category    text NOT NULL CHECK (category IN ('mecanique', 'electricite', 'plomberie', 'accastillage', 'navigation', 'autre')),
    title       text NOT NULL,
    description text NOT NULL,
    photos      text[] DEFAULT '{}',
    status      text NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'en_cours', 'resolu')),
    resolved_by uuid REFERENCES lcb_profiles (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_services_author ON lcb_services (author_id);
CREATE INDEX idx_lcb_services_category ON lcb_services (category);
CREATE INDEX idx_lcb_services_status ON lcb_services (status);
CREATE INDEX idx_lcb_services_created_at ON lcb_services (created_at DESC);

ALTER TABLE lcb_services ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. lcb_complaints - Complaints with geolocation
-- ============================================================================
CREATE TABLE lcb_complaints (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text NOT NULL,
    photos          text[] DEFAULT '{}',
    latitude        double precision,
    longitude       double precision,
    location_name   text,
    status          text NOT NULL DEFAULT 'soumise' CHECK (status IN ('soumise', 'en_cours', 'resolue', 'rejetee')),
    priority        text NOT NULL DEFAULT 'normale' CHECK (priority IN ('basse', 'normale', 'haute', 'urgente')),
    assigned_to     uuid REFERENCES lcb_profiles (id) ON DELETE SET NULL,
    history         jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_complaints_author ON lcb_complaints (author_id);
CREATE INDEX idx_lcb_complaints_status ON lcb_complaints (status);
CREATE INDEX idx_lcb_complaints_priority ON lcb_complaints (priority);
CREATE INDEX idx_lcb_complaints_assigned ON lcb_complaints (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_lcb_complaints_created_at ON lcb_complaints (created_at DESC);

ALTER TABLE lcb_complaints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. lcb_avis_batellerie - Navigation notices
-- ============================================================================
CREATE TABLE lcb_avis_batellerie (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    title           text NOT NULL,
    content         text NOT NULL,
    sector          text,
    is_urgent       boolean NOT NULL DEFAULT false,
    weather_data    jsonb,
    valid_until     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_avis_batellerie_author ON lcb_avis_batellerie (author_id);
CREATE INDEX idx_lcb_avis_batellerie_urgent ON lcb_avis_batellerie (is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_lcb_avis_batellerie_valid ON lcb_avis_batellerie (valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX idx_lcb_avis_batellerie_created_at ON lcb_avis_batellerie (created_at DESC);

ALTER TABLE lcb_avis_batellerie ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. lcb_documents - Association documents
-- ============================================================================
CREATE TABLE lcb_documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    category    text NOT NULL CHECK (category IN ('statuts', 'pv_ag', 'pv_ca', 'reglements', 'courriers', 'divers')),
    year        int,
    file_url    text NOT NULL,
    file_size   int,
    min_role    text NOT NULL DEFAULT 'membre' CHECK (min_role IN ('membre', 'ca', 'bureau')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_documents_category ON lcb_documents (category);
CREATE INDEX idx_lcb_documents_year ON lcb_documents (year);
CREATE INDEX idx_lcb_documents_min_role ON lcb_documents (min_role);
CREATE INDEX idx_lcb_documents_created_at ON lcb_documents (created_at DESC);

ALTER TABLE lcb_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. lcb_events - Association events
-- ============================================================================
CREATE TABLE lcb_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by          uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    title               text NOT NULL,
    description         text,
    location            text,
    start_date          timestamptz NOT NULL,
    end_date            timestamptz,
    max_participants    int,
    registrations_count int NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_events_start_date ON lcb_events (start_date);
CREATE INDEX idx_lcb_events_created_by ON lcb_events (created_by);
CREATE INDEX idx_lcb_events_upcoming ON lcb_events (start_date);

ALTER TABLE lcb_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. lcb_event_registrations - Event sign-ups
-- ============================================================================
CREATE TABLE lcb_event_registrations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES lcb_events (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_lcb_event_registrations_event ON lcb_event_registrations (event_id);
CREATE INDEX idx_lcb_event_registrations_user ON lcb_event_registrations (user_id);

ALTER TABLE lcb_event_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. lcb_directory - Service/business directory
-- ============================================================================
CREATE TABLE lcb_directory (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by  uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    name        text NOT NULL,
    category    text,
    description text,
    phone       text,
    email       text,
    website     text,
    address     text,
    is_approved boolean NOT NULL DEFAULT false,
    approved_by uuid REFERENCES lcb_profiles (id) ON DELETE SET NULL,
    rating_avg  numeric(2,1) NOT NULL DEFAULT 0,
    rating_count int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_directory_category ON lcb_directory (category);
CREATE INDEX idx_lcb_directory_approved ON lcb_directory (is_approved);
CREATE INDEX idx_lcb_directory_rating ON lcb_directory (rating_avg DESC) WHERE is_approved = true;
CREATE INDEX idx_lcb_directory_name ON lcb_directory (name);

ALTER TABLE lcb_directory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. lcb_directory_reviews - Reviews for directory entries
-- ============================================================================
CREATE TABLE lcb_directory_reviews (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_id    uuid NOT NULL REFERENCES lcb_directory (id) ON DELETE CASCADE,
    author_id       uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    rating          int NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (directory_id, author_id)
);

CREATE INDEX idx_lcb_directory_reviews_directory ON lcb_directory_reviews (directory_id);
CREATE INDEX idx_lcb_directory_reviews_author ON lcb_directory_reviews (author_id);

ALTER TABLE lcb_directory_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 14. lcb_conversations - Messaging conversations
-- ============================================================================
CREATE TABLE lcb_conversations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text,
    is_group    boolean NOT NULL DEFAULT false,
    group_type  text CHECK (group_type IS NULL OR group_type IN ('ca', 'bureau', 'custom')),
    created_by  uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_conversations_created_by ON lcb_conversations (created_by);
CREATE INDEX idx_lcb_conversations_group_type ON lcb_conversations (group_type) WHERE group_type IS NOT NULL;

ALTER TABLE lcb_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 15. lcb_conversation_members - Conversation membership
-- ============================================================================
CREATE TABLE lcb_conversation_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES lcb_conversations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    joined_at       timestamptz NOT NULL DEFAULT now(),
    last_read_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_lcb_conversation_members_conv ON lcb_conversation_members (conversation_id);
CREATE INDEX idx_lcb_conversation_members_user ON lcb_conversation_members (user_id);

ALTER TABLE lcb_conversation_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 16. lcb_messages - Chat messages
-- ============================================================================
CREATE TABLE lcb_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES lcb_conversations (id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    content         text NOT NULL,
    attachments     text[] DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_messages_conversation ON lcb_messages (conversation_id, created_at DESC);
CREATE INDEX idx_lcb_messages_sender ON lcb_messages (sender_id);

ALTER TABLE lcb_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 17. lcb_notifications - User notifications
-- ============================================================================
CREATE TABLE lcb_notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES lcb_profiles (id) ON DELETE CASCADE,
    type        text NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'event', 'service', 'complaint', 'message', 'admin')),
    title       text NOT NULL,
    body        text,
    link        text,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcb_notifications_user ON lcb_notifications (user_id, created_at DESC);
CREATE INDEX idx_lcb_notifications_unread ON lcb_notifications (user_id) WHERE is_read = false;

ALTER TABLE lcb_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Add deferred foreign keys for lcb_posts cross-references
-- ============================================================================
ALTER TABLE lcb_posts
    ADD CONSTRAINT fk_lcb_posts_linked_service
    FOREIGN KEY (linked_service_id) REFERENCES lcb_services (id) ON DELETE SET NULL;

ALTER TABLE lcb_posts
    ADD CONSTRAINT fk_lcb_posts_linked_complaint
    FOREIGN KEY (linked_complaint_id) REFERENCES lcb_complaints (id) ON DELETE SET NULL;

ALTER TABLE lcb_posts
    ADD CONSTRAINT fk_lcb_posts_linked_avis
    FOREIGN KEY (linked_avis_id) REFERENCES lcb_avis_batellerie (id) ON DELETE SET NULL;
