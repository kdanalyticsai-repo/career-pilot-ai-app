import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/services/api';
import { useResumeStore } from '@/stores/resumeStore';

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

export function useResumes() {
  const { setResumes } = useResumeStore();

  const query = useQuery<{ resumes: Resume[]; total: number }>({
    queryKey: ['resumes'],
    queryFn: () => api.get('/resumes').then((r) => r.data),
    // Keep polling if any resume is still processing
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      const hasProcessing = data.resumes.some((r: Resume) => r.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });

  useEffect(() => {
    if (query.data?.resumes) {
      setResumes(query.data.resumes);
    }
  }, [query.data]);

  return {
    resumes: query.data?.resumes ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
