'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PreviewTable from '@/components/PreviewTable';
import ErrorSummary from '@/components/ErrorSummary';
import ProgressBar from '@/components/ProgressBar';
import { showToast } from '@/components/Toast';
import { OrderRecord, ValidationError, FieldMapping } from '@/lib/types';
import { validateAll, findDuplicateExternalCodes } from '@/lib/validator';
import { saveTemplateMapping } from '@/lib/template-memory';

export default function PreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OrderRecord[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [fingerprint, setFingerprint] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem('preview_data');
    const h = sessionStorage.getItem('preview_headers');
    const m = sessionStorage.getItem('preview_mapping');
    const fp = sessionStorage.getItem('preview_fingerprint');

    if (!raw) {
      setLoaded(true);
      return;
    }

    try {
      setData(JSON.parse(raw));
      if (h) setHeaders(JSON.parse(h));
      if (m) setMapping(JSON.parse(m));
      if (fp) setFingerprint(fp);
    } catch {
      showToast('error', '数据加载失败');
    }
    setLoaded(true);
  }, []);

  // 获取数据库已有外部编码，用于重复检测
  useEffect(() => {
    fetch('/api/orders?action=existing_codes')
      .then((res) => res.json())
      .then((data) => {
        if (data.codes) {
          setExistingCodes(new Set(data.codes));
        }
      })
      .catch(() => {});
  }, []);

  const errors: ValidationError[] = useMemo(() => {
    const validationErrors = validateAll(data);
    const duplicateErrors = findDuplicateExternalCodes(data, existingCodes);
    return [...validationErrors, ...duplicateErrors];
  }, [data, existingCodes]);

  const errorRowSet = useMemo(() => {
    const set = new Set<number>();
    errors.forEach((e) => set.add(e.row));
    return set;
  }, [errors]);

  const handleChange = useCallback((newData: OrderRecord[]) => {
    setData(newData);
    sessionStorage.setItem('preview_data', JSON.stringify(newData));
  }, []);

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

      showToast('success', `提交完成：成功 ${result.success} 条，失败 ${result.failed} 条`);

      if (result.success > 0) {
        sessionStorage.removeItem('preview_data');
        sessionStorage.removeItem('preview_headers');
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
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 mb-4">暂无预览数据</p>
          <button
            onClick={() => router.push('/import')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            去上传文件
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据预览与编辑</h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {data.length} 条数据 · {errors.length > 0 ? `${errorRowSet.size} 行有错误` : '全部通过校验'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/import')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            返回上传
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-green-700 border border-green-300 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition"
          >
            {exporting ? '导出中...' : '导出 Excel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || errors.length > 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? '提交中...' : '提交下单'}
          </button>
        </div>
      </div>

      {errors.length > 0 && <ErrorSummary errors={errors} />}

      {submitting && (
        <div className="mb-4">
          <ProgressBar percent={submitProgress} label="提交进度" current={Math.floor(data.length * submitProgress / 100)} total={data.length} />
        </div>
      )}

      <PreviewTable data={data} errors={errors} onChange={handleChange} />
    </div>
  );
}
