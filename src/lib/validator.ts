import { OrderRecord, ValidationError, FieldKey } from './types';
import { FIELD_DEFS } from './field-mapper';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const TEMP_ZONES = ['常温', '冷藏', '冷冻'];

export function validateAll(data: OrderRecord[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    for (const def of FIELD_DEFS) {
      const value = row[def.key];
      const label = def.label;

      if (def.required && (!value || !String(value).trim())) {
        errors.push({ row: rowNum, field: def.key, label, message: `第 ${rowNum} 行，${label}：必填字段不能为空` });
        continue;
      }

      if (!value || !String(value).trim()) continue;

      const str = String(value).trim();

      if (def.key === 'sender_phone' || def.key === 'receiver_phone') {
        if (!PHONE_REGEX.test(str)) {
          errors.push({ row: rowNum, field: def.key, label, message: `第 ${rowNum} 行，${label}：格式错误（应为11位手机号）` });
        }
      }

      if (def.key === 'weight') {
        const num = Number(str);
        if (isNaN(num) || num <= 0) {
          errors.push({ row: rowNum, field: def.key, label, message: `第 ${rowNum} 行，${label}：必须为正数` });
        }
      }

      if (def.key === 'quantity') {
        const num = Number(str);
        if (!Number.isInteger(num) || num <= 0) {
          errors.push({ row: rowNum, field: def.key, label, message: `第 ${rowNum} 行，${label}：必须为正整数` });
        }
      }

      if (def.key === 'temp_zone') {
        if (!TEMP_ZONES.includes(str)) {
          errors.push({ row: rowNum, field: def.key, label, message: `第 ${rowNum} 行，${label}：必须为常温/冷藏/冷冻之一` });
        }
      }
    }
  }

  return errors;
}

export function findDuplicateExternalCodes(
  data: OrderRecord[],
  existingCodes: Set<string> = new Set()
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < data.length; i++) {
    const code = data[i].external_code?.trim();
    if (!code) continue;

    // Check against existing database records
    if (existingCodes.has(code)) {
      errors.push({
        row: i + 1,
        field: 'external_code',
        label: '外部编码',
        message: `第 ${i + 1} 行，外部编码：与数据库中已存在的记录重复 (${code})`,
      });
    } else if (seen.has(code)) {
      // Check within current batch
      const firstRow = seen.get(code)!;
      errors.push({
        row: i + 1,
        field: 'external_code',
        label: '外部编码',
        message: `第 ${i + 1} 行，外部编码：与第 ${firstRow} 行重复 (${code})`,
      });
    } else {
      seen.set(code, i + 1);
    }
  }

  return errors;
}

export function validateRow(row: OrderRecord, rowNum: number): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const def of FIELD_DEFS) {
    const value = row[def.key];
    const label = def.label;

    if (def.required && (!value || !String(value).trim())) {
      errors.push({ row: rowNum, field: def.key, label, message: `${label}：必填字段不能为空` });
      continue;
    }

    if (!value || !String(value).trim()) continue;
    const str = String(value).trim();

    if (def.key === 'sender_phone' || def.key === 'receiver_phone') {
      if (!PHONE_REGEX.test(str)) {
        errors.push({ row: rowNum, field: def.key, label, message: `${label}：格式错误` });
      }
    }

    if (def.key === 'weight') {
      const num = Number(str);
      if (isNaN(num) || num <= 0) {
        errors.push({ row: rowNum, field: def.key, label, message: `${label}：必须为正数` });
      }
    }

    if (def.key === 'quantity') {
      const num = Number(str);
      if (!Number.isInteger(num) || num <= 0) {
        errors.push({ row: rowNum, field: def.key, label, message: `${label}：必须为正整数` });
      }
    }

    if (def.key === 'temp_zone') {
      if (!['常温', '冷藏', '冷冻'].includes(str)) {
        errors.push({ row: rowNum, field: def.key, label, message: `${label}：必须为常温/冷藏/冷冻之一` });
      }
    }
  }

  return errors;
}

export function getErrorMap(errors: ValidationError[]): Map<string, ValidationError[]> {
  const map = new Map<string, ValidationError[]>();
  for (const e of errors) {
    const key = `${e.row}-${e.field}`;
    const list = map.get(key) || [];
    list.push(e);
    map.set(key, list);
  }
  return map;
}
