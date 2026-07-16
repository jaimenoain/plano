import { describe, it, expect } from "vitest";
import { formatCoordinates, parseLocation } from "./location";

// Characterization tests: lock in the CURRENT behavior of parseLocation,
// which accepts GeoJSON objects, WKT strings, and PostGIS WKB hex strings.

describe("parseLocation", () => {
  describe("falsy / invalid input", () => {
    it("returns null for null, undefined and empty string", () => {
      expect(parseLocation(null)).toBeNull();
      expect(parseLocation(undefined)).toBeNull();
      expect(parseLocation("")).toBeNull();
    });

    it("returns null for unrelated strings", () => {
      expect(parseLocation("not a location")).toBeNull();
    });

    it("returns null for a GeoJSON object with non-numeric coordinates", () => {
      expect(parseLocation({ type: "Point", coordinates: ["a", "b"] })).toBeNull();
    });

    it("returns null for a GeoJSON object with fewer than two coordinates", () => {
      expect(parseLocation({ type: "Point", coordinates: [1] })).toBeNull();
    });
  });

  describe("GeoJSON objects", () => {
    it("parses { coordinates: [lng, lat] } into { lng, lat }", () => {
      expect(
        parseLocation({ type: "Point", coordinates: [-0.1278, 51.5074] }),
      ).toEqual({ lng: -0.1278, lat: 51.5074 });
    });

    it("coerces numeric strings in coordinates", () => {
      expect(
        parseLocation({ coordinates: ["-0.1278", "51.5074"] }),
      ).toEqual({ lng: -0.1278, lat: 51.5074 });
    });
  });

  describe("WKT strings", () => {
    it('parses "POINT(lng lat)" with a space separator', () => {
      expect(parseLocation("POINT(-0.1278 51.5074)")).toEqual({
        lng: -0.1278,
        lat: 51.5074,
      });
    });

    it('parses "POINT(lng, lat)" with a comma separator', () => {
      expect(parseLocation("POINT(-0.1278, 51.5074)")).toEqual({
        lng: -0.1278,
        lat: 51.5074,
      });
    });

    it("strips a leading SRID prefix before parsing", () => {
      expect(parseLocation("SRID=4326;POINT(-0.1278 51.5074)")).toEqual({
        lng: -0.1278,
        lat: 51.5074,
      });
    });

    it("is case-insensitive on the POINT keyword", () => {
      expect(parseLocation("point(2 3)")).toEqual({ lng: 2, lat: 3 });
    });
  });

  describe("WKB hex strings", () => {
    // Build a little-endian PostGIS WKB point the same way parseLocation reads it,
    // so the round-trip is self-consistent rather than a hand-typed literal.
    function wkbPointHex(lng: number, lat: number): string {
      const buffer = new ArrayBuffer(21);
      const view = new DataView(buffer);
      view.setUint8(0, 1); // little endian
      view.setUint32(1, 1, true); // type = Point
      view.setFloat64(5, lng, true);
      view.setFloat64(13, lat, true);
      return [...new Uint8Array(buffer)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    it("parses a little-endian WKB point", () => {
      const result = parseLocation(wkbPointHex(-0.1278, 51.5074));
      expect(result).not.toBeNull();
      expect(result!.lng).toBeCloseTo(-0.1278, 10);
      expect(result!.lat).toBeCloseTo(51.5074, 10);
    });
  });
});

describe("formatCoordinates", () => {
  it("formats north-east coordinates", () => {
    expect(formatCoordinates({ lat: 48.9244, lng: 2.028 })).toBe("48.92 N · 2.03 E");
  });

  it("formats south-west coordinates with absolute figures", () => {
    expect(formatCoordinates({ lat: -33.8568, lng: -70.6483 })).toBe("33.86 S · 70.65 W");
  });

  it("treats the equator and prime meridian as N/E", () => {
    expect(formatCoordinates({ lat: 0, lng: 0 })).toBe("0.00 N · 0.00 E");
  });
});
