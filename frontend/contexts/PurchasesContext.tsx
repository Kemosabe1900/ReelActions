import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID, DEV_MODE } from '@/constants/config';
import { api } from '@/services/api';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const SUB_CACHE_KEY = 'rc_subscribed_cache';

function cacheSubscribed(active: boolean) {
  AsyncStorage.setItem(SUB_CACHE_KEY, active ? 'true' : 'false').catch(() => {});
}

type PurchasesContextValue = {
  isSubscribed: boolean;
  packages: PurchasesPackage[];
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<boolean>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [isSubscribed, setIsSubscribed] = useState(DEV_MODE);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  // The user id we've finished a subscription check for. Until it catches up
  // with the current userId, purchases are stale for this user.
  const [checkedUserId, setCheckedUserId] = useState<string | undefined>(undefined);
  const configured = useRef(false);
  const lastUserId = useRef<string | undefined>(undefined);
  const bootedFromCache = useRef(false);
  const checkGeneration = useRef(0);

  useEffect(() => {
    (async () => {
      if (DEV_MODE || IS_EXPO_GO) { setLoading(false); return; }

      // Boot instantly from the last known subscription status so cold open
      // isn't gated on a RevenueCat network round-trip. checkSubscription()
      // still runs below and corrects the state if it changed.
      if (!bootedFromCache.current) {
        bootedFromCache.current = true;
        try {
          if (await AsyncStorage.getItem(SUB_CACHE_KEY) === 'true') {
            setIsSubscribed(true);
            setLoading(false);
          }
        } catch {}
      }

      if (!configured.current) {
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
        if (!apiKey) { setLoading(false); return; }
        try {
          Purchases.configure({ apiKey });
          configured.current = true;
        } catch {
          setLoading(false);
          return;
        }
      }

      if (userId !== lastUserId.current) {
        if (userId) {
          // Re-checking subscription for a newly signed-in user — keep the app
          // in a loading state so the router doesn't flash the paywall with a
          // stale (false) subscription status before RevenueCat responds.
          setLoading(true);
          try { await Purchases.logIn(userId); } catch {}
        } else if (lastUserId.current) {
          try { await Purchases.logOut(); } catch {}
          setIsSubscribed(false);
          cacheSubscribed(false);
          setCheckedUserId(undefined);
        }
        lastUserId.current = userId;
      }

      // Offerings (paywall packages) aren't needed to start the app — load in
      // the background so the splash isn't gated on a network round-trip.
      loadOfferings();
      await checkSubscription();
    })();
  }, [userId]);

  async function loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
      } else {
        Sentry.captureMessage(`[RC] No current offering. All: ${JSON.stringify(Object.keys(offerings.all))}`, 'warning');
      }
    } catch (e: any) {
      Sentry.captureException(e, { tags: { component: 'PurchasesContext', operation: 'getOfferings' } });
    }
  }

  async function checkSubscription() {
    // Overlapping runs happen when the effect re-fires mid-check (session
    // hydrating on cold start). Only the newest run may write state, or a
    // stale pre-sign-in result can overwrite a fresh one.
    const generation = ++checkGeneration.current;
    // null = couldn't reach either source; keep whatever we booted with
    // rather than kicking a possibly-subscribed user over a network blip.
    let active: boolean | null = null;
    try {
      active = isActive(await Purchases.getCustomerInfo());
    } catch {}
    if (active !== true && userId) {
      try {
        const profile = await api.profile.get();
        active = profile.subscription_status === 'active';
      } catch {}
    }
    if (generation !== checkGeneration.current) return;
    if (active !== null) {
      setIsSubscribed(active);
      cacheSubscribed(active);
    }
    setCheckedUserId(userId);
    setLoading(false);
  }

  function isActive(info: CustomerInfo): boolean {
    return typeof info.entitlements.active['premium'] !== 'undefined';
  }

  async function purchase(pkg: PurchasesPackage) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = isActive(customerInfo);
    setIsSubscribed(active);
    cacheSubscribed(active);
  }

  async function restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    const active = isActive(info);
    setIsSubscribed(active);
    cacheSubscribed(active);
    return active;
  }

  // Stay "loading" the instant userId changes to a not-yet-checked user, so the
  // state machine sees HYDRATING (not NEEDS_SUBSCRIPTION) during sign-in and
  // never flashes the paywall. Skipped when already subscribed (cache boot) so
  // the instant cold-open optimization is preserved.
  const purchasesLoading =
    loading || (!DEV_MODE && !IS_EXPO_GO && !isSubscribed && userId !== checkedUserId);

  return (
    <PurchasesContext.Provider value={{ isSubscribed, packages, loading: purchasesLoading, purchase, restore }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchasesProvider');
  return ctx;
}
