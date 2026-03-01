import { buildingSchema } from "../src/lib/validations/building";
import { z } from "zod";

const testSchema = async () => {
  console.log("Testing Building Schema...");
  let passed = 0;
  let failed = 0;

  const assert = async (name: string, input: any, expected: any, shouldSucceed: boolean = true) => {
    const result = await buildingSchema.safeParseAsync(input);

    if (shouldSucceed) {
      if (result.success) {
        // specific check for year if needed
        if (expected !== undefined) {
             // For objects, deep equal check is needed, simple JSON stringify for now
             if (JSON.stringify(result.data.year_completed) === JSON.stringify(expected)) {
                 console.log(`✅ ${name} passed`);
                 passed++;
             } else {
                 console.error(`❌ ${name} failed: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result.data.year_completed)}`);
                 failed++;
             }
        } else {
            console.log(`✅ ${name} passed`);
            passed++;
        }
      } else {
        console.error(`❌ ${name} failed: Expected success, got error`, result.error.format());
        failed++;
      }
    } else {
      if (!result.success) {
        console.log(`✅ ${name} passed (correctly failed)`);
        passed++;
      } else {
        console.error(`❌ ${name} failed: Expected failure, got success`);
        failed++;
      }
    }
  };

  // Base valid data
  const baseData = {
    name: "Test Building",
    architects: ["Arch 1"],
    styles: ["Style 1"],
    description: "Desc",
    main_image_url: null
  };

  // Year tests
  await assert("Valid string year", { ...baseData, year_completed: "1990" }, 1990);
  await assert("Valid number year", { ...baseData, year_completed: 1990 }, 1990);
  await assert("Empty string year", { ...baseData, year_completed: "" }, null);
  await assert("Null year", { ...baseData, year_completed: null }, null);
  await assert("Undefined year (if field missing)", { name: "Test", architects: [], styles: [], description: "" }, null); // Zod preprocess handles undefined?
  // Wait, if key is missing in object passed to parse, val is undefined.
  // My preprocess: if (val === undefined) return null.
  // Then z.number().nullable() accepts null.
  // So missing year -> null.

  await assert("Invalid string (abc)", { ...baseData, year_completed: "abc" }, null);
  // "abc" -> parseInt -> NaN -> preprocess returns null. Valid.

  await assert("Negative year (invalid)", { ...baseData, year_completed: -100 }, undefined, false);
  // -100 -> valid number, but .min(0) fails.

  await assert("Float year (invalid)", { ...baseData, year_completed: 1990.5 }, undefined, false);
  // 1990.5 -> valid number, .int() fails.

  await assert("String float year (valid parse)", { ...baseData, year_completed: "1990.5" }, 1990);
  // "1990.5" -> parseInt -> 1990. Valid.

  // Array tests
  await assert("Architects array", { ...baseData, architects: ["A", "B"] }, undefined);
  await assert("Styles array", { ...baseData, styles: ["S1", "S2"] }, undefined);

  // Required name
  await assert("Missing name", { ...baseData, name: "" }, undefined, false);

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
};

testSchema();
