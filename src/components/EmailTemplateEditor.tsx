import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Code,
  Eye,
  Layout,
  Monitor,
  Palette,
  RotateCcw,
  Send,
  Smartphone,
  Sparkles,
  Tag
} from 'lucide-react';
import {
  TransactionalEmailTemplateConfig,
  TransactionalEmailTemplateId
} from '../types';
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_IDS,
  EMAIL_TEMPLATE_VARIABLES,
  SAMPLE_EMAIL_PREVIEW_VARS,
  buildVisualEmailHtml,
  renderTransactionalEmail
} from '../lib/mailRouting';

interface EmailTemplateEditorProps {
  templates: Record<TransactionalEmailTemplateId, TransactionalEmailTemplateConfig>;
  onChangeTemplate: (
    id: TransactionalEmailTemplateId,
    patch: Partial<TransactionalEmailTemplateConfig>
  ) => void;
  onResetTemplate: (id: TransactionalEmailTemplateId) => void;
  onSaveTemplates: () => Promise<void>;
  onSendPreviewEmail: (
    subject: string,
    html: string,
    templateId: TransactionalEmailTemplateId
  ) => Promise<void>;
  logoUrl?: string;
  senderName?: string;
  senderEmail?: string;
  bookingEmail?: string;
  flightsEmail?: string;
  invoiceMessage?: string;
  saving?: boolean;
  sendingPreview?: boolean;
}

const COLOR_PRESETS: Array<{ label: string; headerBg: string; accent: string }> = [
  { label: 'Emerald', headerBg: '#064e3b', accent: '#059669' },
  { label: 'Royal Indigo', headerBg: '#1e1b4b', accent: '#4338ca' },
  { label: 'Aviation Sky', headerBg: '#0c4a6e', accent: '#0284c7' },
  { label: 'Midnight Slate', headerBg: '#18181b', accent: '#0f172a' },
  { label: 'Crimson Alert', headerBg: '#7f1d1d', accent: '#dc2626' },
  { label: 'Warm Amber', headerBg: '#78350f', accent: '#d97706' }
];

type EditableFieldKey =
  | 'subjectTemplate'
  | 'badgeText'
  | 'heading'
  | 'introText'
  | 'bodyText'
  | 'highlightBoxTitle'
  | 'highlightBoxText'
  | 'ctaLabel'
  | 'footerText'
  | 'customHtml';

export default function EmailTemplateEditor({
  templates,
  onChangeTemplate,
  onResetTemplate,
  onSaveTemplates,
  onSendPreviewEmail,
  logoUrl,
  senderName,
  senderEmail,
  bookingEmail,
  flightsEmail,
  invoiceMessage,
  saving = false,
  sendingPreview = false
}: EmailTemplateEditorProps) {
  const [selectedId, setSelectedId] =
    useState<TransactionalEmailTemplateId>('booking_confirmation');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeField, setActiveField] = useState<EditableFieldKey>('introText');
  const fieldRefs = useRef<Partial<Record<EditableFieldKey, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const activeTemplate =
    templates[selectedId] || DEFAULT_EMAIL_TEMPLATES[selectedId];

  const resolvedLogoSrc = useMemo(() => {
    const candidate = logoUrl || '/gfk-custom-logo.webp';
    if (candidate.startsWith('http') || candidate.startsWith('data:')) {
      return candidate;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${candidate.startsWith('/') ? '' : '/'}${candidate}`;
    }
    return candidate;
  }, [logoUrl]);

  const previewVars = useMemo(() => {
    const sample = SAMPLE_EMAIL_PREVIEW_VARS[selectedId];
    return {
      ...sample,
      logo: resolvedLogoSrc,
      billingEmail: bookingEmail || sample.billingEmail,
      assignedDeskEmail:
        selectedId === 'flight_inquiry'
          ? flightsEmail || sample.assignedDeskEmail
          : bookingEmail || sample.assignedDeskEmail,
      policyNote: invoiceMessage?.trim() || sample.policyNote
    };
  }, [selectedId, resolvedLogoSrc, bookingEmail, flightsEmail, invoiceMessage]);

  const compiledPreview = useMemo(() => {
    return renderTransactionalEmail(selectedId, previewVars, undefined, activeTemplate);
  }, [selectedId, previewVars, activeTemplate]);

  const handleInsertVariable = (token: string) => {
    const targetField: EditableFieldKey =
      activeTemplate.editorMode === 'html' ? 'customHtml' : activeField;
    const currentValue = String((activeTemplate as any)[targetField] ?? '');
    const el = fieldRefs.current[targetField];

    if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const updated = currentValue.slice(0, start) + token + currentValue.slice(end);
      onChangeTemplate(selectedId, { [targetField]: updated } as Partial<TransactionalEmailTemplateConfig>);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
      return;
    }

    onChangeTemplate(selectedId, {
      [targetField]: currentValue ? `${currentValue} ${token}` : token
    } as Partial<TransactionalEmailTemplateConfig>);
  };

  const handleSwitchMode = (mode: 'visual' | 'html') => {
    if (mode === 'html' && !(activeTemplate.customHtml || '').trim()) {
      onChangeTemplate(selectedId, {
        editorMode: 'html',
        customHtml: buildVisualEmailHtml(activeTemplate)
      });
      setActiveField('customHtml');
      return;
    }
    onChangeTemplate(selectedId, { editorMode: mode });
    setActiveField(mode === 'html' ? 'customHtml' : 'introText');
  };

  const handleSyncVisualToHtml = () => {
    const generatedHtml = buildVisualEmailHtml(activeTemplate);
    onChangeTemplate(selectedId, {
      editorMode: 'html',
      customHtml: generatedHtml
    });
    setActiveField('customHtml');
  };

  const registerRef =
    (key: EditableFieldKey) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[key] = el;
    };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <h3 className="text-lg font-black text-zinc-950 flex items-center gap-2">
            <Layout className="w-5 h-5 text-emerald-700" />
            <span>Visual Transactional Email Template Editor</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Customize layout, brand colors, messaging, or raw HTML structure for automated emails with real-time preview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onResetTemplate(selectedId)}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Template</span>
          </button>
          <button
            type="button"
            disabled={sendingPreview}
            onClick={() =>
              onSendPreviewEmail(compiledPreview.subject, compiledPreview.html, selectedId)
            }
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingPreview ? 'Sending Preview...' : 'Send Live Test'}</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveTemplates}
            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save All Templates'}</span>
          </button>
        </div>
      </div>

      {/* Template Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {EMAIL_TEMPLATE_IDS.map((id) => {
          const item = templates[id] || DEFAULT_EMAIL_TEMPLATES[id];
          const isSelected = id === selectedId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.accentColor || '#059669' }}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-white/15 text-emerald-300'
                      : 'bg-white border border-zinc-200 text-zinc-500'
                  }`}
                >
                  {item.editorMode === 'html' ? 'Custom HTML' : 'Visual'}
                </span>
              </div>
              <p className="font-black text-xs leading-snug">{item.name}</p>
              <p
                className={`text-[11px] mt-1 line-clamp-2 ${
                  isSelected ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Editor Mode Switch + Dynamic Variable Chips */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-white border border-zinc-200 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => handleSwitchMode('visual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTemplate.editorMode === 'visual'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Visual Designer</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('html')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTemplate.editorMode === 'html'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>HTML Code Editor</span>
            </button>
          </div>

          {activeTemplate.editorMode === 'html' && (
            <button
              type="button"
              onClick={handleSyncVisualToHtml}
              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-emerald-500 text-xs font-bold text-zinc-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Regenerate HTML from Visual Settings</span>
            </button>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3 text-emerald-700" />
            <span>
              Click any merge variable to insert into{' '}
              <strong className="text-zinc-800">
                {activeTemplate.editorMode === 'html' ? 'HTML Code' : activeField}
              </strong>
              :
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                title={v.description}
                onClick={() => handleInsertVariable(v.token)}
                className="px-2 py-1 rounded-lg bg-white border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 text-[11px] font-mono font-bold text-zinc-800 cursor-pointer transition-colors"
              >
                {v.token}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Left Controls / Right Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Pane */}
        <div className="xl:col-span-5 space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
              Email Subject Line
            </label>
            <input
              ref={registerRef('subjectTemplate')}
              type="text"
              value={activeTemplate.subjectTemplate ?? ''}
              onFocus={() => setActiveField('subjectTemplate')}
              onChange={(e) =>
                onChangeTemplate(selectedId, { subjectTemplate: e.target.value })
              }
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
              placeholder="Booking Request Received: {{title}} [{{bookingId}}]"
            />
          </div>

          {activeTemplate.editorMode === 'visual' ? (
            <div className="space-y-4">
              {/* Theme Colors & Layout Options */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                    Theme &amp; Header Palette
                  </span>
                  <div className="flex items-center gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        title={preset.label}
                        onClick={() =>
                          onChangeTemplate(selectedId, {
                            headerBgColor: preset.headerBg,
                            accentColor: preset.accent
                          })
                        }
                        className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                        style={{ backgroundColor: preset.accent }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                      Header Banner Color
                    </label>
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5">
                      <input
                        type="color"
                        value={activeTemplate.headerBgColor || '#064e3b'}
                        onChange={(e) =>
                          onChangeTemplate(selectedId, { headerBgColor: e.target.value })
                        }
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-xs font-bold text-zinc-700">
                        {activeTemplate.headerBgColor || '#064e3b'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                      Button &amp; Accent Color
                    </label>
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5">
                      <input
                        type="color"
                        value={activeTemplate.accentColor || '#059669'}
                        onChange={(e) =>
                          onChangeTemplate(selectedId, { accentColor: e.target.value })
                        }
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-xs font-bold text-zinc-700">
                        {activeTemplate.accentColor || '#059669'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeTemplate.showLogo !== false}
                      onChange={(e) =>
                        onChangeTemplate(selectedId, { showLogo: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-700 rounded"
                    />
                    <span>Show Company Logo</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeTemplate.showSummaryCard !== false}
                      onChange={(e) =>
                        onChangeTemplate(selectedId, { showSummaryCard: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-700 rounded"
                    />
                    <span>Show Booking Summary Table</span>
                  </label>
                </div>
              </div>

              {/* Editable Copy Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                    Header Badge Text
                  </label>
                  <input
                    ref={registerRef('badgeText')}
                    type="text"
                    value={activeTemplate.badgeText ?? ''}
                    onFocus={() => setActiveField('badgeText')}
                    onChange={(e) =>
                      onChangeTemplate(selectedId, { badgeText: e.target.value })
                    }
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                    Main Banner Heading
                  </label>
                  <input
                    ref={registerRef('heading')}
                    type="text"
                    value={activeTemplate.heading ?? ''}
                    onFocus={() => setActiveField('heading')}
                    onChange={(e) =>
                      onChangeTemplate(selectedId, { heading: e.target.value })
                    }
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                  Greeting &amp; Opening Paragraph
                </label>
                <textarea
                  ref={registerRef('introText')}
                  rows={2}
                  value={activeTemplate.introText ?? ''}
                  onFocus={() => setActiveField('introText')}
                  onChange={(e) =>
                    onChangeTemplate(selectedId, { introText: e.target.value })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-zinc-900 text-xs outline-none focus:border-emerald-600 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                  Main Body &amp; Operations Desk Copy
                </label>
                <textarea
                  ref={registerRef('bodyText')}
                  rows={3}
                  value={activeTemplate.bodyText ?? ''}
                  onFocus={() => setActiveField('bodyText')}
                  onChange={(e) =>
                    onChangeTemplate(selectedId, { bodyText: e.target.value })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-zinc-900 text-xs outline-none focus:border-emerald-600 resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                    Policy Box Heading
                  </label>
                  <input
                    ref={registerRef('highlightBoxTitle')}
                    type="text"
                    value={activeTemplate.highlightBoxTitle ?? ''}
                    onFocus={() => setActiveField('highlightBoxTitle')}
                    onChange={(e) =>
                      onChangeTemplate(selectedId, { highlightBoxTitle: e.target.value })
                    }
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                    CTA Button Label
                  </label>
                  <input
                    ref={registerRef('ctaLabel')}
                    type="text"
                    value={activeTemplate.ctaLabel ?? ''}
                    onFocus={() => setActiveField('ctaLabel')}
                    onChange={(e) =>
                      onChangeTemplate(selectedId, { ctaLabel: e.target.value })
                    }
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                    placeholder="Leave blank to hide CTA button"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                  Policy / Callout Box Copy
                </label>
                <textarea
                  ref={registerRef('highlightBoxText')}
                  rows={2}
                  value={activeTemplate.highlightBoxText ?? ''}
                  onFocus={() => setActiveField('highlightBoxText')}
                  onChange={(e) =>
                    onChangeTemplate(selectedId, { highlightBoxText: e.target.value })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-zinc-900 text-xs outline-none focus:border-emerald-600 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                  Footer Legal &amp; Signature
                </label>
                <input
                  ref={registerRef('footerText')}
                  type="text"
                  value={activeTemplate.footerText ?? ''}
                  onFocus={() => setActiveField('footerText')}
                  onChange={(e) =>
                    onChangeTemplate(selectedId, { footerText: e.target.value })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-zinc-900 text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Custom Email HTML Source (Inline CSS Recommended)
              </label>
              <textarea
                ref={registerRef('customHtml')}
                rows={19}
                value={activeTemplate.customHtml ?? ''}
                onFocus={() => setActiveField('customHtml')}
                onChange={(e) =>
                  onChangeTemplate(selectedId, { customHtml: e.target.value })
                }
                spellCheck={false}
                className="w-full p-3.5 bg-zinc-950 text-emerald-300 font-mono text-xs rounded-2xl border border-zinc-800 outline-none focus:border-emerald-500 leading-relaxed resize-y"
                placeholder="<div>Custom HTML email structure...</div>"
              />
            </div>
          )}
        </div>

        {/* Right Pane: Real-time Sandboxed Live Email Preview */}
        <div className="xl:col-span-7 bg-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">
          {/* Mock Email Client Chrome */}
          <div className="bg-white border-b border-zinc-200 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Live Rendered Email Preview
                </span>
              </div>
              <div className="inline-flex bg-zinc-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-zinc-950 shadow-2xs'
                      : 'text-zinc-500'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-zinc-950 shadow-2xs'
                      : 'text-zinc-500'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 space-y-1">
              <div className="flex items-center gap-2 text-zinc-600">
                <span className="font-bold text-zinc-400 w-12 shrink-0">From:</span>
                <span className="font-semibold text-zinc-800 truncate">
                  {senderName || 'GFK Holidays Malaysia'} &lt;
                  {senderEmail || bookingEmail || 'booking@gfkholidays.com'}&gt;
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600">
                <span className="font-bold text-zinc-400 w-12 shrink-0">Subject:</span>
                <span className="font-black text-zinc-950 truncate">
                  {compiledPreview.subject}
                </span>
              </div>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="p-4 flex justify-center overflow-x-auto bg-zinc-200/60">
            <div
              className={`transition-all duration-200 bg-white rounded-xl shadow-md overflow-hidden border border-zinc-200 ${
                previewDevice === 'mobile' ? 'w-[375px]' : 'w-full'
              }`}
            >
              <iframe
                title={`Live Email Preview - ${activeTemplate.name}`}
                srcDoc={compiledPreview.html}
                sandbox="allow-same-origin"
                className="w-full h-[580px] border-0 bg-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
