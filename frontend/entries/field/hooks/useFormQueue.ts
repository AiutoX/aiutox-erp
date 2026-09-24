import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getEncryptionPublicKey,
  getForm,
  listFormVersions,
  listForms,
} from "~/features/data_collection/api/data_collection.api";
import type { DCForm } from "~/features/data_collection/types/data_collection.types";

import { fieldDb, type StoredFieldFormQueueItem } from "../lib/field-db";
import { useFieldAuthStore } from "../stores/field-auth.store";
import { useFieldQueueStore } from "../stores/field-queue.store";

export interface FieldQueueForm {
  id: string;
  title: string;
  category: string | null;
  closesAt: string | null;
  isDownloaded: boolean;
  downloadedAt: string | null;
  status: "available" | "downloaded" | "updating";
}

const fieldQueueKeys = {
  all: ["field", "forms"] as const,
};

async function listFieldForms(): Promise<DCForm[]> {
  const response = await listForms({
    page: 1,
    page_size: 100,
    status: "published",
    field_mode: true,
  });
  return response.data ?? [];
}

async function loadStoredForms(
  tenantId: string | null
): Promise<StoredFieldFormQueueItem[]> {
  if (!tenantId) {
    return [];
  }

  return fieldDb.formQueue.where("tenantId").equals(tenantId).toArray();
}

function mergeForms(
  apiForms: DCForm[],
  storedForms: StoredFieldFormQueueItem[],
  isFetching: boolean
): FieldQueueForm[] {
  const storedById = new Map(storedForms.map((item) => [item.formId, item]));
  const onlineForms = apiForms.map((form) => {
    const stored = storedById.get(form.id);
    return {
      id: form.id,
      title: form.title,
      category: form.category ?? null,
      closesAt: form.closesAt ?? null,
      isDownloaded: Boolean(stored),
      downloadedAt: stored?.downloadedAt ?? null,
      status: stored ? (isFetching ? "updating" : "downloaded") : "available",
    } satisfies FieldQueueForm;
  });

  const offlineOnlyForms = storedForms
    .filter((item) => !apiForms.some((form) => form.id === item.formId))
    .map((item) => ({
      id: item.formId,
      title: item.title,
      category: item.category,
      closesAt: item.closesAt,
      isDownloaded: true,
      downloadedAt: item.downloadedAt,
      status: "downloaded" as const,
    }));

  return [...onlineForms, ...offlineOnlyForms].sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export function useFormQueue() {
  const tenantId = useFieldAuthStore((state) => state.tenantId);
  const setDownloadedForms = useFieldQueueStore(
    (state) => state.setDownloadedForms
  );
  const setDownloading = useFieldQueueStore((state) => state.setDownloading);
  const setDownloaded = useFieldQueueStore((state) => state.setDownloaded);
  const removeDownloadedFromStore = useFieldQueueStore(
    (state) => state.removeDownloaded
  );
  const downloadingId = useFieldQueueStore((state) => state.downloadingId);
  const queryClient = useQueryClient();

  const storedQuery = useQuery({
    queryKey: [...fieldQueueKeys.all, "stored", tenantId],
    queryFn: () => loadStoredForms(tenantId),
    enabled: Boolean(tenantId),
  });

  const formsQuery = useQuery({
    queryKey: [...fieldQueueKeys.all, "remote"],
    queryFn: listFieldForms,
    retry: false,
  });

  useEffect(() => {
    const forms =
      storedQuery.data?.map((item) => ({
        formId: item.formId,
        downloadedAt: item.downloadedAt,
      })) ?? [];
    setDownloadedForms(forms);
  }, [setDownloadedForms, storedQuery.data]);

  const downloadMutation = useMutation({
    mutationFn: async (formId: string) => {
      const [formResponse, versions, encryption] = await Promise.all([
        getForm(formId),
        listFormVersions(formId, { page: 1, page_size: 100 }).then(
          (response) => response.data
        ),
        getEncryptionPublicKey(formId).catch(() => ({
          data: { public_key_pem: null },
        })),
      ]);

      const form = formResponse.data;
      const latestVersion = [...versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )[0];

      const record: StoredFieldFormQueueItem = {
        formId: form.id,
        tenantId: form.tenantId,
        title: form.title,
        category: form.category ?? null,
        schema: latestVersion?.schemaSnapshot ?? form.schema,
        latestVersionId: latestVersion?.id ?? null,
        lookupTables: [],
        downloadedAt: new Date().toISOString(),
        closesAt: form.closesAt ?? null,
        encryptionPublicKey: encryption.data.public_key_pem ?? null,
        status: "downloaded",
      };

      await fieldDb.formQueue.put(record);
      return record;
    },
    onMutate: async (formId) => {
      setDownloading(formId);
    },
    onSuccess: async (record) => {
      setDownloaded(record.formId, record.downloadedAt);
      await queryClient.invalidateQueries({
        queryKey: [...fieldQueueKeys.all, "stored", tenantId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...fieldQueueKeys.all, "remote"],
      });
    },
    onError: () => {
      setDownloading(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (formId: string) => {
      await fieldDb.formQueue.where("formId").equals(formId).delete();
      return formId;
    },
    onSuccess: async (formId) => {
      removeDownloadedFromStore(formId);
      await queryClient.invalidateQueries({
        queryKey: [...fieldQueueKeys.all, "stored", tenantId],
      });
    },
  });

  const mergedForms = mergeForms(
    formsQuery.data ?? [],
    storedQuery.data ?? [],
    Boolean(formsQuery.isFetching && storedQuery.data?.length)
  );

  const availableForms = mergedForms.filter((form) => !form.isDownloaded);
  const downloadedForms = mergedForms.filter((form) => form.isDownloaded);

  return {
    forms: mergedForms,
    availableForms,
    downloadedForms,
    downloadedCount: downloadedForms.length,
    totalCount: mergedForms.length,
    isLoading: formsQuery.isLoading || storedQuery.isLoading,
    isRefreshing: formsQuery.isFetching,
    error: formsQuery.error,
    downloadingId,
    downloadForm: downloadMutation.mutateAsync,
    removeDownload: removeMutation.mutateAsync,
    refetch: async () => {
      await Promise.all([formsQuery.refetch(), storedQuery.refetch()]);
    },
  };
}
