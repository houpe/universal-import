import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { OrderRecord } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json() as { data: OrderRecord[] };

    if (!data || !data.length) {
      return NextResponse.json({ error: '没有数据可导出' }, { status: 400 });
    }

    const FIELD_LABELS = [
      '外部编码', '发件人姓名', '发件人电话', '发件人地址',
      '收件人姓名', '收件人电话', '收件人地址',
      '重量(kg)', '件数', '温层', '备注',
    ];

    const FIELD_KEYS = [
      'external_code', 'sender_name', 'sender_phone', 'sender_address',
      'receiver_name', 'receiver_phone', 'receiver_address',
      'weight', 'quantity', 'temp_zone', 'remark',
    ] as const;

    const headerRow = FIELD_LABELS;
    const dataRows = data.map((row) => FIELD_KEYS.map((k) => row[k] ?? ''));

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = FIELD_LABELS.map(() => ({ wch: 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单数据');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=orders_export.xlsx',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '导出失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
