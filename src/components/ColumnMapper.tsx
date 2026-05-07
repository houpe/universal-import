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

  const mappedCount = Object.values(mapping).filter((v) => v !== null).length;
  const totalCount = headers.filter((h) => h && h.trim()).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scaleIn">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">列映射配置</h3>
              <p className="text-sm text-gray-500 mt-1">
                请为每列 Excel 数据选择对应的系统字段
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{mappedCount}/{totalCount}</p>
              <p className="text-xs text-gray-400">已映射</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {headers.map((header, idx) => {
            if (!header || !header.trim()) return null;
            const isMapped = !!mapping[idx];
            const isRequired = FIELD_DEFS.some(
              (d) => d.required && mapping[idx] === d.key
            );

            return (
              <div
                key={idx}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 ${
                  isMapped
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="w-44 text-sm truncate">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-medium text-gray-500 mr-2">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-700">{header}</span>
                </div>
                <select
                  value={mapping[idx] || ''}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    isMapped ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200'
                  }`}
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

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            disabled={!requiredMapped}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            确认映射
          </button>
        </div>

        {!requiredMapped && (
          <div className="px-6 pb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-500">请确保所有必填字段都已映射</p>
          </div>
        )}
      </div>
    </div>
  );
}
