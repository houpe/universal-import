import { NextRequest, NextResponse } from 'next/server';
import { getSql, ensureTable } from '@/lib/db';
import { OrderRecord, PaginatedResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const dbReady = await ensureTable();
    if (!dbReady) {
      return NextResponse.json({ error: '数据库未配置，请在 Vercel 中集成数据库' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action') || '';

    if (action === 'check_duplicates') {
      const codes = searchParams.get('codes') || '';
      if (!codes) {
        return NextResponse.json({ duplicates: [] });
      }
      const codeList = codes.split(',').filter(Boolean).map(c => c.trim());
      if (codeList.length === 0) {
        return NextResponse.json({ duplicates: [] });
      }
      const sql = getSql();
      const result = await sql.query(
        'SELECT DISTINCT external_code FROM orders WHERE external_code = ANY($1::text[])',
        [codeList]
      );
      const duplicates = result.rows.map((r: Record<string, unknown>) => r.external_code as string);
      return NextResponse.json({ duplicates });
    }

    const external_code = searchParams.get('external_code') || '';
    const receiver_name = searchParams.get('receiver_name') || '';
    const start_date = searchParams.get('start_date') || '';
    const end_date = searchParams.get('end_date') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const sql = getSql();

    let whereParts: string[] = [];
    let whereClause = '';

    if (external_code) whereParts.push(`external_code ILIKE '%${external_code.replace(/'/g, "''")}%'`);
    if (receiver_name) whereParts.push(`receiver_name ILIKE '%${receiver_name.replace(/'/g, "''")}%'`);
    if (start_date) whereParts.push(`created_at >= '${start_date.replace(/'/g, "''")}'`);
    if (end_date) whereParts.push(`created_at <= '${end_date.replace(/'/g, "''")} 23:59:59'`);

    if (whereParts.length > 0) {
      whereClause = 'WHERE ' + whereParts.join(' AND ');
    }

    const countResult = await sql.query(`SELECT COUNT(*) as cnt FROM orders ${whereClause}`);
    const total = Number(countResult.rows[0]?.cnt || 0);

    const offset = (page - 1) * pageSize;
    const rowsResult = await sql.query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    );

    const result: PaginatedResult<OrderRecord> = {
      data: rowsResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        external_code: (r.external_code as string) || '',
        sender_name: r.sender_name as string,
        sender_phone: r.sender_phone as string,
        sender_address: r.sender_address as string,
        receiver_name: r.receiver_name as string,
        receiver_phone: r.receiver_phone as string,
        receiver_address: r.receiver_address as string,
        weight: String(r.weight),
        quantity: String(r.quantity),
        temp_zone: r.temp_zone as string,
        remark: (r.remark as string) || '',
        created_at: r.created_at ? new Date(r.created_at as string).toLocaleString('zh-CN') : '',
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbReady = await ensureTable();
    if (!dbReady) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
    }

    const { orders } = (await request.json()) as { orders: OrderRecord[] };
    if (!orders || !orders.length) {
      return NextResponse.json({ error: '没有数据可提交' }, { status: 400 });
    }

    const sql = getSql();
    const batchId = crypto.randomUUID().slice(0, 8);
    let success = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      try {
        if (o.external_code?.trim()) {
          const existing = await sql`SELECT id FROM orders WHERE external_code = ${o.external_code.trim()}`;
          if (existing.rows.length > 0) {
            errors.push({ row: i + 1, message: `外部编码 ${o.external_code} 与历史记录重复` });
            continue;
          }
        }
        await sql`
          INSERT INTO orders (external_code, sender_name, sender_phone, sender_address,
            receiver_name, receiver_phone, receiver_address, weight, quantity, temp_zone, remark, batch_id)
          VALUES (${o.external_code || null}, ${o.sender_name}, ${o.sender_phone}, ${o.sender_address},
            ${o.receiver_name}, ${o.receiver_phone}, ${o.receiver_address},
            ${Number(o.weight)}, ${parseInt(o.quantity)}, ${o.temp_zone}, ${o.remark || null}, ${batchId})
        `;
        success++;
      } catch (err: unknown) {
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : '插入失败',
        });
      }
    }

    return NextResponse.json({
      success,
      failed: errors.length,
      errors,
      batchId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '提交失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
