import { NextRequest, NextResponse } from 'next/server';
import { getSql, ensureTemplateTable } from '@/lib/db';
import { FieldKey } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const dbReady = await ensureTemplateTable();
    if (!dbReady) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      const sql = getSql();
      const result = await sql`SELECT fingerprint, headers, column_mappings, created_at, updated_at FROM template_mappings ORDER BY updated_at DESC`;
      return NextResponse.json({
        templates: result.rows.map((r: Record<string, unknown>) => ({
          fingerprint: r.fingerprint as string,
          headers: r.headers as string[],
          columnMappings: r.column_mappings as Record<string, FieldKey>,
          createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : '',
          updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : '',
        })),
      });
    }

    const sql = getSql();
    const result = await sql`
      SELECT fingerprint, headers, column_mappings, created_at, updated_at
      FROM template_mappings
      WHERE fingerprint = ${fingerprint}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '未找到模板映射' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      fingerprint: row.fingerprint as string,
      headers: row.headers as string[],
      columnMappings: row.column_mappings as Record<string, FieldKey>,
      createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : '',
      updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : '',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbReady = await ensureTemplateTable();
    if (!dbReady) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
    }

    const body = await request.json();
    const { fingerprint, headers, columnMappings } = body as {
      fingerprint: string;
      headers: string[];
      columnMappings: Record<string, FieldKey>;
    };

    if (!fingerprint || !headers || !columnMappings) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const sql = getSql();
    await sql`
      INSERT INTO template_mappings (fingerprint, headers, column_mappings, created_at, updated_at)
      VALUES (${fingerprint}, ${JSON.stringify(headers)}, ${JSON.stringify(columnMappings)}, NOW(), NOW())
      ON CONFLICT (fingerprint)
      DO UPDATE SET
        headers = ${JSON.stringify(headers)},
        column_mappings = ${JSON.stringify(columnMappings)},
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
