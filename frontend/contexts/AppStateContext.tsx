import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { DEV_MODE, BYPASS_PAYWALL } from '@/constants/config';

export type AppStatus =
  | 'HYDRATING'
  | 'NEEDS_ONBOARDING'
  | 'NEEDS_SUBSCRIPTION'
  | 'NEEDS_REGISTRATION'
  | 'AUTHENTICATED';

const RESET_ONBOARDING = false;

type AppStateContextValue = {
  status: AppStatus;
  markOnboardingComplete: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isSubscribed, loading: purchasesLoading } = usePurchases();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (RESET_ONBOARDING) {
        await AsyncStorage.removeItem('onboarding_complete');
        setOnboardingDone(false);
        return;
      }
      const val = await AsyncStorage.getItem('onboarding_complete');
      setOnboardingDone(val === 'true');
    })();
  }, []);

  const prevSession = useRef(session);
  useEffect(() => {
    if (prevSession.current && !session) {
      AsyncStorage.removeItem('onboarding_complete');
      setOnboardingDone(false);
    }
    prevSession.current = session;
  }, [session]);

  const markOnboardingComplete = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    setOnboardingDone(true);
  };

  const effectivelySubscribed = isSubscribed || BYPASS_PAYWALL;

  let status: AppStatus;
  if (authLoading || purchasesLoading || onboardingDone === null) {
    status = 'HYDRATING';
  } else if (DEV_MODE) {
    status = 'AUTHENTICATED';
  } else if (!onboardingDone && !session) {
    status = 'NEEDS_ONBOARDING';
  } else if (!effectivelySubscribed) {
    status = 'NEEDS_SUBSCRIPTION';
  } else if (effectivelySubscribed && !session) {
    status = 'NEEDS_REGISTRATION';
  } else {
    status = 'AUTHENTICATED';
  }

  return (
    <AppStateContext.Provider value={{ status, markOnboardingComplete }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
