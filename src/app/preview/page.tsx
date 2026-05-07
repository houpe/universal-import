'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PreviewTable from '@/components/PreviewTable';
import ColumnMapper from '@/components/ColumnMapper';
import ErrorSummary from '@/components/ErrorSummary';
import ProgressBar from '@/components/ProgressBar';
import { showToast } from '@/components/Toast';
import { OrderRecord, ValidationError, FieldMapping } from '@/lib/types';
import { mapRowToOrder } from '@/lib/field-mapper';
import { validateAll, findDuplicateExternalCodes } from '@/lib/validator';
import { saveTemplateMapping, loadTemplateMapping } from '@/lib/template-memory';

export default function PreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OrderRecord[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [fingerprint, setFingerprint] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showRemap, setShowRemap] = useState(false);
  const [historyDuplicates, setHistoryDuplicates] = useState<string[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem('preview_data');
    const h = sessionStorage.getItem('preview_headers');
    const rows = sessionStorage.getItem('preview_rows');
    const m = sessionStorage.getItem('preview_mapping');
    const fp = sessionStorage.getItem('preview_fingerprint');

    if (!raw) {
      setLoaded(true);
      return;
    }

    let parsed: OrderRecord[] = [];
    try {
      parsed = JSON.parse(raw);
      setData(parsed);
      if (h) setHeaders(JSON.parse(h));
      if (rows) setRawRows(JSON.parse(rows));
      if (m) setMapping(JSON.parse(m));
      if (fp) setFingerprint(fp);
    } catch {
      showToast('error', '数据加载失败');
    }
    setLoaded(true);

    const codes = parsed
      .map(r => r.external_code?.trim())
      .filter(Boolean);
    if (codes.length > 0) {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_duplicates', codes }),
      })
        .then(res => res.json())
        .then(result => {
          if (result.duplicates?.length > 0) {
            setHistoryDuplicates(result.duplicates);
          }
        })
        .catch(() => {});
    }
  }, []);

  const errors: ValidationError[] = useMemo(() => {
    const all = [...validateAll(data), ...findDuplicateExternalCodes(data)];
    if (historyDuplicates.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const code = data[i].external_code?.trim();
        if (code && historyDuplicates.includes(code)) {
          all.push({
            row: i + 1,
            field: 'external_code',
            label: '外部编码',
            message: `第 ${i + 1} 行，外部编码：${code} 与历史记录重复`,
          });
        }
      }
    }
    return all;
  }, [data, historyDuplicates]);

  const errorRowSet = useMemo(() => {
    const set = new Set<number>();
    errors.forEach((e) => set.add(e.row));
    return set;
  }, [errors]);

  const tempZoneDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    data.forEach((row) => {
      const zone = row.temp_zone || '未设置';
      dist[zone] = (dist[zone] || 0) + 1;
    });
    return dist;
  }, [data]);

  const handleChange = useCallback((newData: OrderRecord[]) => {
    setData(newData);
    sessionStorage.setItem('preview_data', JSON.stringify(newData));
  }, []);

  const handleRemapConfirm = useCallback(
    (newMapping: FieldMapping) => {
      if (!rawRows.length || !headers.length) return;

      const mappedData = rawRows.map((row) => {
        const r = mapRowToOrder(row, newMapping);
        return {
          external_code: r.external_code || '',
          sender_name: r.sender_name || '',
          sender_phone: r.sender_phone || '',
          sender_address: r.sender_address || '',
          receiver_name: r.receiver_name || '',
          receiver_phone: r.receiver_phone || '',
          receiver_address: r.receiver_address || '',
          weight: r.weight || '',
          quantity: r.quantity || '',
          temp_zone: r.temp_zone || '',
          remark: r.remark || '',
        } as OrderRecord;
      });

      setData(mappedData);
      setMapping(newMapping);
      sessionStorage.setItem('preview_data', JSON.stringify(mappedData));
      sessionStorage.setItem('preview_mapping', JSON.stringify(newMapping));

      if (fingerprint) {
        saveTemplateMapping(fingerprint, headers, newMapping);
      }

      setShowRemap(false);
      showToast('success', `映射已更新，共 ${mappedData.length} 条数据`);
    },
    [rawRows, headers, fingerprint]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast('error', err.error || '导出失败');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders_export.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', '导出成功');
    } catch {
      showToast('error', '导出失败');
    } finally {
      setExporting(false);
    }
  }, [data]);

  const handleSubmit = useCallback(async () => {
    if (errors.length > 0) {
      showToast('error', `存在 ${errors.length} 个错误，请先修正后再提交`);
      return;
    }

    setSubmitting(true);
    setSubmitProgress(0);

    const progressTimer = setInterval(() => {
      setSubmitProgress((p) => Math.min(p + Math.random() * 10, 90));
    }, 200);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: data }),
      });

      clearInterval(progressTimer);
      setSubmitProgress(100);

      const result = await res.json();
      if (!res.ok) {
        showToast('error', result.error || '提交失败');
        return;
      }

      if (result.failed > 0 && result.success === 0) {
        showToast('error', `提交失败：全部 ${result.failed} 条记录被拒绝`);
        if (result.errors?.length > 0) {
          const errorSummary = result.errors.slice(0, 3).map((e: { row: number; message: string }) => `第${e.row}行: ${e.message}`).join('\n');
          const more = result.errors.length > 3 ? `\n...还有 ${result.errors.length - 3} 条错误` : '';
          console.error('[提交错误详情]', result.errors);
          showToast('error', `${errorSummary}${more}`);
        }
        return;
      }

      if (result.failed > 0) {
        showToast('error', `部分失败：成功 ${result.success} 条，失败 ${result.failed} 条`);
        if (result.errors?.length > 0) {
          console.error('[提交错误详情]', result.errors);
        }
      } else {
        showToast('success', `提交成功：共 ${result.success} 条`);
      }

      if (result.success > 0) {
        sessionStorage.removeItem('preview_data');
        sessionStorage.removeItem('preview_headers');
        sessionStorage.removeItem('preview_rows');
        sessionStorage.removeItem('preview_mapping');
        sessionStorage.removeItem('preview_fingerprint');
        setTimeout(() => router.push('/orders'), 1000);
      }
    } catch {
      clearInterval(progressTimer);
      showToast('error', '提交异常');
    } finally {
      setSubmitting(false);
    }
  }, [data, errors, router]);

  if (!loaded) return null;

  if (!data.length) {
    return (
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-6 text-lg">暂无预览数据</p>
          <button
            onClick={() => router.push('/import')}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            去上传文件
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据预览与编辑</h1>
          <p className="text-sm text-gray-500 mt-1">
            共 <span className="font-semibold text-gray-700">{data.length}</span> 条数据
            {errors.length > 0 && (
              <span className="ml-2 text-red-600">· <span className="font-semibold">{errorRowSet.size}</span> 行有错误</span>
            )}
            {errors.length === 0 && (
              <span className="ml-2 text-emerald-600">· 全部通过校验</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/import')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            返回上传
          </button>
          <button
            onClick={() => setShowRemap(true)}
            className="px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all duration-200"
          >
            重新映射
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 disabled:opacity-50 transition-all duration-200"
          >
            {exporting ? '导出中...' : '导出 Excel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || errors.length > 0}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitting ? '提交中...' : '提交下单'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total rows */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">总行数</p>
              <p className="text-xl font-bold text-gray-900">{data.length}</p>
            </div>
          </div>
        </div>

        {/* Errors */}
        <div className={`bg-white rounded-xl border p-4 shadow-sm ${errors.length > 0 ? 'border-red-100' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${errors.length > 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-emerald-500 to-green-500'}`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {errors.length > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                )}
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">错误行</p>
              <p className={`text-xl font-bold ${errors.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{errorRowSet.size}</p>
            </div>
          </div>
        </div>

        {/* Valid rows */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">有效行</p>
              <p className="text-xl font-bold text-gray-900">{data.length - errorRowSet.size}</p>
            </div>
          </div>
        </div>

        {/* Temp zone distribution (most common) */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">温层分布</p>
              <p className="text-sm font-semibold text-gray-900">
                {Object.entries(tempZoneDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([k, v]) => `${k}(${v})`)
                  .join(' ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Temp Zone Distribution Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">温层分布详情</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tempZoneDistribution).map(([zone, count]) => {
            const pct = Math.round((count / data.length) * 100);
            const colorClass = zone === '常温' ? 'from-green-500 to-emerald-500'
              : zone === '冷藏' ? 'from-blue-500 to-cyan-500'
              : zone === '冷冻' ? 'from-indigo-500 to-purple-500'
              : 'from-gray-400 to-gray-500';
            
            return (
              <div key={zone} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-[140px]">
                <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${colorClass}`} />
                <span className="text-sm text-gray-700 flex-1">{zone}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
                <span className="text-xs text-gray-400">({pct}%)</span>
              </div>
            );
          })}
        </div>
        {/* Visual bar */}
        <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-0.5">
          {Object.entries(tempZoneDistribution).map(([zone, count]) => {
            const pct = (count / data.length) * 100;
            const colorClass = zone === '常温' ? 'bg-green-500'
              : zone === '冷藏' ? 'bg-blue-500'
              : zone === '冷冻' ? 'bg-indigo-500'
              : 'bg-gray-400';
            return <div key={zone} className={`${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {errors.length > 0 && <ErrorSummary errors={errors} />}

      {submitting && (
        <div className="mb-4">
          <ProgressBar percent={submitProgress} label="提交进度" current={Math.floor(data.length * submitProgress / 100)} total={data.length} />
        </div>
      )}

      <PreviewTable data={data} errors={errors} onChange={handleChange} />

      {/* Remap Modal */}
      {showRemap && (
        <ColumnMapper
          headers={headers}
          autoMapping={mapping}
          onConfirm={handleRemapConfirm}
          onCancel={() => setShowRemap(false)}
        />
      )}
    </div>
  );
}
