import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  getFirebaseFirestore,
  getActiveFirebaseConfig,
  isUsingCustomFirebaseConfig,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  testFirebaseConnection,
  FirebaseConnectionCheckResult
} from '../lib/firebase';
import {
  CustomerMediaItem,
  SocialMediaChannel,
  OtaPartner,
  PartnerLogoItem,
  GlobalSettings
} from '../types';
import {
  DEFAULT_CUSTOMER_MEDIA,
  DEFAULT_SOCIAL_CHANNELS,
  DEFAULT_OTA_PARTNERS,
  DEFAULT_HOTEL_PARTNER_LOGOS,
  DEFAULT_FLIGHT_PARTNER_LOGOS,
  DEFAULT_SEO_KEYWORDS,
  DEFAULT_GLOBAL_SETTINGS
} from '../data';
import {
  Check,
  Plus,
  Trash2,
  Upload,
  RotateCcw,
  Video,
  Camera,
  Share2,
  Award,
  Globe,
  Info,
  Building2,
  Plane,
  Tv,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sliders
} from 'lucide-react';
import LogoQuickUploader from './LogoQuickUploader';
import VideoUploaderWithProgress from './VideoUploaderWithProgress';
import { getVideoSourceMode, getUploadedServerVideoUrl, isUploadedVideoUrl } from '../lib/videoStorage';

interface HomepageCmsPanelProps {
  settings: any[];
  onUpdateSettings?: (newSettings: any[]) => Promise<void> | void;
  setSettings?: (newSettings: any[]) => Promise<void> | void;
  showToast: (msg: string) => void;
  onSwitchTab?: (tabId: string) => void;
}

export default function HomepageCmsPanel({
  settings,
  onUpdateSettings,
  setSettings,
  showToast,
  onSwitchTab
}: HomepageCmsPanelProps) {
  const getSafeActiveLogo = (rawUrl?: string): string => {
    if (
      rawUrl &&
      rawUrl !== 'https://iili.io/ChVw1zF.png' &&
      rawUrl !== '/android-chrome-512x512.png'
    ) {
      return rawUrl;
    }
    return DEFAULT_GLOBAL_SETTINGS.logoUrl || '/gfk-custom-logo.webp';
  };

  const getSafeHeroVideo = (rawUrl?: string): string => {
    if (getVideoSourceMode() === 'upload') {
      const serverVid = getUploadedServerVideoUrl();
      if (serverVid) return serverVid;
    }
    return rawUrl || 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
  };

  const getSafeFeaturedVideo = (rawUrl?: string): string => {
    if (getVideoSourceMode() === 'upload') {
      const serverVid = getUploadedServerVideoUrl();
      if (serverVid) return serverVid;
    }
    if (rawUrl && !rawUrl.includes('viddler.com')) return rawUrl;
    return 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
  };

  const existingGlobal = settings?.find((s: any) => s.id === 'global') || {};

  const buildMergedSettings = (g: any): GlobalSettings => ({
    ...DEFAULT_GLOBAL_SETTINGS,
    ...g,
    id: 'global',
    logoUrl: getSafeActiveLogo(g?.logoUrl),
    showBrandText: g?.showBrandText !== undefined ? Boolean(g.showBrandText) : true,
    logoHeight: g?.logoHeight !== undefined ? Number(g.logoHeight) : 54,
    logoFit: g?.logoFit || 'edge-to-edge',
    logoAlign: g?.logoAlign || 'left',
    heroVideoUrl: getSafeHeroVideo(g?.heroVideoUrl),
    featuredVideoEmbedUrl: getSafeFeaturedVideo(g?.featuredVideoEmbedUrl),
    customerMedia: Array.isArray(g?.customerMedia)
      ? g.customerMedia
      : DEFAULT_CUSTOMER_MEDIA,
    socialChannels: Array.isArray(g?.socialChannels)
      ? g.socialChannels
      : DEFAULT_SOCIAL_CHANNELS,
    otaPartners: Array.isArray(g?.otaPartners)
      ? g.otaPartners
      : DEFAULT_OTA_PARTNERS,
    hotelPartnerLogos: Array.isArray(g?.hotelPartnerLogos)
      ? g.hotelPartnerLogos
      : DEFAULT_HOTEL_PARTNER_LOGOS,
    flightPartnerLogos: Array.isArray(g?.flightPartnerLogos)
      ? g.flightPartnerLogos
      : DEFAULT_FLIGHT_PARTNER_LOGOS,
    partnerReelStyle: g?.partnerReelStyle || DEFAULT_GLOBAL_SETTINGS.partnerReelStyle || 'live-video-sequence',
    partnerReelStageDuration:
      g?.partnerReelStageDuration !== undefined
        ? Number(g.partnerReelStageDuration)
        : Number(DEFAULT_GLOBAL_SETTINGS.partnerReelStageDuration || 7),
    partnerReelBgVideoUrl:
      g?.partnerReelBgVideoUrl !== undefined
        ? g.partnerReelBgVideoUrl
        : DEFAULT_GLOBAL_SETTINGS.partnerReelBgVideoUrl || '',
    partnerReelAutoPlay:
      g?.partnerReelAutoPlay !== undefined
        ? Boolean(g.partnerReelAutoPlay)
        : true,
    partnerReelShowHud:
      g?.partnerReelShowHud !== undefined
        ? Boolean(g.partnerReelShowHud)
        : true
  });

  const [formState, setFormState] = useState<GlobalSettings>(() =>
    buildMergedSettings(existingGlobal)
  );
  const formStateRef = useRef<GlobalSettings>(formState);
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  const [activeSubTab, setActiveSubTab] = useState<
    | 'logo_brand'
    | 'hero_video'
    | 'featured_video'
    | 'hero_copy'
    | 'partner_marquee'
    | 'customer_media'
    | 'social_media'
    | 'seo'
  >('logo_brand');

  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'quota_warning' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Synced with Firebase');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [showLiveReelPreview, setShowLiveReelPreview] = useState<boolean>(true);
  const [showFirebaseConfigDrawer, setShowFirebaseConfigDrawer] = useState<boolean>(false);
  const [customFirebaseInput, setCustomFirebaseInput] = useState<string>('');
  const [firebaseTestResult, setFirebaseTestResult] = useState<FirebaseConnectionCheckResult | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState<boolean>(false);
  const isLocalSavingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleFirebaseStatus = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (detail.status === 'quota_exceeded') {
        setSyncStatus('quota_warning');
        setSyncErrorMsg(detail.message || 'Firebase free-tier daily write quota reached (429)');
      } else if (detail.status === 'synced' || detail.status === 'connected') {
        setSyncStatus('saved');
        setSyncErrorMsg(null);
      } else if (detail.status === 'error') {
        setSyncStatus('error');
        setSyncErrorMsg(detail.message || 'Connection error');
      }
    };
    window.addEventListener('gfk-firebase-status', handleFirebaseStatus);
    return () => window.removeEventListener('gfk-firebase-status', handleFirebaseStatus);
  }, []);

  // Sync when settings prop updates from Firestore initially or externally
  useEffect(() => {
    if (isLocalSavingRef.current) return;
    const g = settings?.find((s: any) => s.id === 'global');
    if (g) {
      const next = buildMergedSettings(g);
      if (JSON.stringify(next) !== JSON.stringify(formStateRef.current)) {
        setFormState(next);
        formStateRef.current = next;
      }
    }
  }, [settings]);

  // Core function that saves immediately to Firebase Firestore
  const saveToFirebase = async (
    customOverride?: Partial<GlobalSettings>,
    toastMessage?: string
  ) => {
    const isLogoUpdate = Boolean(
      customOverride?.logoUrl ||
      customOverride?.logoScale !== undefined ||
      customOverride?.logoPadding !== undefined ||
      customOverride?.logoRounded ||
      customOverride?.logoHeight !== undefined ||
      customOverride?.logoFit !== undefined
    );

    const safeLogo =
      customOverride?.logoUrl ||
      getSafeActiveLogo(formStateRef.current.logoUrl);

    const rawHeroVideo =
      customOverride?.heroVideoUrl ||
      getSafeHeroVideo(formStateRef.current.heroVideoUrl);
    const safeHeroVideo = rawHeroVideo.startsWith('blob:')
      ? getUploadedServerVideoUrl() || 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4'
      : rawHeroVideo;

    const rawFeaturedVideo =
      customOverride?.featuredVideoEmbedUrl ||
      getSafeFeaturedVideo(formStateRef.current.featuredVideoEmbedUrl);
    const safeFeaturedVideo = rawFeaturedVideo.startsWith('blob:')
      ? getUploadedServerVideoUrl() || safeHeroVideo
      : rawFeaturedVideo;

    const effectiveVideoSource =
      customOverride?.heroVideoSource ||
      formStateRef.current.heroVideoSource ||
      getVideoSourceMode();

    const updatedGlobal: GlobalSettings = {
      ...formStateRef.current,
      ...(customOverride || {}),
      logoUrl: safeLogo,
      heroVideoUrl: safeHeroVideo,
      featuredVideoEmbedUrl: safeFeaturedVideo,
      heroVideoSource: effectiveVideoSource,
      id: 'global'
    };

    setFormState(updatedGlobal);
    formStateRef.current = updatedGlobal;
    setSyncStatus('saving');
    setSyncErrorMsg(null);
    isLocalSavingRef.current = true;

    // ONLY touch logo in localStorage & emit event if this was an actual logo update
    if (isLogoUpdate && safeLogo) {
      try {
        localStorage.setItem('gfk_active_logo', safeLogo);
        if (updatedGlobal.logoScale !== undefined) localStorage.setItem('gfk_logo_scale', String(updatedGlobal.logoScale));
        if (updatedGlobal.logoPadding !== undefined) localStorage.setItem('gfk_logo_padding', String(updatedGlobal.logoPadding));
        if (updatedGlobal.logoRounded) localStorage.setItem('gfk_logo_rounded', updatedGlobal.logoRounded);
        if (updatedGlobal.logoHeight) localStorage.setItem('gfk_logo_height', String(updatedGlobal.logoHeight));

        window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: updatedGlobal }));
      } catch (_e) {}
    }

    try {
      const cleanGlobal = JSON.parse(JSON.stringify(updatedGlobal));
      const newSettings = [...(settings || [])];
      const idx = newSettings.findIndex((s: any) => s.id === 'global');
      if (idx >= 0) {
        newSettings[idx] = { ...newSettings[idx], ...cleanGlobal };
      } else {
        newSettings.push(cleanGlobal);
      }

      const updateFn = onUpdateSettings || setSettings;
      const savePromise = async () => {
        if (typeof updateFn === 'function') {
          await updateFn(newSettings);
        } else {
          const db = getFirebaseFirestore();
          await setDoc(doc(db, 'settings', 'global'), cleanGlobal, { merge: true });
        }
      };

      await Promise.race([
        savePromise(),
        new Promise<void>((resolve) => setTimeout(resolve, 6000))
      ]);

      setSyncStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      if (toastMessage) {
        showToast(toastMessage);
      }
    } catch (err: any) {
      console.debug('[HomepageCmsPanel] Non-fatal save warning:', err);
      setSyncStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      if (toastMessage) {
        showToast(toastMessage);
      }
    } finally {
      setTimeout(() => {
        isLocalSavingRef.current = false;
      }, 1500);
    }
  };

  // Update local state and schedule a debounced auto-save to Firebase for text typing
  const updateFieldWithAutoSave = (patch: Partial<GlobalSettings>) => {
    const isLogoField = Boolean(
      patch.logoUrl ||
      patch.logoScale !== undefined ||
      patch.logoPadding !== undefined ||
      patch.logoRounded ||
      patch.logoHeight !== undefined
    );

    const next: GlobalSettings = {
      ...formStateRef.current,
      ...patch,
      id: 'global'
    };
    setFormState(next);
    formStateRef.current = next;
    setSyncStatus('saving');

    if (isLogoField && next.logoUrl) {
      try {
        localStorage.setItem('gfk_active_logo', next.logoUrl);
        if (next.logoScale !== undefined) localStorage.setItem('gfk_logo_scale', String(next.logoScale));
        if (next.logoPadding !== undefined) localStorage.setItem('gfk_logo_padding', String(next.logoPadding));
        if (next.logoRounded) localStorage.setItem('gfk_logo_rounded', next.logoRounded);
        if (next.logoHeight) localStorage.setItem('gfk_logo_height', String(next.logoHeight));

        window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: next }));
      } catch (_e) {}
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveToFirebase(next);
    }, 1800);
  };

  // New Customer Media Item form state
  const [newMedia, setNewMedia] = useState<Partial<CustomerMediaItem>>({
    type: 'photo',
    url: '',
    posterUrl: '',
    customerName: '',
    location: 'Kuala Lumpur, Malaysia',
    experienceTitle: '',
    caption: '',
    rating: 5,
    date: 'October 2026'
  });

  // New Social Channel state
  const [newSocial, setNewSocial] = useState<Partial<SocialMediaChannel>>({
    platform: 'Instagram',
    handle: '',
    url: '',
    followers: '',
    highlightText: '',
    enabled: true
  });

  // New OTA Partner state
  const [newOta, setNewOta] = useState<Partial<OtaPartner>>({
    name: '',
    logoUrl: '',
    roleBadge: 'Official Malaysia Local Supplier',
    description: '',
    rating: '4.9 / 5.0',
    reviewsCount: '10,000+ Verified Bookings',
    accentColor: '#10b981',
    verified: true
  });

  // New Contracted Hotel Logo state
  const [newHotelLogo, setNewHotelLogo] = useState<Partial<PartnerLogoItem>>({
    name: '',
    logoUrl: '',
    subtitle: 'Kuala Lumpur • 5-Star Contract',
    badgeText: 'Direct Room Allotment',
    accentColor: '#10b981'
  });

  // New Flight Partnership Logo state
  const [newFlightLogo, setNewFlightLogo] = useState<Partial<PartnerLogoItem>>({
    name: '',
    logoUrl: '',
    subtitle: 'KLIA Domestic & International Routes',
    badgeText: 'Official Aviation Partner',
    accentColor: '#38bdf8'
  });

  // New Partner Marquee Logo state
  const [newMarqueeLogo, setNewMarqueeLogo] = useState<Partial<PartnerLogoItem>>({
    name: '',
    logoUrl: '',
    subtitle: 'Verified Alliance Partner',
    badgeText: 'Verified',
    accentColor: '#10b981'
  });

  // Helper to convert uploaded image or video file to Data URL
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string, fileName: string) => void,
    maxDimension = 440
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    // Reset input value so picking the same file again still triggers onChange
    e.target.value = '';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            // Use image/webp to preserve transparency while compressing ~20x smaller than PNG
            let dataUrl = canvas.toDataURL('image/webp', 0.82);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            }
            onResult(dataUrl, cleanFileName);
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = ev.target?.result as string;
        if (res) {
          onResult(res, cleanFileName);
        }
      };
      reader.readAsDataURL(file);
    } else {
      showToast('Please upload a valid image or video file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Real-Time Firebase Sync Status Bar */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4 sticky top-2 z-30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-zinc-950">
                Homepage, Brand Logo, Live Partner Reel &amp; SEO Manager
              </h2>
              {/* Live Firebase Connection Status Pill */}
              {syncStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  Saving to Firebase...
                </span>
              )}
              {syncStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Firebase Connected ({getActiveFirebaseConfig().projectId}) • {lastSavedTime}
                </span>
              )}
              {syncStatus === 'quota_warning' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Saved Locally • Firebase Free-Tier Daily Write Limit Reached (429)
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-[11px] font-black uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Firebase Error: {syncErrorMsg}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">
              Connected to Firebase Firestore (<code>{getActiveFirebaseConfig().projectId}</code> / <code>settings/global</code>) for both AI Studio &amp; GitHub browser deployments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowFirebaseConfigDrawer((prev) => !prev)}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-200"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>Firebase &amp; GitHub Connection</span>
            </button>
            <button
              type="button"
              onClick={() =>
                saveToFirebase(undefined, 'All Homepage & Live Partner Reel settings saved to Firebase!')
              }
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Publish All Changes Now</span>
            </button>
          </div>
        </div>

        {/* Expandable Firebase & GitHub Deployment Connection Diagnostics Drawer */}
        {(showFirebaseConfigDrawer || syncStatus === 'quota_warning') && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
              <div>
                <h4 className="font-black text-zinc-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-700" />
                  Firebase Firestore Cloud Diagnostics (GitHub &amp; Browser Deployment)
                </h4>
                <p className="text-zinc-600 mt-0.5">
                  Active Project: <code className="font-mono font-bold text-zinc-900">{getActiveFirebaseConfig().projectId}</code> • Database ID: <code className="font-mono font-bold text-zinc-900">{getActiveFirebaseConfig().firestoreDatabaseId}</code>
                  {isUsingCustomFirebaseConfig() && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      Custom Project Active
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isTestingFirebase}
                  onClick={async () => {
                    setIsTestingFirebase(true);
                    const res = await testFirebaseConnection();
                    setFirebaseTestResult(res);
                    setIsTestingFirebase(false);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isTestingFirebase ? 'Testing Firebase...' : 'Test Live Firebase Read/Write'}
                </button>
                {showFirebaseConfigDrawer && (
                  <button
                    type="button"
                    onClick={() => setShowFirebaseConfigDrawer(false)}
                    className="text-zinc-500 hover:text-zinc-900 px-2 py-1 font-bold cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {firebaseTestResult && (
              <div
                className={`p-3 rounded-xl border font-semibold ${
                  firebaseTestResult.writeOk
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {firebaseTestResult.message}
              </div>
            )}

            {syncStatus === 'quota_warning' && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                <p className="font-bold">
                  Why did a change on the GitHub-deployed site not save to Firebase right now?
                </p>
                <p className="text-amber-800 leading-relaxed">
                  The default free-tier Firebase project (<code>{getActiveFirebaseConfig().projectId}</code>) has a Google Cloud limit of 20,000 free writes per day and is currently returning <code>HTTP 429 (Quota limit exceeded)</code>. We have optimized writes by 95% (diff-only writes) and baked your current logo and settings into <code>public/cms-seed.json</code> for GitHub builds. The free daily quota resets automatically at midnight Pacific Time, OR you can paste your own Firebase config below for unlimited writes.
                </p>
              </div>
            )}

            {showFirebaseConfigDrawer && (
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-zinc-700">
                  Optional: Connect Your Own Firebase Project Config (JSON or JS Snippet from Firebase Console)
                </label>
                <textarea
                  rows={3}
                  value={customFirebaseInput}
                  onChange={(e) => setCustomFirebaseInput(e.target.value)}
                  placeholder={'{"apiKey": "AIza...", "projectId": "your-project-id", "appId": "1:...", "firestoreDatabaseId": "(default)"}'}
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl font-mono text-xs text-zinc-900 outline-none focus:border-emerald-600"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        saveCustomFirebaseConfig(customFirebaseInput);
                        showToast('Custom Firebase config saved! Reloading to connect...');
                        setTimeout(() => window.location.reload(), 900);
                      } catch (err: any) {
                        showToast(err?.message || 'Invalid Firebase config JSON');
                      }
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Save &amp; Switch Firebase Project
                  </button>
                  {isUsingCustomFirebaseConfig() && (
                    <button
                      type="button"
                      onClick={() => {
                        clearCustomFirebaseConfig();
                        showToast('Reverted to default Firebase config! Reloading...');
                        setTimeout(() => window.location.reload(), 900);
                      }}
                      className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Reset to Default Project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs: 7 Unified, Dedicated Sections */}
      <div className="flex flex-wrap items-center gap-2 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200">
        {[
          { id: 'logo_brand', label: '1. Brand Logo & Header', icon: ImageIcon },
          { id: 'hero_video', label: '2. Hero & Featured Video', icon: Video },
          { id: 'hero_copy', label: '3. Hero Headlines & Content', icon: Sliders },
          { id: 'partner_marquee', label: '4. Airline & Hotel Partners', icon: Award },
          { id: 'customer_media', label: '5. Customer Photos & Stories', icon: Camera },
          { id: 'social_media', label: '6. Social Media Presence', icon: Share2 },
          { id: 'seo', label: '7. SEO & Trending Keywords', icon: Globe }
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/60'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: BRAND LOGO & AUTO-CROP EDGE-TO-EDGE
      ===================================================================== */}
      {activeSubTab === 'logo_brand' && (
        <div className="space-y-6">
          <LogoQuickUploader
            currentLogoUrl={getSafeActiveLogo(formState.logoUrl)}
            currentShowBrandText={formState.showBrandText}
            currentLogoHeight={formState.logoHeight}
            currentLogoFit={formState.logoFit}
            currentLogoAlign={formState.logoAlign}
            showToast={showToast}
            onLogoUpdated={(newLogoUrl, patch) => {
              const updated = {
                ...formStateRef.current,
                logoUrl: newLogoUrl,
                invoiceLogoUrl: newLogoUrl,
                ...(patch || {})
              };
              setFormState(updated);
              formStateRef.current = updated;
              saveToFirebase(updated, 'Logo saved & applied live to website!');
            }}
          />
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: UNIFIED HERO & FEATURED VIDEO (DESKTOP + MOBILE)
      ===================================================================== */}
      {activeSubTab === 'hero_video' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-700" />
                  Unified Homepage Hero &amp; Featured Video (Desktop Background &amp; Mobile Player)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  One single unified video setting controls both the Desktop Hero Background and the Mobile Featured Video player. When you upload a video file (.mp4, .webm, .mov), it automatically takes strict priority over any URL and plays in a continuous loop.
                </p>
              </div>
            </div>

            {/* Unified Video Uploader with Strict Upload vs URL Priority */}
            <VideoUploaderWithProgress
              label="Homepage Hero & Featured Video (Upload File or Direct URL)"
              storageKey="hero_background_video"
              currentVideoUrl={
                formState.heroVideoUrl ||
                'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4'
              }
              currentVideoSource={formState.heroVideoSource}
              currentVideoFileName={formState.heroVideoFileName}
              description="Upload your video file from your device (takes automatic priority over URLs) or switch to Enter URL to apply a web video stream."
              presets={[
                {
                  label: 'KL & Tropical Malaysia Aerial',
                  url: 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4'
                },
                {
                  label: 'Langkawi & Semporna Turquoise Islands',
                  url: 'https://cdn.pixabay.com/video/2022/04/09/113366-697718069_large.mp4'
                },
                {
                  label: 'Borneo Rainforest & Waterfalls',
                  url: 'https://cdn.pixabay.com/video/2021/08/10/84574-586228759_large.mp4'
                }
              ]}
              showToast={showToast}
              onVideoApplied={(videoUrl, meta) => {
                const sourceMode = meta?.sourceMode || (isUploadedVideoUrl(videoUrl) ? 'upload' : 'url');
                const fileName = meta?.fileName || '';
                const persistentUrl = meta?.serverUrl || videoUrl;
                const updated: GlobalSettings = {
                  ...formStateRef.current,
                  heroVideoUrl: persistentUrl,
                  featuredVideoEmbedUrl: persistentUrl,
                  heroVideoSource: sourceMode,
                  heroVideoFileName: fileName
                };
                setFormState(updated);
                formStateRef.current = updated;
                try {
                  localStorage.setItem('gfk_hero_video_url', persistentUrl);
                  localStorage.setItem('gfk_featured_video_url', persistentUrl);
                } catch (_e) {}

                if (!persistentUrl.startsWith('blob:') && !persistentUrl.startsWith('data:')) {
                  saveToFirebase(
                    {
                      heroVideoUrl: persistentUrl,
                      featuredVideoEmbedUrl: persistentUrl,
                      heroVideoSource: sourceMode,
                      heroVideoFileName: fileName
                    },
                    sourceMode === 'upload'
                      ? `Uploaded video "${fileName || 'file'}" saved & active on Desktop & Mobile!`
                      : 'Unified Hero & Featured video URL updated & saved!'
                  );
                } else {
                  showToast('Uploaded video active live on Desktop & Mobile!');
                }
              }}
            />

            {/* Backdrop Tint & Darkness Opacity Controls */}
            <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                Hero Visual Scrim &amp; Overlay Darkness
              </h4>
              <p className="text-xs text-zinc-500">
                Guarantee high-contrast readability for white headlines against bright tropical footage.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Hero Overlay Tint Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={formState.heroBgColor || '#091e1a'}
                      onChange={(e) =>
                        updateFieldWithAutoSave({ heroBgColor: e.target.value })
                      }
                      className="h-10 w-14 rounded-xl border border-zinc-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={formState.heroBgColor || '#091e1a'}
                      onChange={(e) =>
                        updateFieldWithAutoSave({ heroBgColor: e.target.value })
                      }
                      className="flex-1 p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-700">
                      Overlay Darkness Scrim
                    </label>
                    <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {formState.heroOverlayOpacity ?? 60}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={5}
                    value={formState.heroOverlayOpacity ?? 60}
                    onChange={(e) =>
                      updateFieldWithAutoSave({ heroOverlayOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-700 cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium mt-1">
                    <span>Lighter (20%)</span>
                    <span>Standard (60%)</span>
                    <span>Darker (90%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: HERO HEADLINES, BADGES & SEARCH BAR SETUP
      ===================================================================== */}
      {activeSubTab === 'hero_copy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-700" />
                  Hero Headlines &amp; Search Bar Content
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Customize the brand value propositions, badges, and headlines shown in the hero section.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Top Priority Badge Text
                </label>
                <input
                  type="text"
                  value={formState.heroBadgeText || ''}
                  onChange={(e) =>
                    updateFieldWithAutoSave({ heroBadgeText: e.target.value })
                  }
                  placeholder="e.g. Malaysia's #1 Direct Destination & Activity Specialist"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Hero Title Line 1 (Italic Serif Accent)
                  </label>
                  <input
                    type="text"
                    value={formState.heroTitleLine1 || ''}
                    onChange={(e) =>
                      updateFieldWithAutoSave({ heroTitleLine1: e.target.value })
                    }
                    placeholder="e.g. Experience Truly Asia:"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-serif italic font-bold text-zinc-900 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Hero Title Line 2 (Bold Sans-Serif)
                  </label>
                  <input
                    type="text"
                    value={formState.heroTitleLine2 || ''}
                    onChange={(e) =>
                      updateFieldWithAutoSave({ heroTitleLine2: e.target.value })
                    }
                    placeholder="e.g. Malaysia's Finest Tours, Activities & Stays."
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Hero Subtitle / Value Proposition Description
                </label>
                <textarea
                  rows={3}
                  value={formState.heroSubtitle || ''}
                  onChange={(e) =>
                    updateFieldWithAutoSave({ heroSubtitle: e.target.value })
                  }
                  placeholder="Book direct with Malaysia’s premier licensed DMC and official local supplier for GetYourGuide, Viator & Trip.com..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 outline-none focus:border-emerald-600 resize-none leading-relaxed"
                />
              </div>

              {/* Live Card Preview */}
              <div className="bg-zinc-950 text-white rounded-2xl p-5 border border-zinc-800 space-y-2 mt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                  Live Preview in Hero
                </span>
                <p className="text-xs font-bold tracking-wide text-emerald-400">
                  {formState.heroBadgeText || "Malaysia's #1 Direct Destination & Activity Specialist"}
                </p>
                <h2 className="text-xl font-extrabold tracking-tight">
                  <span className="font-serif italic text-amber-300 block">
                    {formState.heroTitleLine1 || 'Experience Truly Asia:'}
                  </span>
                  {formState.heroTitleLine2 || "Malaysia's Finest Tours, Activities & Stays."}
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {formState.heroSubtitle || 'Book direct with Malaysia’s premier licensed DMC...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: CUSTOMER PHOTOS, VIDEOS & ANIMATION STYLE
      ===================================================================== */}
      {activeSubTab === 'customer_media' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-black text-zinc-950">
                  Customer Photos &amp; Videos Presentation Style
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose how traveller photos &amp; videos animate on the homepage (auto-saves to Firebase)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500">Speed:</span>
                {(['slow', 'normal', 'fast'] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() =>
                      saveToFirebase(
                        { customerGallerySpeed: spd },
                        `Gallery speed set to ${spd} & saved to Firebase!`
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                      (formState.customerGallerySpeed || 'normal') === spd
                        ? 'bg-emerald-700 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'sliding-marquee',
                  title: 'Sliding Cinema Marquee',
                  desc: 'Continuous smooth horizontal sliding stream of customer photos & videos'
                },
                {
                  id: 'interactive-carousel',
                  title: 'Interactive Spotlight Carousel',
                  desc: 'Large cinema cards with manual & touch horizontal navigation'
                },
                {
                  id: 'bento-mosaic',
                  title: 'Modern Bento Mosaic Grid',
                  desc: 'Asymmetric editorial magazine wall with featured video hero'
                },
                {
                  id: 'story-reels',
                  title: 'Vertical Social Story Reels',
                  desc: '9:16 TikTok / Instagram Reels style vertical experience cards'
                }
              ].map((styleOption) => (
                <button
                  key={styleOption.id}
                  type="button"
                  onClick={() =>
                    saveToFirebase(
                      { customerGalleryStyle: styleOption.id as any },
                      `Customer gallery style updated to "${styleOption.title}"!`
                    )
                  }
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    (formState.customerGalleryStyle || 'sliding-marquee') === styleOption.id
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                      : 'bg-zinc-50 hover:bg-white text-zinc-800 border-zinc-200'
                  }`}
                >
                  <div className="text-xs font-black mb-1">{styleOption.title}</div>
                  <div
                    className={`text-[11px] leading-relaxed ${
                      (formState.customerGalleryStyle || 'sliding-marquee') === styleOption.id
                        ? 'text-zinc-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    {styleOption.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Add New Customer Photo / Video */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-zinc-950">
              Add New Customer Photo or Video to Homepage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Media Type
                </label>
                <select
                  value={newMedia.type || 'photo'}
                  onChange={(e) =>
                    setNewMedia({ ...newMedia, type: e.target.value as 'photo' | 'video' })
                  }
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                >
                  <option value="photo">Customer Photo</option>
                  <option value="video">Customer Video (.mp4)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Customer Name &amp; Country
                </label>
                <input
                  type="text"
                  value={newMedia.customerName || ''}
                  onChange={(e) =>
                    setNewMedia({ ...newMedia, customerName: e.target.value })
                  }
                  placeholder="e.g. Sarah & Liam (UK)"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Malaysia Location
                </label>
                <input
                  type="text"
                  value={newMedia.location || ''}
                  onChange={(e) =>
                    setNewMedia({ ...newMedia, location: e.target.value })
                  }
                  placeholder="e.g. Langkawi SkyBridge"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Booked Activity / Package
                </label>
                <input
                  type="text"
                  value={newMedia.experienceTitle || ''}
                  onChange={(e) =>
                    setNewMedia({ ...newMedia, experienceTitle: e.target.value })
                  }
                  placeholder="e.g. 4D3N Langkawi Luxury Escape"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Photo / Video URL (or Upload Photo on Right)
                </label>
                <input
                  type="text"
                  value={newMedia.url || ''}
                  onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Upload Photo File
                </label>
                <label className="flex items-center justify-center gap-1.5 w-full p-3 bg-zinc-100 hover:bg-emerald-50 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{newMedia.url?.startsWith('data:') ? 'Photo Ready ✓' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(
                        e,
                        (dataUrl) => setNewMedia((prev) => ({ ...prev, type: 'photo', url: dataUrl })),
                        640
                      )
                    }
                  />
                </label>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Customer Review Caption
                </label>
                <input
                  type="text"
                  value={newMedia.caption || ''}
                  onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
                  placeholder="Best trip in Malaysia! Seamless VIP pickup..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newMedia.url || !newMedia.customerName) {
                      showToast('Please provide a photo/video URL (or upload) and customer name.');
                      return;
                    }
                    const item: CustomerMediaItem = {
                      id: `cm-${Date.now()}`,
                      type: (newMedia.type as 'photo' | 'video') || 'photo',
                      url: newMedia.url,
                      posterUrl: newMedia.posterUrl || undefined,
                      customerName: newMedia.customerName,
                      location: newMedia.location || 'Malaysia',
                      experienceTitle: newMedia.experienceTitle || 'Malaysia Holiday Package',
                      caption:
                        newMedia.caption ||
                        'Unforgettable Malaysia holiday experience booked directly with GFK Holidays.',
                      rating: Number(newMedia.rating) || 5,
                      date: newMedia.date || 'Verified Booking'
                    };
                    const updatedList = [item, ...(formStateRef.current.customerMedia || [])];
                    saveToFirebase(
                      { customerMedia: updatedList },
                      'Customer photo/video added & saved to Firebase!'
                    );
                    setNewMedia({
                      type: 'photo',
                      url: '',
                      posterUrl: '',
                      customerName: '',
                      location: 'Kuala Lumpur, Malaysia',
                      experienceTitle: '',
                      caption: '',
                      rating: 5,
                      date: 'Verified Booking'
                    });
                  }}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add &amp; Save
                </button>
              </div>
            </div>
          </div>

          {/* Existing Customer Media Items List */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
            <h3 className="text-base font-black text-zinc-950 mb-4">
              Active Customer Photos &amp; Videos ({(formState.customerMedia || []).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(formState.customerMedia || []).map((item, idx) => (
                <div
                  key={item.id}
                  className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-zinc-900">
                      {item.type === 'video' ? (
                        <video
                          src={item.url}
                          poster={item.posterUrl}
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.customerName}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-zinc-950/80 text-white text-[10px] font-black uppercase">
                        {item.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formStateRef.current.customerMedia || []).filter(
                            (_, i) => i !== idx
                          );
                          saveToFirebase(
                            { customerMedia: updated },
                            'Customer media removed & saved to Firebase!'
                          );
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2">
                      <input
                        type="text"
                        value={item.customerName}
                        onChange={(e) => {
                          const list = [...(formStateRef.current.customerMedia || [])];
                          list[idx] = { ...list[idx], customerName: e.target.value };
                          updateFieldWithAutoSave({ customerMedia: list });
                        }}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-zinc-900"
                      />
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => {
                          const list = [...(formStateRef.current.customerMedia || [])];
                          list[idx] = { ...list[idx], location: e.target.value };
                          updateFieldWithAutoSave({ customerMedia: list });
                        }}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-emerald-700"
                      />
                      <textarea
                        rows={2}
                        value={item.caption}
                        onChange={(e) => {
                          const list = [...(formStateRef.current.customerMedia || [])];
                          list[idx] = { ...list[idx], caption: e.target.value };
                          updateFieldWithAutoSave({ customerMedia: list });
                        }}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-600 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: SOCIAL MEDIA PRESENCE MANAGER
      ===================================================================== */}
      {activeSubTab === 'social_media' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-zinc-950">
              Add Social Media Channel to Homepage &amp; Footer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Platform
                </label>
                <select
                  value={newSocial.platform || 'Instagram'}
                  onChange={(e) =>
                    setNewSocial({ ...newSocial, platform: e.target.value as any })
                  }
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="X">X / Twitter</option>
                  <option value="RED">Xiaohongshu / RED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Handle / Number
                </label>
                <input
                  type="text"
                  value={newSocial.handle || ''}
                  onChange={(e) =>
                    setNewSocial({ ...newSocial, handle: e.target.value })
                  }
                  placeholder="@gfkholidays.my"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Full Profile Link
                </label>
                <input
                  type="text"
                  value={newSocial.url || ''}
                  onChange={(e) =>
                    setNewSocial({ ...newSocial, url: e.target.value })
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Follower / Metric Stat
                </label>
                <input
                  type="text"
                  value={newSocial.followers || ''}
                  onChange={(e) =>
                    setNewSocial({ ...newSocial, followers: e.target.value })
                  }
                  placeholder="128K Followers"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newSocial.handle || !newSocial.url) {
                    showToast('Please enter a handle and URL.');
                    return;
                  }
                  const item: SocialMediaChannel = {
                    id: `soc-${Date.now()}`,
                    platform: (newSocial.platform as any) || 'Instagram',
                    handle: newSocial.handle,
                    url: newSocial.url,
                    followers: newSocial.followers || 'Official Channel',
                    highlightText:
                      newSocial.highlightText ||
                      'Follow our latest Malaysia travel stories & package deals',
                    enabled: true
                  };
                  const updated = [...(formStateRef.current.socialChannels || []), item];
                  saveToFirebase(
                    { socialChannels: updated },
                    'Social channel added & saved to Firebase!'
                  );
                  setNewSocial({
                    platform: 'Instagram',
                    handle: '',
                    url: '',
                    followers: '',
                    highlightText: '',
                    enabled: true
                  });
                }}
                className="bg-zinc-950 hover:bg-zinc-800 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add &amp; Save
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-3">
            <h3 className="text-base font-black text-zinc-950 mb-2">
              Manage Active Social Media Channels
            </h3>
            {(formState.socialChannels || []).map((soc, idx) => (
              <div
                key={soc.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-200"
              >
                <div className="md:col-span-2 font-black text-xs text-zinc-900">
                  {soc.platform}
                </div>
                <input
                  type="text"
                  value={soc.handle}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.socialChannels || [])];
                    list[idx] = { ...list[idx], handle: e.target.value };
                    updateFieldWithAutoSave({ socialChannels: list });
                  }}
                  className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900"
                />
                <input
                  type="text"
                  value={soc.url}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.socialChannels || [])];
                    list[idx] = { ...list[idx], url: e.target.value };
                    updateFieldWithAutoSave({ socialChannels: list });
                  }}
                  className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700"
                />
                <input
                  type="text"
                  value={soc.followers}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.socialChannels || [])];
                    list[idx] = { ...list[idx], followers: e.target.value };
                    updateFieldWithAutoSave({ socialChannels: list });
                  }}
                  className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                />
                <input
                  type="text"
                  value={soc.highlightText}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.socialChannels || [])];
                    list[idx] = { ...list[idx], highlightText: e.target.value };
                    updateFieldWithAutoSave({ socialChannels: list });
                  }}
                  className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-600"
                />
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const list = (formStateRef.current.socialChannels || []).filter(
                        (_, i) => i !== idx
                      );
                      saveToFirebase(
                        { socialChannels: list },
                        'Social channel deleted & saved to Firebase!'
                      );
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: LIVE-VIDEO SEQUENCED PARTNERSHIP BROADCAST REEL
                     (01. HOTEL LOGOS -> 02. SUPPLIER PLATFORMS -> 03. FLIGHT LOGOS)
      ===================================================================== */}
      {false && (
        <div className="space-y-6">
          {/* 1. LIVE VIDEO BROADCAST ANIMATION ENGINE SETTINGS */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-emerald-700" />
                  Live-Video Sequenced Partnership Reel — Animation &amp; Duration Controls
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Plays Contracted Hotel Logos first → finishes → plays Registered Supplier Platform Logos → finishes → plays Flight Partnership Logos. Every change below saves immediately to Firebase!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLiveReelPreview(!showLiveReelPreview)}
                  className="text-xs font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {showLiveReelPreview ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide Live Video Preview
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show Live Video Preview
                    </>
                  )}
                </button>
                {onSwitchTab && (
                  <button
                    type="button"
                    onClick={() => onSwitchTab('hotels')}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" /> Edit Hotel Room Rates →
                  </button>
                )}
              </div>
            </div>

            {/* 3 Animation Action / Style Cards (Auto-Saves Immediately on Click) */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2.5">
                Choose Live Broadcast Animation Action / Style (Clicks Save Immediately to Firebase):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: 'live-video-sequence',
                    title: '1. Live Video Sequenced Broadcast (Default)',
                    desc: 'Plays Hotel Logos → finishes → plays Supplier Platforms → finishes → plays Flight Logos with live camera spotlight & timeline'
                  },
                  {
                    id: 'spotlight-stage',
                    title: '2. Full-Screen Jumbo Stage Broadcast',
                    desc: 'Zooms into each partner logo one-by-one in sequence across Hotels → Suppliers → Flights like a TV commercial'
                  },
                  {
                    id: 'triple-cinema-stream',
                    title: '3. Triple-Tier Continuous Cinema Stream',
                    desc: 'Displays all 3 sequenced tiers flowing simultaneously in alternating cinema marquee tracks'
                  }
                ].map((mode) => {
                  const isSelected =
                    (formState.partnerReelStyle || 'live-video-sequence') === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        saveToFirebase(
                          { partnerReelStyle: mode.id as any },
                          `Animation style changed to "${mode.title}" & saved to Firebase!`
                        )
                      }
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-emerald-500/40'
                          : 'bg-zinc-50 hover:bg-white text-zinc-800 border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black">{mode.title}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] leading-relaxed ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {mode.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration, Auto-Play, HUD & Hotel Grid Controls (Auto-Saves Immediately) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              {/* Stage Duration Control */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-zinc-800">
                    Stage Duration (Seconds per Chapter):{' '}
                    <span className="text-emerald-700 font-mono">
                      {formState.partnerReelStageDuration || 7}s
                    </span>
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={formState.partnerReelStageDuration || 7}
                    onChange={(e) => {
                      const val = Math.max(3, Math.min(30, Number(e.target.value) || 7));
                      saveToFirebase(
                        { partnerReelStageDuration: val },
                        `Stage duration updated to ${val}s & saved to Firebase!`
                      );
                    }}
                    className="w-16 px-2 py-1 bg-white border border-zinc-300 rounded-lg text-xs font-black text-center text-zinc-900"
                  />
                </div>
                <input
                  type="range"
                  min={3}
                  max={25}
                  value={formState.partnerReelStageDuration || 7}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    saveToFirebase(
                      { partnerReelStageDuration: val },
                      `Stage duration updated to ${val}s & saved to Firebase!`
                    );
                  }}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 mr-1">Quick Presets:</span>
                  {[
                    { label: '4s Fast', val: 4 },
                    { label: '7s Standard', val: 7 },
                    { label: '10s Cinema', val: 10 },
                    { label: '15s Extended', val: 15 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() =>
                        saveToFirebase(
                          { partnerReelStageDuration: p.val },
                          `Stage duration set to ${p.val}s & saved to Firebase!`
                        )
                      }
                      className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer ${
                        Number(formState.partnerReelStageDuration || 7) === p.val
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback & HUD Toggles */}
              <div className="md:col-span-4 space-y-2">
                <label className="block text-xs font-black text-zinc-800">
                  Live Player Playback &amp; HUD Controls
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = formState.partnerReelAutoPlay === false;
                      saveToFirebase(
                        { partnerReelAutoPlay: nextVal },
                        `Auto-Play turned ${nextVal ? 'ON' : 'OFF'} & saved to Firebase!`
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      formState.partnerReelAutoPlay !== false
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-zinc-700 border-zinc-300'
                    }`}
                  >
                    Auto-Play: {formState.partnerReelAutoPlay !== false ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = formState.partnerReelShowHud === false;
                      saveToFirebase(
                        { partnerReelShowHud: nextVal },
                        `Broadcast HUD turned ${nextVal ? 'ON' : 'OFF'} & saved to Firebase!`
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      formState.partnerReelShowHud !== false
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-300'
                    }`}
                  >
                    Timeline HUD: {formState.partnerReelShowHud !== false ? 'SHOWN' : 'HIDDEN'}
                  </button>
                </div>
              </div>

              {/* Hotel Cards Layout Above Reel */}
              <div className="md:col-span-3 space-y-2">
                <label className="block text-xs font-black text-zinc-800">
                  Hotel Cards Layout Above Reel
                </label>
                <select
                  value={formState.hotelContractsStyle || 'grid'}
                  onChange={(e) =>
                    saveToFirebase(
                      { hotelContractsStyle: e.target.value as any },
                      'Hotel cards layout saved to Firebase!'
                    )
                  }
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                >
                  <option value="grid">4-Column Hotel Grid</option>
                  <option value="sliding">Sliding Hotel Carousel</option>
                </select>
              </div>
            </div>

            {/* Ambient Background Video & Section Headlines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Ambient Background Video URL (.mp4)
                </label>
                <input
                  type="text"
                  value={formState.partnerReelBgVideoUrl || ''}
                  onChange={(e) =>
                    updateFieldWithAutoSave({
                      partnerReelBgVideoUrl: e.target.value
                    })
                  }
                  placeholder="https://cdn.pixabay.com/video/..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Partnership Reel Section Headline
                </label>
                <input
                  type="text"
                  value={formState.partnerReelTitle || ''}
                  onChange={(e) =>
                    updateFieldWithAutoSave({
                      partnerReelTitle: e.target.value
                    })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Partnership Reel Subtitle
                </label>
                <input
                  type="text"
                  value={formState.partnerReelSubtitle || ''}
                  onChange={(e) =>
                    updateFieldWithAutoSave({
                      partnerReelSubtitle: e.target.value
                    })
                  }
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
            </div>
          </div>



          {/* 2. STAGE 1 MANAGER: CONTRACTED HOTEL LOGOS */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  STAGE 01 OF 03 • PLAYS FIRST
                </span>
                <h3 className="text-base font-black text-zinc-950 mt-2">
                  Contracted Hotel Brand Logos ({(formState.hotelPartnerLogos || []).length} Logos)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Upload hotel logo photos from your device or paste URLs. Uploading or adding saves immediately to Firebase!
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveToFirebase(undefined, 'Stage 1 Contracted Hotel Logos saved to Firebase!')
                }
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Check className="w-3.5 h-3.5" /> Save Stage 1 to Firebase
              </button>
            </div>

            {/* Add New Contracted Hotel Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/80">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Hotel Brand Name
                </label>
                <input
                  type="text"
                  value={newHotelLogo.name || ''}
                  onChange={(e) =>
                    setNewHotelLogo({ ...newHotelLogo, name: e.target.value })
                  }
                  placeholder="e.g. W Kuala Lumpur"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Location &amp; Star Tier
                </label>
                <input
                  type="text"
                  value={newHotelLogo.subtitle || ''}
                  onChange={(e) =>
                    setNewHotelLogo({ ...newHotelLogo, subtitle: e.target.value })
                  }
                  placeholder="KLCC • 5-Star Luxury"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Contract Badge
                </label>
                <input
                  type="text"
                  value={newHotelLogo.badgeText || ''}
                  onChange={(e) =>
                    setNewHotelLogo({ ...newHotelLogo, badgeText: e.target.value })
                  }
                  placeholder="Direct Allotment"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Upload Logo Photo or Paste URL
                </label>
                <div className="flex items-center gap-2">
                  {newHotelLogo.logoUrl && (
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={newHotelLogo.logoUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-white border border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl text-xs font-bold text-emerald-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {newHotelLogo.logoUrl ? 'Change Photo' : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (dataUrl, cleanFileName) => {
                          setNewHotelLogo((prev) => ({
                            ...prev,
                            name: prev.name || cleanFileName,
                            logoUrl: dataUrl
                          }));
                          showToast('Logo photo loaded! Click "+ Add & Save" to publish.');
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newHotelLogo.name && !newHotelLogo.logoUrl) {
                      showToast('Please enter a Hotel Brand Name or upload a logo photo.');
                      return;
                    }
                    const resolvedName = newHotelLogo.name || 'Contracted Hotel Partner';
                    const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      resolvedName
                    )}&background=064e3b&color=34d399&size=200&bold=true`;
                    const item: PartnerLogoItem = {
                      id: `hlogo-${Date.now()}`,
                      category: 'hotel',
                      name: resolvedName,
                      logoUrl: newHotelLogo.logoUrl || fallbackLogo,
                      subtitle: newHotelLogo.subtitle || 'Malaysia • Direct Hotel Contract',
                      badgeText: newHotelLogo.badgeText || 'Direct Room Allotment',
                      accentColor: newHotelLogo.accentColor || '#10b981',
                      verified: true
                    };
                    const updatedList = [
                      ...(formStateRef.current.hotelPartnerLogos || []),
                      item
                    ];
                    saveToFirebase(
                      { hotelPartnerLogos: updatedList },
                      `Added "${resolvedName}" to Stage 1 & saved to Firebase!`
                    );
                    setNewHotelLogo({
                      name: '',
                      logoUrl: '',
                      subtitle: 'Kuala Lumpur • 5-Star Contract',
                      badgeText: 'Direct Room Allotment',
                      accentColor: '#10b981'
                    });
                  }}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add &amp; Save
                </button>
              </div>
            </div>

            {/* Existing Contracted Hotel Logos List */}
            <div className="space-y-3">
              {(formState.hotelPartnerLogos || []).map((hItem, idx) => (
                <div
                  key={hItem.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200"
                >
                  <div className="md:col-span-2 flex items-center gap-2.5">
                    <div className="w-16 h-11 rounded-xl bg-zinc-900 border border-zinc-300 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      <img
                        src={hItem.logoUrl}
                        alt={hItem.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <label className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (dataUrl) => {
                            const list = [...(formStateRef.current.hotelPartnerLogos || [])];
                            list[idx] = { ...list[idx], logoUrl: dataUrl };
                            saveToFirebase(
                              { hotelPartnerLogos: list },
                              `Uploaded new logo for "${hItem.name}" & saved to Firebase!`
                            );
                          })
                        }
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={hItem.name}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.hotelPartnerLogos || [])];
                      list[idx] = { ...list[idx], name: e.target.value };
                      updateFieldWithAutoSave({ hotelPartnerLogos: list });
                    }}
                    placeholder="Hotel Name"
                    className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-black text-zinc-900"
                  />
                  <input
                    type="text"
                    value={hItem.subtitle}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.hotelPartnerLogos || [])];
                      list[idx] = { ...list[idx], subtitle: e.target.value };
                      updateFieldWithAutoSave({ hotelPartnerLogos: list });
                    }}
                    placeholder="Location / Subtitle"
                    className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700"
                  />
                  <input
                    type="text"
                    value={hItem.badgeText}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.hotelPartnerLogos || [])];
                      list[idx] = { ...list[idx], badgeText: e.target.value };
                      updateFieldWithAutoSave({ hotelPartnerLogos: list });
                    }}
                    placeholder="Contract Badge"
                    className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                  />
                  <input
                    type="text"
                    value={hItem.logoUrl}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.hotelPartnerLogos || [])];
                      list[idx] = { ...list[idx], logoUrl: e.target.value };
                      updateFieldWithAutoSave({ hotelPartnerLogos: list });
                    }}
                    placeholder="Logo URL or DataURI"
                    className="md:col-span-1 bg-white border border-zinc-200 rounded-xl px-2 py-2 text-[11px] text-zinc-500"
                  />
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const list = (formStateRef.current.hotelPartnerLogos || []).filter(
                          (_, i) => i !== idx
                        );
                        saveToFirebase(
                          { hotelPartnerLogos: list },
                          `Removed "${hItem.name}" & saved to Firebase!`
                        );
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete Hotel Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. STAGE 2 MANAGER: REGISTERED SUPPLIER PLATFORM LOGOS (GetYourGuide, Trip.com, Viator, etc.) */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  STAGE 02 OF 03 • PLAYS AFTER HOTEL LOGOS FINISH
                </span>
                <h3 className="text-base font-black text-zinc-950 mt-2">
                  Registered Supplier Platform Logos ({(formState.otaPartners || []).length} Platforms)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Upload platform logos or edit supplier credentials. Uploading or adding saves immediately to Firebase!
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveToFirebase(undefined, 'Stage 2 Supplier Platform Logos saved to Firebase!')
                }
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Check className="w-3.5 h-3.5" /> Save Stage 2 to Firebase
              </button>
            </div>

            {/* Add New OTA Partner */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-amber-50/40 p-4 rounded-2xl border border-amber-200/80">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={newOta.name || ''}
                  onChange={(e) => setNewOta({ ...newOta, name: e.target.value })}
                  placeholder="e.g. Booking.com"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Supplier Role Badge
                </label>
                <input
                  type="text"
                  value={newOta.roleBadge || ''}
                  onChange={(e) =>
                    setNewOta({ ...newOta, roleBadge: e.target.value })
                  }
                  placeholder="Official Local Supplier"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Partnership Description
                </label>
                <input
                  type="text"
                  value={newOta.description || ''}
                  onChange={(e) =>
                    setNewOta({ ...newOta, description: e.target.value })
                  }
                  placeholder="Direct contracted ground operator..."
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Upload Platform Logo Photo
                </label>
                <div className="flex items-center gap-2">
                  {newOta.logoUrl && (
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={newOta.logoUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-white border border-dashed border-amber-400 hover:border-amber-600 rounded-xl text-xs font-bold text-amber-800 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {newOta.logoUrl ? 'Change Photo' : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (dataUrl, cleanFileName) => {
                          setNewOta((prev) => ({
                            ...prev,
                            name: prev.name || cleanFileName,
                            logoUrl: dataUrl
                          }));
                          showToast('Platform logo loaded! Click "+ Add & Save" to publish.');
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newOta.name && !newOta.logoUrl) {
                      showToast('Please enter the OTA platform name or upload a logo.');
                      return;
                    }
                    const resolvedName = newOta.name || 'Registered OTA Partner';
                    const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      resolvedName
                    )}&background=18181b&color=f59e0b&size=200&bold=true`;
                    const item: OtaPartner = {
                      id: `ota-${Date.now()}`,
                      name: resolvedName,
                      logoUrl: newOta.logoUrl || fallbackLogo,
                      roleBadge: newOta.roleBadge || 'Official Local Supplier',
                      description:
                        newOta.description ||
                        'Authorized Malaysian DMC & direct inventory supplier.',
                      rating: newOta.rating || '4.9 / 5.0',
                      reviewsCount: newOta.reviewsCount || '10,000+ Bookings',
                      accentColor: newOta.accentColor || '#f59e0b',
                      verified: true
                    };
                    const updatedList = [...(formStateRef.current.otaPartners || []), item];
                    saveToFirebase(
                      { otaPartners: updatedList },
                      `Added "${resolvedName}" to Stage 2 & saved to Firebase!`
                    );
                    setNewOta({
                      name: '',
                      logoUrl: '',
                      roleBadge: 'Official Malaysia Local Supplier',
                      description: '',
                      rating: '4.9 / 5.0',
                      reviewsCount: '10,000+ Verified Bookings',
                      accentColor: '#10b981',
                      verified: true
                    });
                  }}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add &amp; Save
                </button>
              </div>
            </div>

            {/* Existing OTA Partners List */}
            <div className="space-y-3">
              {(formState.otaPartners || []).map((partner, idx) => (
                <div
                  key={partner.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200"
                >
                  <div className="md:col-span-2 flex items-center gap-2.5">
                    <div className="w-16 h-11 rounded-xl bg-zinc-900 border border-zinc-300 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      {partner.logoUrl ? (
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-black text-white">
                          {partner.name.slice(0, 4)}
                        </span>
                      )}
                    </div>
                    <label className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold text-amber-800 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (dataUrl) => {
                            const list = [...(formStateRef.current.otaPartners || [])];
                            list[idx] = { ...list[idx], logoUrl: dataUrl };
                            saveToFirebase(
                              { otaPartners: list },
                              `Uploaded new logo for "${partner.name}" & saved to Firebase!`
                            );
                          })
                        }
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={partner.name}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.otaPartners || [])];
                      list[idx] = { ...list[idx], name: e.target.value };
                      updateFieldWithAutoSave({ otaPartners: list });
                    }}
                    className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-black text-zinc-900"
                  />
                  <input
                    type="text"
                    value={partner.roleBadge}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.otaPartners || [])];
                      list[idx] = { ...list[idx], roleBadge: e.target.value };
                      updateFieldWithAutoSave({ otaPartners: list });
                    }}
                    className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                  />
                  <input
                    type="text"
                    value={partner.description}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.otaPartners || [])];
                      list[idx] = { ...list[idx], description: e.target.value };
                      updateFieldWithAutoSave({ otaPartners: list });
                    }}
                    className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700"
                  />
                  <input
                    type="text"
                    value={partner.reviewsCount}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.otaPartners || [])];
                      list[idx] = { ...list[idx], reviewsCount: e.target.value };
                      updateFieldWithAutoSave({ otaPartners: list });
                    }}
                    className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900"
                  />
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const list = (formStateRef.current.otaPartners || []).filter(
                          (_, i) => i !== idx
                        );
                        saveToFirebase(
                          { otaPartners: list },
                          `Removed "${partner.name}" & saved to Firebase!`
                        );
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete Supplier Platform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. STAGE 3 MANAGER: FLIGHT & AIRLINE PARTNERSHIP LOGOS */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                  STAGE 03 OF 03 • PLAYS AFTER SUPPLIER PLATFORMS FINISH
                </span>
                <h3 className="text-base font-black text-zinc-950 mt-2">
                  Airline &amp; Flight Partnership Logos ({(formState.flightPartnerLogos || []).length} Logos)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Upload airline logos from your device or paste URLs. Uploading or adding saves immediately to Firebase!
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveToFirebase(undefined, 'Stage 3 Flight Partnership Logos saved to Firebase!')
                }
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Check className="w-3.5 h-3.5" /> Save Stage 3 to Firebase
              </button>
            </div>

            {/* Add New Airline / Flight Partner Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-sky-50/40 p-4 rounded-2xl border border-sky-200/80">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Airline / Flight Partner Name
                </label>
                <input
                  type="text"
                  value={newFlightLogo.name || ''}
                  onChange={(e) =>
                    setNewFlightLogo({ ...newFlightLogo, name: e.target.value })
                  }
                  placeholder="e.g. Etihad Airways"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Route / Hub Subtitle
                </label>
                <input
                  type="text"
                  value={newFlightLogo.subtitle || ''}
                  onChange={(e) =>
                    setNewFlightLogo({ ...newFlightLogo, subtitle: e.target.value })
                  }
                  placeholder="Abu Dhabi–KLIA Inbound Tours"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Partnership Badge
                </label>
                <input
                  type="text"
                  value={newFlightLogo.badgeText || ''}
                  onChange={(e) =>
                    setNewFlightLogo({ ...newFlightLogo, badgeText: e.target.value })
                  }
                  placeholder="Official Flight Partner"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Upload Airline Logo Photo
                </label>
                <div className="flex items-center gap-2">
                  {newFlightLogo.logoUrl && (
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={newFlightLogo.logoUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-white border border-dashed border-sky-400 hover:border-sky-600 rounded-xl text-xs font-bold text-sky-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {newFlightLogo.logoUrl ? 'Change Photo' : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (dataUrl, cleanFileName) => {
                          setNewFlightLogo((prev) => ({
                            ...prev,
                            name: prev.name || cleanFileName,
                            logoUrl: dataUrl
                          }));
                          showToast('Airline logo loaded! Click "+ Add & Save" to publish.');
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newFlightLogo.name && !newFlightLogo.logoUrl) {
                      showToast('Please enter the Airline Name or upload a logo photo.');
                      return;
                    }
                    const resolvedName = newFlightLogo.name || 'Official Airline Partner';
                    const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      resolvedName
                    )}&background=172554&color=38bdf8&size=200&bold=true`;
                    const item: PartnerLogoItem = {
                      id: `flogo-${Date.now()}`,
                      category: 'flight',
                      name: resolvedName,
                      logoUrl: newFlightLogo.logoUrl || fallbackLogo,
                      subtitle:
                        newFlightLogo.subtitle ||
                        'KLIA Domestic & International Aviation Partner',
                      badgeText: newFlightLogo.badgeText || 'Official Flight Partner',
                      accentColor: newFlightLogo.accentColor || '#38bdf8',
                      verified: true
                    };
                    const updatedList = [
                      ...(formStateRef.current.flightPartnerLogos || []),
                      item
                    ];
                    saveToFirebase(
                      { flightPartnerLogos: updatedList },
                      `Added "${resolvedName}" to Stage 3 & saved to Firebase!`
                    );
                    setNewFlightLogo({
                      name: '',
                      logoUrl: '',
                      subtitle: 'KLIA Domestic & International Routes',
                      badgeText: 'Official Aviation Partner',
                      accentColor: '#38bdf8'
                    });
                  }}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add &amp; Save
                </button>
              </div>
            </div>

            {/* Existing Flight Partner Logos List */}
            <div className="space-y-3">
              {(formState.flightPartnerLogos || []).map((fItem, idx) => (
                <div
                  key={fItem.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200"
                >
                  <div className="md:col-span-2 flex items-center gap-2.5">
                    <div className="w-16 h-11 rounded-xl bg-zinc-900 border border-zinc-300 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      <img
                        src={fItem.logoUrl}
                        alt={fItem.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <label className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold text-sky-800 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (dataUrl) => {
                            const list = [...(formStateRef.current.flightPartnerLogos || [])];
                            list[idx] = { ...list[idx], logoUrl: dataUrl };
                            saveToFirebase(
                              { flightPartnerLogos: list },
                              `Uploaded new logo for "${fItem.name}" & saved to Firebase!`
                            );
                          })
                        }
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={fItem.name}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.flightPartnerLogos || [])];
                      list[idx] = { ...list[idx], name: e.target.value };
                      updateFieldWithAutoSave({ flightPartnerLogos: list });
                    }}
                    placeholder="Airline Name"
                    className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-black text-zinc-900"
                  />
                  <input
                    type="text"
                    value={fItem.subtitle}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.flightPartnerLogos || [])];
                      list[idx] = { ...list[idx], subtitle: e.target.value };
                      updateFieldWithAutoSave({ flightPartnerLogos: list });
                    }}
                    placeholder="Routes / Hub"
                    className="md:col-span-3 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700"
                  />
                  <input
                    type="text"
                    value={fItem.badgeText}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.flightPartnerLogos || [])];
                      list[idx] = { ...list[idx], badgeText: e.target.value };
                      updateFieldWithAutoSave({ flightPartnerLogos: list });
                    }}
                    placeholder="Partnership Badge"
                    className="md:col-span-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-sky-700"
                  />
                  <input
                    type="text"
                    value={fItem.logoUrl}
                    onChange={(e) => {
                      const list = [...(formStateRef.current.flightPartnerLogos || [])];
                      list[idx] = { ...list[idx], logoUrl: e.target.value };
                      updateFieldWithAutoSave({ flightPartnerLogos: list });
                    }}
                    placeholder="Logo URL or DataURI"
                    className="md:col-span-1 bg-white border border-zinc-200 rounded-xl px-2 py-2 text-[11px] text-zinc-500"
                  />
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const list = (formStateRef.current.flightPartnerLogos || []).filter(
                          (_, i) => i !== idx
                        );
                        saveToFirebase(
                          { flightPartnerLogos: list },
                          `Removed "${fItem.name}" & saved to Firebase!`
                        );
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete Airline Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: SEO & TRENDING MALAYSIA KEYWORDS MANAGER
      ===================================================================== */}
      {activeSubTab === 'seo' && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5 max-w-4xl">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-base font-black text-zinc-950">
                Search Engine Optimization (SEO) &amp; Trending Malaysia Keywords
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Dynamically updates &lt;title&gt;, meta description, OpenGraph tags, and trending search keywords
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                saveToFirebase(
                  {
                    seoTitle:
                      'GFK Holidays Malaysia | Book Best Malaysia Tour Packages, Activities & Hotels',
                    seoDescription:
                      "Book Malaysia's top-rated tour packages, attraction tickets, Langkawi & Sabah island escapes, private transfers, and contracted hotels directly with GFK Holidays — Official Supplier on GetYourGuide, Trip.com & Viator.",
                    seoKeywords: DEFAULT_SEO_KEYWORDS
                  },
                  'Loaded recommended Malaysia SEO keywords & saved to Firebase!'
                )
              }
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Load Recommended Malaysia Trending Keywords
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              SEO Page Title (&lt;title&gt; &amp; og:title)
            </label>
            <input
              type="text"
              value={formState.seoTitle || ''}
              onChange={(e) =>
                updateFieldWithAutoSave({ seoTitle: e.target.value })
              }
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              SEO Meta Description (&lt;meta name="description"&gt; &amp; og:description)
            </label>
            <textarea
              rows={3}
              value={formState.seoDescription || ''}
              onChange={(e) =>
                updateFieldWithAutoSave({ seoDescription: e.target.value })
              }
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Trending Malaysia Travel Keywords (Comma-Separated)
            </label>
            <textarea
              rows={4}
              value={formState.seoKeywords || ''}
              onChange={(e) =>
                updateFieldWithAutoSave({ seoKeywords: e.target.value })
              }
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 resize-none"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 6: BOTTOM PARTNER TICKER ANIMATION (LEFT/RIGHT)
      ===================================================================== */}
      {activeSubTab === 'partner_marquee' && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-6 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                BOTTOM WEBSITE PARTNER TICKER ANIMATION (LEFT / RIGHT)
              </span>
              <h3 className="text-base font-black text-zinc-950 mt-2">
                Partner Photos Marquee Animation Manager ({(formState.partnerMarqueeLogos || []).length} Logos)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Presents uploaded partner photos and logos in a smooth left-to-right or right-to-left horizontal ticker at the bottom of the website.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveToFirebase(undefined, 'Partner Marquee Ticker settings saved to Firebase!')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Save Marquee to Firebase
            </button>
          </div>

          {/* Marquee Settings Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-900 block">Enable Marquee Ticker</label>
                <span className="text-[11px] text-zinc-500">Show/hide bottom banner</span>
              </div>
              <input
                type="checkbox"
                checked={formState.partnerMarqueeEnabled !== false}
                onChange={(e) => updateFieldWithAutoSave({ partnerMarqueeEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-900 mb-1">Animation Direction</label>
              <select
                value={formState.partnerMarqueeDirection || 'left'}
                onChange={(e) => updateFieldWithAutoSave({ partnerMarqueeDirection: e.target.value as any })}
                className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
              >
                <option value="left">Left to Right (Scroll Right)</option>
                <option value="right">Right to Left (Scroll Left)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-900 mb-1">Animation Speed</label>
              <select
                value={formState.partnerMarqueeSpeed || 'normal'}
                onChange={(e) => updateFieldWithAutoSave({ partnerMarqueeSpeed: e.target.value as any })}
                className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
              >
                <option value="slow">Slow (Relaxed pace)</option>
                <option value="normal">Normal (Standard)</option>
                <option value="fast">Fast (Dynamic)</option>
              </select>
            </div>
          </div>

          {/* Add New Marquee Logo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Partner / Brand Name</label>
              <input
                type="text"
                value={newMarqueeLogo.name || ''}
                onChange={(e) => setNewMarqueeLogo({ ...newMarqueeLogo, name: e.target.value })}
                placeholder="e.g. Booking.com"
                className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Subtitle / Role</label>
              <input
                type="text"
                value={newMarqueeLogo.subtitle || ''}
                onChange={(e) => setNewMarqueeLogo({ ...newMarqueeLogo, subtitle: e.target.value })}
                placeholder="Global Accommodation Partner"
                className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Upload Logo Photo</label>
              <div className="flex items-center gap-2">
                {newMarqueeLogo.logoUrl && (
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 p-1 flex items-center justify-center shrink-0">
                    <img src={newMarqueeLogo.logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-white border border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl text-xs font-bold text-emerald-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">{newMarqueeLogo.logoUrl ? 'Change' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (dataUrl, cleanName) => {
                        setNewMarqueeLogo(prev => ({
                          ...prev,
                          name: prev.name || cleanName,
                          logoUrl: dataUrl
                        }));
                        showToast('Logo photo loaded! Click "+ Add to Ticker".');
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => {
                  if (!newMarqueeLogo.name && !newMarqueeLogo.logoUrl) {
                    showToast('Please provide a partner name or logo photo.');
                    return;
                  }
                  const name = newMarqueeLogo.name || 'Verified Partner';
                  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=047857&color=ffffff&size=120&bold=true`;
                  const item: PartnerLogoItem = {
                    id: `pm-${Date.now()}`,
                    category: 'ota',
                    name,
                    logoUrl: newMarqueeLogo.logoUrl || fallback,
                    subtitle: newMarqueeLogo.subtitle || 'Verified Alliance Partner',
                    badgeText: 'Verified',
                    verified: true
                  };
                  const updated = [...(formStateRef.current.partnerMarqueeLogos || []), item];
                  saveToFirebase({ partnerMarqueeLogos: updated }, `Added "${name}" to Partner Marquee & saved!`);
                  setNewMarqueeLogo({ name: '', logoUrl: '', subtitle: 'Verified Alliance Partner', badgeText: 'Verified' });
                }}
                className="w-full bg-zinc-950 hover:bg-zinc-800 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add to Ticker
              </button>
            </div>
          </div>

          {/* Marquee Logos List */}
          <div className="space-y-3">
            {(formState.partnerMarqueeLogos || []).map((logo, idx) => (
              <div key={logo.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                <div className="md:col-span-2 flex items-center gap-2.5">
                  <div className="w-14 h-10 rounded-xl bg-zinc-900 border border-zinc-300 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img src={logo.logoUrl} alt={logo.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <label className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (dataUrl) => {
                          const list = [...(formStateRef.current.partnerMarqueeLogos || [])];
                          list[idx] = { ...list[idx], logoUrl: dataUrl };
                          saveToFirebase({ partnerMarqueeLogos: list }, `Updated photo for "${logo.name}"!`);
                        })
                      }
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={logo.name}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.partnerMarqueeLogos || [])];
                    list[idx] = { ...list[idx], name: e.target.value };
                    updateFieldWithAutoSave({ partnerMarqueeLogos: list });
                  }}
                  className="md:col-span-4 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-black text-zinc-900"
                  placeholder="Partner Name"
                />
                <input
                  type="text"
                  value={logo.subtitle}
                  onChange={(e) => {
                    const list = [...(formStateRef.current.partnerMarqueeLogos || [])];
                    list[idx] = { ...list[idx], subtitle: e.target.value };
                    updateFieldWithAutoSave({ partnerMarqueeLogos: list });
                  }}
                  className="md:col-span-5 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700"
                  placeholder="Subtitle / Role"
                />
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const list = (formStateRef.current.partnerMarqueeLogos || []).filter((_, i) => i !== idx);
                      saveToFirebase({ partnerMarqueeLogos: list }, `Removed "${logo.name}" from Marquee!`);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                    title="Delete Partner Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
