import { describe, expect, it } from "vitest";
import { isDiscoverPath, kibanaPrefix } from "../../../src/kibana/prefix";

describe("kibanaPrefix", () => {
  it("returns everything before /app/", () => {
    expect(kibanaPrefix("/app/discover")).toBe("");
    expect(kibanaPrefix("/kibana/app/discover")).toBe("/kibana");
    expect(kibanaPrefix("/s/team/app/discover")).toBe("/s/team");
    expect(kibanaPrefix("/kibana/s/team/app/discover")).toBe("/kibana/s/team");
  });

  it("returns null outside Kibana apps", () => {
    expect(kibanaPrefix("/login")).toBeNull();
    expect(kibanaPrefix("/")).toBeNull();
  });

  it("starts looking after the environment's base path", () => {
    expect(kibanaPrefix("/app/kibana/app/discover", "/app/kibana")).toBe("/app/kibana");
    expect(kibanaPrefix("/app/kibana/s/team/app/discover", "/app/kibana")).toBe("/app/kibana/s/team");
    expect(kibanaPrefix("/kibana/app/discover", "/kibana")).toBe("/kibana");
    expect(kibanaPrefix("/other/app/discover", "/kibana")).toBeNull();
  });
});

describe("isDiscoverPath", () => {
  it("detects Discover under the given prefix", () => {
    expect(isDiscoverPath("/app/discover", "")).toBe(true);
    expect(isDiscoverPath("/kibana/s/team/app/discover", "/kibana/s/team")).toBe(true);
    expect(isDiscoverPath("/app/kibana/app/discover", "/app/kibana")).toBe(true);
    expect(isDiscoverPath("/app/dashboards", "")).toBe(false);
    expect(isDiscoverPath("/app/kibana/app/dashboards", "/app/kibana")).toBe(false);
  });
});
