-- Function to update user display name
-- This can be used by users to update their display names

-- Create a function to update display name
CREATE OR REPLACE FUNCTION update_user_display_name(new_display_name TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{display_name}',
        to_jsonb(new_display_name)
    )
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_display_name(TEXT) TO authenticated;

-- Example usage:
-- SELECT update_user_display_name('My New Display Name'); 