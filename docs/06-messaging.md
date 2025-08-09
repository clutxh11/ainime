## Messaging

### Streams
- team_streams (unique per team)
- stream_messages (realtime, unread counts via client-side aggregate)

### Direct Messages
- direct_messages (realtime; enable publication for realtime)

### Realtime setup
```
alter publication supabase_realtime add table public.stream_messages;
alter publication supabase_realtime add table public.direct_messages;
```

