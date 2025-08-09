-- Safe fix for user_profiles_public schema
-- This version won't break authentication

-- 1. First, let's check if the view exists and drop it safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_profiles_public') THEN
        DROP VIEW user_profiles_public;
    END IF;
END $$;

-- 2. Create user_profiles_public as a table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles_public (
    id UUID PRIMARY KEY,
    email VARCHAR,
    display_name TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_public_id_fkey'
    ) THEN
        ALTER TABLE user_profiles_public 
        ADD CONSTRAINT user_profiles_public_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create a simpler trigger function that won't break auth
CREATE OR REPLACE FUNCTION sync_user_profiles_public()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle INSERT operations for now to avoid breaking auth
    IF TG_OP = 'INSERT' THEN
        BEGIN
            INSERT INTO user_profiles_public (id, email, display_name, bio)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
                COALESCE(NEW.raw_user_meta_data->>'bio', '')
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log the error but don't fail the auth operation
            RAISE WARNING 'Failed to sync user profile: %', SQLERRM;
        END;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_profiles_public_trigger ON auth.users;

-- 6. Create trigger only for INSERT operations
CREATE TRIGGER sync_user_profiles_public_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_profiles_public();

-- 7. Populate existing data safely
INSERT INTO user_profiles_public (id, email, display_name, bio)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'display_name', email) as display_name,
    COALESCE(raw_user_meta_data->>'bio', '') as bio
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles_public)
ON CONFLICT (id) DO NOTHING;

-- 8. Enable RLS
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all public profiles" ON user_profiles_public;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles_public;

-- 10. Create RLS policies
CREATE POLICY "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

-- 11. Grant necessary permissions
GRANT SELECT ON user_profiles_public TO authenticated;
GRANT UPDATE ON user_profiles_public TO authenticated; 