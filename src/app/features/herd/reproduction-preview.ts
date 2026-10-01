import { validImportDate } from './herd-import';

/** Presentation-only estimate; the API response remains authoritative. */
export function expectedCalvingPreview(serviceOn: string): string | null {
  if (!validImportDate(serviceOn)) return null;
  const date = new Date(`${serviceOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 283);
  return date.toISOString().slice(0, 10);
}
