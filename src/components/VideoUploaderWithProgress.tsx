import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Film,
  ExternalLink,
  Trash2,
  Play,
  HardDrive,
  Info,
  Layers,
  Sparkles,
  Lock,
  RefreshCw,
  X
} from 'lucide-react';
import {
  saveVideoBlob,
  loadVideoBlob,
  deleteStoredVideoItem,
  activateStoredVideo,
  getStoredVideosList,
  registerUrlInLibrary,
  clearAllStoredVideos,
  auditStoredVideos,
  purgeAllVideoStorage,
  getVideoSourceMode,
  setVideoSourceMode,
  isDirectVideoSource,
  isUploadedVideoUrl,
  DEFAULT_SCENIC_HERO_VIDEO,
  StoredVideoItem,
  StorageAuditResult
} from '../lib/videoStorage';

export interface VideoAppliedMetadata {
  sourceMode: 'upload' | 'url';
  fileName?: string;
  serverUrl?: string | null;
}

interface VideoUploaderWithProgressProps {
  label: string;
  storageKey: 'hero_background_video' | 'featured_attractions_video';
  currentVideoUrl: string;
  currentVideoSource?: 'upload' | 'url';
  currentVideoFileName?: string;
  onVideoApplied: (videoUrl: string, meta?: VideoAppliedMetadata) => void;
  showToast: (msg: string) => void;
  description?: string;
  presets?: Array<{ label: string; url: string }>;
  defaultFallbackUrl?: string;
}

export default function VideoUploaderWithProgress({
  label,
  storageKey,
  currentVideoUrl,
  currentVideoSource,
  currentVideoFileName,
  onVideoApplied,
  showToast,
  description,
  presets = [],
  defaultFallbackUrl = DEFAULT_SCENIC_HERO_VIDEO
}: VideoUploaderWithProgressProps) {
  const [activeSourceMode, setActiveSourceMode] = useState<'upload' | 'url'>(() => {
    if (currentVideoSource === 'upload' || isUploadedVideoUrl(currentVideoUrl)) {
      return 'upload';
    }
    return getVideoSourceMode();
  });

  // Default tab matches active source mode so there is zero confusion
  const [inputMode, setInputMode] = useState<'upload' | 'url' | 'library' | 'storage_audit'>('upload');

  const sanitizeInitialUrl = (raw?: string): string => {
    if (!raw || raw.includes('viddler.com')) {
      return defaultFallbackUrl;
    }
    return raw;
  };

  const [activeUrl, setActiveUrl] = useState<string>(() => sanitizeInitialUrl(currentVideoUrl));
  const [activeFileName, setActiveFileName] = useState<string>(() => {
    if (currentVideoFileName) return currentVideoFileName;
    try {
      return localStorage.getItem('gfk_video_name_hero_background_video') || '';
    } catch {
      return '';
    }
  });

  // Keep URL input box separate so an external URL never overwrites an uploaded video
  const [urlInput, setUrlInput] = useState<string>(() => {
    if (
      currentVideoUrl &&
      !isUploadedVideoUrl(currentVideoUrl) &&
      !currentVideoUrl.includes('viddler.com')
    ) {
      return currentVideoUrl;
    }
    return '';
  });

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [fileStats, setFileStats] = useState<{ name: string; sizeMb: string; loadedMb: string } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [showStorageExplainer, setShowStorageExplainer] = useState<boolean>(false);

  // Stored videos list for the library
  const [storedList, setStoredList] = useState<StoredVideoItem[]>([]);

  // Inline confirmation states (NO window.confirm!)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);

  // Storage audit result
  const [auditData, setAuditData] = useState<StorageAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const refreshLibrary = () => {
    const list = getStoredVideosList(storageKey);
    setStoredList(list);
  };

  const runStorageAudit = async () => {
    setIsAuditing(true);
    try {
      const data = await auditStoredVideos(storageKey);
      setAuditData(data);
    } catch (_e) {
      // ignore
    } finally {
      setIsAuditing(false);
    }
  };

  // Load uploaded video from IndexedDB / Server on mount if source mode is 'upload'
  useEffect(() => {
    let isMounted = true;
    const mode =
      currentVideoSource === 'upload' || isUploadedVideoUrl(currentVideoUrl)
        ? 'upload'
        : getVideoSourceMode();

    if (mode === 'upload') {
      if (isUploadedVideoUrl(currentVideoUrl)) {
        setActiveSourceMode('upload');
        setActiveUrl(currentVideoUrl);
      } else {
        loadVideoBlob(storageKey).then((savedObjectUrl) => {
          if (!isMounted) return;
          if (savedObjectUrl) {
            setActiveSourceMode('upload');
            setActiveUrl(savedObjectUrl);
          }
        });
      }
    } else if (currentVideoUrl && !currentVideoUrl.startsWith('blob:')) {
      setActiveUrl(sanitizeInitialUrl(currentVideoUrl));
    }

    refreshLibrary();
    runStorageAudit();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // Sync external currentVideoUrl ONLY when in 'url' mode or if the incoming URL is a server-uploaded video
  useEffect(() => {
    if (!currentVideoUrl) return;

    // If the incoming URL is an uploaded server video (/api/cms-video/... or /uploads/...), always honor it as 'upload'
    if (isUploadedVideoUrl(currentVideoUrl)) {
      setActiveSourceMode('upload');
      if (!activeUrl.startsWith('blob:') && activeUrl !== currentVideoUrl) {
        setActiveUrl(currentVideoUrl);
      }
      if (currentVideoFileName) {
        setActiveFileName(currentVideoFileName);
      }
      return;
    }

    // CRITICAL FIX: If an uploaded video file is active, DO NOT let an external URL overwrite it!
    const currentMode = getVideoSourceMode();
    if (currentMode === 'upload' || activeSourceMode === 'upload' || currentVideoSource === 'upload') {
      return;
    }

    if (!currentVideoUrl.startsWith('blob:') && !currentVideoUrl.includes('viddler.com')) {
      setActiveUrl(currentVideoUrl);
      setUrlInput(currentVideoUrl);
    }
  }, [currentVideoUrl, currentVideoSource, currentVideoFileName]);

  // Handle local video file upload with real-time percentage progress
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file (.mp4, .webm, or .mov)');
      return;
    }

    const totalSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileStats({
      name: file.name,
      sizeMb: totalSizeMb,
      loadedMb: '0.0'
    });

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadStatus(`Preparing to upload ${file.name} (${totalSizeMb} MB)...`);

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(95, Math.round((event.loaded / event.total) * 95));
        const currentLoadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
        setUploadProgress(percent);
        setFileStats({
          name: file.name,
          sizeMb: totalSizeMb,
          loadedMb: currentLoadedMb
        });
        setUploadStatus(`Reading video file: ${percent}% (${currentLoadedMb} MB of ${totalSizeMb} MB)`);
      }
    };

    reader.onload = async () => {
      setUploadProgress(98);
      setUploadStatus(`Saving video to server & high-speed storage...`);

      try {
        const { playbackUrl, serverUrl, fileName } = await saveVideoBlob(storageKey, file, file.name);

        setUploadProgress(100);
        setActiveSourceMode('upload');
        setActiveFileName(fileName);
        setActiveUrl(playbackUrl);
        // Clear URL input box so URL never conflicts with uploaded file
        setUrlInput('');
        setIsUploading(false);
        setUploadSuccess(true);
        setUploadStatus(
          `Uploaded "${fileName}" (100%)! Uploaded video is now priority-locked & playing live on Desktop & Mobile.`
        );
        refreshLibrary();
        runStorageAudit();

        // Broadcast event so homepage hero & mobile video immediately update
        window.dispatchEvent(
          new CustomEvent('gfk-video-updated', {
            detail: {
              key: 'hero_background_video',
              videoUrl: playbackUrl,
              serverUrl,
              sourceMode: 'upload',
              fileName
            }
          })
        );

        onVideoApplied(serverUrl || playbackUrl, {
          sourceMode: 'upload',
          fileName,
          serverUrl
        });
        showToast(`Video "${fileName}" uploaded (100%) and set as active Hero & Featured video!`);
      } catch (err: any) {
        console.error('Failed to save video:', err);
        setIsUploading(false);
        setUploadStatus(`Error storing video: ${err?.message || 'Storage error'}`);
        showToast('Storage error while saving video file.');
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setUploadStatus(`Upload failed. Please try again or use an MP4 URL.`);
      showToast('Error reading video file.');
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Apply custom URL or preset (explicitly switches priority from Upload to URL)
  const handleApplyUrl = async (urlToApply = urlInput, presetLabel?: string) => {
    const cleanUrl = urlToApply.trim();
    if (!cleanUrl) {
      showToast('Please enter a valid video URL');
      return;
    }

    await registerUrlInLibrary(storageKey, cleanUrl, presetLabel);
    setVideoSourceMode('url');
    setActiveSourceMode('url');
    setActiveFileName('');
    setActiveUrl(cleanUrl);
    setUrlInput(cleanUrl);
    setUploadSuccess(true);
    setUploadStatus('Video URL applied & active across Desktop & Mobile!');
    refreshLibrary();
    runStorageAudit();

    window.dispatchEvent(
      new CustomEvent('gfk-video-updated', {
        detail: {
          key: 'hero_background_video',
          videoUrl: cleanUrl,
          sourceMode: 'url'
        }
      })
    );

    onVideoApplied(cleanUrl, { sourceMode: 'url' });
    showToast('Video URL applied live to Homepage!');
  };

  // Activate an existing video from library
  const handleActivateVideo = async (item: StoredVideoItem) => {
    try {
      const result = await activateStoredVideo(item, storageKey);
      if (result) {
        setActiveSourceMode(result.sourceMode);
        setActiveFileName(result.sourceMode === 'upload' ? result.fileName : '');
        setActiveUrl(result.activeUrl);
        if (result.sourceMode === 'url') {
          setUrlInput(result.activeUrl);
        } else {
          setUrlInput('');
        }
        setUploadSuccess(true);
        setUploadStatus(`"${item.name}" is now the active Homepage video.`);
        refreshLibrary();
        runStorageAudit();

        window.dispatchEvent(
          new CustomEvent('gfk-video-updated', {
            detail: {
              key: 'hero_background_video',
              videoUrl: result.activeUrl,
              sourceMode: result.sourceMode,
              fileName: result.fileName
            }
          })
        );

        onVideoApplied(result.activeUrl, {
          sourceMode: result.sourceMode,
          fileName: result.fileName
        });
        showToast(`Switched active video to "${item.name}"!`);
      }
    } catch (_e) {
      showToast('Could not activate video.');
    }
  };

  // Confirm and execute delete for an individual video
  const executeDeleteVideo = async (item: StoredVideoItem) => {
    setPendingDeleteId(null);
    try {
      const { wasActive } = await deleteStoredVideoItem(item.id, storageKey);
      refreshLibrary();
      runStorageAudit();

      if (wasActive) {
        setActiveSourceMode('url');
        setActiveFileName('');
        setActiveUrl(defaultFallbackUrl);
        setUrlInput(defaultFallbackUrl);

        window.dispatchEvent(
          new CustomEvent('gfk-video-updated', {
            detail: {
              key: 'hero_background_video',
              videoUrl: defaultFallbackUrl,
              sourceMode: 'url'
            }
          })
        );

        onVideoApplied(defaultFallbackUrl, { sourceMode: 'url' });
        showToast(`"${item.name}" deleted. Reset active video to default scenic Malaysia video.`);
      } else {
        showToast(`"${item.name}" deleted from video storage.`);
      }
    } catch (_err: any) {
      showToast('Error deleting video.');
    }
  };

  // Execute clear all videos in this key
  const executeClearAll = async () => {
    setShowClearConfirm(false);
    await clearAllStoredVideos(storageKey);
    refreshLibrary();
    runStorageAudit();
    setActiveSourceMode('url');
    setActiveFileName('');
    setActiveUrl(defaultFallbackUrl);
    setUrlInput(defaultFallbackUrl);

    window.dispatchEvent(
      new CustomEvent('gfk-video-updated', {
        detail: {
          key: 'hero_background_video',
          videoUrl: defaultFallbackUrl,
          sourceMode: 'url'
        }
      })
    );

    onVideoApplied(defaultFallbackUrl, { sourceMode: 'url' });
    showToast('All saved videos deleted. Reset to default scenic video.');
  };

  // Master Deep Purge of ALL storage
  const executeMasterPurge = async () => {
    setShowPurgeConfirm(false);
    const { purgedCount } = await purgeAllVideoStorage();
    refreshLibrary();
    runStorageAudit();
    setActiveSourceMode('url');
    setActiveFileName('');
    setActiveUrl(defaultFallbackUrl);
    setUrlInput(defaultFallbackUrl);

    window.dispatchEvent(
      new CustomEvent('gfk-video-updated', {
        detail: {
          key: 'hero_background_video',
          videoUrl: defaultFallbackUrl,
          sourceMode: 'url'
        }
      })
    );

    onVideoApplied(defaultFallbackUrl, { sourceMode: 'url' });
    showToast(`Storage Purged (${purgedCount} items removed)! Reset to default video.`);
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 md:p-6 space-y-5">
      {/* Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-950 uppercase tracking-wide">
              {label}
            </h4>
            {description && (
              <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-lg border shrink-0 ${
              activeSourceMode === 'upload'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {activeSourceMode === 'upload' ? (
              <>
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Priority Active: Uploaded File {activeFileName ? `(${activeFileName})` : ''}</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
                <span>Active Source: Video URL</span>
              </>
            )}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 bg-zinc-200/70 border border-zinc-300 px-2.5 py-1 rounded-lg shrink-0">
            <Lock className="w-3 h-3 text-emerald-700" /> Locked Loop
          </span>

          <button
            type="button"
            onClick={() => setShowStorageExplainer(!showStorageExplainer)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 hover:border-zinc-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Where are uploaded videos stored?"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Storage Info</span>
          </button>
        </div>
      </div>

      {/* Storage Explainer Callout */}
      {showStorageExplainer && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 text-blue-950 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-black flex items-center gap-1.5 text-blue-900">
              <HardDrive className="w-4 h-4 text-blue-700" />
              How Unified Video Priority &amp; Storage Work
            </span>
            <button
              type="button"
              onClick={() => setShowStorageExplainer(false)}
              className="text-blue-500 hover:text-blue-800 text-[11px] font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] text-blue-900/90 leading-relaxed font-medium">
            <strong>1. Unified Hero &amp; Featured Video:</strong> A single video setting controls both the Desktop Hero Background and the Mobile Featured Video player simultaneously.
          </p>
          <p className="text-[11px] text-blue-900/90 leading-relaxed font-medium">
            <strong>2. Strict Upload Priority (No URL Conflict):</strong> When you upload a video file from your computer, the system locks priority to <strong>Uploaded File</strong> and saves it to both the server and local IndexedDB. External URLs will never override your uploaded video unless you explicitly click <strong>Apply URL</strong> in the Enter URL tab.
          </p>
        </div>
      )}

      {/* ONE-CLICK MODE SWITCHER (Segmented Control) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider">
          Choose Video Source (Upload File vs. Direct Video URL):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-zinc-200/80 rounded-2xl max-w-2xl">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>1. Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              inputMode === 'url'
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-emerald-700" />
            <span>2. Enter URL</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('library')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              inputMode === 'library'
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>Saved ({storedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode('storage_audit');
              runStorageAudit();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              inputMode === 'storage_audit'
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <HardDrive className="w-4 h-4 text-rose-600" />
            <span>Check &amp; Clean</span>
          </button>
        </div>
      </div>

      {/* MODE 1: DIRECT FILE UPLOAD */}
      {inputMode === 'upload' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold text-zinc-700">
              Upload Video File from Computer (.mp4, .webm, .mov) — Automatically Takes Priority Over Any URL
            </label>
            {activeSourceMode === 'upload' && (
              <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                Uploaded Video Currently Active
              </span>
            )}
          </div>

          <label
            className={`flex flex-col items-center justify-center gap-2.5 w-full p-6 border-2 border-dashed rounded-2xl text-xs font-bold cursor-pointer transition-all ${
              isUploading
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-zinc-300 hover:border-emerald-600 bg-white hover:bg-emerald-50/30 text-zinc-800 shadow-sm'
            }`}
          >
            <Upload
              className={`w-6 h-6 ${
                isUploading ? 'text-emerald-600 animate-bounce' : 'text-emerald-700'
              }`}
            />
            <div className="text-center">
              <span className="block text-sm text-zinc-900 font-black">
                {isUploading ? 'Uploading & Activating Video File...' : 'Click to Choose Video File from Device'}
              </span>
              <span className="block text-xs text-zinc-500 font-medium mt-1">
                Supports HD / 4K MP4, WebM, and MOV files • Plays immediately on Desktop Hero &amp; Mobile
              </span>
            </div>
            <input
              type="file"
              accept="video/*"
              disabled={isUploading}
              className="hidden"
              onChange={handleVideoFileChange}
            />
          </label>

          {/* REAL-TIME PROGRESS BAR & PERCENTAGE DISPLAY */}
          {isUploading && (
            <div className="bg-white border-2 border-emerald-400 rounded-2xl p-4 space-y-3 shadow-md animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                <span className="flex items-center gap-2 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-black">Uploading Video File...</span>
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {uploadProgress}%
                </span>
              </div>

              <div className="w-full h-3.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-150 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                <span className="truncate max-w-[220px] font-bold text-zinc-800">{fileStats?.name}</span>
                <span className="font-mono text-zinc-700 font-bold bg-zinc-100 px-2 py-0.5 rounded-md">
                  {fileStats?.loadedMb} MB / {fileStats?.sizeMb} MB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: DIRECT VIDEO URL */}
      {inputMode === 'url' && (
        <div className="space-y-3 animate-fade-in">
          {activeSourceMode === 'upload' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-amber-900 font-semibold">
              <span>
                An <strong>Uploaded Video File</strong> {activeFileName ? `(${activeFileName})` : ''} is currently active. Clicking <strong>Apply URL</strong> below will switch from your uploaded file to the URL.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Paste Direct Video URL (.mp4, Pixabay, Streamable, or CDN link)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://cdn.pixabay.com/video/... or direct .mp4 link"
                className="flex-1 p-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:border-emerald-600 shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleApplyUrl()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shrink-0 transition-colors cursor-pointer shadow-sm"
              >
                Apply URL
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          {presets.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Quick Scenic Malaysia Video Presets (Click to Apply URL):
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyUrl(preset.url, preset.label)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-zinc-200 hover:border-emerald-600 hover:text-emerald-700 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: SAVED VIDEOS LIBRARY */}
      {inputMode === 'library' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-black text-zinc-950 uppercase tracking-wide flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                Stored Videos ({storedList.length})
              </h5>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Switch active video in 1 click or permanently delete older videos.
              </p>
            </div>
            {storedList.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Clear All Videos
              </button>
            )}
          </div>

          {showClearConfirm && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Delete ALL saved videos from storage and reset to default?</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={executeClearAll}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Yes, Delete All
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {storedList.length === 0 ? (
            <div className="text-center py-8 bg-white border border-dashed border-zinc-200 rounded-2xl space-y-2">
              <Film className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-xs font-bold text-zinc-600">No custom videos stored yet.</p>
              <p className="text-[11px] text-zinc-400">
                Upload a video file or enter a video URL above.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {storedList.map((item) => {
                const isActive = item.isActive || item.url === activeUrl;
                const isPendingDelete = pendingDeleteId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border transition-all gap-2 ${
                      isActive
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-950 truncate max-w-[200px] sm:max-w-xs">
                            {item.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium mt-0.5">
                          <span className="font-mono font-bold text-zinc-700">
                            {item.sizeFormatted}
                          </span>
                          <span>•</span>
                          <span>{item.uploadedAt}</span>
                          <span>•</span>
                          <span className="uppercase text-[9px] font-bold text-zinc-400">
                            {item.type === 'file' ? 'UPLOADED FILE' : 'DIRECT URL'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {isPendingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => executeDeleteVideo(item)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-lg cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleActivateVideo(item)}
                              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Set as active video"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Use Video</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Permanently delete video from storage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 4: STORAGE AUDIT & DEEP PURGE */}
      {inputMode === 'storage_audit' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5">
            <div>
              <h5 className="text-xs font-black text-zinc-950 uppercase tracking-wide flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-rose-600" />
                Storage Scanner &amp; Deep Purge
              </h5>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Inspect all previous video files currently stored and delete them in 1 click.
              </p>
            </div>
            <button
              type="button"
              onClick={runStorageAudit}
              disabled={isAuditing}
              className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>Rescan</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase">Previous Files Found</span>
                <span className="text-base font-black font-mono text-zinc-900">
                  {auditData?.totalStoredCount ?? 0} {auditData?.totalStoredCount === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase">Estimated Size</span>
                <span className="text-base font-black font-mono text-zinc-900">
                  {auditData?.totalSizeFormatted || '0 MB'}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase">Storage Status</span>
                <span
                  className={`text-xs font-black flex items-center gap-1 mt-0.5 ${
                    auditData?.hasPreviousVideos ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {auditData?.hasPreviousVideos ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Videos Stored</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Storage Clean</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {auditData?.hasPreviousVideos ? (
              <div className="pt-2">
                {!showPurgeConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowPurgeConfirm(true)}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Previous Uploaded Videos from Storage</span>
                  </button>
                ) : (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                    <div className="text-xs font-bold text-rose-950 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Are you sure you want to delete all stored previous videos and reset to default?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={executeMasterPurge}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs"
                      >
                        Yes, Delete All Immediately
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPurgeConfirm(false)}
                        className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 font-medium pt-1">
                Zero leftover previous video files found. Storage is completely clean.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload status banner */}
      {uploadStatus && !isUploading && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            uploadSuccess
              ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300'
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
          }`}
        >
          {uploadSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          <span className="flex-1">{uploadStatus}</span>
        </div>
      )}

      {/* Live Video Preview Box */}
      {activeUrl && (
        <div className="pt-2 border-t border-zinc-200/70">
          <div className="text-xs font-black text-zinc-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-700 fill-current" />
              Live Unified Video Preview (Desktop Hero &amp; Mobile Player)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-600 font-bold bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-zinc-700" />
                {activeSourceMode === 'upload' ? 'Uploaded File Active' : 'URL Stream Active'}
              </span>
              <span className="text-[10px] text-emerald-700 font-black uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Active Live
              </span>
            </div>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-inner aspect-video">
            {isDirectVideoSource(activeUrl) ? (
              <video
                key={activeUrl}
                src={activeUrl}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                onContextMenu={(e) => e.preventDefault()}
                onEnded={(e) => {
                  const v = e.currentTarget;
                  v.currentTime = 0;
                  v.play().catch(() => {});
                }}
                onPause={(e) => {
                  const v = e.currentTarget;
                  if (!document.hidden && !v.ended) {
                    v.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            ) : (
              <iframe
                key={activeUrl}
                src={activeUrl}
                className="w-full h-full border-0 block pointer-events-none select-none"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Video Preview"
              />
            )}
            <div className="absolute inset-0 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
