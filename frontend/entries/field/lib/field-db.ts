import Dexie, { type Table } from "dexie";

import type { DCFormSchema } from "~/features/data_collection/types/data_collection.types";

export type FieldFormQueueStatus = "downloaded" | "updating";

export interface StoredFieldFormQueueItem {
  id?: number;
  formId: string;
  tenantId: string;
  title: string;
  category: string | null;
  schema: DCFormSchema;
  latestVersionId: string | null;
  lookupTables: Array<Record<string, unknown>>;
  downloadedAt: string;
  closesAt: string | null;
  encryptionPublicKey: string | null;
  status: FieldFormQueueStatus;
}

class FieldDatabase extends Dexie {
  formQueue!: Table<StoredFieldFormQueueItem, number>;

  constructor() {
    super("aiutox_field");
    this.version(1).stores({
      formQueue: "++id, &formId, tenantId, status, downloadedAt",
    });
  }
}

export const fieldDb = new FieldDatabase();
