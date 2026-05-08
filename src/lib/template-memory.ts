import { FieldKey, SavedTemplateMapping } from './types';
import { normalize } from './field-mapper';

export async function saveTemplateMapping(
  fingerprint: string,
  headers: string[],
  mapping: Record<number, FieldKey | null>
): Promise<boolean> {
  try {
    const columnMappings: Record<string, FieldKey> = {};

    for (const [colIdx, field] of Object.entries(mapping)) {
      if (field && headers[parseInt(colIdx)]) {
        const nh = normalize(headers[parseInt(colIdx)]);
        columnMappings[nh] = field;
      }
    }

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, headers, columnMappings }),
    });

    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export async function loadTemplateMapping(
  fingerprint: string
): Promise<SavedTemplateMapping | null> {
  try {
    const res = await fetch(`/api/templates?fingerprint=${encodeURIComponent(fingerprint)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      fingerprint: data.fingerprint,
      headers: data.headers,
      columnMappings: data.columnMappings,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function listTemplateMappings(): Promise<SavedTemplateMapping[]> {
  try {
    const res = await fetch('/api/templates');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.templates || []).map((t: Record<string, unknown>) => ({
      fingerprint: t.fingerprint as string,
      headers: t.headers as string[],
      columnMappings: t.columnMappings as Record<string, FieldKey>,
      createdAt: t.createdAt as string,
      updatedAt: t.updatedAt as string,
    }));
  } catch {
    return [];
  }
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

export async function debugSavedMapping(fingerprint: string): Promise<void> {
  const saved = await loadTemplateMapping(fingerprint);
  if (saved) {
    console.log('[DEBUG] Saved columnMappings:', JSON.stringify(saved.columnMappings));
    console.log('[DEBUG] Saved headers:', JSON.stringify(saved.headers));
  } else {
    console.log('[DEBUG] No saved mapping for fingerprint:', fingerprint);
  }
}
