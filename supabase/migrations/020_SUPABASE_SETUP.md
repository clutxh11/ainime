# Supabase Setup Guide for AI-Nime Platform

This guide will help you set up Supabase for the AI-Nime platform.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. Git repository cloned

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `ai-nime-platform` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. In your project root, edit the `.env.local` file:

   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Replace the placeholder values with your actual Supabase credentials

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to execute the schema

This will create:

- All necessary tables (users, projects, teams, chapters, forum_posts, animation_projects)
- Proper relationships and constraints
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates

## Step 5: Configure Authentication (Optional)

If you want to use Supabase Auth:

1. Go to **Authentication** → **Settings**
2. Configure your authentication providers (Email, Google, GitHub, etc.)
3. Set up email templates if using email authentication
4. Configure redirect URLs for your application

## Step 6: Set Up Storage (Optional)

For file uploads (avatars, project images, etc.):

1. Go to **Storage** in your Supabase dashboard
2. Create buckets:
   - `avatars` - for user profile pictures
   - `project-images` - for project thumbnails
   - `animation-assets` - for animation project files
3. Set up storage policies for each bucket

## Step 7: Test the Connection

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Check the browser console for any connection errors
3. Try creating a test project to verify the database connection

## Step 8: Insert Sample Data (Optional)

You can insert sample data to test the application:

```sql
-- Insert a test user
INSERT INTO users (email, username, role)
VALUES ('test@example.com', 'testuser', 'creator');

-- Insert a test project
INSERT INTO projects (title, description, genre, creator_id)
VALUES (
  'Test Project',
  'A test animation project',
  'Fantasy',
  (SELECT id FROM users WHERE email = 'test@example.com')
);
```

## Troubleshooting

### Common Issues

1. **Connection Errors**:

   - Verify your environment variables are correct
   - Check that your Supabase project is active
   - Ensure your IP is not blocked by Supabase

2. **RLS Policy Errors**:

   - Make sure all RLS policies are properly created
   - Check that the `auth.uid()` function is available

3. **TypeScript Errors**:
   - Run `npm run build` to check for type errors
   - Ensure all database types match your schema

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Discord](https://discord.supabase.com)
- Review the [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## Next Steps

After setting up Supabase:

1. **Implement Authentication**: Add login/signup functionality
2. **Add Real-time Features**: Use Supabase's real-time subscriptions
3. **Set Up File Uploads**: Configure storage for media files
4. **Add Analytics**: Use Supabase's built-in analytics
5. **Deploy**: Deploy your application with the Supabase configuration

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your API keys
- Monitor your Supabase usage and costs
- Set up proper RLS policies for production

## Production Deployment

When deploying to production:

1. Create a production Supabase project
2. Update environment variables for production
3. Set up proper CORS policies
4. Configure production authentication settings
5. Set up monitoring and alerts
