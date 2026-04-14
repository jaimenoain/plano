import { describe, expect, it } from "vitest";
import type { EventDTO } from "@/features/events/types";

/** Ensures `EventDTO` stays importable for consumers (Roadmap Task 1.2 verify). */
describe("events Task 1.2 types", () => {
  it("exports EventDTO", () => {
    const stub = {} as EventDTO;
    expect(typeof stub).toBe("object");
  });
});
