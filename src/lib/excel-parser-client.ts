import * as XLSX from 'xlsx';
import { autoMapColumns, mapRowToOrder, generateFingerprint, matchField } from './field-mapper';
import { OrderRecord, ParsedResult } from './types';

export interface ParseProgress {
  phase: string;
  percent: number;
  current: number;
  total: number;
}

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

export function parseExcelWithProgress(
  buffer: ArrayBuffer,
  onProgress?: (progress: ParseProgress) => void
): ParsedResult {
  onProgress?.({ phase: '读取文件', percent: 5, current: 0, total: 0 });

  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames.length) {
    throw new Error('Excel文件中没有找到任何Sheet');
  }

  onProgress?.({ phase: '识别表头', percent: 15, current: 0, total: 0 });

  const { sheet, name: sheetName } = findBestSheet(workbook);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  const allRows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      row.push(cell ? String(cell.v ?? '').trim() : '');
    }
    allRows.push(row);
  }

  const headerRowIndex = findHeaderRowIndex(sheet);
  if (headerRowIndex < 0) {
    const hasAnyContent = allRows.some(row => row.some(cell => cell.trim() !== ''));
    if (!hasAnyContent) {
      throw new Error('Excel文件为空，未找到任何数据');
    }
    throw new Error('无法自动识别表头行，请检查Excel格式或使用手动映射');
  }

  const headers = allRows[headerRowIndex];
  const dataRows = allRows.slice(headerRowIndex + 1);
  const nonEmptyRows = dataRows.filter((row) => row.some((cell) => cell.trim() !== ''));
  const totalRows = nonEmptyRows.length;

  if (totalRows === 0) {
    throw new Error('文件中没有找到有效数据行');
  }

  onProgress?.({ phase: '解析数据', percent: 20, current: 0, total: totalRows });

  const { mapping: autoMapping, unmappedCols } = autoMapColumns(headers);

  const mappedData: OrderRecord[] = [];
  const batchSize = Math.max(1, Math.floor(totalRows / 10));

  for (let i = 0; i < totalRows; i++) {
    const row = nonEmptyRows[i];
    const r = mapRowToOrder(row, autoMapping);
    mappedData.push({
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
    } as OrderRecord);

    if ((i + 1) % batchSize === 0 || i === totalRows - 1) {
      const pct = 20 + Math.floor((i + 1) / totalRows * 75);
      onProgress?.({ phase: '解析数据', percent: Math.min(pct, 95), current: i + 1, total: totalRows });
    }
  }

  const fingerprint = generateFingerprint(headers);

  onProgress?.({ phase: '完成', percent: 100, current: totalRows, total: totalRows });

  return {
    headers,
    rows: nonEmptyRows,
    headerRowIndex,
    sheetName,
    fingerprint,
    autoMapping,
    unmappedCols,
    mappedData,
    totalRows,
  };
}
