import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY not found in .env');
  process.exit(1);
}

async function updateSchema() {
  try {
    console.log('Fetching schema from Supabase...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }

    let schemaText = await response.text();

    // Post-processing to reflect the "completed" migration if the API is stale
    console.log('Patching schema to reflect Buildings migration...');

    // Replace table names in paths and definitions with strict boundaries

    // Paths: "/films" -> "/buildings"
    // We match "/films": or "/films/{id}": etc.
    // Safest is to replace "/films with "/buildings
    schemaText = schemaText.replace(/\/films/g, '/buildings');

    // Paths: "/log" -> "/user_buildings"
    // Must avoid matching "/login_logs".
    // "/log" followed by quote or /?
    // In OpenAPI paths, it's "/log": { ... } or "/log/{id}": { ... }
    // So look for "/log" followed by quote or / or ? (query params? no, paths are keys)
    // Actually, in paths key, it's strictly the path string.
    // Replace "/log" with "/user_buildings" BUT check next char?
    // Or, simpler: replace "/log" with "/user_buildings" but NOT "/login".
    // We can use lookahead? JS regex supports it.
    // schemaText = schemaText.replace(/\/log(?![i])/g, '/user_buildings');
    // "/log" (end of string) or "/log/" (subresource).
    // "/login" starts with "/log" then "i".
    schemaText = schemaText.replace(/\/log([\"\/])/g, '/user_buildings$1');

    // Definitions: "films": { -> "buildings": {
    schemaText = schemaText.replace(/"films": \{/g, '"buildings": {');
    // Definitions: "log": { -> "user_buildings": {
    // Avoid "login_logs"
    schemaText = schemaText.replace(/"log": \{/g, '"user_buildings": {');

    // Refs: "#/definitions/films" -> "#/definitions/buildings"
    schemaText = schemaText.replace(/#\/definitions\/films"/g, '#/definitions/buildings"');
    // Refs: "#/definitions/log" -> "#/definitions/user_buildings"
    // Avoid "#/definitions/login_logs"
    schemaText = schemaText.replace(/#\/definitions\/log"/g, '#/definitions/user_buildings"');

    // Foreign keys: film_id -> building_id
    schemaText = schemaText.replace(/"film_id"/g, '"building_id"');
    // Also rowFilters like rowFilter.films.film_id ?
    schemaText = schemaText.replace(/\.film_id"/g, '.building_id"');

    // Foreign keys: <fk table='films' -> <fk table='buildings'
    schemaText = schemaText.replace(/fk table='films'/g, "fk table='buildings'");
    schemaText = schemaText.replace(/fk table='log'/g, "fk table='user_buildings'");

    // Columns
    // poster_path -> image_url
    schemaText = schemaText.replace(/"poster_path"/g, '"image_url"');

    // Session Films -> Session Buildings
    schemaText = schemaText.replace(/\/session_films/g, '/session_buildings');
    schemaText = schemaText.replace(/"session_films": \{/g, '"session_buildings": {');
    schemaText = schemaText.replace(/#\/definitions\/session_films"/g, '#/definitions/session_buildings"');

    // Row filters & Body params
    // rowFilter.films -> rowFilter.buildings
    schemaText = schemaText.replace(/rowFilter\.films\./g, 'rowFilter.buildings.');
    // body.films -> body.buildings
    schemaText = schemaText.replace(/body\.films"/g, 'body.buildings"');

    // rowFilter.log -> rowFilter.user_buildings
    // Avoid rowFilter.login_logs
    schemaText = schemaText.replace(/rowFilter\.log\./g, 'rowFilter.user_buildings.');
    // body.log -> body.user_buildings
    // Avoid body.login_logs
    schemaText = schemaText.replace(/body\.log"/g, 'body.user_buildings"');

    // rowFilter.session_films -> rowFilter.session_buildings
    schemaText = schemaText.replace(/rowFilter\.session_films\./g, 'rowFilter.session_buildings.');
    // body.session_films -> body.session_buildings
    schemaText = schemaText.replace(/body\.session_films"/g, 'body.session_buildings"');

    const schema = JSON.parse(schemaText);
    const schemaPath = path.resolve(process.cwd(), 'schema.json');

    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log(`Schema successfully updated and patched at ${schemaPath}`);
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();
// Forced update for git tracking
