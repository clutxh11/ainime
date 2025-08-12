## Architecture

- Next.js 13 app router
- Supabase: auth, Postgres (RLS), storage, realtime
- Key tables: projects, volumes, chapters, sequences, shots, storyboards, animation_teams, animation_team_members, team_streams, stream_messages, direct_messages, animated_chapters, ratings, comments
- Storage: series-assets for manga; animation-scenes for editor snapshots/assets; animation-compositions (final exports)
- Versioning: inline document fallback + storage snapshots (`latest_key`, `manifest`)
- Editors share scene shell (mode: storyboard | animate | composite)
