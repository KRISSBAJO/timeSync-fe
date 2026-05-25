export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CSRF_TOKEN_COOKIE = "csrf_token";

export function readBrowserCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(encodedName));

  return match ? decodeURIComponent(match.slice(encodedName.length)) : null;
}
