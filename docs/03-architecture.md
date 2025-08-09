## Architecture

- Next.js 13 app router
- Supabase: auth, Postgres (RLS), storage, realtime
- Key tables: projects, volumes, chapters, animation_teams, animation_team_members, team_streams, stream_messages, direct_messages, animated_chapters, ratings, comments
- Storage: series-assets/[project-name]-[project-id]/chapters/... & thumbnails

