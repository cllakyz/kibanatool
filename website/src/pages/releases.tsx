import type { ComponentType } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import Translate, { translate } from "@docusaurus/Translate";
import ChangelogMdx from "@site/../CHANGELOG.md";

// An .md import is typed as a bare component; MDX accepts a components prop.
const Changelog = ChangelogMdx as ComponentType<{ components?: Record<string, ComponentType> }>;

export default function Releases() {
  return (
    <Layout title={translate({ id: "releases.title", message: "Releases" })}>
      <main className="container margin-vert--lg">
        <Heading as="h1">
          <Translate id="releases.title">Releases</Translate>
        </Heading>
        <p>
          <Translate id="releases.intro">Every release of the extension, from CHANGELOG.md.</Translate>
        </p>
        <Changelog components={{ h1: () => null }} />
      </main>
    </Layout>
  );
}
