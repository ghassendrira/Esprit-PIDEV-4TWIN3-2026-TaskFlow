export function trimTrailingSlash(url: string): string {
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}