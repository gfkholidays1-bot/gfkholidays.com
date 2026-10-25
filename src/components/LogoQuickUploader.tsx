import React, { useState, useRef, useEffect } from 'react';
import { Upload, Crop, Check, RefreshCw, Eye, Sparkles, AlignLeft, AlignCenter } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';
import { GlobalSettings } from '../types';

interface LogoQuickUploaderProps {
  currentLogoUrl: string;
  currentShowBrandText?: boolean;
  currentLogoHeight?: number;
  currentLogoFit?: 'edge-to-edge' | 'standard' | 'compact';
  currentLogoAlign?: 'left' | 'center';
  onLogoUpdated: (newLogoUrl: string, settingsPatch?: Partial<GlobalSettings>) => void;
  showToast: (msg: string) => void;
}

export default function LogoQuickUploader({
  currentLogoUrl,
  currentShowBrandText,
  currentLogoHeight,
  currentLogoFit,
  currentLogoAlign,
  onLogoUpdated,
  showToast
}: LogoQuickUploaderProps) {
  // Active logo source
  const [activeLogo, setActiveLogo] = useState<string>(() => {
    return currentLogoUrl || '/logo-transparent.svg';
  });

  const [fitMode, setFitMode] = useState<'edge-to-edge' | 'standard' | 'compact'>(() => {
    if (currentLogoFit) return currentLogoFit;
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gfk_logo_fit') as any) || 'edge-to-edge';
    }
    return 'edge-to-edge';
  });

  const [alignment, setAlignment] = useState<'left' | 'center'>(() => {
    if (currentLogoAlign) return currentLogoAlign;
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gfk_logo_align') as any) || 'left';
    }
    return 'left';
  });

  const [logoHeight, setLogoHeight] = useState<number>(() => {
    if (currentLogoHeight && currentLogoHeight >= 32 && currentLogoHeight <= 80) {
      return currentLogoHeight;
    }
    if (typeof window !== 'undefined') {
      const h = Number(localStorage.getItem('gfk_logo_height'));
      if (h >= 32 && h <= 80) return h;
    }
    return 54;
  });

  const [showBrandText, setShowBrandText] = useState<boolean>(() => {
    if (currentShowBrandText !== undefined) return Boolean(currentShowBrandText);
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('gfk_show_brand_text');
      if (val !== null) return val === 'true';
    }
    return true;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const sliderDebounceRef = useRef<any>(null);

  // Sync with parent props when loaded
  useEffect(() => {
    if (currentLogoUrl && currentLogoUrl !== 'https://iili.io/ChVw1zF.png') {
      setActiveLogo(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  useEffect(() => {
    if (currentShowBrandText !== undefined) {
      setShowBrandText(Boolean(currentShowBrandText));
    }
  }, [currentShowBrandText]);

  useEffect(() => {
    if (currentLogoHeight && currentLogoHeight >= 32 && currentLogoHeight <= 80) {
      setLogoHeight(Number(currentLogoHeight));
    }
  }, [currentLogoHeight]);

  useEffect(() => {
    if (currentLogoAlign) {
      setAlignment(currentLogoAlign);
    }
  }, [currentLogoAlign]);

  useEffect(() => {
    if (currentLogoFit) {
      setFitMode(currentLogoFit);
    }
  }, [currentLogoFit]);

  // Trims empty transparent and white margins from an image to make it 100% edge-to-edge
  const autoCropEdgeToEdge = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          canvas.width = naturalW;
          canvas.height = naturalH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(imageSrc);

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, naturalW, naturalH);
          const data = imgData.data;

          let minX = naturalW;
          let minY = naturalH;
          let maxX = 0;
          let maxY = 0;

          // Scan pixels for non-transparent content
          for (let y = 0; y < naturalH; y++) {
            for (let x = 0; x < naturalW; x++) {
              const idx = (y * naturalW + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              // Visible and not pure white border
              const isVisible = a > 20;
              const isNotWhite = !(r > 240 && g > 240 && b > 240 && a > 240);

              if (isVisible && isNotWhite) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // If no content or already tight
          if (minX >= maxX || minY >= maxY) {
            minX = 0;
            minY = 0;
            maxX = naturalW;
            maxY = naturalH;
          }

          // Add a tiny 2px breathing buffer
          const padding = 2;
          const cropX = Math.max(0, minX - padding);
          const cropY = Math.max(0, minY - padding);
          const cropW = Math.min(naturalW - cropX, maxX - minX + padding * 2);
          const cropH = Math.min(naturalH - cropY, maxY - minY + padding * 2);

          // Optimal output resolution (max 440px wide to stay under 30KB)
          const maxTargetW = 440;
          let outW = cropW;
          let outH = cropH;
          if (outW > maxTargetW) {
            outH = Math.round((outH * maxTargetW) / outW);
            outW = maxTargetW;
          }

          const outCanvas = document.createElement('canvas');
          outCanvas.width = outW;
          outCanvas.height = outH;
          const outCtx = outCanvas.getContext('2d');
          if (!outCtx) return resolve(imageSrc);

          outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

          const result = outCanvas.toDataURL('image/webp', 0.92);
          if (result && result.startsWith('data:image/webp')) {
            resolve(result);
          } else {
            resolve(outCanvas.toDataURL('image/png'));
          }
        } catch (_err) {
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  // Upload new logo image and automatically crop it edge-to-edge
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (rawDataUrl) {
        // Automatically crop transparent/white excess borders so it fits edge-to-edge
        const croppedEdgeToEdge = await autoCropEdgeToEdge(rawDataUrl);
        setActiveLogo(croppedEdgeToEdge);
        setIsProcessing(false);
        showToast('Logo uploaded and automatically cropped to fit edge-to-edge!');
        // Automatically apply & persist
        saveAndPublish(croppedEdgeToEdge, fitMode, alignment, logoHeight, showBrandText);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Trigger manual Auto-Crop on existing logo
  const handleManualAutoCrop = async () => {
    if (!activeLogo) return;
    setIsProcessing(true);
    const cropped = await autoCropEdgeToEdge(activeLogo);
    setActiveLogo(cropped);
    setIsProcessing(false);
    showToast('Cropped empty borders out! Logo is now edge-to-edge.');
    saveAndPublish(cropped, fitMode, alignment, logoHeight, showBrandText);
  };

  // Save to localStorage, dispatch live event, and propagate through parent CMS panel
  const saveAndPublish = async (
    targetLogo = activeLogo,
    targetFit = fitMode,
    targetAlign = alignment,
    targetHeight = logoHeight,
    targetShowText = showBrandText
  ) => {
    setIsSaved(true);
    try {
      // 1. Immediately store in localStorage
      localStorage.setItem('gfk_active_logo', targetLogo);
      localStorage.setItem('gfk_logo_fit', targetFit);
      localStorage.setItem('gfk_logo_align', targetAlign);
      localStorage.setItem('gfk_logo_height', String(targetHeight));
      localStorage.setItem('gfk_show_brand_text', String(targetShowText));

      const patch: Partial<GlobalSettings> = {
        logoUrl: targetLogo,
        invoiceLogoUrl: targetLogo,
        logoFit: targetFit,
        logoAlign: targetAlign,
        logoHeight: targetHeight,
        showBrandText: targetShowText
      };

      // 2. Dispatch custom event so Header, Footer, and live app update instantly
      window.dispatchEvent(
        new CustomEvent('gfk-logo-updated', {
          detail: {
            ...patch,
            fit: targetFit,
            alignment: targetAlign,
            height: targetHeight
          }
        })
      );

      // 3. Immediately update parent state & persist via CMS/Firestore pipeline
      onLogoUpdated(targetLogo, patch);
    } catch (err: any) {
      console.debug('Warning saving logo:', err);
    } finally {
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Reset to default
  const handleResetDefault = () => {
    const defaultUrl = '/logo-transparent.svg';
    setActiveLogo(defaultUrl);
    setFitMode('edge-to-edge');
    setAlignment('left');
    setLogoHeight(54);
    setShowBrandText(true);

    try {
      localStorage.removeItem('gfk_active_logo');
      localStorage.setItem('gfk_logo_fit', 'edge-to-edge');
      localStorage.setItem('gfk_logo_align', 'left');
      localStorage.setItem('gfk_logo_height', '54');
      localStorage.setItem('gfk_show_brand_text', 'true');
    } catch (_e) {}

    const resetPatch: Partial<GlobalSettings> = {
      logoUrl: defaultUrl,
      invoiceLogoUrl: defaultUrl,
      logoFit: 'edge-to-edge',
      logoAlign: 'left',
      logoHeight: 54,
      showBrandText: true
    };

    window.dispatchEvent(
      new CustomEvent('gfk-logo-updated', {
        detail: {
          ...resetPatch,
          fit: 'edge-to-edge',
          alignment: 'left',
          height: 54
        }
      })
    );

    onLogoUpdated(defaultUrl, resetPatch);
    showToast('Reset to default vector logo.');
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-7 border border-zinc-200 shadow-sm space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
            <Crop className="w-5 h-5 text-emerald-700" />
            Website Logo &amp; Edge-to-Edge Fitting
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Upload your logo, auto-crop empty borders, and adjust height &amp; alignment for the live header.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Default</span>
          </button>
          <button
            type="button"
            onClick={() => saveAndPublish()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Applied Live!' : 'Save & Apply Live'}</span>
          </button>
        </div>
      </div>

      {/* Upload & Auto-Crop Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Button */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
            1. Select Logo File from Computer
          </label>
          <label className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 text-xs font-bold text-emerald-950 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-emerald-700" />
            <div className="text-left">
              <span className="block text-zinc-900 font-extrabold">Choose Image to Upload</span>
              <span className="block text-[11px] text-zinc-500 font-medium">
                PNG, SVG, JPG or WebP (auto-crops on upload)
              </span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Auto Crop Edge-to-Edge Button */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
            2. Crop Empty Margins (Edge-to-Edge)
          </label>
          <button
            type="button"
            onClick={handleManualAutoCrop}
            disabled={isProcessing}
            className="w-full p-4 border border-zinc-200 hover:border-emerald-500 rounded-2xl bg-zinc-50 hover:bg-emerald-50/40 text-left cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="block text-xs font-black text-zinc-900 group-hover:text-emerald-700 transition-colors">
                {isProcessing ? 'Cropping...' : 'Auto-Crop to Edge-to-Edge'}
              </span>
              <span className="block text-[11px] text-zinc-500 font-medium">
                Removes transparent or white borders so logo fills the header
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Sizing, Alignment & Options Bar */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4.5 space-y-4">
        <div className="text-xs font-black text-zinc-900">
          3. Live Alignment &amp; Display Options
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Logo Height / Scale */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1">
              <span>Logo Size / Height</span>
              <span className="font-mono text-emerald-700">{logoHeight}px</span>
            </div>
            <input
              type="range"
              min="36"
              max="72"
              step="2"
              value={logoHeight}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLogoHeight(val);
                if (sliderDebounceRef.current) clearTimeout(sliderDebounceRef.current);
                sliderDebounceRef.current = setTimeout(() => {
                  saveAndPublish(activeLogo, fitMode, alignment, val, showBrandText);
                }, 300);
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-bold mt-0.5">
              <span>Compact</span>
              <span>Standard (54px)</span>
              <span>Edge-to-Edge</span>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Header Alignment
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAlignment('left');
                  saveAndPublish(activeLogo, fitMode, 'left', logoHeight, showBrandText);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  alignment === 'left'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Left Aligned</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAlignment('center');
                  saveAndPublish(activeLogo, fitMode, 'center', logoHeight, showBrandText);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  alignment === 'center'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Center Aligned</span>
              </button>
            </div>
          </div>

          {/* Show / Hide GFK Holidays text */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Brand Wordmark Text
            </label>
            <label className="flex items-center gap-2.5 p-2 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100/70 transition-colors">
              <input
                type="checkbox"
                checked={showBrandText}
                onChange={(e) => {
                  const val = e.target.checked;
                  setShowBrandText(val);
                  saveAndPublish(activeLogo, fitMode, alignment, logoHeight, val);
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800">
                Show &quot;GFK Holidays&quot; next to logo
              </span>
            </label>
            <p className="text-[10px] text-zinc-400 mt-1">
              Uncheck if your logo graphic already includes the words &quot;GFK Holidays&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Simulated Website Header Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-700" /> Live Simulation on Website Header
          </span>
          <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">
            Updates in real-time
          </span>
        </div>

        {/* Real Header Bar Simulation */}
        <div className="bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div
            className={`flex items-center gap-4 ${
              alignment === 'center' ? 'justify-center' : 'justify-between'
            }`}
          >
            {/* Logo + Text */}
            <div className="flex items-center gap-3 shrink-0">
              <img
                src={activeLogo}
                alt="Active Logo"
                style={{ height: `${logoHeight}px` }}
                className="w-auto object-contain shrink-0 transition-all bg-transparent"
              />
              {showBrandText && (
                <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 leading-none whitespace-nowrap">
                  GFK Holidays
                </span>
              )}
            </div>

            {/* Simulated nav items */}
            {alignment === 'left' && (
              <div className="hidden sm:flex items-center gap-5 text-xs font-semibold text-zinc-600">
                <span className="text-emerald-700 font-bold">Malaysia Packages</span>
                <span>Attraction Tickets</span>
                <span>Contracted Hotels</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
