// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { buildClusterAttribution } from "./getFeedClusters";
import type { ClusterActor, ClusterBuilding, ClusterLocality } from "@/types/feedItem";

const building: ClusterBuilding = {
  kind: "building",
  buildingId: "b1",
  buildingName: "Casa da Música",
  city: "Porto",
  mainImageUrl: null,
  communityPreviewUrl: null,
  slug: null,
  shortId: null,
};

const locality: ClusterLocality = {
  kind: "locality",
  localityId: "loc-1",
  city: "Lisbon",
};

function actors(n: number): ClusterActor[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `u${i}`,
    username: `user${i + 1}`,
    avatarUrl: null,
  }));
}

describe("buildClusterAttribution", () => {
  describe("multi_user_locality", () => {
    it("1 actor", () => {
      expect(buildClusterAttribution("multi_user_locality", actors(1), locality)).toBe(
        "user1 visited Lisbon this week",
      );
    });

    it("2 actors", () => {
      expect(buildClusterAttribution("multi_user_locality", actors(2), locality)).toBe(
        "user1 and user2 visited Lisbon this week",
      );
    });

    it("3+ actors uses 'and N others'", () => {
      expect(buildClusterAttribution("multi_user_locality", actors(4), locality)).toBe(
        "user1 and 3 others you follow visited Lisbon this week",
      );
    });

    it("falls back to 'this area' when city is null", () => {
      const noCity: ClusterLocality = { kind: "locality", localityId: "x", city: null };
      expect(buildClusterAttribution("multi_user_locality", actors(1), noCity)).toBe(
        "user1 visited this area this week",
      );
    });
  });

  describe("multi_photo_single_building", () => {
    it("single actor at a building", () => {
      expect(buildClusterAttribution("multi_photo_single_building", actors(1), building)).toBe(
        "user1 posted multiple photos at Casa da Música",
      );
    });
  });

  describe("multi_user_single_building", () => {
    it("1 actor", () => {
      expect(buildClusterAttribution("multi_user_single_building", actors(1), building)).toBe(
        "user1 visited Casa da Música",
      );
    });

    it("2 actors", () => {
      expect(buildClusterAttribution("multi_user_single_building", actors(2), building)).toBe(
        "user1 and user2 both visited Casa da Música",
      );
    });

    it("3+ actors", () => {
      expect(buildClusterAttribution("multi_user_single_building", actors(5), building)).toBe(
        "user1 and 4 others you follow visited Casa da Música",
      );
    });
  });
});
