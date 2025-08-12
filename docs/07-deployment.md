## Deployment

### Env vars

- NEXT_PUBLIC_ENABLE_SCENE_STORAGE=true|false
- SUPABASE_URL, SUPABASE_ANON_KEY

### Scripts

- `npm run dev` – start dev server
- Add DB scripts as needed (migrations, seed)

### Storage

- Buckets: `animation-scenes` (private), `animation-compositions` (private), `series-assets` (public or signed)
- Policies: authenticated read/write for scenes/compositions; public read (signed) for viewer delivery

### Realtime

- Add messaging tables to publication (see messaging doc)
