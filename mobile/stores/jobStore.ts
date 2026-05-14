import { create } from 'zustand';

interface JobState {
  savedJobIds: Set<string>;
  toggleSaved: (jobId: string) => void;
  isSaved: (jobId: string) => boolean;
}

export const useJobStore = create<JobState>((set, get) => ({
  savedJobIds: new Set(),

  toggleSaved: (jobId) =>
    set((state) => {
      const next = new Set(state.savedJobIds);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return { savedJobIds: next };
    }),

  isSaved: (jobId) => get().savedJobIds.has(jobId),
}));
