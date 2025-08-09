-- Fix user_profiles_public schema
-- Convert view to table and add proper triggers

-- 1. Drop the existing view
DROP VIEW IF EXISTS user_profiles_public;

-- 2. Create user_profiles_public as a table
CREATE TABLE user_profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR,
    display_name TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create trigger function to automatically sync data
CREATE OR REPLACE FUNCTION sync_user_profiles_public()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_profiles_public (id, email, display_name, bio)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
            NEW.raw_user_meta_data->>'bio'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE user_profiles_public 
        SET 
            email = NEW.email,
            display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
            bio = NEW.raw_user_meta_data->>'bio',
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM user_profiles_public WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create triggers
DROP TRIGGER IF EXISTS sync_user_profiles_public_trigger ON auth.users;
CREATE TRIGGER sync_user_profiles_public_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_profiles_public();

-- 5. Populate existing data
INSERT INTO user_profiles_public (id, email, display_name, bio)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'display_name', email) as display_name,
    raw_user_meta_data->>'bio' as bio
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    updated_at = NOW();

-- 6. Enable RLS
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

-- 8. Drop the old user_profiles table if it exists and is not needed
-- DROP TABLE IF EXISTS user_profiles;

-- 9. Grant necessary permissions
GRANT SELECT ON user_profiles_public TO authenticated;
GRANT UPDATE ON user_profiles_public TO authenticated; 