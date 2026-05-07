'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { OrderRecord, FieldKey, ValidationError } from '@/lib/types';
import { FIELD_DEFS, TEMP_ZONE_OPTIONS } from '@/lib/field-mapper';
import { validateRow, getErrorMap } from '@/lib/validator';

interface Props {
  data: OrderRecord[];
  errors: ValidationError[];
  onChange: (data: OrderRecord[]) => void;
}

const EDITABLE_FIELDS: { key: FieldKey; label: string; width: number }[] = [
  { key: 'external_code', label: '外部编码', width: 110 },
  { key: 'sender_name', label: '发件人姓名', width: 90 },
  { key: 'sender_phone', label: '发件人电话', width: 120 },
  { key: 'sender_address', label: '发件人地址', width: 180 },
  { key: 'receiver_name', label: '收件人姓名', width: 90 },
  { key: 'receiver_phone', label: '收件人电话', width: 120 },
  { key: 'receiver_address', label: '收件人地址', width: 180 },
  { key: 'weight', label: '重量(kg)', width: 80 },
  { key: 'quantity', label: '件数', width: 60 },
  { key: 'temp_zone', label: '温层', width: 70 },
  { key: 'remark', label: '备注', width: 120 },
];

const EMPTY_ROW: OrderRecord = {
  external_code: '',
  sender_name: '',
  sender_phone: '',
  sender_address: '',
  receiver_name: '',
  receiver_phone: '',
  receiver_address: '',
  weight: '',
  quantity: '',
  temp_zone: '',
  remark: '',
};

export default function PreviewTable({ data, errors, onChange }: Props) {
  const [editing, setEditing] = useState<{ row: number; field: FieldKey } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const errorMap = useMemo(() => getErrorMap(errors), [errors]);
  const errorRowSet = useMemo(() => {
    const set = new Set<number>();
    errors.forEach((e) => set.add(e.row));
    return set;
  }, [errors]);

  const startEdit = useCallback((row: number, field: FieldKey) => {
    setEditing({ row, field });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback(
    (row: number, field: FieldKey, value: string) => {
      const next = [...data];
      next[row] = { ...next[row], [field]: value };
      onChange(next);
      setEditing(null);
    },
    [data, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, fieldIdx: number) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const nextIdx = e.shiftKey
          ? (fieldIdx - 1 + EDITABLE_FIELDS.length) % EDITABLE_FIELDS.length
          : (fieldIdx + 1) % EDITABLE_FIELDS.length;
        const nextField = EDITABLE_FIELDS[nextIdx].key;
        setEditing({ row, field: nextField });
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape') {
        setEditing(null);
      }
    },
    []
  );

  const addRow = useCallback(() => {
    onChange([...data, { ...EMPTY_ROW }]);
  }, [data, onChange]);

  const deleteRow = useCallback(
    (idx: number) => {
      const next = data.filter((_, i) => i !== idx);
      onChange(next);
    },
    [data, onChange]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: '65vh' }}>
        <table className="w-full border-collapse text-sm" style={{ minWidth: EDITABLE_FIELDS.reduce((a, f) => a + f.width, 0) }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-[#1E293B] to-[#334155] text-white">
              <th className="px-2 py-3 text-center w-12 font-semibold text-xs">#</th>
              {EDITABLE_FIELDS.map((f) => (
                <th
                  key={f.key}
                  className="px-2 py-3 text-left font-semibold text-xs whitespace-nowrap"
                  style={{ width: f.width }}
                >
                  {f.label}
                  {FIELD_DEFS.find((d) => d.key === f.key)?.required && (
                    <span className="text-red-300 ml-0.5">*</span>
                  )}
                </th>
              ))}
              <th className="px-2 py-3 text-center w-14 font-semibold text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-gray-50 transition-colors ${errorRowSet.has(rowIdx + 1) ? 'bg-red-50/30' : ''} hover:bg-[#07BEBF]/10`}
              >
                <td className="px-2 py-1 text-center text-xs text-gray-400">{rowIdx + 1}</td>
                {EDITABLE_FIELDS.map((f, fIdx) => {
                  const errKey = `${rowIdx + 1}-${f.key}`;
                  const cellErrors = errorMap.get(errKey);
                  const hasError = !!cellErrors?.length;
                  const isEditing = editing?.row === rowIdx && editing?.field === f.key;

                  return (
                    <td
                      key={f.key}
                      className={`px-1 py-0.5 ${hasError ? 'bg-red-50' : ''}`}
                      style={{ width: f.width, minWidth: f.width }}
                    >
                      {isEditing ? (
                        f.key === 'temp_zone' ? (
                          <select
                            ref={inputRef as any}
                            value={row[f.key]}
                            className="w-full px-1 py-1 text-sm border border-[#07BEBF]/60 rounded focus:outline-none focus:ring-1 focus:ring-[#07BEBF] bg-white/90 backdrop-blur-sm"
                            onChange={(e) => commitEdit(rowIdx, f.key, e.target.value)}
                            onBlur={(e) => {
                              setEditing(null);
                            }}
                            onKeyDown={(e) => handleKeyDown(e as any, rowIdx, fIdx)}
                          >
                            <option value="">-- 请选择 --</option>
                            {TEMP_ZONE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={inputRef}
                            type="text"
                            defaultValue={row[f.key]}
                            className="w-full px-1 py-1 text-sm border border-[#07BEBF]/60 rounded focus:outline-none focus:ring-1 focus:ring-[#07BEBF]"
                            onBlur={(e) => commitEdit(rowIdx, f.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, fIdx)}
                          />
                        )
                      ) : (
                        <div
                          className="px-1 py-1 cursor-pointer rounded hover:bg-[#07BEBF]/20 min-h-[24px] truncate"
                          title={hasError ? cellErrors!.map((e) => e.message).join('\n') : row[f.key]}
                          onClick={() => startEdit(rowIdx, f.key)}
                        >
                          <span className={hasError ? 'text-red-600' : 'text-gray-800'}>
                            {row[f.key] || ''}
                          </span>
                        </div>
                      )}
                      {hasError && !isEditing && (
                        <div className="text-[10px] text-red-500 truncate" title={cellErrors!.map((e) => e.message).join('; ')}>
                          {cellErrors![0].message.split('：').pop()}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1 text-center">
                  <button
                    onClick={() => deleteRow(rowIdx)}
                    className="text-red-400 hover:text-red-600 transition text-xs opacity-60 hover:opacity-100"
                    title="删除此行"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={addRow}
          className="px-4 py-2 text-xs font-medium text-white bg-[#07BEBF] hover:bg-[#059A9B] rounded-lg hover:shadow-sm transition-all duration-200"
        >
          + 新增空行
        </button>
        <span className="text-xs text-slate-500">共 {data.length} 条数据</span>
      </div>
    </div>
  );
}
