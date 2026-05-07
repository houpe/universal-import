'use client';

import React from 'react';

interface Props {
  percent: number;
  current?: number;
  total?: number;
  label?: string;
}

export default function ProgressBar({ percent, current, total, label }: Props) {
  const pct = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full">
      {label && <p className="text-sm text-gray-600 mb-2">{label}</p>}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#004B64] to-[#004B64] rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${pct}%` }}
        >
          {pct > 5 && pct < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs font-medium text-gray-600">{Math.round(pct)}%</span>
        {current !== undefined && total !== undefined && (
          <span className="text-xs text-gray-500">
            {current} / {total} 条
          </span>
        )}
      </div>
    </div>
  );
}
