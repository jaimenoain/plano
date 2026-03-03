export const parseDuration = (text: string): number | null => {
  if (!text || !text.trim()) return null;
  const normalizedText = text.trim().toLowerCase();

  // Try matching purely minutes if it's just a number
  if (/^\d+$/.test(normalizedText)) {
    return parseInt(normalizedText, 10);
  }

  let minutes = 0;
  const hMatch = normalizedText.match(/(\d+)\s*h/);
  const mMatch = normalizedText.match(/(\d+)\s*m/);

  if (hMatch || mMatch) {
    if (hMatch) minutes += parseInt(hMatch[1], 10) * 60;
    if (mMatch) minutes += parseInt(mMatch[1], 10);
    return minutes > 0 ? minutes : null;
  }

  return null;
};

export const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};
