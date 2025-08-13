import { slugifyName } from "./paths";

export function buildProjectChapterParts(projectTitle?: string, projectId?: string, chapterTitle?: string, chapterId?: string) {
  const projectPart = `${slugifyName(projectTitle)}-${projectId || "unknown-project"}`;
  const chapterPart = `${slugifyName(chapterTitle)}-${chapterId || "unknown-chapter"}`;
  return { projectPart, chapterPart };
}

export function buildSequencePart(sequenceCode?: string, sequenceId?: string) {
  return `${slugifyName(sequenceCode)}-${sequenceId || "unknown-seq"}`;
}

export function buildShotPart(shotCode?: string, shotId?: string) {
  return `shot-${slugifyName(shotCode)}-${shotId || "unknown"}`;
}


