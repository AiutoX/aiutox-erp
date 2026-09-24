import { create } from "zustand";

export interface DownloadedFieldFormSummary {
  formId: string;
  downloadedAt: string;
}

interface FieldQueueState {
  downloadedForms: DownloadedFieldFormSummary[];
  downloadingId: string | null;
  setDownloading: (formId: string | null) => void;
  setDownloaded: (formId: string, downloadedAt: string) => void;
  removeDownloaded: (formId: string) => void;
  setDownloadedForms: (forms: DownloadedFieldFormSummary[]) => void;
  getDownloaded: (formId: string) => boolean;
}

export const useFieldQueueStore = create<FieldQueueState>((set, get) => ({
  downloadedForms: [],
  downloadingId: null,
  setDownloading: (formId) => set({ downloadingId: formId }),
  setDownloaded: (formId, downloadedAt) =>
    set((state) => ({
      downloadedForms: [
        ...state.downloadedForms.filter((item) => item.formId !== formId),
        { formId, downloadedAt },
      ],
      downloadingId: null,
    })),
  removeDownloaded: (formId) =>
    set((state) => ({
      downloadedForms: state.downloadedForms.filter(
        (item) => item.formId !== formId
      ),
      downloadingId:
        state.downloadingId === formId ? null : state.downloadingId,
    })),
  setDownloadedForms: (forms) => set({ downloadedForms: forms }),
  getDownloaded: (formId) =>
    get().downloadedForms.some((item) => item.formId === formId),
}));
