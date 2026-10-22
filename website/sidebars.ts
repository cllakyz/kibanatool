import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const cat = (label: string, group: string, pages: string[]) => ({
  type: "category" as const,
  label,
  collapsed: false,
  items: pages.map((p) => `${group}/${p}`),
});

const sidebars: SidebarsConfig = {
  docs: [
    cat("Getting started", "getting-started", ["introduction", "install", "first-setup"]),
    cat("Configure", "configure", ["environments", "variables", "actions", "placeholders-and-conditions", "example-actions"]),
    cat("Use", "use", [
      "action-bar-and-row-buttons",
      "view-panel",
      "xml-and-form-data",
      "text-view",
      "copy-and-masking",
      "copy-as-curl",
    ]),
    cat("More", "more", ["privacy-and-permissions", "build-from-source"]),
  ],
};
export default sidebars;
