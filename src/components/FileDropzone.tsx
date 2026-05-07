'use client';

import React, { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function FileDropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center w-full min-h-[220px]
        border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300
        ${dragging 
          ? 'border-[#07BEBF] bg-[#07BEBF]/10 scale-[1.01]' 
          : 'border-gray-200 bg-gradient-to-b from-gray-50/50 to-white hover:border-[#07BEBF]/40 hover:bg-[#07BEBF]/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 ${
        dragging ? 'bg-[#07BEBF]/20 scale-110' : 'bg-gray-100'
      }`}>
        <svg className={`w-8 h-8 transition-colors duration-300 ${
          dragging ? 'text-[#07BEBF]' : 'text-gray-400'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <p className="text-slate-600 text-base mb-1">
        拖拽 Excel 文件到此处，或<span className="text-[#07BEBF] font-semibold">点击选择文件</span>
      </p>
      <p className="text-gray-400 text-sm">支持 .xlsx / .xls 格式</p>
    </div>
  );
}
