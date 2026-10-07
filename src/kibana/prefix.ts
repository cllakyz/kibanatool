// Kibana path prefix (base path + space) and Discover detection (spec §6.1).

/** Everything before "/app/": "", "/kibana", "/s/team", "/kibana/s/team". Null outside Kibana apps. */
export function kibanaPrefix(pathname: string): string | null {
  const index = pathname.indexOf("/app/");
  return index === -1 ? null : pathname.slice(0, index);
}

export function isDiscoverPath(pathname: string): boolean {
  const prefix = kibanaPrefix(pathname);
  return prefix !== null && pathname.slice(prefix.length).startsWith("/app/discover");
}
