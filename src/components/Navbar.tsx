'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/import', label: '导入文件', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { href: '/preview', label: '数据预览', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { href: '/orders', label: '运单列表', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass px-6 py-2.5 flex items-center justify-between">
      <Link href="/import" className="flex items-center gap-2.5 group">
        <div className="bg-[#004B64] p-1.5 rounded-lg shadow-sm">
          <img 
            src="https://www.ztocc.com/img/logo.b5a384ab.png" 
            alt="logo" 
            className="h-6 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
          />
        </div>
        <span className="text-lg font-bold gradient-text">万能导入</span>
      </Link>

      <div className="flex items-center gap-1 bg-gray-100/60 rounded-lg p-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href === '/import' && pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${active 
                  ? 'bg-white/90 backdrop-blur-sm text-[#004B64] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
