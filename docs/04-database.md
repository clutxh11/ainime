## Database

### Core entities
- projects → volumes → chapters (content pages in storage)
- animation_teams, animation_team_members
- animated_chapters (per-team output per chapter)
- team_streams, stream_messages, direct_messages

### RLS
- Drafts visible only to creators; published visible to all
- Team-scoped create/update for animated_chapters and messages

