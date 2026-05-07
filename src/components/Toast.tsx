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
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white
            ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
