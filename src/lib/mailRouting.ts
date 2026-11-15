import { EmailHierarchyRule, GlobalSettings, ServiceHierarchyKey } from '../types';

export const CORE_SERVICE_HIERARCHY_KEYS: ServiceHierarchyKey[] = [
  'attractions',
  'hotels',
  'transfers',
  'dining',
  'packages'
];

export const ALL_MAIL_HIERARCHY_KEYS: ServiceHierarchyKey[] = [
  'attractions',
  'hotels',
  'transfers',
  'dining',
  'packages',
  'flights',
  'payments'
];

export const DEFAULT_EMAIL_HIERARCHY_MAP: Record<ServiceHierarchyKey, EmailHierarchyRule> = {
  attractions: {
    key: 'attractions',
    priority: 1,
    label: 'Attraction Tickets',
    description: 'Gate QR passes, theme parks, skybridges & observation decks',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: 'tickets@gfkholidays.com',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: true
  },
  hotels: {
    key: 'hotels',
    priority: 2,
    label: 'Hotels & Resorts',
    description: 'Direct contracted 3–5 star hotels, island villas & resorts',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: 'hotels@gfkholidays.com',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: true
  },
  transfers: {
    key: 'transfers',
    priority: 3,
    label: 'Private Transfers',
    description: 'KLIA / airport pickups, sedans, MPVs, 7-seater & 13-seater vans',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: 'transfers@gfkholidays.com',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: true
  },
  dining: {
    key: 'dining',
    priority: 4,
    label: 'Dining',
    description: 'Revolving tower buffets, heritage dinners & sunset dining experiences',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: 'dining@gfkholidays.com',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: true
  },
  packages: {
    key: 'packages',
    priority: 5,
    label: 'Holiday Packages',
    description: 'Multi-day Malaysia guided tours, islands & custom packages',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: 'packages@gfkholidays.com',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: true
  },
  flights: {
    key: 'flights',
    priority: 6,
    label: 'Flights Desk (Non-Banking)',
    description: 'Airline fare quotes, schedules & luggage inquiries',
    primaryEmail: 'flights@gfkholidays.com',
    ccEmail: '',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: false
  },
  payments: {
    key: 'payments',
    priority: 7,
    label: 'Stripe Billing & Accounts',
    description: 'Stripe settlement receipts, invoices & finance follow-ups',
    primaryEmail: 'booking@gfkholidays.com',
    ccEmail: '',
    enabled: true,
    sendCustomerCopy: true,
    ccBillingDesk: false
  }
};

export function getMergedEmailHierarchy(
  settings?: Partial<GlobalSettings>
): Record<ServiceHierarchyKey, EmailHierarchyRule> {
  const custom = settings?.emailHierarchyRouting || {};
  const billingDefault = settings?.bookingEmail || 'booking@gfkholidays.com';
  const flightsDefault = settings?.flightsEmail || 'flights@gfkholidays.com';

  const result = {} as Record<ServiceHierarchyKey, EmailHierarchyRule>;

  for (const key of ALL_MAIL_HIERARCHY_KEYS) {
    const base = DEFAULT_EMAIL_HIERARCHY_MAP[key];
    const override = custom[key];
    const defaultPrimary =
      key === 'flights'
        ? flightsDefault
        : key === 'payments'
        ? billingDefault
        : base.primaryEmail || billingDefault;

    result[key] = {
      ...base,
      primaryEmail: defaultPrimary,
      ...(override || {})
    };
  }

  return result;
}

export function classifyServiceHierarchy(product: any): ServiceHierarchyKey {
  if (!product) return 'packages';

  const id = String(product.id || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  const title = `${product.title || ''} ${product.name || ''} ${product.description || ''}`.toLowerCase();

  if (product.isFlight || category === 'flight' || id.startsWith('fl-')) {
    return 'flights';
  }

  if (
    category.includes('dining') ||
    category.includes('food') ||
    title.includes('dinner') ||
    title.includes('buffet') ||
    title.includes('restaurant') ||
    title.includes('high tea') ||
    title.includes('dining')
  ) {
    return 'dining';
  }

  if (
    id.startsWith('tr-') ||
    category === 'transport' ||
    category.includes('transfer') ||
    'car' in product ||
    'mpv' in product
  ) {
    return 'transfers';
  }

  if (
    id.startsWith('ht-') ||
    category.includes('hotel') ||
    category.includes('resort') ||
    'roomCategories' in product ||
    'cat' in product
  ) {
    return 'hotels';
  }

  if (
    id.startsWith('tk-') ||
    category.includes('attraction') ||
    category.includes('ticket') ||
    'ticketCategories' in product
  ) {
    return 'attractions';
  }

  return 'packages';
}

export interface ResolvedMailDispatch {
  categoryKey: ServiceHierarchyKey;
  rule: EmailHierarchyRule;
  primaryRecipient: string;
  ccRecipients: string[];
  billingEmail: string;
  sendCustomerCopy: boolean;
}

export function resolveBookingMailDispatch(
  product: any,
  settings?: Partial<GlobalSettings>
): ResolvedMailDispatch {
  const billingEmail = (settings?.bookingEmail || 'booking@gfkholidays.com').trim();
  const hierarchy = getMergedEmailHierarchy(settings);
  const categoryKey = classifyServiceHierarchy(product);
  const rule = hierarchy[categoryKey] || hierarchy.packages;

  const primaryRecipient =
    rule.enabled && rule.primaryEmail.trim() ? rule.primaryEmail.trim() : billingEmail;

  const ccSet = new Set<string>();
  if (rule.enabled && rule.ccEmail && rule.ccEmail.trim()) {
    rule.ccEmail
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((addr) => {
        if (addr.toLowerCase() !== primaryRecipient.toLowerCase()) {
          ccSet.add(addr);
        }
      });
  }

  if (rule.ccBillingDesk && billingEmail && billingEmail.toLowerCase() !== primaryRecipient.toLowerCase()) {
    ccSet.add(billingEmail);
  }

  return {
    categoryKey,
    rule,
    primaryRecipient,
    ccRecipients: Array.from(ccSet),
    billingEmail,
    sendCustomerCopy: rule.sendCustomerCopy !== false
  };
}

export interface EmailSendRequestPayload {
  to: string;
  cc?: string | string[];
  replyTo?: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  categoryKey?: ServiceHierarchyKey | string;
  categoryLabel?: string;
  bookingId?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  deliveredTo?: string;
  code?: string;
  error?: string;
}

export async function dispatchTransactionalEmail(
  payload: EmailSendRequestPayload,
  authToken?: string
): Promise<EmailSendResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        code: data?.code || `HTTP_${res.status}`,
        error: data?.error || `Mail delivery failed (HTTP ${res.status})`
      };
    }
    return {
      ok: true,
      messageId: data?.messageId,
      deliveredTo: data?.deliveredTo || payload.to
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      error: err?.message || 'Unable to reach mail delivery service'
    };
  }
}
