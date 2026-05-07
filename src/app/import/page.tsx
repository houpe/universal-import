'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FileDropzone from '@/components/FileDropzone';
import ColumnMapper from '@/components/ColumnMapper';
import ProgressBar from '@/components/ProgressBar';
import { showToast } from '@/components/Toast';
import { ParsedResult, OrderRecord, FieldMapping, FieldKey } from '@/lib/types';
import { mapRowToOrder, FIELD_DEFS, TEMP_ZONE_OPTIONS } from '@/lib/field-mapper';
import { saveTemplateMapping, loadTemplateMapping, applySavedMapping } from '@/lib/template-memory';
import { validateAll, findDuplicateExternalCodes } from '@/lib/validator';
import { parseExcelWithProgress, ParseProgress } from '@/lib/excel-parser-client';

type Step = 'idle' | 'parsing' | 'mapping' | 'done';

const STATS = [
  { label: '支持字段', value: '11+', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'bg-[#227446] text-white' },
  { label: '模板记忆', value: '∞', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'bg-[#227446] text-white' },
  { label: '自动识别', value: '智能', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', color: 'bg-[#227446] text-white' },
  { label: '批量处理', value: '10K+', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'bg-[#227446] text-white' },
];

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [usedSavedMapping, setUsedSavedMapping] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const all = JSON.parse(localStorage.getItem('template_mappings') || '[]');
      setSavedTemplates(all.length);
    }
  }, [step]);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep('parsing');
    setProgress(0);
    setProgressLabel('正在读取文件...');

    try {
      const buffer = await file.arrayBuffer();

      const result = parseExcelWithProgress(buffer, (p: ParseProgress) => {
        setProgress(p.percent);
        setProgressLabel(`${p.phase} ${p.current}/${p.total}`);
      });

      const saved = loadTemplateMapping(result.fingerprint);
      let finalMapping = result.autoMapping;
      let needsManualMapping = false;

      if (saved) {
        const applied = applySavedMapping(result.headers, saved);
        finalMapping = applied;
        setUsedSavedMapping(true);

        const requiredMapped = FIELD_DEFS.filter((d) => d.required).every((d) =>
          Object.values(applied).some((v) => v === d.key)
        );
        if (!requiredMapped) {
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
        const mappedData = result.mappedData || applyMappingToRows(result.rows, finalMapping);
        setProgress(100);
        storeAndNavigate(mappedData, result.headers, result.rows, finalMapping, result.fingerprint);
      }
    } catch (err) {
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
    rows: string[][],
    mapping: FieldMapping,
    fingerprint: string
  ) {
    sessionStorage.setItem('preview_data', JSON.stringify(mappedData));
    sessionStorage.setItem('preview_headers', JSON.stringify(headers));
    sessionStorage.setItem('preview_rows', JSON.stringify(rows));
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
      storeAndNavigate(mappedData, parsed.headers, parsed.rows, mapping, parsed.fingerprint);
    },
    [parsed, router]
  );

  const handleMappingCancel = useCallback(() => {
    setStep('idle');
    setParsed(null);
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-8 stagger-children">
        <h1 className="text-3xl font-bold gradient-text">万能导入</h1>
        <p className="text-slate-500 mt-2 text-base">多模板自动识别与导入下单系统 — 支持 .xlsx / .xls 文件</p>
      </div>

      {step === 'idle' && (
        <div className="space-y-6 stagger-children">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200/60 p-4 shadow-sm card-hover">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Saved templates indicator */}
          {savedTemplates > 0 && (
            <div className="bg-gradient-to-r from-[#227446]/5 to-[#227446]/5 border border-[#227446]/20 rounded-lg p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#227446]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#227446]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-[#1d613b]">已记忆 <span className="font-semibold">{savedTemplates}</span> 个模板映射规则，上传相同结构文件将自动识别</p>
            </div>
          )}

          {/* Upload Zone */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200/60 p-1 shadow-sm">
            <FileDropzone onFile={handleFile} />
          </div>

          {/* Supported Fields */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200/60 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#227446]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              支持的字段映射
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {FIELD_DEFS.map((def) => (
                <div key={def.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/60">
                  <span className={`w-2 h-2 rounded-full ${def.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                  <span className="text-slate-600">{def.label}</span>
                  {!def.required && <span className="text-gray-400 text-[10px]">(选填)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* How to use */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-slate-200/60 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              使用说明
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: '上传文件', desc: '拖拽或点击选择 Excel 文件' },
                { step: '2', title: '自动识别', desc: '系统智能匹配列映射，支持手动调整' },
                { step: '3', title: '预览编辑', desc: '检查数据，修正异常行' },
                { step: '4', title: '提交下单', desc: '一键批量提交，实时查看进度' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#227446] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'parsing' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200/60 p-8 shadow-sm ">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#227446] flex items-center justify-center shadow-sm ">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{progressLabel || '正在解析文件...'}</p>
              <p className="text-sm text-slate-500 mt-0.5">{fileName}</p>
            </div>
          </div>
          <ProgressBar percent={progress} label="解析进度" />
        </div>
      )}

      {step === 'mapping' && parsed && (
        <div className="animate-slideUp">
          <div className={`rounded-lg border p-4 mb-4 ${usedSavedMapping ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              {usedSavedMapping ? (
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <p className={`text-sm ${usedSavedMapping ? 'text-emerald-700' : 'text-amber-700'}`}>
                {usedSavedMapping
                  ? '已自动应用历史保存的映射规则，请检查并补充未识别的列。'
                  : '无法完全自动识别列映射，请手动配置。调整后会自动保存，下次相同模板无需重新配置。'}
              </p>
            </div>
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
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200/60 p-12 text-center shadow-sm ">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-slate-800 mb-2">解析完成</p>
          <p className="text-slate-500">正在跳转到数据预览页面...</p>
        </div>
      )}
    </div>
  );
}
