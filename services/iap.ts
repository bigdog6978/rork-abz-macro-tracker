import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { IapCustomerState, LIFETIME_PRODUCT_ID, mapOwnedProductsToEntitlement } from './iapMapping';

export interface IapProductView {
  productId: string;
  title: string;
  priceText: string;
}

let isConfigured = false;

function getRevenueCatKey(): string {
  const key =
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY as string | undefined) ??
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  return key ?? '';
}

function mapPackageToView(pkg: PurchasesPackage): IapProductView {
  const p = pkg.product;
  return {
    productId: p.identifier,
    title: p.title || p.identifier,
    priceText: p.priceString,
  };
}

export function mapCustomerInfoToState(info: CustomerInfo): IapCustomerState {
  const anyInfo = info as any;
  const activeEntitlementProductIds = (Object.values(anyInfo.entitlements?.active ?? {}) as Array<any>)
    .map((e) => e?.productIdentifier)
    .filter(Boolean) as string[];
  const allPurchased = (anyInfo.allPurchasedProductIdentifiers ?? []) as string[];
  const ownedIds = Array.from(
    new Set<string>([...activeEntitlementProductIds, ...allPurchased])
  );

  return {
    entitlement: mapOwnedProductsToEntitlement(ownedIds),
    activeProductIds: ownedIds,
  };
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
    .filter((pkg) => pkg.product.identifier === LIFETIME_PRODUCT_ID)
    .map(mapPackageToView);
}

async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  const offering = await getCurrentOffering();
  if (!offering) return null;
  return offering.availablePackages.find((pkg) => pkg.product.identifier === LIFETIME_PRODUCT_ID) ?? null;
}

export async function purchaseLifetime(): Promise<IapCustomerState> {
  await initIAP();
  const pkg = await getLifetimePackage();
  if (!pkg) throw new Error('Product not available: lifetime');
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
