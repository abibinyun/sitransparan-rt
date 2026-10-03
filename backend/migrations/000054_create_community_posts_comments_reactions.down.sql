-- Migration: 000054_create_community_posts_comments_reactions.down.sql
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
            DROP TABLE IF EXISTS %I.community_reactions CASCADE;
            DROP TABLE IF EXISTS %I.community_comments CASCADE;
            DROP TABLE IF EXISTS %I.community_posts CASCADE;
        ', schema_record.schema_name, schema_record.schema_name, schema_record.schema_name);
    END LOOP;
END $$;
