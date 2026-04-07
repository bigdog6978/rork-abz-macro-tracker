import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { IAP_PRODUCT_IDS, IapCustomerState, mapCustomerLikeInfoToState } from './iapMapping';

export const IAP_PRODUCTS = {
  proMonthly: IAP_PRODUCT_IDS.proMonthly,
  athleteMonthly: IAP_PRODUCT_IDS.athleteMonthly,
} as const;

export type IapTier = 'pro' | 'athlete';

export interface IapProductView {
  productId: string;
  title: string;
  priceText: string;
  billingPeriodText: string;
}

let isConfigured = false;

function getRevenueCatKey(): string {
  const key =
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY as string | undefined) ??
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  return key ?? '';
}

function periodUnitToText(unit: string | undefined): string {
  if (!unit) return 'month';
  if (unit === 'DAY') return 'day';
  if (unit === 'WEEK') return 'week';
  if (unit === 'YEAR') return 'year';
  return 'month';
}

function mapPackageToView(pkg: PurchasesPackage): IapProductView {
  const p = pkg.product;
  const unit = periodUnitToText((p.subscriptionPeriod as any)?.unit);
  const value = Number((p.subscriptionPeriod as any)?.value ?? 1);
  const billingPeriodText = `per ${value > 1 ? `${value} ${unit}s` : unit}`;
  return {
    productId: p.identifier,
    title: p.title || p.identifier,
    priceText: p.priceString,
    billingPeriodText,
  };
}

export function mapCustomerInfoToState(info: CustomerInfo): IapCustomerState {
  const anyInfo = info as any;
  const entitlementValues = Object.values(anyInfo.entitlements?.all ?? {}) as Array<any>;
  const hasBillingIssue = entitlementValues.some((e) => Boolean(e?.billingIssueDetectedAt));
  const gracePeriodExpiresDate =
    entitlementValues.map((e) => e?.gracePeriodExpiresDate).find(Boolean) ?? null;
  const isDeferred = entitlementValues.some((e) => Boolean(e?.isSandbox && e?.periodType === 'trial' && !e?.isActive));

  return mapCustomerLikeInfoToState({
    activeSubscriptions: info.activeSubscriptions,
    latestExpirationDate: info.latestExpirationDate,
    billingIssueDetectedAt: hasBillingIssue ? new Date().toISOString() : null,
    gracePeriodExpiresDate,
    deferred: isDeferred,
    nowIso: anyInfo.requestDate ?? new Date().toISOString(),
  });
}

export async function initIAP(): Promise<void> {
  if (Platform.OS !== 'ios' || isConfigured) return;
  const key = getRevenueCatKey();
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY');
  }
  await Purchases.configure({ apiKey: key });
  isConfigured = true;
}

async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  await initIAP();
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function getProducts(): Promise<IapProductView[]> {
  if (Platform.OS !== 'ios') return [];
  const offering = await getCurrentOffering();
  if (!offering) return [];
  return offering.availablePackages
    .filter(
      (pkg) =>
        pkg.product.identifier === IAP_PRODUCTS.proMonthly ||
        pkg.product.identifier === IAP_PRODUCTS.athleteMonthly
    )
    .map(mapPackageToView);
}

function getProductIdForTier(tier: IapTier): string {
  return tier === 'athlete' ? IAP_PRODUCTS.athleteMonthly : IAP_PRODUCTS.proMonthly;
}

async function getPackageForTier(tier: IapTier): Promise<PurchasesPackage | null> {
  const offering = await getCurrentOffering();
  if (!offering) return null;
  return (
    offering.availablePackages.find((pkg) => pkg.product.identifier === getProductIdForTier(tier)) ?? null
  );
}

export async function purchaseTier(tier: IapTier): Promise<IapCustomerState> {
  await initIAP();
  const pkg = await getPackageForTier(tier);
  if (!pkg) throw new Error(`Product not available: ${tier}`);
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return mapCustomerInfoToState(customerInfo);
}

export async function restorePurchases(): Promise<IapCustomerState> {
  await initIAP();
  const info = await Purchases.restorePurchases();
  return mapCustomerInfoToState(info);
}

export async function getCustomerState(): Promise<IapCustomerState> {
  await initIAP();
  const info = await Purchases.getCustomerInfo();
  return mapCustomerInfoToState(info);
}

export async function openManageSubscriptions(): Promise<void> {
  await Linking.openURL('https://apps.apple.com/account/subscriptions');
}

