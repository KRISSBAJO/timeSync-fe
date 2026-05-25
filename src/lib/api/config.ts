export const API_VERSION_PREFIX = "/api/v1";

export function getBackendBaseUrl() {
  return (
    process.env.TIMESYNC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_TIMESYNC_API_BASE_URL ??
    "http://localhost:4040"
  ).replace(/\/$/, "");
}

export function backendUrl(path: string, search?: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith(API_VERSION_PREFIX)
    ? normalizedPath
    : `${API_VERSION_PREFIX}${normalizedPath}`;
  const url = new URL(`${getBackendBaseUrl()}${versionedPath}`);

  if (search) {
    url.search = search.startsWith("?") ? search.slice(1) : search;
  }

  return url;
}
