'use client';

import React, { useState, useMemo } from 'react';
import { ValidationError } from '@/lib/types';

interface Props {
  errors: ValidationError[];
  onClear?: () => void;
}

export default function ErrorSummary({ errors, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const groupedErrors = useMemo(() => {
    const groups: Record<number, ValidationError[]> = {};
    errors.forEach((e) => {
      if (!groups[e.row]) groups[e.row] = [];
      groups[e.row].push(e);
    });
    return groups;
  }, [errors]);

  if (!errors.length) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg mb-4 shadow-sm overflow-hidden animate-slideUp">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-red-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-red-700">
            发现 <span className="font-bold">{errors.length}</span> 个错误 · 影响 <span className="font-bold">{Object.keys(groupedErrors).length}</span> 行
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100 transition"
            >
              关闭
            </button>
          )}
          <svg
            className={`w-4 h-4 text-red-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-red-200 max-h-64 overflow-y-auto">
          {Object.entries(groupedErrors).map(([row, errs]) => (
            <div key={row} className="px-4 py-2 bg-white/90 backdrop-blur-sm/60 border-b border-red-100 last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {row}
                </span>
                <span className="text-xs text-slate-500">第 {row} 行</span>
              </div>
              <div className="pl-7 space-y-0.5">
                {errs.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {e.message}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
