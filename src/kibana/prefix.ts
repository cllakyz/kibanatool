// Kibana path prefix (base path + space) and Discover detection (spec §6.1).

/**
 * Everything before the first "/app/" after the environment's base path:
 * "", "/kibana", "/s/team", "/kibana/s/team". Null outside Kibana apps.
 */
export function kibanaPrefix(pathname: string, basePath = ""): string | null {
  if (!pathname.startsWith(basePath)) return null;
  const index = pathname.indexOf("/app/", basePath.length);
  return index === -1 ? null : pathname.slice(0, index);
}

export function isDiscoverPath(pathname: string, prefix: string): boolean {
  return pathname.startsWith(`${prefix}/app/discover`);
}
