-- Migration: 000054_create_community_posts_comments_reactions.up.sql
-- Ruang Warga, Komentar Bertingkat (Threaded), Reaksi Warga, dan Lapak UMKM

DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.community_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL,
                author_name VARCHAR(150) NOT NULL,
                house_number VARCHAR(50),
                post_type VARCHAR(30) NOT NULL DEFAULT ''discussion'',
                category VARCHAR(50) NOT NULL DEFAULT ''general'',
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                price NUMERIC(15, 2),
                contact_phone VARCHAR(50),
                media_urls TEXT[],
                is_solved BOOLEAN NOT NULL DEFAULT FALSE,
                solved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
                is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );

            CREATE INDEX IF NOT EXISTS idx_%s_community_posts_type 
            ON %I.community_posts(post_type, category, created_at DESC) 
            WHERE deleted_at IS NULL;

            CREATE TABLE IF NOT EXISTS %I.community_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID NOT NULL REFERENCES %I.community_posts(id) ON DELETE CASCADE,
                parent_comment_id UUID REFERENCES %I.community_comments(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                author_name VARCHAR(150) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );

            CREATE INDEX IF NOT EXISTS idx_%s_community_comments_post 
            ON %I.community_comments(post_id, created_at ASC) 
            WHERE deleted_at IS NULL;

            CREATE TABLE IF NOT EXISTS %I.community_reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID NOT NULL REFERENCES %I.community_posts(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                reaction_type VARCHAR(30) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (post_id, user_id, reaction_type)
            );

            CREATE INDEX IF NOT EXISTS idx_%s_community_reactions_post 
            ON %I.community_reactions(post_id);
        ', 
        schema_record.schema_name, -- 1. community_posts
        schema_record.schema_name, -- 2. residents
        schema_record.schema_name, -- 3. houses
        schema_record.schema_name, -- 4. index name prefix
        schema_record.schema_name, -- 5. community_posts
        schema_record.schema_name, -- 6. community_comments
        schema_record.schema_name, -- 7. community_posts
        schema_record.schema_name, -- 8. community_comments
        schema_record.schema_name, -- 9. index name prefix
        schema_record.schema_name, -- 10. community_comments
        schema_record.schema_name, -- 11. community_reactions
        schema_record.schema_name, -- 12. community_posts
        schema_record.schema_name, -- 13. index name prefix
        schema_record.schema_name  -- 14. community_reactions
        );
    END LOOP;
END $$;
