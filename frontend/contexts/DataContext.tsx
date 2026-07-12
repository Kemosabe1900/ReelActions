import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api, Video, Profile } from '@/services/api';
import { useAuth } from './AuthContext';

export type PendingJob = { jobId: string; videoId: string; url: string; failed: boolean; createdAt: number; escalated: boolean; errorMessage?: string };

const ESCALATE_AFTER_MS = 150_000;

type DataContextType = {
  videos: Video[];
  profile: Profile | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  pendingJobs: PendingJob[];
  addPendingJob: (jobId: string, videoId: string, url: string) => void;
  addFailedSave: (url: string, errorMessage: string) => void;
  removePendingJob: (jobId: string) => void;
  retryJob: (jobId: string) => Promise<void>;
  toggleTried: (videoId: string) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  renameVideo: (videoId: string, title: string) => Promise<void>;
};

const DataContext = createContext<DataContextType>({
  videos: [],
  profile: null,
  loading: true,
  error: false,
  refresh: async () => {},
  pendingJobs: [],
  addPendingJob: () => {},
  addFailedSave: () => {},
  removePendingJob: () => {},
  retryJob: async () => {},
  toggleTried: async () => {},
  deleteVideo: async () => {},
  renameVideo: async () => {},
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
  const pendingJobsRef = useRef<PendingJob[]>([]);
  useEffect(() => { pendingJobsRef.current = pendingJobs; }, [pendingJobs]);

  const addPendingJob = useCallback((jobId: string, videoId: string, url: string) => {
    setPendingJobs(prev =>
      prev.some(j => j.jobId === jobId) ? prev : [...prev, { jobId, videoId, url, failed: false, createdAt: Date.now(), escalated: false }]
    );
  }, []);

  const addFailedSave = useCallback((url: string, errorMessage: string) => {
    setPendingJobs(prev => [...prev, {
      jobId: `local-${Date.now()}`,
      videoId: '',
      url,
      failed: true,
      createdAt: Date.now(),
      escalated: false,
      errorMessage,
    }]);
  }, []);

  const removePendingJob = useCallback((jobId: string) => {
    setPendingJobs(prev => prev.filter(j => j.jobId !== jobId));
  }, []);

  const retryJob = useCallback(async (jobId: string) => {
    const job = pendingJobsRef.current.find(j => j.jobId === jobId);
    if (!job) return;
    try {
      const res = await api.videos.submit(job.url);
      setPendingJobs(prev => prev.map(j => j.jobId === jobId
        ? { jobId: res.job_id, videoId: res.video_id, url: job.url, failed: false, createdAt: Date.now(), escalated: false }
        : j
      ));
    } catch (e: any) {
      setPendingJobs(prev => prev.map(j => j.jobId === jobId
        ? { ...j, errorMessage: e.message || 'Something went wrong. Please try again.' }
        : j
      ));
    }
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

  // Optimistic mutations: flip local state instantly, sync with the server in
  // the background, and fall back to a full refresh if the call fails.
  const toggleTried = useCallback(async (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId
      ? { ...v, tried: !v.tried, tried_count: !v.tried ? v.tried_count + 1 : v.tried_count }
      : v
    ));
    try {
      await api.videos.toggleTried(videoId);
      refresh();
    } catch {
      refresh();
    }
  }, [refresh]);

  const deleteVideo = useCallback(async (videoId: string) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
    try {
      await api.videos.delete(videoId);
    } catch {
      refresh();
    }
  }, [refresh]);

  const renameVideo = useCallback(async (videoId: string, title: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, title } : v));
    try {
      await api.videos.rename(videoId, title);
    } catch {
      refresh();
    }
  }, [refresh]);

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
      setPendingJobs(prev => prev.map(j =>
        !j.failed && !j.escalated && Date.now() - j.createdAt > ESCALATE_AFTER_MS
          ? { ...j, escalated: true }
          : j
      ));
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
    <DataContext.Provider value={{ videos, profile, loading, error, refresh, pendingJobs, addPendingJob, addFailedSave, removePendingJob, retryJob, toggleTried, deleteVideo, renameVideo }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
