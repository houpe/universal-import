import { NextRequest, NextResponse } from 'next/server';
import { parseExcel } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: '仅支持 .xlsx / .xls 格式的文件' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: '上传的文件为空' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = parseExcel(buffer);

    if (result.totalRows === 0) {
      return NextResponse.json({ error: '文件中没有找到有效数据行' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '解析失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
