import type { ReactNode } from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { usePluginData } from "@docusaurus/useGlobalData";
import HeroDemo from "@site/src/components/HeroDemo";
import ScreenshotTabs from "@site/src/components/ScreenshotTabs";
import { STORE_URL, exampleSettingsUrl } from "@site/src/constants";
import styles from "./index.module.css";

interface Release {
  version: string;
  date: string;
  summary: string;
}

function Section({ tint, children }: { tint?: boolean; children: ReactNode }) {
  return (
    <section className={clsx(styles.section, tint && styles.tint)}>
      <div className={styles.wrap}>{children}</div>
    </section>
  );
}

/** A section with its heading in a left column (spec §6.2 "başlık solda"). */
function Split({ tint, title, intro, children }: { tint?: boolean; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <Section tint={tint}>
      <div className={styles.split}>
        <div>
          <h2 className={styles.h2}>{title}</h2>
          {intro && <p className={styles.intro}>{intro}</p>}
        </div>
        <div>{children}</div>
      </div>
    </Section>
  );
}

function Item({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className={styles.h3}>{title}</h3>
      <p className={styles.text}>{children}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  const locale = useDocusaurusContext().i18n.currentLocale;
  const release = usePluginData("kibanatool-changelog") as Release;
  const settingsUrl = exampleSettingsUrl(locale);
  const description = translate({
    id: "home.hero.description",
    message:
      "kibanatool reads the raw fields of the log you open in Discover and turns them into buttons: your admin panel, Jira, Sentry, related logs, a masked copy to share.",
  });
  const addToChrome = (
    <a className={clsx(styles.button, styles.primary)} href={STORE_URL}>
      <Translate id="home.hero.addToChrome">Add to Chrome</Translate>
    </a>
  );

  return (
    <Layout description={description}>
      <main>
        <section className={styles.hero}>
          <div className={clsx(styles.wrap, styles.heroGrid)}>
            <div>
              <h1 className={styles.title}>
                <Translate id="home.hero.title">One-click actions for the log you open in Kibana</Translate>
              </h1>
              <p className={styles.lead}>{description}</p>
              <div className={styles.buttons}>
                {addToChrome}
                <Link className={clsx(styles.button, styles.secondary)} to="/docs/getting-started/introduction">
                  <Translate id="home.hero.docs">Read the docs</Translate>
                </Link>
              </div>
              <p className={styles.support}>
                <Translate id="home.hero.support">Kibana 7.17, 8.x and 9.x. Free and open source.</Translate>
              </p>
            </div>
            <HeroDemo />
          </div>
        </section>

        <Section tint>
          <h2 className={styles.h2}>
            <Translate id="home.shots.title">See it in Kibana</Translate>
          </h2>
          <p className={styles.intro}>
            <Translate id="home.shots.intro">Kibana 9.5 with synthetic logs. The same buttons work on 7.17 and 8.x.</Translate>
          </p>
          <div className={styles.shots}>
            <ScreenshotTabs />
          </div>
        </Section>

        <Split
          title={<Translate id="home.adds.title">What it adds to Discover</Translate>}
          intro={
            <Translate id="home.adds.intro">
              Everything is built from the log's raw fields, read from your Kibana, never from what the screen shows.
            </Translate>
          }
        >
          <div className={styles.grid}>
            <Item title={<Translate id="home.adds.links.title">Links to your other tools</Translate>}>
              <Translate id="home.adds.links.text" values={{ placeholder: <code>{"{user_id}"}</code> }}>
                {"Open your admin panel, Sentry or Jira with a value from the log, like {placeholder}."}
              </Translate>
            </Item>
            <Item title={<Translate id="home.adds.related.title">Related logs</Translate>}>
              <Translate id="home.adds.related.text">
                The same user's logs, every log ±5 minutes around this one, or the same query in another data view.
              </Translate>
            </Item>
            <Item title={<Translate id="home.adds.rows.title">Buttons on result rows</Translate>}>
              <Translate id="home.adds.rows.text">Point at a row and click, without opening the log.</Translate>
            </Item>
            <Item title={<Translate id="home.adds.bodies.title">Readable request bodies</Translate>}>
              <Translate id="home.adds.bodies.text">
                JSON, XML and form text as a searchable tree. Stack traces and console output with their line breaks.
              </Translate>
            </Item>
            <Item title={<Translate id="home.adds.copies.title">Copies that are safe to share</Translate>}>
              <Translate id="home.adds.copies.text">
                Markdown, JSON or cURL, with passwords, tokens, IBANs and card numbers masked.
              </Translate>
            </Item>
            <Item title={<Translate id="home.adds.env.title">One setup for every Kibana</Translate>}>
              <Translate id="home.adds.env.text" values={{ placeholder: <code>{"{env.adminUrl}"}</code> }}>
                {"Variables like {placeholder} take each environment's own value."}
              </Translate>
            </Item>
          </div>
        </Split>

        <Section tint>
          <h2 className={styles.h2}>
            <Translate id="home.how.title">How it works</Translate>
          </h2>
          <ol className={styles.how}>
            <li>
              <Item title={<Translate id="home.how.step1.title">Add your Kibana</Translate>}>
                <Translate id="home.how.step1.text">
                  Enter its address on the options page. Chrome asks for access to that site only; kibanatool runs
                  nowhere else.
                </Translate>
              </Item>
            </li>
            <li>
              <Item title={<Translate id="home.how.step2.title">Describe your actions</Translate>}>
                <Translate
                  id="home.how.step2.text"
                  values={{ template: <code>{"{env.adminUrl}/users/{user_id}"}</code> }}
                >
                  {"A label and a template, such as {template}. Or import the example settings and edit them."}
                </Translate>
              </Item>
            </li>
            <li>
              <Item title={<Translate id="home.how.step3.title">Open a log</Translate>}>
                <Translate id="home.how.step3.text">
                  kibanatool reads the log's raw fields through Kibana's own API, with your session, and builds the
                  buttons.
                </Translate>
              </Item>
            </li>
          </ol>
        </Section>

        <Split title={<Translate id="home.privacy.title">Your logs stay in your Kibana</Translate>}>
          <div className={styles.grid}>
            <Item title={<Translate id="home.privacy.local.title">No data leaves your browser</Translate>}>
              <Translate id="home.privacy.local.text">
                No telemetry, no third-party service. It talks only to the Kibana addresses you add.
              </Translate>
            </Item>
            <Item title={<Translate id="home.privacy.settings.title">Settings stay on this device</Translate>}>
              <Translate id="home.privacy.settings.text">
                Kept in Chrome's local storage. Export them to a file to share with your team.
              </Translate>
            </Item>
            <Item title={<Translate id="home.privacy.access.title">Access one site at a time</Translate>}>
              <Translate id="home.privacy.access.text">
                No access to any site until you add it, and you can remove it any time.
              </Translate>
            </Item>
            <Item title={<Translate id="home.privacy.source.title">Open source</Translate>}>
              <Translate id="home.privacy.source.text">MIT licensed. Read every line on GitHub.</Translate>
            </Item>
          </div>
          <ul className={styles.tags}>
            <li>Kibana 7.17</li>
            <li>Kibana 8.x</li>
            <li>Kibana 9.x</li>
          </ul>
        </Split>

        <Split
          tint
          title={<Translate id="home.install.title">Install</Translate>}
          intro={<Translate id="home.install.intro">Two minutes, with the example settings.</Translate>}
        >
          <ol className={styles.steps}>
            <li>
              <h3 className={styles.h3}>
                <Translate id="home.install.step1.title">Add kibanatool from the Chrome Web Store</Translate>
              </h3>
              <div className={styles.buttons}>{addToChrome}</div>
            </li>
            <li>
              <Item title={<Translate id="home.install.step2.title">Import the example actions</Translate>}>
                <Translate
                  id="home.install.step2.text"
                  values={{
                    file: (
                      <a href={settingsUrl}>
                        <code>{settingsUrl.slice(settingsUrl.lastIndexOf("/") + 1)}</code>
                      </a>
                    ),
                  }}
                >
                  {"Click the toolbar icon to open the options. Under Export and import, load {file}."}
                </Translate>
              </Item>
            </li>
            <li>
              <Item title={<Translate id="home.install.step3.title">Point it at your Kibana</Translate>}>
                <Translate id="home.install.step3.text">
                  On Environments, change the example address to your Kibana's and click Grant access. Under
                  Variables, put in your own admin and Jira addresses. Then reload your Kibana tab and open a log.
                </Translate>
              </Item>
            </li>
          </ol>
          <p className={styles.text}>
            <Translate id="home.install.buildYourself">Prefer to build it yourself?</Translate>{" "}
            <Link to="/docs/more/build-from-source">
              <Translate id="home.install.buildFromSource">Build from source</Translate>
            </Link>
          </p>
        </Split>

        <Split title={<Translate id="home.releases.title">Releases</Translate>}>
          <div className={styles.release}>
            <div className={styles.releaseHead}>
              <h3 className={styles.version}>{release.version}</h3>
              <time className={styles.date} dateTime={release.date}>
                {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(release.date))}
              </time>
              <Link className={styles.allReleases} to="/releases">
                <Translate id="home.releases.all">All releases</Translate>
              </Link>
            </div>
            {release.summary && <p className={styles.text}>{release.summary}</p>}
          </div>
        </Split>
      </main>
    </Layout>
  );
}
