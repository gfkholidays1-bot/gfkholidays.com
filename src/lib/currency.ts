import { useState, useEffect, useCallback } from 'react';

export type SupportedCurrency =
  | 'INR'
  | 'MYR'
  | 'USD'
  | 'SGD'
  | 'GBP'
  | 'EUR'
  | 'AED'
  | 'AUD';

export const CURRENCY_ORDER: SupportedCurrency[] = [
  'INR',
  'USD',
  'MYR',
  'SGD',
  'GBP',
  'EUR',
  'AED',
  'AUD'
];

export const SUPPORTED_CURRENCIES: Record<
  SupportedCurrency,
  { code: SupportedCurrency; symbol: string; locale: string; label: string }
> = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'Indian Rupee (INR)' },
  MYR: { code: 'MYR', symbol: 'RM ', locale: 'en-US', label: 'Malaysian Ringgit (MYR)' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar (USD)' },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG', label: 'Singapore Dollar (SGD)' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound (GBP)' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', label: 'Euro (EUR)' },
  AED: { code: 'AED', symbol: 'AED ', locale: 'en-AE', label: 'UAE Dirham (AED)' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', label: 'Australian Dollar (AUD)' }
};

export interface GeoInfo {
  countryCode: string;
  countryName: string;
  source:
    | 'browser-geolocation'
    | 'ip-geo'
    | 'edge-header'
    | 'locale-timezone'
    | 'fallback';
}

export interface XeRateInfo {
  base: 'MYR';
  target: 'INR';
  rate: number; // Base market mid-rate MYR -> INR (without markup)
  rates: Record<SupportedCurrency, number>;
  source: string;
  updatedAt: string;
}

export interface FxPricingConfig {
  markupInr: number; // Flat INR buffer added per 1 MYR (default +₹1.00)
  markupPercent: number; // Optional percentage FX buffer for INR (default 0%)
  intlMarkupPercent: number; // Percentage FX buffer for USD / SGD / GBP / EUR / AED / AUD at checkout (default 2%)
  refreshSeconds: number; // Auto-sync interval in seconds (default 120s / 2 mins)
  useManualRate: boolean; // Admin lock to override FX feed for INR
  manualRateOverride: number; // Fixed MYR -> INR rate if useManualRate is true
}

export const DEFAULT_FX_RATES: Record<SupportedCurrency, number> = {
  MYR: 1,
  INR: 19.65,
  USD: 0.228,
  SGD: 0.304,
  GBP: 0.178,
  EUR: 0.212,
  AED: 0.838,
  AUD: 0.348
};

const STORAGE_RATE_KEY = 'gfk_fx_rates_cache_v2';
const STORAGE_FX_CONFIG_KEY = 'gfk_fx_config_v1';
const SESSION_GEO_KEY = 'gfk_geo_detected_v1';
const CURRENCY_EVENT = 'gfk-currency-sync';

const DEFAULT_FX_CONFIG: FxPricingConfig = {
  markupInr: 1, // Default +₹1.00 above market rate to protect INR payouts & Stripe settlement
  markupPercent: 0,
  intlMarkupPercent: 2, // Default 2% margin for international checkout currencies (USD, SGD, GBP, EUR, AED, AUD)
  refreshSeconds: 120, // 2-minute automatic sync cadence
  useManualRate: false,
  manualRateOverride: 20.65
};

const EURO_COUNTRIES = new Set([
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR', 'EU'
]);

export function mapCountryToCurrency(countryCode: string): SupportedCurrency {
  const code = String(countryCode || '').trim().toUpperCase();
  if (code === 'IN') return 'INR';
  if (code === 'MY') return 'MYR';
  if (code === 'SG') return 'SGD';
  if (code === 'GB' || code === 'UK') return 'GBP';
  if (code === 'AE') return 'AED';
  if (code === 'AU') return 'AUD';
  if (EURO_COUNTRIES.has(code)) return 'EUR';
  return 'USD';
}

function isSupportedCurrency(val: any): val is SupportedCurrency {
  return typeof val === 'string' && val in SUPPORTED_CURRENCIES;
}

function detectInitialGeoFromLocale(): { currency: SupportedCurrency; geo: GeoInfo } {
  if (typeof window === 'undefined') {
    return {
      currency: 'INR',
      geo: { countryCode: 'IN', countryName: 'India', source: 'fallback' }
    };
  }

  // Check short-lived session cache from recent /api/geo-currency detection
  try {
    const cachedRaw = window.sessionStorage.getItem(SESSION_GEO_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed?.geo?.countryCode && isSupportedCurrency(parsed?.currency)) {
        return { currency: parsed.currency, geo: parsed.geo };
      }
    }
  } catch (_e) {}

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toUpperCase();

    if (tz.includes('Kolkata') || tz.includes('Calcutta') || lang.endsWith('-IN') || lang === 'HI') {
      return {
        currency: 'INR',
        geo: { countryCode: 'IN', countryName: 'India', source: 'locale-timezone' }
      };
    }
    if (tz.includes('Kuala_Lumpur') || tz.includes('Kuching') || lang.endsWith('-MY') || lang.startsWith('MS')) {
      return {
        currency: 'MYR',
        geo: { countryCode: 'MY', countryName: 'Malaysia', source: 'locale-timezone' }
      };
    }
    if (tz.includes('Singapore') || lang.endsWith('-SG')) {
      return {
        currency: 'SGD',
        geo: { countryCode: 'SG', countryName: 'Singapore', source: 'locale-timezone' }
      };
    }
    if (tz.includes('London') || lang.endsWith('-GB')) {
      return {
        currency: 'GBP',
        geo: { countryCode: 'GB', countryName: 'United Kingdom', source: 'locale-timezone' }
      };
    }
    if (tz.includes('Dubai') || lang.endsWith('-AE')) {
      return {
        currency: 'AED',
        geo: { countryCode: 'AE', countryName: 'UAE', source: 'locale-timezone' }
      };
    }
    if (tz.startsWith('Australia/') || lang.endsWith('-AU')) {
      return {
        currency: 'AUD',
        geo: { countryCode: 'AU', countryName: 'Australia', source: 'locale-timezone' }
      };
    }
    if (tz.startsWith('Europe/')) {
      return {
        currency: 'EUR',
        geo: { countryCode: 'EU', countryName: 'Europe', source: 'locale-timezone' }
      };
    }
    if (tz.startsWith('America/') || lang.endsWith('-US')) {
      return {
        currency: 'USD',
        geo: { countryCode: 'US', countryName: 'United States', source: 'locale-timezone' }
      };
    }
  } catch (_e) {}

  return {
    currency: 'USD',
    geo: { countryCode: 'US', countryName: 'International', source: 'fallback' }
  };
}

const initialLocaleDetection = detectInitialGeoFromLocale();
let sharedCurrency: SupportedCurrency = initialLocaleDetection.currency;
let sharedGeoInfo: GeoInfo = initialLocaleDetection.geo;
let geoDetectionStarted = false;
let geoDetectionPromise: Promise<GeoInfo> | null = null;

let sharedFxConfig: FxPricingConfig = (() => {
  if (typeof window === 'undefined') return { ...DEFAULT_FX_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_FX_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        markupInr:
          typeof parsed.markupInr === 'number' && parsed.markupInr >= 0
            ? parsed.markupInr
            : DEFAULT_FX_CONFIG.markupInr,
        markupPercent:
          typeof parsed.markupPercent === 'number' && parsed.markupPercent >= 0
            ? parsed.markupPercent
            : DEFAULT_FX_CONFIG.markupPercent,
        intlMarkupPercent:
          typeof parsed.intlMarkupPercent === 'number' && parsed.intlMarkupPercent >= 0
            ? parsed.intlMarkupPercent
            : DEFAULT_FX_CONFIG.intlMarkupPercent,
        refreshSeconds:
          typeof parsed.refreshSeconds === 'number' && parsed.refreshSeconds >= 30
            ? parsed.refreshSeconds
            : DEFAULT_FX_CONFIG.refreshSeconds,
        useManualRate: Boolean(parsed.useManualRate),
        manualRateOverride:
          typeof parsed.manualRateOverride === 'number' && parsed.manualRateOverride > 5
            ? parsed.manualRateOverride
            : DEFAULT_FX_CONFIG.manualRateOverride
      };
    }
  } catch (_e) {}
  return { ...DEFAULT_FX_CONFIG };
})();

let sharedRateInfo: XeRateInfo = (() => {
  const fallback: XeRateInfo = {
    base: 'MYR',
    target: 'INR',
    rate: DEFAULT_FX_RATES.INR,
    rates: { ...DEFAULT_FX_RATES },
    source: 'Treasury Mid-Market Feed',
    updatedAt: new Date().toISOString()
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_RATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.rate === 'number' && parsed.rate > 5 && parsed.rate < 60) {
        return {
          ...fallback,
          ...parsed,
          rates: {
            ...DEFAULT_FX_RATES,
            ...(parsed.rates || {}),
            MYR: 1,
            INR: Number(parsed.rate) || DEFAULT_FX_RATES.INR
          }
        };
      }
    }
  } catch (_e) {}
  return fallback;
})();

let inflightPromise: Promise<XeRateInfo> | null = null;
let lastFetchedMs = 0;
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
let mountedHookCount = 0;

function emitSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT));
  }
}

export function computeEffectiveRate(
  baseRate: number = sharedRateInfo.rate,
  config: FxPricingConfig = sharedFxConfig
): number {
  if (config.useManualRate && config.manualRateOverride > 5) {
    return Number(config.manualRateOverride.toFixed(4));
  }
  const safeBase = Number(baseRate) || DEFAULT_FX_RATES.INR;
  const pctMultiplier = 1 + Math.max(0, Number(config.markupPercent) || 0) / 100;
  const flatAdd = Number(config.markupInr);
  const safeFlatAdd = Number.isFinite(flatAdd) ? flatAdd : DEFAULT_FX_CONFIG.markupInr;
  return Number(Math.max(1, safeBase * pctMultiplier + safeFlatAdd).toFixed(4));
}

export function computeEffectiveRateFor(
  targetCurrency: SupportedCurrency,
  baseRates: Record<SupportedCurrency, number> = sharedRateInfo.rates,
  config: FxPricingConfig = sharedFxConfig
): number {
  if (targetCurrency === 'MYR') return 1;
  if (targetCurrency === 'INR') {
    return computeEffectiveRate(baseRates.INR ?? sharedRateInfo.rate, config);
  }
  const market = Number(baseRates[targetCurrency]) || DEFAULT_FX_RATES[targetCurrency] || 1;
  const intlPct = Number(config.intlMarkupPercent);
  const safeIntlPct = Number.isFinite(intlPct)
    ? Math.max(0, intlPct)
    : DEFAULT_FX_CONFIG.intlMarkupPercent;
  return Number((market * (1 + safeIntlPct / 100)).toFixed(4));
}

export function getEffectiveRate(): number {
  return computeEffectiveRate(sharedRateInfo.rate, sharedFxConfig);
}

export function getFxConfig(): FxPricingConfig {
  return sharedFxConfig;
}

export function getGeoInfo(): GeoInfo {
  return sharedGeoInfo;
}

export function syncFxConfig(partial: Partial<FxPricingConfig>) {
  const next: FxPricingConfig = {
    markupInr:
      partial.markupInr !== undefined && Number.isFinite(Number(partial.markupInr))
        ? Number(partial.markupInr)
        : sharedFxConfig.markupInr,
    markupPercent:
      partial.markupPercent !== undefined && Number.isFinite(Number(partial.markupPercent))
        ? Math.max(0, Number(partial.markupPercent))
        : sharedFxConfig.markupPercent,
    intlMarkupPercent:
      partial.intlMarkupPercent !== undefined && Number.isFinite(Number(partial.intlMarkupPercent))
        ? Math.max(0, Number(partial.intlMarkupPercent))
        : sharedFxConfig.intlMarkupPercent,
    refreshSeconds:
      partial.refreshSeconds !== undefined && Number(partial.refreshSeconds) >= 30
        ? Math.min(3600, Math.round(Number(partial.refreshSeconds)))
        : sharedFxConfig.refreshSeconds,
    useManualRate:
      partial.useManualRate !== undefined
        ? Boolean(partial.useManualRate)
        : sharedFxConfig.useManualRate,
    manualRateOverride:
      partial.manualRateOverride !== undefined && Number(partial.manualRateOverride) > 5
        ? Number(partial.manualRateOverride)
        : sharedFxConfig.manualRateOverride
  };

  const intervalChanged = next.refreshSeconds !== sharedFxConfig.refreshSeconds;
  const changed =
    next.markupInr !== sharedFxConfig.markupInr ||
    next.markupPercent !== sharedFxConfig.markupPercent ||
    next.intlMarkupPercent !== sharedFxConfig.intlMarkupPercent ||
    intervalChanged ||
    next.useManualRate !== sharedFxConfig.useManualRate ||
    next.manualRateOverride !== sharedFxConfig.manualRateOverride;

  if (!changed) return;

  sharedFxConfig = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_FX_CONFIG_KEY, JSON.stringify(next));
    } catch (_e) {}
  }
  if (intervalChanged && mountedHookCount > 0) {
    restartAutoRefreshTimer();
  }
  emitSync();
}

export function setGlobalCurrency(next: SupportedCurrency) {
  sharedCurrency = next;
  emitSync();
}

/**
 * Utility function to automatically set the default currency for the entire site
 * based on the user's ISO 3166-1 alpha-2 country code (e.g. INR for India, MYR for Malaysia, USD for others),
 * overriding any hardcoded default currency.
 */
export function setDefaultCurrencyByCountry(
  countryCode: string,
  countryName?: string,
  source: GeoInfo['source'] = 'browser-geolocation'
): SupportedCurrency {
  const normalizedCode = String(countryCode || '').trim().toUpperCase();
  const nextCurrency = mapCountryToCurrency(normalizedCode);
  const nextGeo: GeoInfo = {
    countryCode: normalizedCode || 'US',
    countryName: countryName || normalizedCode || 'International',
    source
  };

  sharedCurrency = nextCurrency;
  sharedGeoInfo = nextGeo;

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(
        SESSION_GEO_KEY,
        JSON.stringify({ currency: nextCurrency, geo: nextGeo })
      );
    } catch (_e) {}
  }

  emitSync();
  return nextCurrency;
}

export async function resolveCountryFromCoordinates(
  latitude: number,
  longitude: number
): Promise<{ countryCode: string; countryName: string } | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  try {
    const res = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(
        String(longitude)
      )}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const cc = String(data?.countryCode || '').trim().toUpperCase();
      if (data?.ok && cc.length === 2) {
        return {
          countryCode: cc,
          countryName: String(data?.countryName || cc)
        };
      }
    }
  } catch (_e) {}

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    try {
      const extRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
          String(latitude)
        )}&longitude=${encodeURIComponent(String(longitude))}&localityLanguage=en`,
        { signal: controller.signal }
      );
      if (extRes.ok) {
        const extData = await extRes.json();
        const cc = String(extData?.countryCode || '').trim().toUpperCase();
        if (cc.length === 2) {
          return {
            countryCode: cc,
            countryName: String(extData?.countryName || cc)
          };
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (_e) {}

  return null;
}

export function getGlobalCurrency(): SupportedCurrency {
  return sharedCurrency;
}

export function getGlobalXeRate(): XeRateInfo {
  return sharedRateInfo;
}

function getCacheTtlMs(): number {
  return Math.max(30, Number(sharedFxConfig.refreshSeconds) || 120) * 1000;
}

function restartAutoRefreshTimer() {
  if (typeof window === 'undefined') return;
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  if (mountedHookCount > 0) {
    const intervalMs = getCacheTtlMs();
    autoRefreshTimer = setInterval(() => {
      if (!sharedFxConfig.useManualRate) {
        fetchLiveXeRate(false).catch(() => {});
      }
    }, intervalMs);
  }
}

export async function detectGeoCurrency(): Promise<GeoInfo> {
  if (typeof window === 'undefined') return sharedGeoInfo;
  if (getGeoInfo().source === 'browser-geolocation') return sharedGeoInfo;
  if (geoDetectionPromise) return geoDetectionPromise;

  geoDetectionPromise = (async () => {
    if (getGeoInfo().source === 'browser-geolocation') {
      return sharedGeoInfo;
    }
    try {
      const res = await fetch('/api/geo-currency', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.countryCode && getGeoInfo().source !== 'browser-geolocation') {
          setDefaultCurrencyByCountry(
            String(data.countryCode),
            String(data.countryName || data.countryCode),
            data.source === 'edge-header' ? 'edge-header' : 'ip-geo'
          );
          return sharedGeoInfo;
        }
      }
    } catch (_e) {}

    // Direct IP geo fallback for static hosting without server middleware
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      try {
        const ipRes = await fetch('https://ipwho.is/', { signal: controller.signal });
        if (ipRes.ok) {
          const ipJson = await ipRes.json();
          const cc = String(ipJson?.country_code || '').toUpperCase();
          if (cc && cc.length === 2 && getGeoInfo().source !== 'browser-geolocation') {
            setDefaultCurrencyByCountry(
              cc,
              String(ipJson?.country || cc),
              'ip-geo'
            );
            return sharedGeoInfo;
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (_e) {}

    return sharedGeoInfo;
  })();

  return geoDetectionPromise;
}

function buildRatesMap(rawRates: any, primaryInr?: number): Record<SupportedCurrency, number> {
  const out: Record<SupportedCurrency, number> = { ...DEFAULT_FX_RATES, MYR: 1 };
  for (const code of CURRENCY_ORDER) {
    if (code === 'MYR') continue;
    const val = Number(rawRates?.[code]);
    if (val > 0) {
      out[code] = Number(val.toFixed(4));
    }
  }
  if (primaryInr && primaryInr > 5) {
    out.INR = Number(primaryInr.toFixed(4));
  }
  return out;
}

export async function fetchLiveXeRate(force = false): Promise<XeRateInfo> {
  const now = Date.now();
  const ttlMs = getCacheTtlMs();
  if (!force && now - lastFetchedMs < ttlMs && lastFetchedMs > 0) {
    return sharedRateInfo;
  }
  if (inflightPromise && !force) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    const ttlSec = Math.max(30, Math.round(ttlMs / 1000));
    try {
      // 1. Primary: Server-side FX Treasury Proxy
      const res = await fetch(
        `/api/fx-rate?base=MYR&target=INR&ttlSec=${ttlSec}${force ? '&force=1' : ''}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const inrRate = Number(data?.rate || data?.rates?.INR);
        if (inrRate > 5) {
          const rates = buildRatesMap(data?.rates, inrRate);
          sharedRateInfo = {
            base: 'MYR',
            target: 'INR',
            rate: rates.INR,
            rates,
            source: data.source || 'Treasury Mid-Market Feed',
            updatedAt: data.updatedAt || new Date().toISOString()
          };
          lastFetchedMs = Date.now();
          try {
            window.localStorage.setItem(STORAGE_RATE_KEY, JSON.stringify(sharedRateInfo));
          } catch (_e) {}
          emitSync();
          return sharedRateInfo;
        }
      }
    } catch (_e) {}

    try {
      // 2. Static host fallback (CDN preview without server API)
      const extRes = await fetch('https://open.er-api.com/v6/latest/MYR');
      if (extRes.ok) {
        const extData = await extRes.json();
        const inrRate = Number(extData?.rates?.INR);
        if (inrRate && inrRate > 5) {
          const rates = buildRatesMap(extData?.rates, inrRate);
          sharedRateInfo = {
            base: 'MYR',
            target: 'INR',
            rate: rates.INR,
            rates,
            source: 'Treasury Mid-Market Feed',
            updatedAt: new Date().toISOString()
          };
          lastFetchedMs = Date.now();
          try {
            window.localStorage.setItem(STORAGE_RATE_KEY, JSON.stringify(sharedRateInfo));
          } catch (_e) {}
          emitSync();
          return sharedRateInfo;
        }
      }
    } catch (_e) {}

    return sharedRateInfo;
  })().finally(() => {
    inflightPromise = null;
  });

  return inflightPromise;
}

export function convertMyrToInr(
  myrAmount: number,
  effectiveRate: number = getEffectiveRate()
): number {
  const safeMyr = Number(myrAmount) || 0;
  const safeRate = Number(effectiveRate) || getEffectiveRate();
  return Math.round(safeMyr * safeRate);
}

export function convertMyrToInrExact(
  myrAmount: number,
  effectiveRate: number = getEffectiveRate()
): number {
  const safeMyr = Number(myrAmount) || 0;
  const safeRate = Number(effectiveRate) || getEffectiveRate();
  return Number((safeMyr * safeRate).toFixed(2));
}

export function convertMyrToCurrencyExact(
  myrAmount: number,
  targetCurrency: SupportedCurrency,
  baseRates: Record<SupportedCurrency, number> = sharedRateInfo.rates,
  config: FxPricingConfig = sharedFxConfig
): number {
  const safeMyr = Number(myrAmount) || 0;
  const rate = computeEffectiveRateFor(targetCurrency, baseRates, config);
  return Number((safeMyr * rate).toFixed(2));
}

export function convertMyrToCurrencyRounded(
  myrAmount: number,
  targetCurrency: SupportedCurrency,
  baseRates: Record<SupportedCurrency, number> = sharedRateInfo.rates,
  config: FxPricingConfig = sharedFxConfig
): number {
  const safeMyr = Number(myrAmount) || 0;
  const rate = computeEffectiveRateFor(targetCurrency, baseRates, config);
  return Math.round(safeMyr * rate);
}

export function formatCurrencyValue(
  amount: number,
  currency: SupportedCurrency = sharedCurrency,
  exact = false
): string {
  const safeVal = Number(amount) || 0;
  const meta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  const formatted = safeVal.toLocaleString(
    meta.locale,
    exact
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 0 }
  );
  return `${meta.symbol}${formatted}`;
}

export function formatAmountInCurrency(
  myrAmount: number,
  currency: SupportedCurrency = sharedCurrency,
  baseRates: Record<SupportedCurrency, number> = sharedRateInfo.rates,
  config: FxPricingConfig = sharedFxConfig
): string {
  const converted = convertMyrToCurrencyRounded(myrAmount, currency, baseRates, config);
  return formatCurrencyValue(converted, currency, false);
}

export function formatExactInr(inrAmount: number): string {
  return formatCurrencyValue(inrAmount, 'INR', true);
}

export function useCurrencyRate() {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(sharedCurrency);
  const [geoInfo, setGeoInfo] = useState<GeoInfo>(sharedGeoInfo);
  const [rateInfo, setRateInfo] = useState<XeRateInfo>(sharedRateInfo);
  const [fxConfig, setFxConfigState] = useState<FxPricingConfig>(sharedFxConfig);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    mountedHookCount += 1;
    if (mountedHookCount === 1) {
      restartAutoRefreshTimer();
    }

    const sync = () => {
      setCurrencyState(sharedCurrency);
      setGeoInfo(sharedGeoInfo);
      setRateInfo(sharedRateInfo);
      setFxConfigState(sharedFxConfig);
    };
    window.addEventListener(CURRENCY_EVENT, sync);
    window.addEventListener('storage', sync);

    // Silent background FX fetch + IP geo detection once per session
    fetchLiveXeRate(false).catch(() => {});
    if (!geoDetectionStarted) {
      geoDetectionStarted = true;
      detectGeoCurrency().catch(() => {});
    }

    return () => {
      mountedHookCount = Math.max(0, mountedHookCount - 1);
      if (mountedHookCount === 0 && autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      window.removeEventListener(CURRENCY_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setGlobalCurrency(next);
  }, []);

  const refreshRate = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updated = await fetchLiveXeRate(true);
      setRateInfo(updated);
      return updated;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const effectiveInrRate = computeEffectiveRate(rateInfo.rate, fxConfig);

  const getEffectiveRateFor = useCallback(
    (target: SupportedCurrency) => computeEffectiveRateFor(target, rateInfo.rates, fxConfig),
    [rateInfo.rates, fxConfig]
  );

  const formatPrice = useCallback(
    (myrAmount: number) => formatAmountInCurrency(myrAmount, currency, rateInfo.rates, fxConfig),
    [currency, rateInfo.rates, fxConfig]
  );

  const formatSecondaryPrice = useCallback(
    (myrAmount: number) => {
      if (currency === 'MYR') {
        return formatAmountInCurrency(myrAmount, 'USD', rateInfo.rates, fxConfig);
      }
      return `RM ${Math.round(Number(myrAmount) || 0).toLocaleString('en-US')}`;
    },
    [currency, rateInfo.rates, fxConfig]
  );

  const convertToCurrencyExact = useCallback(
    (myrAmount: number, target: SupportedCurrency) =>
      convertMyrToCurrencyExact(myrAmount, target, rateInfo.rates, fxConfig),
    [rateInfo.rates, fxConfig]
  );

  return {
    currency,
    geoInfo,
    setCurrency,
    rate: effectiveInrRate,
    baseRate: rateInfo.rate,
    baseRates: rateInfo.rates,
    fxConfig,
    rateInfo,
    isRefreshing,
    refreshRate,
    formatPrice,
    formatSecondaryPrice,
    getEffectiveRateFor,
    convertToCurrencyExact,
    formatExact: (amount: number, target: SupportedCurrency) =>
      formatCurrencyValue(amount, target, true),
    toInr: (myr: number) => convertMyrToInr(myr, effectiveInrRate),
    toInrExact: (myr: number) => convertMyrToInrExact(myr, effectiveInrRate)
  };
}
