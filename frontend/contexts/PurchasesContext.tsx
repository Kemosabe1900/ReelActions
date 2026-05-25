import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID, DEV_MODE } from '@/constants/config';

type PurchasesContextValue = {
  isSubscribed: boolean;
  packages: PurchasesPackage[];
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [isSubscribed, setIsSubscribed] = useState(DEV_MODE);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_MODE) { setLoading(false); return; }

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    if (!apiKey) { setLoading(false); return; }

    Purchases.configure({ apiKey });

    if (userId) {
      Purchases.logIn(userId).catch(() => {});
    }

    loadOfferings();
    checkSubscription();
  }, [userId]);

  async function loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
      }
    } catch {
      // offerings unavailable (simulator, no products configured yet)
    }
  }

  async function checkSubscription() {
    try {
      const info = await Purchases.getCustomerInfo();
      setIsSubscribed(isActive(info));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function isActive(info: CustomerInfo): boolean {
    return typeof info.entitlements.active['premium'] !== 'undefined';
  }

  async function purchase(pkg: PurchasesPackage) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    setIsSubscribed(isActive(customerInfo));
  }

  async function restore() {
    const info = await Purchases.restorePurchases();
    setIsSubscribed(isActive(info));
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
