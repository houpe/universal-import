'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FileDropzone from '@/components/FileDropzone';
import ColumnMapper from '@/components/ColumnMapper';
import ProgressBar from '@/components/ProgressBar';
import { showToast } from '@/components/Toast';
import { ParsedResult, OrderRecord, FieldMapping, FieldKey } from '@/lib/types';
import { mapRowToOrder, FIELD_DEFS } from '@/lib/field-mapper';
import { saveTemplateMapping, loadTemplateMapping, applySavedMapping } from '@/lib/template-memory';
import { validateAll, findDuplicateExternalCodes } from '@/lib/validator';

type Step = 'idle' | 'parsing' | 'mapping' | 'done';

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [usedSavedMapping, setUsedSavedMapping] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep('parsing');
    setProgress(0);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(progressTimer);

      if (!res.ok) {
        showToast('error', data.error || '解析失败');
        setStep('idle');
        return;
      }

      setProgress(95);

      const result = data as ParsedResult;

      const saved = loadTemplateMapping(result.fingerprint);
      let finalMapping = result.autoMapping;
      let needsManualMapping = false;

      if (saved) {
        const applied = applySavedMapping(result.headers, saved);
        const requiredMapped = FIELD_DEFS.filter((d) => d.required).every((d) =>
          Object.values(applied).some((v) => v === d.key)
        );
        if (requiredMapped) {
          finalMapping = applied;
          setUsedSavedMapping(true);
        } else {
          needsManualMapping = true;
        }
      } else {
        const requiredMapped = FIELD_DEFS.filter((d) => d.required).every((d) =>
          Object.values(result.autoMapping).some((v) => v === d.key)
        );
        if (!requiredMapped) {
          needsManualMapping = true;
        }
      }

      if (needsManualMapping) {
        setParsed({ ...result, autoMapping: finalMapping });
        setStep('mapping');
        setProgress(100);
      } else {
        const mappedData = applyMappingToRows(result.rows, finalMapping);
        setProgress(100);
        storeAndNavigate(mappedData, result.headers, finalMapping, result.fingerprint);
      }
    } catch (err) {
      clearInterval(progressTimer);
      showToast('error', err instanceof Error ? err.message : '解析异常');
      setStep('idle');
    }
  }, [router]);

  function applyMappingToRows(rows: string[][], mapping: FieldMapping): OrderRecord[] {
    return rows.map((row) => {
      const r = mapRowToOrder(row, mapping);
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
  }

  function storeAndNavigate(
    mappedData: OrderRecord[],
    headers: string[],
    mapping: FieldMapping,
    fingerprint: string
  ) {
    sessionStorage.setItem('preview_data', JSON.stringify(mappedData));
    sessionStorage.setItem('preview_headers', JSON.stringify(headers));
    sessionStorage.setItem('preview_mapping', JSON.stringify(mapping));
    sessionStorage.setItem('preview_fingerprint', fingerprint);

    setStep('done');
    showToast('success', `成功导入 ${mappedData.length} 条数据`);
    setTimeout(() => router.push('/preview'), 500);
  }

  const handleMappingConfirm = useCallback(
    (mapping: FieldMapping) => {
      if (!parsed) return;

      saveTemplateMapping(parsed.fingerprint, parsed.headers, mapping);

      const mappedData = applyMappingToRows(parsed.rows, mapping);
      storeAndNavigate(mappedData, parsed.headers, mapping, parsed.fingerprint);
    },
    [parsed, router]
  );

  const handleMappingCancel = useCallback(() => {
    setStep('idle');
    setParsed(null);
  }, []);

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">万能导入</h1>
        <p className="text-gray-500 mt-1">多模板自动识别与导入下单系统 — 支持 .xlsx / .xls 文件</p>
      </div>

      {step === 'idle' && (
        <div className="space-y-6">
          <FileDropzone onFile={handleFile} />

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">支持的字段映射</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {FIELD_DEFS.map((def) => (
                <div key={def.key} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${def.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                  <span className="text-gray-600">{def.label}</span>
                  {!def.required && <span className="text-gray-400">(选填)</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">使用说明</h3>
            <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
              <li>上传 Excel 文件，系统自动识别模板格式</li>
              <li>如自动识别不完整，可手动调整列映射（映射规则会被记住）</li>
              <li>在预览页面检查、编辑数据</li>
              <li>确认无误后提交下单</li>
            </ol>
          </div>
        </div>
      )}

      {step === 'parsing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="font-medium text-gray-900">正在解析文件...</p>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
          </div>
          <ProgressBar percent={progress} label="解析进度" />
        </div>
      )}

      {step === 'mapping' && parsed && (
        <div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-700">
              无法完全自动识别列映射，请手动配置。调整后会自动保存，下次相同模板无需重新配置。
            </p>
            {usedSavedMapping && (
              <p className="text-xs text-green-600 mt-1">
                已自动应用历史保存的映射规则
              </p>
            )}
          </div>
          <ColumnMapper
            headers={parsed.headers}
            autoMapping={parsed.autoMapping}
            onConfirm={handleMappingConfirm}
            onCancel={handleMappingCancel}
          />
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900">解析完成，正在跳转...</p>
        </div>
      )}
    </div>
  );
}
