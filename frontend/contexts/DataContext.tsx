import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api, Video, Profile } from '@/services/api';
import { useAuth } from './AuthContext';

export type PendingJob = { jobId: string; videoId: string; url: string; failed: boolean };

type DataContextType = {
  videos: Video[];
  profile: Profile | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  pendingJobs: PendingJob[];
  addPendingJob: (jobId: string, videoId: string, url: string) => void;
  removePendingJob: (jobId: string) => void;
};

const DataContext = createContext<DataContextType>({
  videos: [],
  profile: null,
  loading: true,
  error: false,
  refresh: async () => {},
  pendingJobs: [],
  addPendingJob: () => {},
  removePendingJob: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const prevUserIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addPendingJob = useCallback((jobId: string, videoId: string, url: string) => {
    setPendingJobs(prev =>
      prev.some(j => j.jobId === jobId) ? prev : [...prev, { jobId, videoId, url, failed: false }]
    );
  }, []);

  const removePendingJob = useCallback((jobId: string) => {
    setPendingJobs(prev => prev.filter(j => j.jobId !== jobId));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api.videos.list(), api.profile.get()]);
      setVideos(v);
      setProfile(p);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    if (!session) {
      setVideos([]);
      setProfile(null);
      setPendingJobs([]);
      setLoading(true);
      setError(false);
      prevUserIdRef.current = null;
      return;
    }
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      setLoading(true);
      refresh();
    }
  }, [session, refresh]);

  // Drop pending jobs whose video has already landed in the library.
  useEffect(() => {
    setPendingJobs(prev => prev.filter(job => !videos.some(v => v.id === job.videoId)));
  }, [videos]);

  // Poll active jobs until they complete or fail.
  useEffect(() => {
    const active = pendingJobs.filter(j => !j.failed);
    if (active.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      for (const job of active) {
        try {
          const status = await api.jobs.get(job.jobId);
          if (status.status === 'completed') {
            setPendingJobs(prev => prev.filter(j => j.jobId !== job.jobId));
            refresh();
          } else if (status.status === 'failed') {
            setPendingJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, failed: true } : j));
          }
        } catch {}
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingJobs, refresh]);

  return (
    <DataContext.Provider value={{ videos, profile, loading, error, refresh, pendingJobs, addPendingJob, removePendingJob }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
