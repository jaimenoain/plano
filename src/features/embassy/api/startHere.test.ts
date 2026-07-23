import { describe, expect, it } from "vitest";
import { rankStartHereTasks, type StartHereTask, type StartHereToolKey } from "./startHere";

function task(toolKey: StartHereToolKey, backlogCount = 1): StartHereTask {
  return {
    id: `${toolKey}:x`,
    toolKey,
    title: `${toolKey} item`,
    context: "do the thing",
    href: `/embassy/contribute?tool=${toolKey}`,
    backlogCount,
  };
}

const keysOf = (tasks: StartHereTask[]) => tasks.map((t) => t.toolKey);

describe("rankStartHereTasks", () => {
  it("orders tasks by the ambassador's saved tool preference", () => {
    const candidates = [task("events"), task("research"), task("photography")];
    const ranked = rankStartHereTasks(candidates, ["photography", "events", "research"]);
    expect(keysOf(ranked)).toEqual(["photography", "events", "research"]);
  });

  it("sorts tools not in the preference list after preferred ones", () => {
    const candidates = [task("outreach"), task("research"), task("curation")];
    const ranked = rankStartHereTasks(candidates, ["research"]);
    expect(keysOf(ranked)[0]).toBe("research");
    // outreach and curation are unlisted → they follow, in stable input order
    expect(keysOf(ranked).slice(1)).toEqual(["outreach", "curation"]);
  });

  it("honors the legacy 'moderation' → 'curation' mapping when ranking", () => {
    const candidates = [task("research"), task("curation")];
    const ranked = rankStartHereTasks(candidates, ["moderation", "research"]);
    expect(keysOf(ranked)).toEqual(["curation", "research"]);
  });

  it("breaks preference ties by larger backlog first", () => {
    const candidates = [task("research", 2), task("curation", 9)];
    // neither is in the preference list → both share the same (last) rank,
    // so the tiebreak is backlog size
    const ranked = rankStartHereTasks(candidates, []);
    expect(keysOf(ranked)).toEqual(["curation", "research"]);
  });

  it("falls back to a stable, deterministic order when no preference is saved", () => {
    const candidates = [task("photography", 1), task("events", 1)];
    expect(keysOf(rankStartHereTasks(candidates, null))).toEqual(["photography", "events"]);
    expect(keysOf(rankStartHereTasks(candidates, undefined))).toEqual(["photography", "events"]);
  });

  it("caps the feed at 5 tasks", () => {
    const candidates: StartHereTask[] = [
      task("research"),
      task("curation"),
      task("photography"),
      task("outreach"),
      task("events"),
      task("research", 5),
    ];
    expect(rankStartHereTasks(candidates, []).length).toBe(5);
  });

  it("returns an empty feed when there are no candidates", () => {
    expect(rankStartHereTasks([], ["research"])).toEqual([]);
  });
});
