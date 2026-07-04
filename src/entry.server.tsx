import "./entry-server-localstorage-shim";
// Reference the React Router SSR packages so Vercel's Node file tracer bundles
// them (they were previously imported via hardcoded ../node_modules/*.mjs paths;
// under Vite 7 those explicit paths resolved to a SECOND react-router instance,
// giving <Links>/<Meta> an empty FrameworkContext and breaking SSR — "You must
// render this element inside a <HydratedRouter> element"). Bare specifiers keep
// the tracing intent while deduping to the single canonical instance the rest of
// the app uses.
import "@react-router/node";
import "react-router";
import { handleRequest } from "@vercel/react-router/entry.server";

export default handleRequest;
