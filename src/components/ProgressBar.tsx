'use client';

import React from 'react';

interface Props {
  percent: number;
  current?: number;
  total?: number;
  label?: string;
}

export default function ProgressBar({ percent, current, total, label }: Props) {
  return (
    <div className="w-full">
      {label && <p className="text-sm text-gray-600 mb-1">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">{Math.round(percent)}%</span>
        {current !== undefined && total !== undefined && (
          <span className="text-xs text-gray-500">
            {current} / {total} 条
          </span>
        )}
      </div>
    </div>
  );
}
