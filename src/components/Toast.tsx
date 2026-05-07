'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let addToastFn: ((type: ToastItem['type'], message: string) => void) | null = null;

export function showToast(type: ToastItem['type'], message: string) {
  addToastFn?.(type, message);
}

const TOAST_CONFIG = {
  success: {
    bg: 'bg-emerald-500',
    icon: 'M5 13l4 4L19 7',
  },
  error: {
    bg: 'bg-red-500',
    icon: 'M6 18L18 6M6 6l12 12',
  },
  info: {
    bg: 'bg-[#2563EB]',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const add = useCallback((type: ToastItem['type'], message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => { addToastFn = null; };
  }, [add]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => {
        const config = TOAST_CONFIG[t.type];
        return (
          <div
            key={t.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm text-sm font-medium text-white
              ${config.bg} animate-slideUp
            `}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
            </svg>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
