'use client';

import React from 'react';
import { ValidationError } from '@/lib/types';

interface Props {
  errors: ValidationError[];
  onClear?: () => void;
}

export default function ErrorSummary({ errors, onClear }: Props) {
  if (!errors.length) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-red-700">
          发现 {errors.length} 个错误
        </h4>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700"
          >
            关闭
          </button>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {errors.map((e, i) => (
          <p key={i} className="text-xs text-red-600">
            {e.message}
          </p>
        ))}
      </div>
    </div>
  );
}
