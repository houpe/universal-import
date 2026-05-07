import * as XLSX from 'xlsx';
import { autoMapColumns, mapRowToOrder, generateFingerprint, matchField } from './field-mapper';
import { OrderRecord, ParsedResult } from './types';

function findBestSheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; name: string } {
  const skipPatterns = ['说明', '填写', 'instruction', 'readme', '帮助'];

  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (skipPatterns.some((p) => lower.includes(p))) continue;
    const sheet = workbook.Sheets[name];
    if (sheet['!ref']) return { sheet, name };
  }

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet['!ref']) return { sheet, name };
  }

  const firstName = workbook.SheetNames[0];
  return { sheet: workbook.Sheets[firstName], name: firstName };
}

function findHeaderRowIndex(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let bestRow = -1;
  let bestScore = 0;

  for (let r = range.s.r; r <= Math.min(range.s.r + 9, range.e.r); r++) {
    let nonEmpty = 0;
    let matchCount = 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      const value = cell ? String(cell.v ?? '').trim() : '';
      if (value) {
        nonEmpty++;
        if (matchField(value)) matchCount++;
      }
    }

    if (nonEmpty < 3) continue;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestRow = r;
    }
  }

  return bestRow;
}

function getSheetRows(sheet: XLSX.WorkSheet): string[][] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows: string[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      row.push(cell ? String(cell.v ?? '').trim() : '');
    }
    rows.push(row);
  }

  return rows;
}

export function parseExcel(buffer: ArrayBuffer): ParsedResult {
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames.length) {
    throw new Error('Excel文件中没有找到任何Sheet');
  }

  const { sheet, name: sheetName } = findBestSheet(workbook);
  const allRows = getSheetRows(sheet);

  const headerRowIndex = findHeaderRowIndex(sheet);
  if (headerRowIndex < 0) {
    throw new Error('无法自动识别表头行，请检查Excel格式或使用手动映射');
  }

  const headers = allRows[headerRowIndex];
  const dataRows = allRows.slice(headerRowIndex + 1);
  const nonEmptyRows = dataRows.filter((row) => row.some((cell) => cell.trim() !== ''));

  const { mapping: autoMapping, unmappedCols } = autoMapColumns(headers);
  const fingerprint = generateFingerprint(headers);

  const mappedData: OrderRecord[] = nonEmptyRows.map((row) => {
    const r = mapRowToOrder(row, autoMapping);
    return {
      external_code: r.external_code || '',
      sender_name: r.sender_name || '',
      sender_phone: r.sender_phone || '',
      sender_address: r.sender_address || '',
      receiver_name: r.receiver_name || '',
      receiver_phone: r.receiver_phone || '',
      receiver_address: r.receiver_address || '',
      weight: r.weight || '',
      quantity: r.quantity || '',
      temp_zone: r.temp_zone || '',
      remark: r.remark || '',
    } as OrderRecord;
  });

  return {
    headers,
    rows: nonEmptyRows,
    headerRowIndex,
    sheetName,
    fingerprint,
    autoMapping,
    unmappedCols,
    mappedData,
    totalRows: mappedData.length,
  };
}
