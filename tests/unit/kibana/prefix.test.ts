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
});

describe("isDiscoverPath", () => {
  it("detects Discover under any prefix", () => {
    expect(isDiscoverPath("/app/discover")).toBe(true);
    expect(isDiscoverPath("/kibana/s/team/app/discover")).toBe(true);
    expect(isDiscoverPath("/app/dashboards")).toBe(false);
    expect(isDiscoverPath("/login")).toBe(false);
  });
});
