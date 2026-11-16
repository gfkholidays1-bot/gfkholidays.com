import {
  EmailHierarchyRule,
  GlobalSettings,
  ServiceHierarchyKey,
  TransactionalEmailTemplateConfig,
  TransactionalEmailTemplateId
} from '../types';

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

export const EMAIL_TEMPLATE_IDS: TransactionalEmailTemplateId[] = [
  'booking_confirmation',
  'invoice_dispatch',
  'flight_inquiry',
  'booking_cancelled'
];

export const EMAIL_TEMPLATE_VARIABLES: Array<{
  token: string;
  label: string;
  description: string;
}> = [
  { token: '{{client}}', label: 'Client Name', description: 'Customer or B2B agent name' },
  { token: '{{bookingId}}', label: 'Booking Ref', description: 'Voucher or inquiry code' },
  { token: '{{title}}', label: 'Service Title', description: 'Booked package, attraction, hotel, or route' },
  { token: '{{serviceTier}}', label: 'Service Tier', description: 'Attraction Tickets, Hotels, Transfers, Dining, or Packages' },
  { token: '{{date}}', label: 'Travel Date', description: 'Selected service or departure date' },
  { token: '{{timeSlot}}', label: 'Slot / Pax', description: 'Time slot, passengers, or route details' },
  { token: '{{total}}', label: 'Amount', description: 'Formatted currency / MYR amount' },
  { token: '{{assignedDeskEmail}}', label: 'Desk Email', description: 'Primary hierarchy desk recipient' },
  { token: '{{billingEmail}}', label: 'Billing Email', description: 'Stripe & Accounts desk address' },
  { token: '{{policyNote}}', label: 'Policy Note', description: 'Reservation & invoice policy message' },
  { token: '{{logo}}', label: 'Brand Logo', description: 'Active website/invoice logo URL' },
  { token: '{{bankDetailsHtml}}', label: 'Invoice / Bank Block', description: 'Itemized breakdown & bank transfer instructions (if applicable)' }
];

export const DEFAULT_EMAIL_TEMPLATES: Record<
  TransactionalEmailTemplateId,
  TransactionalEmailTemplateConfig
> = {
  booking_confirmation: {
    id: 'booking_confirmation',
    name: 'Booking Request Received',
    description: 'Sent automatically to customers immediately after checkout or Stripe reservation.',
    subjectTemplate: 'Booking Request Received: {{title}} [{{bookingId}}]',
    badgeText: '{{serviceTier}} · {{bookingId}}',
    heading: 'Booking Request Received',
    accentColor: '#059669',
    headerBgColor: '#064e3b',
    introText:
      'Dear {{client}}, thank you for choosing GFK Holidays Malaysia. We have received your booking request for {{title}}.',
    bodyText:
      'Your assigned {{serviceTier}} operations specialist ({{assignedDeskEmail}}) is reviewing availability. Stripe billing & receipts are managed via {{billingEmail}}.',
    highlightBoxTitle: 'Next Steps & Reservation Policy',
    highlightBoxText: '{{policyNote}}',
    ctaLabel: 'Contact Operations Desk',
    footerText:
      'GFK Holidays Sdn Bhd · Kuala Lumpur, Malaysia · Reply directly mentioning Ref #{{bookingId}} for immediate assistance.',
    showLogo: true,
    showSummaryCard: true,
    editorMode: 'visual',
    customHtml: ''
  },
  invoice_dispatch: {
    id: 'invoice_dispatch',
    name: 'Confirmed Booking & Invoice',
    description: 'Sent when an admin confirms a reservation or dispatches an official invoice.',
    subjectTemplate: 'Invoice & Confirmation: {{title}} [{{bookingId}}]',
    badgeText: '{{serviceTier}} · Confirmed #{{bookingId}}',
    heading: 'Official Booking Confirmation & Invoice',
    accentColor: '#4338ca',
    headerBgColor: '#1e1b4b',
    introText:
      'Dear {{client}}, your {{serviceTier}} reservation ({{title}}) under voucher #{{bookingId}} is confirmed.',
    bodyText:
      'Please review your booking summary and settlement details below. Your dedicated desk contact is {{assignedDeskEmail}}.',
    highlightBoxTitle: 'Important Payment & Issuance Notice',
    highlightBoxText: '{{policyNote}}',
    ctaLabel: 'Reply with Payment Proof',
    footerText:
      'GFK Holidays Sdn Bhd · Accounts & Settlement Desk ({{billingEmail}}) · Thank you for travelling with us.',
    showLogo: true,
    showSummaryCard: true,
    editorMode: 'visual',
    customHtml: ''
  },
  flight_inquiry: {
    id: 'flight_inquiry',
    name: 'Flight Quote Request',
    description: 'Sent to customers when they submit an airline fare quote or luggage inquiry.',
    subjectTemplate: 'Flight Quote Request Received [{{bookingId}}] - {{title}}',
    badgeText: 'Flight Desk · {{bookingId}}',
    heading: 'Flight Fare Inquiry Received',
    accentColor: '#0284c7',
    headerBgColor: '#0c4a6e',
    introText:
      'Dear {{client}}, we have received your airline fare & schedule inquiry for {{title}}.',
    bodyText:
      'Your request has been routed directly to our Aviation & Flight Desk at {{assignedDeskEmail}}. Note: All payment & Stripe billing matters remain handled exclusively via {{billingEmail}}.',
    highlightBoxTitle: 'Aviation Desk Turnaround',
    highlightBoxText:
      'Our ticketing specialists typically respond with live airline fare options and baggage allowances within 2 working hours.',
    ctaLabel: 'Reply to Flight Desk',
    footerText:
      'GFK Holidays Aviation Desk · {{assignedDeskEmail}} · Non-banking inquiry reference #{{bookingId}}.',
    showLogo: true,
    showSummaryCard: true,
    editorMode: 'visual',
    customHtml: ''
  },
  booking_cancelled: {
    id: 'booking_cancelled',
    name: 'Booking Cancellation Notice',
    description: 'Sent when a booking request is rejected or cancelled in the Admin Portal.',
    subjectTemplate: 'Booking Cancelled: {{title}} [{{bookingId}}]',
    badgeText: '{{serviceTier}} · Cancelled #{{bookingId}}',
    heading: 'Booking Request Cancelled',
    accentColor: '#dc2626',
    headerBgColor: '#7f1d1d',
    introText:
      'Dear {{client}}, we regret to inform you that your {{serviceTier}} request #{{bookingId}} ({{title}}) could not be fulfilled for {{date}}.',
    bodyText:
      'If any authorization hold was placed, it will be released promptly. Our team at {{assignedDeskEmail}} can help arrange alternative dates or experiences upon reply.',
    highlightBoxTitle: 'Alternative Arrangements & Support',
    highlightBoxText:
      'Reply to this email or write to {{assignedDeskEmail}} referencing #{{bookingId}} for immediate rebooking assistance.',
    ctaLabel: 'Contact Support Desk',
    footerText:
      'GFK Holidays Sdn Bhd · Customer Care · Reference #{{bookingId}}.',
    showLogo: true,
    showSummaryCard: true,
    editorMode: 'visual',
    customHtml: ''
  }
};

export const SAMPLE_EMAIL_PREVIEW_VARS: Record<
  TransactionalEmailTemplateId,
  Record<string, string>
> = {
  booking_confirmation: {
    client: 'AISHA AL-MANSOOR',
    bookingId: 'GFK88412',
    title: 'Petronas Twin Towers Skybridge & Level 86 Observation Deck',
    serviceTier: 'Attraction Tickets',
    date: '2026-11-24',
    timeSlot: '10:00 AM · 2 Adults',
    total: 'RM 290',
    assignedDeskEmail: 'tickets@gfkholidays.com',
    billingEmail: 'booking@gfkholidays.com',
    policyNote:
      'Stripe Payments (INR): Payment confirmations & Stripe receipts are managed via booking@gfkholidays.com.',
    logo: '/gfk-custom-logo.webp',
    bankDetailsHtml: ''
  },
  invoice_dispatch: {
    client: 'JONATHAN DOE',
    bookingId: 'GFK88210',
    title: 'Langkawi Luxury Overwater Escape 4D3N',
    serviceTier: 'Holiday Packages',
    date: '2026-12-04',
    timeSlot: '09:00 AM · Private Butler',
    total: 'RM 3,410',
    assignedDeskEmail: 'packages@gfkholidays.com',
    billingEmail: 'booking@gfkholidays.com',
    policyNote:
      'Payment proof must be emailed within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.',
    logo: '/gfk-custom-logo.webp',
    bankDetailsHtml: `<div style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#312e81;">Bank Transfer Settlement Details</p>
      <p style="margin:0;font-size:12px;color:#1e1b4b;">Account Name: <strong>GFK HOLIDAYS SDN BHD</strong> · Bank: <strong>Maybank</strong> · A/C: <strong>5141 2345 6789</strong></p>
    </div>`
  },
  flight_inquiry: {
    client: 'PRIYA SHARMA',
    bookingId: 'FLT44901',
    title: 'Malaysia Airlines (MH 1432) · KUL → LGK',
    serviceTier: 'Flights Desk (Non-Banking)',
    date: '2026-11-22',
    timeSlot: '4 Passengers · Fare Quote',
    total: 'Quote Requested',
    assignedDeskEmail: 'flights@gfkholidays.com',
    billingEmail: 'booking@gfkholidays.com',
    policyNote:
      'All payment & Stripe billing matters remain handled via booking@gfkholidays.com.',
    logo: '/gfk-custom-logo.webp',
    bankDetailsHtml: ''
  },
  booking_cancelled: {
    client: 'ROBERT KOWALSKI',
    bookingId: 'GFK77309',
    title: 'The Datai Langkawi Rainforest Villa',
    serviceTier: 'Hotels & Resorts',
    date: '2026-12-12',
    timeSlot: '3 Nights · Rainforest Villa',
    total: 'RM 4,800',
    assignedDeskEmail: 'hotels@gfkholidays.com',
    billingEmail: 'booking@gfkholidays.com',
    policyNote:
      'Please reply to hotels@gfkholidays.com for instant alternative luxury hotel availability.',
    logo: '/gfk-custom-logo.webp',
    bankDetailsHtml: ''
  }
};

export function getMergedEmailTemplates(
  settings?: Partial<GlobalSettings>
): Record<TransactionalEmailTemplateId, TransactionalEmailTemplateConfig> {
  const customMap = settings?.emailTemplates || {};
  const merged = {} as Record<TransactionalEmailTemplateId, TransactionalEmailTemplateConfig>;
  for (const id of EMAIL_TEMPLATE_IDS) {
    merged[id] = {
      ...DEFAULT_EMAIL_TEMPLATES[id],
      ...(customMap[id] || {})
    };
  }
  return merged;
}

export function applyTemplateTokens(
  rawTemplate: string,
  vars: Record<string, string>
): string {
  if (!rawTemplate) return '';
  return rawTemplate.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : '';
  });
}

export function buildVisualEmailHtml(
  tpl: TransactionalEmailTemplateConfig
): string {
  const accent = tpl.accentColor || '#059669';
  const headerBg = tpl.headerBgColor || '#064e3b';

  const logoBlock = tpl.showLogo
    ? `<img src="{{logo}}" alt="GFK Holidays Logo" style="height:44px;width:44px;object-fit:contain;border-radius:8px;background:#ffffff;padding:4px;" />`
    : '';

  const summaryBlock = tpl.showSummaryCard
    ? `<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${accent};border-radius:10px;padding:16px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:5px 0;color:#64748b;font-weight:700;">Reference ID</td>
            <td style="padding:5px 0;color:#0f172a;font-weight:800;text-align:right;">#{{bookingId}}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;font-weight:700;">Service / Route</td>
            <td style="padding:5px 0;color:#0f172a;font-weight:700;text-align:right;">{{title}}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;font-weight:700;">Tier &amp; Date</td>
            <td style="padding:5px 0;color:#0f172a;text-align:right;">{{serviceTier}} · {{date}}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;font-weight:700;">Details / Slot</td>
            <td style="padding:5px 0;color:#0f172a;text-align:right;">{{timeSlot}}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;border-top:1px solid #e2e8f0;color:#64748b;font-weight:700;">Amount</td>
            <td style="padding:8px 0 0 0;border-top:1px solid #e2e8f0;color:${accent};font-weight:900;font-size:15px;text-align:right;">{{total}}</td>
          </tr>
        </table>
      </div>`
    : '';

  const ctaBlock = tpl.ctaLabel?.trim()
    ? `<div style="margin:24px 0 8px 0;text-align:center;">
        <a href="mailto:{{assignedDeskEmail}}?subject=Ref%20%23{{bookingId}}" style="display:inline-block;background-color:${accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:12px 24px;border-radius:10px;letter-spacing:0.2px;">
          ${tpl.ctaLabel}
        </a>
      </div>`
    : '';

  const highlightBlock =
    tpl.highlightBoxTitle?.trim() || tpl.highlightBoxText?.trim()
      ? `<div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;">
            ${tpl.highlightBoxTitle || ''}
          </p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:#78350f;">
            ${tpl.highlightBoxText || ''}
          </p>
        </div>`
      : '';

  return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;padding:24px 12px;margin:0;">
  <div style="max-width:650px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
    <div style="background-color:${headerBg};padding:26px 28px;color:#ffffff;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${logoBlock}
              <div>
                <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#d1fae5;">${tpl.badgeText}</div>
                <h1 style="margin:4px 0 0 0;font-size:21px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">${tpl.heading}</h1>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:28px;color:#27272a;">
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.65;color:#18181b;font-weight:600;">
        ${tpl.introText}
      </p>
      <p style="margin:0 0 18px 0;font-size:13px;line-height:1.65;color:#52525b;">
        ${tpl.bodyText}
      </p>
      ${summaryBlock}
      {{bankDetailsHtml}}
      ${highlightBlock}
      ${ctaBlock}
    </div>
    <div style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:18px 28px;font-size:11px;line-height:1.5;color:#71717a;text-align:center;">
      ${tpl.footerText}
    </div>
  </div>
</div>`;
}

export function renderTransactionalEmail(
  templateId: TransactionalEmailTemplateId,
  vars: Record<string, string>,
  settings?: Partial<GlobalSettings>,
  overrideTemplate?: TransactionalEmailTemplateConfig
): { subject: string; html: string } {
  const merged = getMergedEmailTemplates(settings);
  const tpl = overrideTemplate || merged[templateId] || DEFAULT_EMAIL_TEMPLATES[templateId];
  const rawHtml =
    tpl.editorMode === 'html' && tpl.customHtml && tpl.customHtml.trim()
      ? tpl.customHtml
      : buildVisualEmailHtml(tpl);

  return {
    subject: applyTemplateTokens(tpl.subjectTemplate, vars),
    html: applyTemplateTokens(rawHtml, vars)
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
