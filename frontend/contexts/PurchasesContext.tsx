import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID, DEV_MODE } from '@/constants/config';
import { api } from '@/services/api';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

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
  const configured = useRef(false);
  const lastUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (DEV_MODE || IS_EXPO_GO) { setLoading(false); return; }

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
    try {
      const info = await Purchases.getCustomerInfo();
      if (isActive(info)) {
        setIsSubscribed(true);
        setLoading(false);
        return;
      }
    } catch {}
    if (userId) {
      try {
        const profile = await api.profile.get();
        if (profile.subscription_status === 'active') {
          setIsSubscribed(true);
        }
      } catch {}
    }
    setLoading(false);
  }

  function isActive(info: CustomerInfo): boolean {
    return typeof info.entitlements.active['premium'] !== 'undefined';
  }

  async function purchase(pkg: PurchasesPackage) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    setIsSubscribed(isActive(customerInfo));
  }

  async function restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    const active = isActive(info);
    setIsSubscribed(active);
    return active;
  }

  return (
    <PurchasesContext.Provider value={{ isSubscribed, packages, loading, purchase, restore }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchasesProvider');
  return ctx;
}
