'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { OrderRecord, PaginatedResult } from '@/lib/types';

export default function OrdersPage() {
  const [result, setResult] = useState<PaginatedResult<OrderRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    external_code: '',
    receiver_name: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.external_code) params.set('external_code', filters.external_code);
      if (filters.receiver_name) params.set('receiver_name', filters.receiver_name);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || '查询失败');
        setResult(null);
        return;
      }

      setResult(data);
    } catch {
      showToast('error', '查询异常');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleReset = () => {
    setFilters({ external_code: '', receiver_name: '', start_date: '', end_date: '' });
    setPage(1);
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">已导入运单</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有历史已导入的运单记录</p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">外部编码</label>
            <input
              type="text"
              value={filters.external_code}
              onChange={(e) => setFilters((f) => ({ ...f, external_code: e.target.value }))}
              placeholder="搜索外部编码"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004B64] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">收件人姓名</label>
            <input
              type="text"
              value={filters.receiver_name}
              onChange={(e) => setFilters((f) => ({ ...f, receiver_name: e.target.value }))}
              placeholder="搜索收件人"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004B64] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">开始日期</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004B64] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">结束日期</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004B64] focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            重置
          </button>
          <button
            onClick={handleSearch}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#004B64] to-[#004B64] rounded-lg hover:shadow-md transition-all duration-200"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-3 border-[#004B64] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      ) : !result || !result.data.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">暂无运单记录</p>
          <a href="/import" className="text-sm text-[#004B64] hover:text-[#003d52] font-medium">
            去导入文件 →
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">ID</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">外部编码</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">发件人</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">发件电话</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">收件人</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">收件电话</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">收件地址</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">重量</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">件数</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">温层</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 text-xs">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-[#004B64]/10/30 transition-colors">
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{order.id}</td>
                    <td className="px-3 py-2.5 text-xs font-mono">{order.external_code || '-'}</td>
                    <td className="px-3 py-2.5 text-xs">{order.sender_name}</td>
                    <td className="px-3 py-2.5 text-xs">{order.sender_phone}</td>
                    <td className="px-3 py-2.5 text-xs">{order.receiver_name}</td>
                    <td className="px-3 py-2.5 text-xs">{order.receiver_phone}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" title={order.receiver_address}>{order.receiver_address}</td>
                    <td className="px-3 py-2.5 text-xs">{order.weight}</td>
                    <td className="px-3 py-2.5 text-xs">{order.quantity}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium
                        ${order.temp_zone === '常温' ? 'bg-green-100 text-green-700' :
                          order.temp_zone === '冷藏' ? 'bg-[#004B64]/20 text-[#003d52]' :
                          order.temp_zone === '冷冻' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {order.temp_zone || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {order.created_at || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              共 <span className="font-semibold text-gray-700">{result.total}</span> 条 · 第 <span className="font-semibold text-gray-700">{result.page}</span> / <span className="font-semibold text-gray-700">{result.totalPages}</span> 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                disabled={page >= result.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
