export interface Coordinates {
  lat: number;
  lng: number;
}

export function parseLocation(location: any): Coordinates | null {
  if (!location) return null;

  // Case 1: GeoJSON Object { type: "Point", coordinates: [lng, lat] }
  if (typeof location === 'object') {
    if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      const lng = Number(location.coordinates[0]);
      const lat = Number(location.coordinates[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { lng, lat };
      }
    }
    // Handle potential nested objects or other structures if necessary, but standard GeoJSON is above.
  }

  // Case 2: String parsing (WKT or WKB Hex)
  if (typeof location === 'string') {
    let text = location;

    // Case 2a: WKB Hex String
    // Basic check: length sufficient (42 chars for standard point) and hex chars only
    // 0101000000... (21 bytes * 2 = 42 chars) or with SRID (25 bytes * 2 = 50 chars)
    if (text.length >= 42 && /^[0-9a-fA-F]+$/.test(text)) {
      try {
        const bytes = text.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16));
        if (bytes) {
          const buffer = new Uint8Array(bytes).buffer;
          const view = new DataView(buffer);

          let offset = 0;
          const byteOrder = view.getUint8(offset); // 0 = Big Endian, 1 = Little Endian
          const littleEndian = byteOrder === 1;
          offset += 1;

          const type = view.getUint32(offset, littleEndian);
          offset += 4;

          // PostGIS EWKB flags
          const wkbPoint = 1;
          const sridFlag = 0x20000000;

          let isPoint = type === wkbPoint;
          let hasSrid = false;

          if ((type & sridFlag) === sridFlag) {
             hasSrid = true;
             // Remove flag to check base type
             if ((type & ~sridFlag) === wkbPoint) {
                 isPoint = true;
             }
          }

          if (isPoint) {
            if (hasSrid) {
                offset += 4; // Skip SRID
            }

            const lng = view.getFloat64(offset, littleEndian);
            offset += 8;
            const lat = view.getFloat64(offset, littleEndian);

            if (!isNaN(lng) && !isNaN(lat)) {
                return { lng, lat };
            }
          }
        }
      } catch (e) {
        // Fallthrough if WKB parsing fails
        console.warn("Failed to parse location as WKB:", e);
      }
    }

    // Case 2b: WKT String "POINT(lng lat)"
    // Strip SRID if present (e.g., "SRID=4326;POINT(...)")
    if (text.includes(';')) {
      text = text.split(';').pop() || '';
    }

    // Trim whitespace
    text = text.trim();

    // Regex to match POINT followed by coordinates in parentheses
    // Matches:
    // POINT
    // optional spaces
    // (
    // optional spaces
    // number
    // separator (space AND/OR comma)
    // number
    // optional spaces
    // )

    // Updated regex to allow comma separator
    const regex = /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:\s+|\s*,\s*)([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)/i;
    const match = text.match(regex);

    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { lng, lat };
      }
    }
  }

  return null;
}
