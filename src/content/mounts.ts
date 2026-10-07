// Keeps exactly one action-bar host next to each open detail view (spec §5.1, §10).
import type { DetailView } from "../adapters/types";

export const HOST_TAG = "kibanatool-bar";

export interface MountHandle {
  render(view: DetailView): void;
  destroy(): void;
}

export interface Mount {
  host: HTMLElement;
  handle: MountHandle;
}

export type MountFactory = (host: HTMLElement) => MountHandle;

export function reconcileMounts(
  views: DetailView[],
  mounts: Map<Element, Mount>,
  createMount: MountFactory,
  doc: Document,
): void {
  const seen = new Set<Element>();
  for (const view of views) {
    seen.add(view.container);
    let mount = mounts.get(view.container);
    if (!mount) {
      const host = doc.createElement(HOST_TAG);
      mount = { host, handle: createMount(host) };
      mounts.set(view.container, mount);
    }
    if (!isPlaced(mount.host, view)) place(mount.host, view);
    mount.handle.render(view);
  }
  for (const [container, mount] of mounts) {
    if (seen.has(container)) continue;
    mount.handle.destroy();
    mount.host.remove();
    mounts.delete(container);
  }
}

function isPlaced(host: Element, view: DetailView): boolean {
  if (!host.isConnected) return false;
  return view.position === "before"
    ? host.nextElementSibling === view.anchor
    : host.previousElementSibling === view.anchor;
}

function place(host: Element, view: DetailView): void {
  if (view.position === "before") view.anchor.before(host);
  else view.anchor.after(host);
}
