import { FieldDef, FieldKey, FieldMapping } from './types';

export const TEMP_ZONE_OPTIONS = [
  { value: '常温', label: '常温' },
  { value: '冷藏', label: '冷藏' },
  { value: '冷冻', label: '冷冻' },
  { value: '恒温', label: '恒温' },
  { value: '冷链', label: '冷链' },
  { value: '阴凉', label: '阴凉' },
];

export const FIELD_DEFS: FieldDef[] = [
  {
    key: 'external_code',
    label: '外部编码',
    required: false,
    aliases: ['外部编码', '外部订单号', 'ref code', 'refcode', '客户单号', '外部单号', '客户编码', '订单编号', '订单号', 'external code'],
  },
  {
    key: 'sender_name',
    label: '发件人姓名',
    required: true,
    aliases: ['发件人姓名', '发货人', 'sender', '发件人', '寄件人', '寄方姓名', '寄件方', 'sender name', 'sendername'],
  },
  {
    key: 'sender_phone',
    label: '发件人电话',
    required: true,
    aliases: ['发件人电话', '发货电话', 'sender tel', '发件电话', '寄件电话', '寄方电话', 'sender phone', '发件人手机', 'sendertel', 'senderphone'],
  },
  {
    key: 'sender_address',
    label: '发件人地址',
    required: true,
    aliases: ['发件人地址', '发货地址', 'sender address', '发件地址', '寄件地址', '寄方地址', 'senderaddress'],
  },
  {
    key: 'receiver_name',
    label: '收件人姓名',
    required: true,
    aliases: ['收件人姓名', '收货人', 'receiver', '收件人', '收方', '收方姓名', '收货方', 'receiver name', 'receivername'],
  },
  {
    key: 'receiver_phone',
    label: '收件人电话',
    required: true,
    aliases: ['收件人电话', '收货电话', 'receiver tel', '收件电话', '收方电话', '收货方电话', 'receiver phone', 'receivertel', 'receiverphone'],
  },
  {
    key: 'receiver_address',
    label: '收件人地址',
    required: true,
    aliases: ['收件人地址', '收货地址', 'receiver address', '收件地址', '收方地址', '收货方地址', 'receiveraddress'],
  },
  {
    key: 'weight',
    label: '重量(kg)',
    required: true,
    aliases: ['重量(kg)', '重量(KG)', 'weight(kg)', 'weight(KG)', '重量', 'weight', '货物重量', 'weiht'],
  },
  {
    key: 'quantity',
    label: '件数',
    required: true,
    aliases: ['件数', '数量', 'qty', '包裹数', '箱数', 'quantity'],
  },
  {
    key: 'temp_zone',
    label: '温层',
    required: true,
    aliases: ['温层', '温度要求', 'temp zone', '温度', '温区', '温控', 'temperature', 'tempzone'],
  },
  {
    key: 'remark',
    label: '备注',
    required: false,
    aliases: ['备注', '附言', 'note', '说明', '备注信息', '特殊说明', 'remark', '附注'],
  },
];

export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]/g, '')
    .replace(/[()（）\[\]【】]/g, '')
    .replace(/kg/g, '');
}

export function matchField(header: string): FieldKey | null {
  const nh = normalize(header);
  if (!nh) return null;

  for (const def of FIELD_DEFS) {
    for (const alias of def.aliases) {
      if (normalize(alias) === nh) return def.key;
    }
  }

  for (const def of FIELD_DEFS) {
    for (const alias of def.aliases) {
      const na = normalize(alias);
      if (na.length >= 2 && nh.length >= 2 && (nh.includes(na) || na.includes(nh))) {
        return def.key;
      }
    }
  }

  return null;
}

export function autoMapColumns(headers: string[]): {
  mapping: FieldMapping;
  unmappedCols: number[];
} {
  const mapping: FieldMapping = {};
  const unmappedCols: number[] = [];
  const usedFields = new Set<FieldKey>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header || !header.trim()) {
      mapping[i] = null;
      unmappedCols.push(i);
      continue;
    }

    const field = matchField(header);
    if (field && !usedFields.has(field)) {
      mapping[i] = field;
      usedFields.add(field);
    } else {
      mapping[i] = null;
      unmappedCols.push(i);
    }
  }

  return { mapping, unmappedCols };
}

export function mapRowToOrder(
  row: string[],
  mapping: FieldMapping
): Record<string, string> {
  const record: Record<string, string> = {
    external_code: '',
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    weight: '',
    quantity: '',
    temp_zone: '',
    remark: '',
  };

  for (const [colIdx, field] of Object.entries(mapping)) {
    if (field) {
      const value = row[parseInt(colIdx)] ?? '';
      record[field] = String(value).trim();
    }
  }

  return record;
}

export function generateFingerprint(headers: string[]): string {
  const normalized = headers
    .filter((h) => h && h.trim())
    .map((h) => normalize(h))
    .sort()
    .join('|');

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
