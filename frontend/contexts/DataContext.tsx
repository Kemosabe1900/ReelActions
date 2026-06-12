import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api, Video, Profile } from '@/services/api';
import { useAuth } from './AuthContext';

type DataContextType = {
  videos: Video[];
  profile: Profile | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
};

const DataContext = createContext<DataContextType>({
  videos: [],
  profile: null,
  loading: true,
  error: false,
  refresh: async () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

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

  return (
    <DataContext.Provider value={{ videos, profile, loading, error, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
