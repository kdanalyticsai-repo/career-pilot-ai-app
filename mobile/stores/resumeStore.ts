import { create } from 'zustand';

interface Resume {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'failed';
  ats_score: number | null;
  is_primary: boolean;
  version: number;
  structured_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ResumeState {
  resumes: Resume[];
  activeResumeId: string | null;
  uploadProgress: number;

  setResumes: (resumes: Resume[]) => void;
  upsertResume: (resume: Resume) => void;
  removeResume: (id: string) => void;
  setActiveResume: (id: string) => void;
  setUploadProgress: (progress: number) => void;

  getActiveResume: () => Resume | null;
  getPrimaryResume: () => Resume | null;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  activeResumeId: null,
  uploadProgress: 0,

  setResumes: (resumes) => set({ resumes }),

  upsertResume: (resume) =>
    set((state) => {
      const idx = state.resumes.findIndex((r) => r.id === resume.id);
      if (idx >= 0) {
        const updated = [...state.resumes];
        updated[idx] = resume;
        return { resumes: updated };
      }
      return { resumes: [resume, ...state.resumes] };
    }),

  removeResume: (id) =>
    set((state) => ({ resumes: state.resumes.filter((r) => r.id !== id) })),

  setActiveResume: (id) => set({ activeResumeId: id }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  getActiveResume: () => {
    const { resumes, activeResumeId } = get();
    return resumes.find((r) => r.id === activeResumeId) ?? null;
  },

  getPrimaryResume: () => {
    return get().resumes.find((r) => r.is_primary) ?? get().resumes[0] ?? null;
  },
}));
