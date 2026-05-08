export type FieldKey =
  | 'external_code'
  | 'sender_name'
  | 'sender_phone'
  | 'sender_address'
  | 'receiver_name'
  | 'receiver_phone'
  | 'receiver_address'
  | 'weight'
  | 'quantity'
  | 'temp_zone'
  | 'remark';

export interface OrderRecord {
  id?: number;
  external_code: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: string;
  quantity: string;
  temp_zone: string;
  remark: string;
  created_at?: string;
}

export interface FieldDef {
  key: FieldKey;
  label: string;
  required: boolean;
  aliases: string[];
}

export interface FieldMapping {
  [colIndex: number]: FieldKey | null;
}

export interface ValidationError {
  row: number;
  field: FieldKey;
  label: string;
  message: string;
}

export interface ParsedResult {
  headers: string[];
  rows: string[][];
  headerRowIndex: number;
  sheetName: string;
  fingerprint: string;
  autoMapping: FieldMapping;
  unmappedCols: number[];
  mappedData: OrderRecord[];
  totalRows: number;
}

export interface SavedTemplateMapping {
  fingerprint: string;
  columnMappings: Record<string, FieldKey>;
  headers: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface BatchSubmitResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
  batchId: string;
}

export interface OrderQueryParams {
  external_code?: string;
  receiver_name?: string;
  start_date?: string;
  end_date?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
