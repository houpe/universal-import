'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FIELD_DEFS } from '@/lib/field-mapper';
import { FieldKey, FieldMapping } from '@/lib/types';

interface Props {
  headers: string[];
  autoMapping: FieldMapping;
  onConfirm: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

export default function ColumnMapper({ headers, autoMapping, onConfirm, onCancel }: Props) {
  const [mapping, setMapping] = useState<FieldMapping>({ ...autoMapping });

  useEffect(() => {
    setMapping({ ...autoMapping });
  }, [autoMapping]);

  const handleChange = useCallback((colIndex: number, fieldKey: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      
      if (fieldKey) {
        for (const [k, v] of Object.entries(next)) {
          if (v === fieldKey) {
            next[parseInt(k)] = null;
          }
        }
      }
      
      next[colIndex] = fieldKey ? (fieldKey as FieldKey) : null;
      return next;
    });
  }, []);

  const requiredMapped = FIELD_DEFS.filter((d) => d.required).every((d) =>
    Object.values(mapping).some((v) => v === d.key)
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">列映射配置</h3>
          <p className="text-sm text-gray-500 mt-1">
            请为每列 Excel 数据选择对应的系统字段。红色标记为必填字段。
          </p>
        </div>

        <div className="p-6 space-y-3">
          {headers.map((header, idx) => {
            if (!header || !header.trim()) return null;
            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-48 text-sm font-medium text-gray-700 truncate" title={header}>
                  <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                    列 {idx + 1}
                  </span>
                  <span className="ml-2">{header}</span>
                </div>
                <select
                  value={mapping[idx] || ''}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- 不映射 --</option>
                  {FIELD_DEFS.map((def) => (
                    <option key={def.key} value={def.key}>
                      {def.label} {!def.required ? '(选填)' : '*'}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            disabled={!requiredMapped}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            确认映射
          </button>
        </div>

        {!requiredMapped && (
          <div className="px-6 pb-4">
            <p className="text-xs text-red-500">请确保所有必填字段都已映射</p>
          </div>
        )}
      </div>
    </div>
  );
}
