export interface Product {
  id?: string;
  skuId: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  price: number;
  totalIn: number;
  totalOut: number;
  stock: number;
  valueStock: number;
  reorderLevel: number;
  status: 'OK' | 'LOW';
  lastUpdated: any;
}

export interface LedgerEntry {
  id?: string;
  skuId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  channel?: string;
  supplier?: string;
  timestamp: any;
  note?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
