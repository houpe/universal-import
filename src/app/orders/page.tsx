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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">已导入运单</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有历史已导入的运单记录</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">外部编码</label>
            <input
              type="text"
              value={filters.external_code}
              onChange={(e) => setFilters((f) => ({ ...f, external_code: e.target.value }))}
              placeholder="搜索外部编码"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">收件人姓名</label>
            <input
              type="text"
              value={filters.receiver_name}
              onChange={(e) => setFilters((f) => ({ ...f, receiver_name: e.target.value }))}
              placeholder="搜索收件人"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            重置
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      ) : !result || !result.data.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">暂无运单记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">ID</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">外部编码</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">发件人</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">发件电话</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">收件人</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">收件电话</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">收件地址</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">重量</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">件数</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">温层</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                        ${order.temp_zone === '常温' ? 'bg-green-100 text-green-700' :
                          order.temp_zone === '冷藏' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'}`}>
                        {order.temp_zone}
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

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              共 {result.total} 条 · 第 {result.page} / {result.totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                disabled={page >= result.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
