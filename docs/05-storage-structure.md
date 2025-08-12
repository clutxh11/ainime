## Storage structure

### Manga (static pages)

series-assets/

- [project-name]-[project-id]/
  - thumbnails/
    - square.jpg
    - wide.jpg
  - chapters/
    - volume-[num]-[volume-id]/
      - [chapter-name]-[chapter-id]/
        - page-N.jpg

### Animated scenes (editor)

animation-scenes/

- {projectId}/{chapterId}/{sequenceId}/{shotId}/
  - scene/scene-<timestamp>.json (snapshot)
  - assets/frames/{rowId}/{frameIndex}/<filename>

### Final exports (compositions)

animation-compositions/

- {projectId}/{chapterId}/chapter-<version>.mp4
