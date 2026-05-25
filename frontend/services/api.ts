import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { DEV_MODE } from '@/constants/config';

// Android emulator uses 10.0.2.2 to reach host localhost; iOS simulator uses localhost directly
const BASE_URL = 'http://10.0.0.62:8000/api/v1';

// When deploying, replace BASE_URL with your server URL e.g. 'https://api.reelactions.com/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!DEV_MODE) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Video = {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  category: string | null;
  summary: string | null;
  structured_data: Record<string, unknown> | null;
  tried: boolean;
  tried_count: number;
  tried_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  current_streak: number;
  longest_streak: number;
  explorer_score: number;
  explorer_tried: number;
  explorer_total: number;
  subscription_status: string;
  email: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  user_id: string;
  video_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  created_at: string;
};

export type SubmitVideoResponse = {
  job_id: string;
  video_id: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatSource = {
  id: string;
  url: string;
  title: string;
};

export const api = {
  videos: {
    list: (params?: { category?: string; tried?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.tried !== undefined) query.set('tried', String(params.tried));
      const qs = query.toString();
      return request<Video[]>(`/videos${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<Video>(`/videos/${id}`),
    submit: (url: string) =>
      request<SubmitVideoResponse>('/videos', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    rename: (id: string, title: string) =>
      request<Video>(`/videos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    toggleTried: (id: string) =>
      request<Video>(`/videos/${id}/tried`, { method: 'PATCH' }),
    delete: (id: string) =>
      request<void>(`/videos/${id}`, { method: 'DELETE' }),
  },

  jobs: {
    get: (id: string) => request<Job>(`/jobs/${id}`),
  },

  profile: {
    get: () => request<Profile>('/profile'),
  },

  chat: {
    // SSE streaming via XHR — fetch doesn't support ReadableStream in React Native
    stream: async (
      message: string,
      history: ChatMessage[],
      onDelta: (text: string) => void,
      onSources: (sources: ChatSource[]) => void,
      onDone: () => void,
      onError: (err: Error) => void,
    ) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/chat`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      if (!DEV_MODE) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        }
      }

      let cursor = 0;
      let buffer = '';

      xhr.onprogress = () => {
        const chunk = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { onDone(); return; }
          try {
            const event = JSON.parse(raw);
            if (event.type === 'delta') onDelta(event.text);
            else if (event.type === 'sources') onSources(event.urls);
          } catch {}
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 400) {
          onError(new Error(`API error ${xhr.status}`));
        }
      };

      xhr.onerror = () => onError(new Error('Network error'));

      xhr.send(JSON.stringify({ message, history }));
    },
  },

  pushTokens: {
    register: (token: string) =>
      request<void>('/push-tokens', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },
};
