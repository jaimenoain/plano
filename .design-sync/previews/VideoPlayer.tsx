import { VideoPlayer } from 'plano';

// Static poster stand-in (grey frame + play glyph) — Plano uses flat grey
// placeholders where photography/video isn't yet supplied. The player's live
// controls appear on hover, so the poster is what the card shows statically.
const poster =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>" +
  "<rect width='640' height='360' fill='%23E5E5E5'/>" +
  "<circle cx='320' cy='180' r='34' fill='%23171717'/>" +
  "<path d='M309 162 L345 180 L309 198 Z' fill='%23ffffff'/></svg>";

export const Poster = () => (
  <div style={{ width: 480 }}>
    <VideoPlayer src="" poster={poster} objectFit="cover" />
  </div>
);
