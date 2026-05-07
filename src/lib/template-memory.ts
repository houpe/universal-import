import { FieldKey, SavedTemplateMapping } from './types';
import { normalize } from './field-mapper';

const STORAGE_KEY = 'template_mappings';

function loadAll(): SavedTemplateMapping[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(mappings: SavedTemplateMapping[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

export function saveTemplateMapping(
  fingerprint: string,
  headers: string[],
  mapping: Record<number, FieldKey | null>
) {
  const all = loadAll();
  const columnMappings: Record<string, FieldKey> = {};

  for (const [colIdx, field] of Object.entries(mapping)) {
    if (field && headers[parseInt(colIdx)]) {
      const nh = normalize(headers[parseInt(colIdx)]);
      columnMappings[nh] = field;
    }
  }

  const idx = all.findIndex((m) => m.fingerprint === fingerprint);
  const entry: SavedTemplateMapping = {
    fingerprint,
    columnMappings,
    headers,
    createdAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }

  saveAll(all);
}

export function loadTemplateMapping(
  fingerprint: string
): SavedTemplateMapping | null {
  const all = loadAll();
  return all.find((m) => m.fingerprint === fingerprint) || null;
}

export function applySavedMapping(
  headers: string[],
  saved: SavedTemplateMapping
): Record<number, FieldKey | null> {
  const mapping: Record<number, FieldKey | null> = {};
  const usedFields = new Set<FieldKey>();

  for (let i = 0; i < headers.length; i++) {
    const nh = normalize(headers[i]);
    const field = saved.columnMappings[nh];
    if (field && !usedFields.has(field)) {
      mapping[i] = field;
      usedFields.add(field);
    } else {
      mapping[i] = null;
    }
  }

  return mapping;
}

// Debug: log saved column mappings
export function debugSavedMapping(fingerprint: string): void {
  const saved = loadTemplateMapping(fingerprint);
  if (saved) {
    console.log('[DEBUG] Saved columnMappings:', JSON.stringify(saved.columnMappings));
    console.log('[DEBUG] Saved headers:', JSON.stringify(saved.headers));
  } else {
    console.log('[DEBUG] No saved mapping for fingerprint:', fingerprint);
  }
}
