import "./entry-server-localstorage-shim";
import "../node_modules/@react-router/node/dist/index.mjs";
import "../node_modules/react-router/dist/development/index.mjs";
import { handleRequest } from "@vercel/react-router/entry.server";

export default handleRequest;
