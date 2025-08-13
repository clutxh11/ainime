// Filename and path helpers for editor storage/export

export function getFileName(url?: string) {
  if (!url) return "";
  try {
    const match = url.match(/([^/]+\.[a-zA-Z0-9]+)(\?|$)/);
    if (match) return match[1];
    return decodeURIComponent(url.split("/").pop() || "");
  } catch {
    return url;
  }
}

export function getFileNameBase(url?: string) {
  if (!url) return "";
  try {
    const match = url.match(/([^/]+)\.[a-zA-Z0-9]+(\?|$)/);
    if (match) return match[1];
    return decodeURIComponent(url.split("/").pop() || "").split(".")[0];
  } catch {
    return url;
  }
}

export function getFileNameBaseFromString(name?: string) {
  if (!name) return "";
  return name.split(".")[0];
}

export function slugifyName(input?: string) {
  if (!input) return "untitled";
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}


