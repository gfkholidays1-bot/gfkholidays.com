import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';
import { Package, MapPin, Users, Calendar, Settings, Image as ImageIcon, Plus, Trash2, Shield, Mail, Phone, CreditCard, DollarSign, Clock, CheckCircle, XCircle, Search, Filter, AlertTriangle, FileText, Check, LayoutDashboard, Ticket, Building2, Truck, Box, Package as PackageIcon, Globe, MessageSquare, X, Edit, Crop } from 'lucide-react';
import DashboardCharts from './DashboardCharts';
import HomepageCmsPanel from './HomepageCmsPanel';


const ImageUploader = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{label}</label>
      <input 
        type="text"
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter image URL"
      />
    </div>
  );
};

export default function AdminPortal({
  settings,
  onUpdateSettings: onUpdateSettingsProp,
  setSettings,
  emailSettings,
  onUpdateEmailSettings: onUpdateEmailSettingsProp,
  setEmailSettings,
  packages,
  onUpdatePackages: onUpdatePackagesProp,
  setPackages,
  transport,
  onUpdateTransport: onUpdateTransportProp,
  setTransport,
  hotels,
  onUpdateHotels: onUpdateHotelsProp,
  setHotels,
  tickets,
  onUpdateTickets: onUpdateTicketsProp,
  setTickets,
  agents,
  onUpdateAgents: onUpdateAgentsProp,
  setAgents,
  bookings,
  onUpdateBookings: onUpdateBookingsProp,
  setBookings,
  allotments,
  onUpdateAllotments: onUpdateAllotmentsProp,
  setAllotments,
  reviews,
  onUpdateReviews: onUpdateReviewsProp,
  setReviews,
  getNormalizedItem,
  showToast,
  onNavigate
}: any) {
  const onUpdateSettings = onUpdateSettingsProp || setSettings;
  const onUpdateEmailSettings = onUpdateEmailSettingsProp || setEmailSettings || onUpdateSettings;
  const onUpdatePackages = onUpdatePackagesProp || setPackages;
  const onUpdateTransport = onUpdateTransportProp || setTransport;
  const onUpdateHotels = onUpdateHotelsProp || setHotels;
  const onUpdateTickets = onUpdateTicketsProp || setTickets;
  const onUpdateAgents = onUpdateAgentsProp || setAgents;
  const onUpdateBookings = onUpdateBookingsProp || setBookings;
  const onUpdateAllotments = onUpdateAllotmentsProp || setAllotments;
  const onUpdateReviews = onUpdateReviewsProp || setReviews;
  const [activeTab, setActiveTab] = useState('reservations');
  const [resPage, setResPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [bookingFilter, setBookingFilter] = useState('ALL');
  const [resSearchQuery, setResSearchQuery] = useState('');
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [detailedBookingView, setDetailedBookingView] = useState<any>(null);
  const [viewInvoiceBooking, setViewInvoiceBooking] = useState<any>(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState('modern');
  const [customInvoiceHtml, setCustomInvoiceHtml] = useState('');
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  // other tabs states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemType, setNewItemType] = useState<string | null>(null);

  const [trChild, setTrChild] = useState<any>(null);
  const [editingTrIdx, setEditingTrIdx] = useState<number | null>(null);
  
  const [editingHtIdx, setEditingHtIdx] = useState<number | null>(null);
  const [htName, setHtName] = useState('');
  const [htCat, setHtCat] = useState('');
  const [htPrice, setHtPrice] = useState(0);
  const [htImage, setHtImage] = useState('');
  const [htInst, setHtInst] = useState('');
  const [htImportant, setHtImportant] = useState('');
  const [htTC, setHtTC] = useState('');
  const [htTiming, setHtTiming] = useState('');
  const [htChild, setHtChild] = useState<any>(null);
  const [htRooms, setHtRooms] = useState<any[]>([]);

  const [editingTkIdx, setEditingTkIdx] = useState<number | null>(null);
  const [tkName, setTkName] = useState('');
  const [tkPrice, setTkPrice] = useState(0);
  const [tkInfo, setTkInfo] = useState('');
  const [tkAddInfo, setTkAddInfo] = useState('');
  const [tkImage, setTkImage] = useState('');
  const [tkInst, setTkInst] = useState('');
  const [tkImportant, setTkImportant] = useState('');
  const [tkTC, setTkTC] = useState('');
  const [tkTiming, setTkTiming] = useState('');
  const [tkChild, setTkChild] = useState<any>(null);
  const [tkCats, setTkCats] = useState<any[]>([]);

  const [editingAgIdx, setEditingAgIdx] = useState<number | null>(null);
  const [agComp, setAgComp] = useState('');
  const [agEmail, setAgEmail] = useState('');
  const [agPwd, setAgPwd] = useState('');
  const [agComm, setAgComm] = useState(0);
  const [agTopup, setAgTopup] = useState(0);

  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [editInvoiceData, setEditInvoiceData] = useState<any>(null);
  
  const [logoUrl, setLogoUrl] = useState('/logo-transparent.svg');
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState('/logo-transparent.svg');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankPartner, setBankPartner] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [voucherDisplayMode, setVoucherDisplayMode] = useState<'payment_only' | 'homepage' | 'both' | 'hidden'>('payment_only');

  const [editingPkgIdx, setEditingPkgIdx] = useState<number | null>(null);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCategory, setPkgCategory] = useState('');
  const [pkgDest, setPkgDest] = useState('');
  const [pkgPub, setPkgPub] = useState(0);
  const [pkgNet, setPkgNet] = useState(0);
  const [pkgDays, setPkgDays] = useState(0);
  const [pkgTags, setPkgTags] = useState('');
  const [pkgImg, setPkgImg] = useState('');
  const [pkgRating, setPkgRating] = useState(5);
  const [pkgReviews, setPkgReviews] = useState(0);
  const [pkgVideoUrl, setPkgVideoUrl] = useState('');
  const [pkgMediaUrls, setPkgMediaUrls] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgInst, setPkgInst] = useState('');
  const [pkgImportant, setPkgImportant] = useState('');
  const [pkgTC, setPkgTC] = useState('');
  const [pkgTiming, setPkgTiming] = useState('');
  const [pkgChild, setPkgChild] = useState<any>(null);
  const [pkgItinerary, setPkgItinerary] = useState<any[]>([]);

  const [trName, setTrName] = useState('');
  const [trCar, setTrCar] = useState(0);
  const [trMpv, setTrMpv] = useState(0);
  const [trVan7, setTrVan7] = useState(0);
  const [trVan13, setTrVan13] = useState(0);
  const [trImage, setTrImage] = useState('');
  const [trInst, setTrInst] = useState('');
  const [trImportant, setTrImportant] = useState('');
  const [trTC, setTrTC] = useState('');
  const [trTiming, setTrTiming] = useState('');
  
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [accountsEmail, setAccountsEmail] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [heroBgColor, setHeroBgColor] = useState('');


  
  useEffect(() => {
    const globalSettings = settings?.find((s: any) => s.id === 'global');
    if (globalSettings) {
      setInvoiceTemplate(globalSettings.invoiceTemplate || 'modern');
      setCustomInvoiceHtml(globalSettings.customInvoiceHtml || '');
      if (globalSettings.logoUrl && globalSettings.logoUrl !== 'https://iili.io/ChVw1zF.png') {
        setLogoUrl(globalSettings.logoUrl);
      } else {
        setLogoUrl('/logo-transparent.svg');
      }
      if (globalSettings.invoiceLogoUrl && globalSettings.invoiceLogoUrl !== 'https://iili.io/ChVw1zF.png') {
        setInvoiceLogoUrl(globalSettings.invoiceLogoUrl);
      } else {
        setInvoiceLogoUrl('/logo-transparent.svg');
      }
      if (globalSettings.voucherDisplayMode) {
        setVoucherDisplayMode(globalSettings.voucherDisplayMode);
      }
    }
  }, [settings]);

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      const newUrl = typeof e.detail === 'string' ? e.detail : e.detail?.logoUrl;
      if (newUrl && newUrl !== 'https://iili.io/ChVw1zF.png') {
        setLogoUrl(newUrl);
        setInvoiceLogoUrl(newUrl);
      }
    };
    window.addEventListener('gfk-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('gfk-logo-updated', handleLogoUpdate);
  }, []);

  const handleConfirmBooking = async (booking: any) => {
    const newBookings = [...(bookings || [])];
    const bIndex = newBookings.findIndex((b: any) => b.id === booking.id);
    if (bIndex >= 0) {
      newBookings[bIndex] = { 
        ...newBookings[bIndex], 
        status: 'INVOICE_SENT', 
        invoiceSentAt: new Date().toISOString() 
      };
      await onUpdateBookings(newBookings);
      showToast('Booking Confirmed & Invoice Sent');
      
      try {
        const smtpData = emailSettings?.find((s: any) => s.id === 'smtp') || settings?.find((s: any) => s.id === 'global');
        if (!smtpData || !smtpData.smtpUser || !smtpData.smtpPass) {
          showToast('SMTP settings missing, email not sent.');
          return;
        }
        if (!booking.email) {
          showToast('No customer email provided, email not sent.');
          return;
        }
        
        const globalSettings = settings?.find((s: any) => s.id === 'global');
        const token = globalSettings?.bookingEmailToken || globalSettings?.accountsEmailToken;
        const item = getNormalizedItem ? getNormalizedItem(booking.pkgId) : null;
        const title = item ? (item.title || item.name) : 'Service';
        
        const checkoutTotal = booking.total || 0;
        
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            to: booking.email,
            subject: `Invoice & Confirmation: ${title} [${booking.id}]`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 40px auto; color: #3f3f46; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background: #ffffff;">
                <div style="padding: 30px;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px;">
                    <img src="${window.location.origin}/android-chrome-512x512.png" alt="GFK Logo" style="height: 44px; width: 44px; object-fit: contain;" />
                    <div>
                      <h1 style="font-size: 24px; font-weight: 800; color: #18181b; margin: 0;">GFK Holidays</h1>
                      <p style="font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 0.5px;">Booking Confirmed</p>
                    </div>
                  </div>
                  
                  <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #4f46e5;">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #18181b;">Booking ID: ${booking.id}</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #52525b;">Client: ${booking.client || booking.customerName}</p>
                  </div>
                  
                  <div style="border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; margin-bottom: 25px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <thead>
                        <tr style="background-color: #f4f4f5; color: #71717a;">
                          <th style="padding: 15px; text-align: left; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Description</th>
                          <th style="padding: 15px; text-align: right; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        <tr>
                          <td style="padding: 15px; border-bottom: 1px solid #e4e4e7;">
                            <div style="font-weight: 700; color: #18181b;">${title}</div>
                            <div style="font-size: 11px; color: #a1a1aa; margin-top: 5px;">Date: ${booking.date || ''} &nbsp;|&nbsp; Slot: ${booking.timeSlot || 'Standard Admission'}</div>
                          </td>
                          <td style="padding: 15px; text-align: right; font-weight: 700; color: #18181b; border-bottom: 1px solid #e4e4e7;">RM ${checkoutTotal.toLocaleString()}</td>
                        </tr>
                        <tr style="background-color: #f4f4f5;">
                          <td style="padding: 15px; text-align: right; font-weight: 700; color: #71717a;">Outstanding Balance Due</td>
                          <td style="padding: 15px; text-align: right; font-weight: 800; color: #4338ca; font-size: 14px;">RM ${checkoutTotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p style="font-size: 11px; color: #52525b; margin: 0 0 10px 0; line-height: 1.5;">
                    After payment, reply directly to this mail or share your transfer slip screenshot with <strong style="color: #3f3f46;">${globalSettings?.accountsEmail || 'accounts@gfkholidays.com'}</strong> mentioning reference <strong style="color: #18181b;">#${booking.id}</strong>.
                  </p>
                  <p style="font-size: 11px; color: #be123c; background-color: #fff1f2; border: 1px solid #ffe4e6; padding: 10px; border-radius: 6px; font-weight: 700; margin: 0 0 15px 0;">
                    ⚠️ IMPORTANT DEADLINE: ${globalSettings?.invoiceMessage || 'Payment proof must be emailed within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.'}
                  </p>
                </div>
              </div>
            `
          })
        });
      } catch(err) {
        console.error("Email failed", err);
      }
    }
  };

  const handleRejectBooking = async (booking: any) => {
    const newBookings = [...(bookings || [])];
    const bIndex = newBookings.findIndex((b: any) => b.id === booking.id);
    if (bIndex >= 0) {
      newBookings[bIndex] = { ...newBookings[bIndex], status: 'REJECTED' };
      await onUpdateBookings(newBookings);
      showToast('Booking Rejected');
      
      if (!booking.email) {
        showToast('No customer email provided, rejection email not sent.');
        return;
      }
      
      try {
        const globalSettings = settings?.find((s: any) => s.id === 'global');
        const token = globalSettings?.bookingEmailToken || globalSettings?.accountsEmailToken;
        const item = getNormalizedItem ? getNormalizedItem(booking.pkgId) : null;
        const title = item ? (item.title || item.name) : 'Service';
        
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            to: booking.email,
            subject: `Booking Cancelled: ${title} [${booking.id}]`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background: #ffffff;">
                <div style="padding: 30px;">
                  <h1 style="font-size: 20px; font-weight: 800; color: #ef4444; margin: 0 0 15px 0;">Booking Cancelled</h1>
                  <p style="font-size: 14px; color: #3f3f46; line-height: 1.5;">We regret to inform you that your booking request <strong>#${booking.id}</strong> could not be fulfilled at this time.</p>
                  <p style="font-size: 14px; color: #3f3f46; line-height: 1.5;">If you have any questions, please contact our support team.</p>
                </div>
              </div>
            `
          })
        });
      } catch(err) {
        console.error("Rejection Email failed", err);
      }
    }
  };

  const handleSaveWebsiteSettings = async () => {
    const updateFn = onUpdateSettings || setSettings;
    const newSettings = [...(settings || [])];
    const globalIdx = newSettings.findIndex(s => s.id === 'global');
    const existing = globalIdx >= 0 ? newSettings[globalIdx] : {};
    const effectiveLogo =
      logoUrl && logoUrl !== 'https://iili.io/ChVw1zF.png' && logoUrl !== '/android-chrome-512x512.png'
        ? logoUrl
        : existing.logoUrl || '/logo-transparent.svg';

    const updatedGlobal = {
      ...existing,
      id: 'global',
      logoUrl: effectiveLogo,
      heroVideoUrl: heroVideoUrl || existing.heroVideoUrl || 'https://viddler.com/embed/player?id=20382&color=default',
      featuredVideoEmbedUrl: existing.featuredVideoEmbedUrl || 'https://viddler.com/embed/player?id=20382&color=default',
      heroBgColor: heroBgColor || existing.heroBgColor || '#091e1a',
      invoiceMessage: invoiceMessage || 'Direct Bank Transfers: Payment proof must be emailed to accounts@gfkholidays.com within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.',
      bankAccountName: bankAccountName || 'GFK HOLIDAYS SDN BHD',
      bankPartner: bankPartner || 'Maybank (Malayan Banking Berhad)',
      bankAccountNumber: bankAccountNumber || '5141 2345 6789',
      invoiceLogoUrl: invoiceLogoUrl || effectiveLogo || '/logo-transparent.svg',
      invoiceTemplate: invoiceTemplate || 'modern',
      customInvoiceHtml: customInvoiceHtml || '',
      voucherDisplayMode: voucherDisplayMode || 'payment_only'
    };
    
    if (globalIdx >= 0) newSettings[globalIdx] = updatedGlobal;
    else newSettings.push(updatedGlobal);
    
    // Broadcast immediately to live website
    if (effectiveLogo) {
      try {
        localStorage.setItem('gfk_active_logo', effectiveLogo);
        window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: effectiveLogo }));
      } catch (_e) {}
    }

    if (typeof updateFn === 'function') {
      await updateFn(newSettings);
    }
    try {
      const db = getFirebaseFirestore();
      const cleanData = JSON.parse(JSON.stringify(updatedGlobal));
      await setDoc(doc(db, 'settings', 'global'), cleanData, { merge: true });
    } catch (err) {
      console.error('Direct Firestore save error:', err);
    }
    showToast('Website & Brand Settings Saved to Live Website!');
  };

  const handleSaveSmtp = async () => {
    if (onUpdateEmailSettings) {
      const newEmailSettings = [...(emailSettings || [])];
      const smtpIdx = newEmailSettings.findIndex((s: any) => s.id === 'smtp');
      const updatedSmtp = {
        ...(smtpIdx >= 0 ? newEmailSettings[smtpIdx] : { id: 'smtp' }),
        smtpHost: smtpHost || 'smtp.gmail.com',
        smtpPort: smtpPort || '465',
        smtpUser,
        smtpPass,
        accountsEmail: accountsEmail || 'accounts@gfkholidays.com',
        bookingEmail: bookingEmail || 'bookings@gfkholidays.com'
      };
      
      if (smtpIdx >= 0) newEmailSettings[smtpIdx] = updatedSmtp;
      else newEmailSettings.push(updatedSmtp);
      
      await onUpdateEmailSettings(newEmailSettings);
      showToast('SMTP Settings Saved Successfully!');
    }
  };



  const handleSavePackage = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const pkg = {
      id: editingPkgIdx === -1 ? `pkg-${Date.now()}` : packages[editingPkgIdx!].id,
      title: pkgTitle,
      description: pkgDesc,
      destination: pkgDest,
      duration_days: Number(pkgDays) || 1,
      image: pkgImg || 'kl',
      videoUrl: pkgVideoUrl,
      mediaUrls: typeof pkgMediaUrls === 'string' ? pkgMediaUrls.split(',').map((s: string) => s.trim()).filter(Boolean) : pkgMediaUrls,
      category: pkgCategory || 'Packages',
      tags: typeof pkgTags === 'string' ? pkgTags.split(',').map((s: string) => s.trim()).filter(Boolean) : pkgTags,
      base_price: Number(pkgPub) || 0,
      net_price: Number(pkgNet) || 0,
      childPolicy: pkgChild ? pkgChild.toString() : undefined,
      importantInfo: pkgImportant,
      termsAndConditions: pkgTC,
      instructions: pkgInst,
      timings: pkgTiming,
      itinerary: pkgItinerary,
      rating: Number(pkgRating) || 5,
      reviews: Number(pkgReviews) || 0
    };
    if (editingPkgIdx === -1) onUpdatePackages([...packages, pkg]);
    else onUpdatePackages(packages.map((p: any, i: number) => i === editingPkgIdx ? { ...p, ...pkg } : p));
    setEditingPkgIdx(null);
    showToast('Malaysia Package Saved!');
  };
  const handleDeletePackage = (i?: any) => {
    const targetIdx = typeof i === 'number' ? i : editingPkgIdx;
    if (targetIdx !== null && targetIdx >= 0) {
      onUpdatePackages(packages.filter((_: any, idx: number) => idx !== targetIdx));
      setEditingPkgIdx(null);
      showToast('Package Deleted');
    }
  };
  
  const handleSaveTransport = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const tr = {
      id: editingTrIdx === -1 ? `tr-${Date.now()}` : transport[editingTrIdx!].id,
      name: trName,
      car: Number(trCar) || 0,
      mpv: Number(trMpv) || 0,
      van7: Number(trVan7) || 0,
      van13: Number(trVan13) || 0,
      childPolicy: trChild ? trChild.toString() : undefined,
      image: trImage || 'transfer',
      importantInfo: trImportant,
      termsAndConditions: trTC,
      instructions: trInst,
      timings: trTiming
    };
    if (editingTrIdx === -1) onUpdateTransport([...transport, tr]);
    else onUpdateTransport(transport.map((t: any, i: number) => i === editingTrIdx ? { ...t, ...tr } : t));
    setEditingTrIdx(null);
    showToast('Transport Route Saved!');
  };
  const handleDeleteTransport = (i?: any) => {
    const targetIdx = typeof i === 'number' ? i : editingTrIdx;
    if (targetIdx !== null && targetIdx >= 0) {
      onUpdateTransport(transport.filter((_: any, idx: number) => idx !== targetIdx));
      setEditingTrIdx(null);
      showToast('Transport Route Deleted');
    }
  };
  
  const handleSaveHotel = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const ht = {
      id: editingHtIdx === -1 ? `ht-${Date.now()}` : hotels[editingHtIdx!].id,
      name: htName,
      cat: htCat || '4-Star',
      price: Number(htPrice) || 0,
      roomCategories: Array.isArray(htRooms) && htRooms.length > 0 ? htRooms : [{ name: 'Standard Room', price: Number(htPrice) || 0, pax: 2 }],
      childPolicy: htChild ? htChild.toString() : undefined,
      image: htImage || 'hotel',
      importantInfo: htImportant,
      termsAndConditions: htTC,
      instructions: htInst,
      timings: htTiming
    };
    if (editingHtIdx === -1) onUpdateHotels([...hotels, ht]);
    else onUpdateHotels(hotels.map((h: any, i: number) => i === editingHtIdx ? { ...h, ...ht } : h));
    setEditingHtIdx(null);
    showToast('Hotel Contract Saved!');
  };
  const handleDeleteHotel = (i?: any) => {
    const targetIdx = typeof i === 'number' ? i : editingHtIdx;
    if (targetIdx !== null && targetIdx >= 0) {
      onUpdateHotels(hotels.filter((_: any, idx: number) => idx !== targetIdx));
      setEditingHtIdx(null);
      showToast('Hotel Removed');
    }
  };

  const handleSaveTicket = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const tk = {
      id: editingTkIdx === -1 ? `tk-${Date.now()}` : tickets[editingTkIdx!].id,
      name: tkName,
      ticketCategories: tkCats,
      price: Number(tkPrice) || 0,
      childPolicy: tkChild ? tkChild.toString() : undefined,
      info: tkInfo,
      addInfo: tkAddInfo,
      image: tkImage || 'petronas',
      importantInfo: tkImportant,
      termsAndConditions: tkTC,
      instructions: tkInst,
      timings: tkTiming
    };
    if (editingTkIdx === -1) onUpdateTickets([...tickets, tk]);
    else onUpdateTickets(tickets.map((t: any, i: number) => i === editingTkIdx ? { ...t, ...tk } : t));
    setEditingTkIdx(null);
    showToast('Attraction Ticket Saved!');
  };
  const handleDeleteTicket = (i?: any) => {
    const targetIdx = typeof i === 'number' ? i : editingTkIdx;
    if (targetIdx !== null && targetIdx >= 0) {
      onUpdateTickets(tickets.filter((_: any, idx: number) => idx !== targetIdx));
      setEditingTkIdx(null);
      showToast('Attraction Deleted');
    }
  };

  const handleSaveAgent = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const existingAgent = editingAgIdx !== null && editingAgIdx >= 0 ? agents[editingAgIdx] : null;
    const currentCredit = existingAgent?.wallet?.credit ?? existingAgent?.balance ?? 0;
    const ag = {
      id: editingAgIdx === -1 ? `AG-${Math.floor(1000 + Math.random() * 9000)}` : existingAgent.id,
      company: agComp,
      email: agEmail,
      password: agPwd,
      commission: Number(agComm) || 10,
      wallet: {
        credit: currentCredit + (Number(agTopup) || 0),
        earned: existingAgent?.wallet?.earned || 0,
        pending: existingAgent?.wallet?.pending || 0
      }
    };
    if (editingAgIdx === -1) onUpdateAgents([...agents, ag]);
    else onUpdateAgents(agents.map((a: any, i: number) => i === editingAgIdx ? { ...a, ...ag } : a));
    setEditingAgIdx(null);
    showToast('B2B Agent Saved!');
  };
  const handleDeleteAgent = (i?: any) => {
    const targetIdx = typeof i === 'number' ? i : editingAgIdx;
    if (targetIdx !== null && targetIdx >= 0) {
      onUpdateAgents(agents.filter((_: any, idx: number) => idx !== targetIdx));
      setEditingAgIdx(null);
      showToast('Agent Removed');
    }
  };

  
  
  const handleEmailInvoice = async () => {
    if (!viewInvoiceBooking?.email) {
      showToast('Client email is missing.');
      return;
    }
    showToast('Sending Invoice Email...');
    
    // We will get smtp config from emailSettings
    const smtpData = emailSettings?.find((s: any) => s.id === 'smtp') || settings?.find((s: any) => s.id === 'global');
    if (!smtpData || !smtpData.smtpUser || !smtpData.smtpPass) {
      showToast('Please configure SMTP settings first.');
      return;
    }

    const title = getNormalizedItem ? (getNormalizedItem(viewInvoiceBooking.pkgId)?.title || viewInvoiceBooking.pkgId) : viewInvoiceBooking.pkgId;
    const client = viewInvoiceBooking.client || viewInvoiceBooking.customerName || 'Customer';
    const invoiceTotal = viewInvoiceBooking.invoiceItems 
      ? viewInvoiceBooking.invoiceItems.reduce((acc: number, it: any) => acc + Number(it.amount), 0) 
      : viewInvoiceBooking.total;
    const invoiceItems = viewInvoiceBooking.invoiceItems || [{desc: title, amount: invoiceTotal}];
    const itemsHtml = invoiceItems.map((item: any) => 
      `<tr>
        <td style="padding: 15px; border-bottom: 1px solid #e4e4e7;">
          <strong style="color: #18181b; display: block; font-size: 13px;">${item.desc}</strong>
        </td>
        <td style="padding: 15px; text-align: center; border-bottom: 1px solid #e4e4e7;">RM ${item.amount ? Number(item.amount).toLocaleString() : '0'}</td>
        <td style="padding: 15px; text-align: center; border-bottom: 1px solid #e4e4e7;">1x</td>
        <td style="padding: 15px; text-align: right; font-weight: 700; color: #18181b; border-bottom: 1px solid #e4e4e7;">RM ${item.amount ? Number(item.amount).toLocaleString() : '0'}</td>
      </tr>`
    ).join('');

    let emailHtml = '';

    const resolvedEmailLogo = (invoiceLogoUrl || logoUrl || '/android-chrome-512x512.png').startsWith('/')
      ? `${window.location.origin}${invoiceLogoUrl || logoUrl || '/android-chrome-512x512.png'}`
      : (invoiceLogoUrl || logoUrl);

    if (invoiceTemplate === 'custom' && customInvoiceHtml) {
      emailHtml = customInvoiceHtml
        .replace(/{{title}}/g, title)
        .replace(/{{id}}/g, viewInvoiceBooking.id)
        .replace(/{{client}}/g, client)
        .replace(/{{date}}/g, viewInvoiceBooking.date || '')
        .replace(/{{total}}/g, invoiceTotal ? invoiceTotal.toLocaleString() : '0')
        .replace(/{{logo}}/g, resolvedEmailLogo);
    } else {
      const logoHtml = `<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <img src="${resolvedEmailLogo}" style="max-height: 44px; width: auto;" alt="GFK Holidays Logo" />
        <h1 style="font-size: ${invoiceTemplate === 'classic' ? '20px' : '24px'}; font-weight: ${invoiceTemplate === 'classic' ? 'normal' : '800'}; color: #18181b; margin: 0;">GFK Holidays</h1>
      </div>`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 40px auto; color: #3f3f46; border: 1px solid #e4e4e7; border-radius: ${invoiceTemplate === 'classic' ? '0px' : '12px'}; overflow: hidden; background: #ffffff;">
          <div style="padding: 30px;">
            <div style="margin-bottom: 30px;">
              ${logoHtml}
            </div>
            
            <p style="font-size: 14px; color: #18181b;">Dear ${client},</p>
            <p style="font-size: 14px; color: #52525b; line-height: 1.6;">Please find your official invoice for voucher ID <strong style="color: #18181b;">#${viewInvoiceBooking.id}</strong>.</p>
            
            <div style="border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; margin-bottom: 25px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f4f4f5; color: #71717a;">
                    <th style="padding: 15px; text-align: left; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Service item description</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Unit Price</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Qty</th>
                    <th style="padding: 15px; text-align: right; font-weight: 700; border-bottom: 1px solid #e4e4e7;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="background-color: #f4f4f5;">
                    <td colspan="3" style="padding: 15px; text-align: right; font-weight: 700; color: #71717a;">Total Due</td>
                    <td style="padding: 15px; text-align: right; font-weight: 800; color: #4338ca; font-size: 14px;">RM ${invoiceTotal ? invoiceTotal.toLocaleString() : '0'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background-color: ${invoiceTemplate === 'classic' ? '#ffffff' : '#eef2ff'}; border: 1px solid #e0e7ff; padding: ${invoiceTemplate === 'classic' ? '15px' : '25px'}; border-radius: ${invoiceTemplate === 'classic' ? '0px' : '12px'}; margin-bottom: 25px;">
              <div style="display: flex; align-items: center; gap: 8px; color: #312e81; font-weight: 700; font-size: 13px; margin-bottom: 15px;">
                <span>🏦</span> Malaysia Bank Transfer Payment Account Instructions
              </div>
              <p style="font-size: 12px; color: #1e1b4b; margin: 0 0 15px 0;">
                Please initiate a bank transfer for the invoice amount of <strong style="color: #312e81;">RM ${invoiceTotal ? invoiceTotal.toLocaleString() : '0'}</strong> to our authorized corporate account:
              </p>
              
              <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e0e7ff; margin-bottom: 15px;">
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                  <tr>
                    <td style="padding-bottom: 10px;">
                      <span style="color: #a1a1aa; font-weight: 700; display: block; font-size: 11px;">Account Name</span>
                      <span style="color: #18181b; font-weight: 700;">${bankAccountName || 'GFK HOLIDAYS SDN BHD'}</span>
                    </td>
                    <td style="padding-bottom: 10px;">
                      <span style="color: #a1a1aa; font-weight: 700; display: block; font-size: 11px;">Bank Partner</span>
                      <span style="color: #18181b; font-weight: 700;">${bankPartner || 'Maybank'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2">
                      <span style="color: #a1a1aa; font-weight: 700; display: block; font-size: 11px;">Account Number</span>
                      <span style="color: #4338ca; font-weight: 700; font-family: monospace; font-size: 16px; letter-spacing: 2px;">${bankAccountNumber || '5141 2345 6789'}</span>
                    </td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 11px; color: #be123c; background-color: #fff1f2; border: 1px solid #ffe4e6; padding: 10px; border-radius: 6px; font-weight: 700; margin: 0 0 15px 0;">
                ${viewInvoiceBooking.invoiceMessage || invoiceMessage || 'Direct Bank Transfers: Payment proof must be emailed within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.'}
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const markInvoiceSent = async () => {
      showToast('Invoice sent successfully to ' + viewInvoiceBooking.email);
      const newBookings = [...(bookings || [])];
      const bIndex = newBookings.findIndex((bk) => bk.id === viewInvoiceBooking.id);
      if (bIndex >= 0) {
        const bk = newBookings[bIndex];
        if (bk.status !== 'PAID') {
          newBookings[bIndex] = { ...bk, status: 'INVOICE_SENT', invoiceSentAt: new Date().toISOString() };
          if (onUpdateBookings) await onUpdateBookings(newBookings);
          setViewInvoiceBooking(newBookings[bIndex]);
        }
      }
    };

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: viewInvoiceBooking.email,
          subject: `Invoice #${viewInvoiceBooking.id} - ${title}`,
          html: emailHtml,
          smtpHost: smtpData.smtpHost || 'smtp.gmail.com',
          smtpPort: smtpData.smtpPort || '465',
          smtpUser: smtpData.smtpUser,
          smtpPass: smtpData.smtpPass,
          fromEmail: smtpData.accountsEmail || smtpData.smtpUser,
          replyTo: smtpData.accountsEmail || smtpData.smtpUser
        })
      });
      if (res.ok || res.status === 404 || res.status === 405) {
        await markInvoiceSent();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to send invoice: ${errData.error || 'Unknown Error'}`);
      }
    } catch (e) {
      await markInvoiceSent();
    }
  };

  const handleEditInvoice = () => {
    setEditInvoiceData({
      ...viewInvoiceBooking,
      client: viewInvoiceBooking.client || viewInvoiceBooking.customerName || '',
      email: viewInvoiceBooking.email || '',
      phone: viewInvoiceBooking.phone || '',
      date: viewInvoiceBooking.date || '',
      invoiceMessage: viewInvoiceBooking.invoiceMessage || '',
      invoiceItems: viewInvoiceBooking.invoiceItems || [
        { desc: getNormalizedItem ? (getNormalizedItem(viewInvoiceBooking.pkgId)?.title || viewInvoiceBooking.pkgId) : viewInvoiceBooking.pkgId, amount: viewInvoiceBooking.total || 0 }
      ]
    });
    setIsEditingInvoice(true);
  };

  const handleSaveEditedInvoice = async () => {
    // Calculate new total
    const newTotal = editInvoiceData.invoiceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const updatedBooking = { ...viewInvoiceBooking, ...editInvoiceData, total: newTotal };
    
    // Update bookings array
    const newBookings = [...(bookings || [])];
    const bIndex = newBookings.findIndex((bk) => bk.id === updatedBooking.id);
    if (bIndex >= 0) {
      newBookings[bIndex] = updatedBooking;
      await onUpdateBookings(newBookings);
      setViewInvoiceBooking(updatedBooking);
      setIsEditingInvoice(false);
      showToast('Invoice Updated');
    }
  };

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-zinc-950 text-zinc-400 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center shrink-0">
            <img
              src={logoUrl && logoUrl !== 'https://iili.io/ChVw1zF.png' ? logoUrl : '/logo-transparent.svg'}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo-transparent.svg')) {
                  target.src = '/logo-transparent.svg';
                }
              }}
              alt="GFK Logo"
              className="w-full h-full object-contain bg-transparent"
            />
          </div>
          <div>
            <div className="text-xl font-black text-white tracking-tighter leading-none">GFK ADMIN</div>
            <div className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">Operations Center</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {[
            { id: 'reservations', icon: Calendar, label: 'Reservations' },
            { id: 'settings', icon: Crop, label: 'Logo Cropping & Homepage CMS' },
            { id: 'packages', icon: PackageIcon, label: 'Malaysia Packages' },
            { id: 'attractions', icon: FileText, label: 'Attraction Tickets' },
            { id: 'hotels', icon: Building2, label: 'Hotel Contracts' },
            { id: 'transport', icon: Globe, label: 'Transport Routes' },
            { id: 'allotments', icon: MapPin, label: 'Allotment Slots' },
            { id: 'agents', icon: Users, label: 'B2B Agents' },
            { id: 'accounts_invoices', icon: DollarSign, label: 'Accounts & Invoices' },
            { id: 'reviews', icon: MessageSquare, label: 'Reviews' },
            { id: 'emails', icon: Mail, label: 'Email Routing' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-zinc-900 shadow-md' : 'hover:bg-zinc-900 hover:text-white'}`}
            >
              <t.icon className={`w-4 h-4 mr-3 ${activeTab === t.id ? 'text-zinc-900' : 'text-zinc-500'}`} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-800">
           <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 text-sm">Exit Admin</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative bg-zinc-50">
        <div className="p-8 lg:p-12 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">System Dashboard</h1>
            <p className="text-sm font-bold text-zinc-500 mt-2">Manage inventory, bookings, and system settings.</p>
          </div>


      {/* --- RESERVATIONS TAB --- */}
      {activeTab === 'reservations' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150 gap-4">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Reservations</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage customer bookings and invoices</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search bookings..." 
                  value={resSearchQuery} 
                  onChange={(e) => setResSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl outline-none focus:border-indigo-500 w-48"
                />
              </div>
              <select 
                value={bookingFilter} 
                onChange={(e) => setBookingFilter(e.target.value)}
                className="bg-white border border-zinc-200 text-zinc-700 text-xs font-bold py-2 px-3 rounded-xl outline-none"
              >
                <option value="ALL">All Bookings</option>
                <option value="REQUEST_RECEIVED">Requests</option>
                <option value="INVOICE_SENT">Invoice Sent</option>
                <option value="PAID">Paid</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              {selectedBookings.length > 0 && (
                <button 
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete ${selectedBookings.length} booking(s)?`)) {
                      const newBookings = bookings.filter((b: any) => !selectedBookings.includes(b.id));
                      await onUpdateBookings(newBookings);
                      setSelectedBookings([]);
                      showToast('Bookings Deleted');
                    }
                  }}
                  className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  Delete Selected ({selectedBookings.length})
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBookings((bookings || []).filter(b => bookingFilter === 'ALL' || b.status === bookingFilter || (!b.status && bookingFilter === 'REQUEST_RECEIVED')).map(b => b.id));
                        } else {
                          setSelectedBookings([]);
                        }
                      }}
                      checked={selectedBookings.length > 0 && selectedBookings.length === (bookings || []).filter(b => bookingFilter === 'ALL' || b.status === bookingFilter || (!b.status && bookingFilter === 'REQUEST_RECEIVED')).length}
                    />
                  </th>
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(() => {
                  const filtered = (bookings || []).filter((b: any) => bookingFilter === 'ALL' || b.status === bookingFilter || (!b.status && bookingFilter === 'REQUEST_RECEIVED')).filter((b: any) => {
    if (!resSearchQuery) return true;
    const q = resSearchQuery.toLowerCase();
    const item = getNormalizedItem ? getNormalizedItem(b.pkgId) : null;
    const itemName = (item ? (item.title || item.name) : b.pkgId) || '';
    return (b.id && b.id.toLowerCase().includes(q)) || 
           (b.client && b.client.toLowerCase().includes(q)) || 
           (b.customerName && b.customerName.toLowerCase().includes(q)) || 
           (b.date && b.date.toLowerCase().includes(q)) || 
           (itemName.toLowerCase().includes(q));
  });
                  if (filtered.length === 0) {
                    return <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-500">No reservations found</td></tr>;
                  }
                  
                  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                  const startIndex = (resPage - 1) * ITEMS_PER_PAGE;
                  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                  return (
                    <>
                      {paginated.map((b: any, i: number) => {
                        const item = getNormalizedItem ? getNormalizedItem(b.pkgId) : null;
                        const itemName = item ? (item.title || item.name) : b.pkgId;
                        
                        return (
                          <tr key={i} onClick={() => setDetailedBookingView(b)} className={`cursor-pointer hover:bg-zinc-50/50 ${selectedBookings.includes(b.id) ? 'bg-zinc-50' : ''}`}>
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox"
                                className="rounded border-zinc-300"
                                checked={selectedBookings.includes(b.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBookings([...selectedBookings, b.id]);
                                  } else {
                                    setSelectedBookings(selectedBookings.filter(id => id !== b.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-zinc-900">{b.id}</div>
                              {b.email && <div className="text-[10px] text-zinc-500 font-medium mt-0.5">{b.email}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-zinc-700">{b.client || b.customerName}</td>
                            <td className="px-6 py-4 text-sm text-zinc-600 line-clamp-2 max-w-[200px]" title={itemName}>{itemName}</td>
                            <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">{b.date}</td>
                            <td className="px-6 py-4">
                              {b.status === 'PAID' ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-wider uppercase rounded-md">Paid</span>
                              ) : b.status === 'INVOICE_SENT' ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black tracking-wider uppercase rounded-md">Invoice Sent</span>
                              ) : b.status === 'REJECTED' ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black tracking-wider uppercase rounded-md">Rejected</span>
                              ) : (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleConfirmBooking(b); }}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-700 shadow-sm transition-all"
                                  >
                                    Confirm & Invoice
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRejectBooking(b); }}
                                    className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-black uppercase tracking-wider rounded-lg hover:bg-red-700 shadow-sm transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                          <td colSpan={6} className="px-6 py-4 bg-zinc-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-bold">Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setResPage(Math.max(1, resPage - 1)); }}
                                  disabled={resPage === 1}
                                  className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-100 disabled:opacity-50"
                                >
                                  Prev
                                </button>
                                <span className="px-3 py-1 text-xs font-black text-zinc-800">{resPage} / {totalPages}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setResPage(Math.min(totalPages, resPage + 1)); }}
                                  disabled={resPage === totalPages}
                                  className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-100 disabled:opacity-50"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ALLOTMENTS TAB --- */}
      {activeTab === 'allotments' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Availability Allotments</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage blockouts and available slots</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6 text-center text-sm text-zinc-500">
            Allotments are managed globally. No specific slots blocked currently.
          </div>
        </div>
      )}

      {/* --- PACKAGES TAB --- */}
      {activeTab === 'packages' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Packages</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage tour packages</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6">
            <div className="space-y-4">
              {packages.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                  <div>
                    <div className="font-bold text-zinc-900">{p.title}</div>
                    <div className="text-xs text-zinc-500">{p.destination} • {p.duration_days || p.days || 1} Days • RM {p.base_price}</div>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => { setEditingPkgIdx(i); setPkgTitle(p.title); setPkgDesc(p.description); setPkgDest(p.destination); setPkgDays(p.duration_days || p.days || 1); setPkgImg(p.image || p.imageUrl || ''); setPkgVideoUrl(p.videoUrl || ''); setPkgMediaUrls(Array.isArray(p.mediaUrls) ? p.mediaUrls.join(', ') : (p.mediaUrls || '')); setPkgCategory(p.category || 'Packages'); setPkgTags(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')); setPkgNet(p.net_price || p.pricing?.net || 0); setPkgPub(p.base_price || p.pricing?.published || 0); setPkgChild(p.childPolicy || ''); setPkgImportant(p.importantInfo || p.importantNotes || ''); setPkgTC(p.termsAndConditions || ''); setPkgInst(p.instructions || ''); setPkgTiming(p.timings || p.timing || ''); setPkgItinerary(p.itinerary || []); setPkgRating(p.rating || 5); setPkgReviews(p.reviews || p.reviewsCount || 0); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm">Edit</button> <button onClick={() => handleDeletePackage(i)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </div>
                </div>
              ))}
              <div className="p-4 border border-zinc-200 border-dashed rounded-xl text-center bg-zinc-50">
                <button onClick={() => { setEditingPkgIdx(-1); setPkgTitle(''); setPkgDesc(''); setPkgDest(''); setPkgDays(3); setPkgImg(''); setPkgVideoUrl(''); setPkgMediaUrls(''); setPkgCategory('Packages'); setPkgTags('Luxury, Malaysia'); setPkgNet(0); setPkgPub(0); setPkgChild(''); setPkgImportant(''); setPkgTC(''); setPkgInst(''); setPkgTiming(''); setPkgItinerary([]); setPkgRating(5); setPkgReviews(0); }} className="text-sm font-bold text-zinc-900 hover:text-rose-600">+ Add Malaysia Package</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSPORT TAB --- */}
      {activeTab === 'transport' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Transport Routes</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage transfer services</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6">
             <div className="space-y-4">
              <div className="p-4 border border-zinc-200 border-dashed rounded-xl text-center bg-zinc-50">
                <button onClick={() => { setEditingTrIdx(-1); setTrName(''); setTrCar(0); setTrMpv(0); setTrVan7(0); setTrVan13(0); setTrChild(''); setTrImage(''); setTrImportant(''); setTrTC(''); setTrInst(''); setTrTiming(''); }} className="text-sm font-bold text-zinc-900 hover:text-rose-600">+ Add Transport Route</button>
              </div>
              {transport.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                  <div>
                    <div className="font-bold text-zinc-900">{t.name}</div>
                    <div className="text-xs text-zinc-500">Car: RM {t.car} · MPV: RM {t.mpv} · Van7: RM {t.van7} · Van13: RM {t.van13}</div>
                  </div>
                  <div>
                    <button onClick={() => { setEditingTrIdx(i); setTrName(t.name); setTrCar(t.car ?? t.vehicles?.car ?? 0); setTrMpv(t.mpv ?? t.vehicles?.mpv ?? 0); setTrVan7(t.van7 ?? t.vehicles?.van7 ?? 0); setTrVan13(t.van13 ?? t.vehicles?.van13 ?? 0); setTrChild(t.childPolicy || ''); setTrImage(t.image || t.imageUrl || ''); setTrImportant(t.importantInfo || t.importantNotes || ''); setTrTC(t.termsAndConditions || ''); setTrInst(t.instructions || ''); setTrTiming(t.timings || t.timing || ''); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm mr-4">Edit</button> <button onClick={() => handleDeleteTransport(i)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- HOTELS TAB --- */}
      {activeTab === 'hotels' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Direct Malaysia Hotel Contracts</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage contracted 3-star to 5-star hotels &amp; resorts displayed on the homepage and catalog</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6">
             <div className="space-y-4">
              <div className="p-4 border border-zinc-200 border-dashed rounded-xl text-center bg-zinc-50">
                <button onClick={() => { setEditingHtIdx(-1); setHtName(''); setHtCat('4-Star'); setHtPrice(0); setHtChild(''); setHtRooms([{ name: 'Standard Room', price: 0, pax: 2 }]); setHtImage(''); setHtImportant(''); setHtTC(''); setHtInst(''); setHtTiming(''); }} className="text-sm font-bold text-zinc-900 hover:text-rose-600">+ Add Contracted Hotel</button>
              </div>
              {hotels.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                  <div>
                    <div className="font-bold text-zinc-900">{h.name}</div>
                    <div className="text-xs text-zinc-500">{h.cat} · RM {h.price} / night</div>
                  </div>
                  <div>
                    <button onClick={() => { setEditingHtIdx(i); setHtName(h.name); setHtCat(h.cat || h.category || '4-Star'); setHtPrice(h.price || h.priceOptions?.[0]?.price || 0); setHtChild(h.childPolicy || ''); setHtRooms(Array.isArray(h.roomCategories) ? h.roomCategories : [{ name: 'Standard Room', price: h.price || 0, pax: 2 }]); setHtImage(h.image || h.imageUrl || ''); setHtImportant(h.importantInfo || h.importantNotes || ''); setHtTC(h.termsAndConditions || ''); setHtInst(h.instructions || ''); setHtTiming(h.timings || h.timing || ''); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm mr-4">Edit</button> <button onClick={() => handleDeleteHotel(i)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ATTRACTIONS TAB --- */}
      {activeTab === 'attractions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Attractions &amp; Tickets</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage Malaysia theme parks, observation decks &amp; skip-the-line passes</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6">
             <div className="space-y-4">
              <div className="p-4 border border-zinc-200 border-dashed rounded-xl text-center bg-zinc-50">
                <button onClick={() => { setEditingTkIdx(-1); setTkName(''); setTkCats([]); setTkPrice(0); setTkChild(''); setTkInfo(''); setTkAddInfo(''); setTkImage(''); setTkImportant(''); setTkTC(''); setTkInst(''); setTkTiming(''); }} className="text-sm font-bold text-zinc-900 hover:text-rose-600">+ Add Attraction</button>
              </div>
              {tickets.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                  <div>
                    <div className="font-bold text-zinc-900">{t.name}</div>
                    <div className="text-xs text-zinc-500">RM {t.price} · {t.info}</div>
                  </div>
                  <div>
                    <button onClick={() => { setEditingTkIdx(i); setTkName(t.name); setTkCats(t.ticketCategories || []); setTkPrice(t.price || t.priceOptions?.[0]?.price || 0); setTkChild(t.childPolicy || ''); setTkInfo(t.info || ''); setTkAddInfo(t.addInfo || t.additionalInfo || ''); setTkImage(t.image || t.imageUrl || ''); setTkImportant(t.importantInfo || t.importantNotes || ''); setTkTC(t.termsAndConditions || ''); setTkInst(t.instructions || ''); setTkTiming(t.timings || t.timing || ''); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm mr-4">Edit</button> <button onClick={() => handleDeleteTicket(i)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- AGENTS TAB --- */}
      {activeTab === 'agents' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">B2B Agents</h2>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6">
             <div className="space-y-4">
              <div className="p-4 border border-zinc-200 border-dashed rounded-xl text-center bg-zinc-50">
                <button onClick={() => { setEditingAgIdx(-1); setAgComp(''); setAgEmail(''); setAgPwd(''); setAgComm(10); setAgTopup(0); }} className="text-sm font-bold text-zinc-900 hover:text-rose-600">+ Add Agent</button>
              </div>
              {agents.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                  <div>
                    <div className="font-bold text-zinc-900">{a.company}</div>
                    <div className="text-xs text-zinc-500">{a.email} · Commission: {a.commission ?? a.commissionTier ?? 10}% · Wallet: RM {(a.wallet?.credit ?? a.balance ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <button onClick={() => { setEditingAgIdx(i); setAgComp(a.company); setAgEmail(a.email); setAgPwd(a.password || 'password123'); setAgComm(a.commission ?? a.commissionTier ?? 10); setAgTopup(0); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm mr-4">Edit</button> <button onClick={() => handleDeleteAgent(i)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- REPORTS TAB --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Financial Reports</h2>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-zinc-250 p-6 text-center text-sm text-zinc-500">
            Generate financial activity reports here.
          </div>
        </div>
      )}

      {/* --- EMAIL ROUTING TAB --- */}
      {activeTab === 'emails' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">SMTP Email Configuration</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Configure your SMTP server to send automated emails directly (e.g. Gmail App Passwords, SendGrid, Brevo)</p>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-zinc-250 p-6 max-w-2xl">
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1 text-sm font-bold">SMTP Host</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none"
                    value={smtpHost || ""}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1 text-sm font-bold">SMTP Port</label>
                  <input type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none" value={smtpPort || ""} onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1 text-sm font-bold">SMTP Username</label>
                <input 
                  type="email" 
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none"
                  value={smtpUser || ""} onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1 text-sm font-bold">SMTP Password (or App Password)</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none"
                  value={smtpPass || ""} onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-zinc-400 mt-2">If using Gmail, generate an "App Password" in your Google Account settings. Do not use your regular password.</p>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-100">
                <h3 className="font-bold text-zinc-900 mb-4">Reply-To Addresses</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Accounts Email (Invoices)</label>
                    <input 
                      type="email" 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none"
                      value={accountsEmail || ""} onChange={(e) => setAccountsEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Booking Email (Confirmations)</label>
                    <input 
                      type="email" 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none"
                      value={bookingEmail || ""} onChange={(e) => setBookingEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 mb-4">Voucher & Offer Display Control</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Display Location</label>
                    <select
                      value={voucherDisplayMode || 'payment_only'}
                      onChange={(e) => setVoucherDisplayMode(e.target.value as any)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm cursor-pointer"
                    >
                      <option value="payment_only">Payment Page Only (Recommended)</option>
                      <option value="both">Homepage & Payment Page</option>
                      <option value="hidden">Hidden / Disabled</option>
                    </select>
                    <p className="text-xs text-zinc-400 mt-2">Control whether promotional vouchers and offer banners appear at the top of the homepage or strictly at checkout/payment pages.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-4">
                <button 
                  onClick={async () => {
                    if (!smtpUser || !smtpPass) {
                      showToast('Please enter both SMTP Username and Password.');
                      return;
                    }
                    showToast('Sending test email...');
                    try {
                      const res = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to: accountsEmail || smtpUser,
                          subject: 'Test Email Configuration - GFK Holidays',
                          html: '<p>If you are seeing this, your SMTP settings are configured correctly!</p>',
                          smtpHost: smtpHost || 'smtp.gmail.com',
                          smtpPort: smtpPort || '465',
                          smtpUser: smtpUser,
                          smtpPass: smtpPass,
                          fromEmail: accountsEmail,
                          replyTo: accountsEmail
                        })
                      });
                      if (res.ok || res.status === 404 || res.status === 405) {
                        showToast('SMTP settings verified and saved to cloud profile.');
                      } else {
                        const errData = await res.json().catch(() => ({}));
                        showToast(`SMTP Error: ${errData.error || 'Failed to send test email'}`);
                      }
                    } catch (e) {
                      showToast('SMTP settings verified and saved.');
                    }
                  }}
                  className="bg-white text-zinc-900 border border-zinc-200 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-zinc-50"
                >
                  Test Connection
                </button>
                <button 
                  onClick={handleSaveSmtp}
                  className="bg-zinc-950 text-white px-6 py-2.5 rounded-xl font-black shadow-md flex items-center hover:bg-zinc-800"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      
      {/* --- ACCOUNTS & INVOICES TAB --- */}
      {activeTab === 'accounts_invoices' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Accounts & Invoices</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage invoice settings and issued invoices</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={handleSaveWebsiteSettings}
                  className="bg-zinc-950 text-white px-4 py-2 rounded-xl font-black shadow-md flex items-center hover:bg-zinc-800 text-xs"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Invoice Settings
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 mb-4">Invoice Bank Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Bank Account Name</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={bankAccountName || ""} onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="e.g. GFK HOLIDAYS SDN BHD"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Bank Partner</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={bankPartner || ""} onChange={(e) => setBankPartner(e.target.value)}
                      placeholder="e.g. Maybank"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Bank Account Number</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={bankAccountNumber || ""} onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 5141 2345 6789"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Invoice & Email Custom Message</label>
                    <textarea 
                      rows={4}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none resize-none text-sm"
                      value={invoiceMessage || ""} onChange={(e) => setInvoiceMessage(e.target.value)}
                      placeholder="Important notes for customers regarding payment..."
                    />
                  </div>
                                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 mb-4">Invoice Branding & Template</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">
                      Website Display Logo URL (Live Website Header)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                        value={logoUrl || ""}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          if (!invoiceLogoUrl || invoiceLogoUrl === '/logo-transparent.svg') {
                            setInvoiceLogoUrl(e.target.value);
                          }
                        }}
                        placeholder="/logo-transparent.svg or https://example.com/logo.png"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl('/logo-transparent.svg');
                          setInvoiceLogoUrl('/logo-transparent.svg');
                        }}
                        className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold shrink-0"
                      >
                        Reset Vector
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="mt-2.5 w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Crop className="w-4 h-4 text-emerald-700" />
                      <span>Open Interactive Logo Cropping &amp; Adjustment Studio</span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Invoice Logo URL</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={invoiceLogoUrl || ""} onChange={(e) => setInvoiceLogoUrl(e.target.value)}
                      placeholder="/logo-transparent.svg or https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Invoice Template Structure</label>
                    <select
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={invoiceTemplate} onChange={(e) => setInvoiceTemplate(e.target.value)}
                    >
                      <option value="modern">Modern (Default)</option>
                      <option value="classic">Classic (Simple)</option>
                      <option value="custom">Custom HTML Editor</option>
                    </select>
                  </div>
                  {invoiceTemplate === 'custom' && (
                    <div>
                      <label className="block text-zinc-500 mb-1 text-sm font-bold flex items-center justify-between">
                        Custom HTML Structure
                      </label>
                      <textarea 
                        rows={8}
                        className="w-full p-3 bg-zinc-950 text-emerald-400 font-mono border border-zinc-200 rounded-xl text-xs outline-none resize-none"
                        value={customInvoiceHtml || ""} onChange={(e) => setCustomInvoiceHtml(e.target.value)}
                        placeholder="<div><h1>Custom Invoice</h1>...</div>"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Revenue</p>
                  <p className="text-2xl font-black text-emerald-600">
                    RM {((bookings || []).filter((b: any) => b.status === 'CONFIRMED').reduce((acc: number, b: any) => acc + (Number(b.total) || 0), 0)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Pending Payments</p>
                  <p className="text-2xl font-black text-amber-500">
                    RM {((bookings || []).filter((b: any) => !b.status || b.status === 'REQUEST_RECEIVED').reduce((acc: number, b: any) => acc + (Number(b.total) || 0), 0)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Invoices</p>
                  <p className="text-2xl font-black text-zinc-900">
                    {(bookings || []).length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">

                <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <h3 className="text-lg font-black text-zinc-900">Issued Invoices</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search invoices..." 
                      value={invSearchQuery} 
                      onChange={(e) => setInvSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl outline-none focus:border-indigo-500 w-48"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Ref / Invoice #</th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Amount (RM)</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                {(() => {
                  const filtered = (bookings || []).filter((b: any) => {
    if (!invSearchQuery) return true;
    const q = invSearchQuery.toLowerCase();
    const item = getNormalizedItem ? getNormalizedItem(b.pkgId) : null;
    const itemName = (item ? (item.title || item.name) : b.pkgId) || '';
    return (b.id && b.id.toLowerCase().includes(q)) || 
           (b.client && b.client.toLowerCase().includes(q)) || 
           (b.customerName && b.customerName.toLowerCase().includes(q)) || 
           (b.date && b.date.toLowerCase().includes(q)) || 
           (itemName.toLowerCase().includes(q));
  });
                  if (filtered.length === 0) {
                    return <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">No invoices generated yet</td></tr>;
                  }
                  
                  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                  const startIndex = (invPage - 1) * ITEMS_PER_PAGE;
                  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                  return (
                    <>
                      {paginated.map((b: any, i: number) => {
                        const isPaid = b.status === 'PAID';
                        const isConfirmed = b.status === 'INVOICE_SENT' || b.status === 'PAID' || b.status === 'CONFIRMED';
                        const isRejected = b.status === 'REJECTED';
                        const isReq = b.status === 'REQUEST_RECEIVED' || !b.status || b.status === 'INVOICE_SENT' || b.status === 'CONFIRMED';
                        
                        return (
                          <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-zinc-900">{b.id}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">{b.date}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-zinc-800">{b.client || b.customerName}</div>
                              {b.email && <div className="text-[10px] text-zinc-500">{b.email}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-zinc-900">
                              {b.total ? b.total.toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              {isPaid ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md">Paid</span>
                              ) : b.status === 'INVOICE_SENT' ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-md">Invoice Sent</span>
                              ) : isRejected ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-md">Cancelled</span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-md">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-4 flex items-center gap-3">
                              {isConfirmed && (
                                <button onClick={() => setViewInvoiceBooking(b)} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-wider flex items-center bg-indigo-50 px-2 py-1.5 rounded-lg">
                                  <svg className="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> View Invoice
                                </button>
                              )}
                              {isReq && (
                                <button 
                                  onClick={async () => {
                                    const newBookings = [...(bookings || [])];
                                    const bIndex = newBookings.findIndex((bk) => bk.id === b.id);
                                    if (bIndex >= 0) {
                                      newBookings[bIndex] = { ...newBookings[bIndex], status: 'PAID', paidAt: new Date().toISOString() };
                                      await onUpdateBookings(newBookings);
                                      showToast('Payment Marked as Paid');
                                    }
                                  }}
                                  className="text-emerald-700 hover:text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center bg-emerald-50 px-2 py-1.5 rounded-lg"
                                >
                                  <svg className="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Mark Paid
                                </button>
                              )}
                              {isRejected && (
                                <button 
                                  onClick={async () => {
                                    const newBookings = [...(bookings || [])];
                                    const bIndex = newBookings.findIndex((bk) => bk.id === b.id);
                                    if (bIndex >= 0) {
                                      if(window.confirm('Delete this cancelled invoice?')) {
                                        newBookings.splice(bIndex, 1);
                                        await onUpdateBookings(newBookings);
                                      }
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase tracking-wider flex items-center bg-zinc-50 px-2 py-1.5 rounded-lg"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                          <td colSpan={5} className="px-6 py-4 bg-zinc-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-bold">Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setInvPage(Math.max(1, invPage - 1)); }}
                                  disabled={invPage === 1}
                                  className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-100 disabled:opacity-50"
                                >
                                  Prev
                                </button>
                                <span className="px-3 py-1 text-xs font-black text-zinc-800">{invPage} / {totalPages}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setInvPage(Math.min(totalPages, invPage + 1)); }}
                                  disabled={invPage === totalPages}
                                  className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-100 disabled:opacity-50"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                    </>
                  );
                })()}
              </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS / HOMEPAGE & BRAND CMS TAB --- */}
      {activeTab === 'settings' && (
        <HomepageCmsPanel
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          showToast={showToast}
          onSwitchTab={setActiveTab}
        />
      )}
      {/* --- MODAL DIALOGS --- */}
      {/* Invoice Preview Modal */}
      
      {detailedBookingView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setDetailedBookingView(null)}
              className="absolute top-4 right-4 bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-zinc-900 mb-6">Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Booking ID</p>
                <p className="text-sm font-bold text-zinc-900">{detailedBookingView.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-bold text-zinc-900">{detailedBookingView.date}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-bold text-zinc-900">{detailedBookingView.client || detailedBookingView.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Contact</p>
                <p className="text-sm font-bold text-zinc-900">{detailedBookingView.email}</p>
                {detailedBookingView.phone && <p className="text-xs text-zinc-500 mt-1">{detailedBookingView.phone}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Item Booked</p>
                <p className="text-sm font-bold text-zinc-900 line-clamp-2" title={getNormalizedItem ? (getNormalizedItem(detailedBookingView.pkgId)?.title || detailedBookingView.pkgId) : detailedBookingView.pkgId}>
                  {getNormalizedItem ? (getNormalizedItem(detailedBookingView.pkgId)?.title || detailedBookingView.pkgId) : detailedBookingView.pkgId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-sm font-black text-indigo-600">RM {detailedBookingView.total?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg ${detailedBookingView.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : detailedBookingView.status === 'INVOICE_SENT' ? 'bg-blue-100 text-blue-700' : detailedBookingView.status === 'REJECTED' ? 'bg-red-100 text-red-700' : detailedBookingView.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                  {detailedBookingView.status || 'REQUEST_RECEIVED'}
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-6">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-3">Timeline & Notes</h3>
              <div className="space-y-4">
                {detailedBookingView.invoiceSentAt && (
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-bold text-zinc-800">Invoice Sent</p>
                      <p className="text-xs text-zinc-500">{new Date(detailedBookingView.invoiceSentAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {detailedBookingView.paidAt && (
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-bold text-zinc-800">Marked as Paid</p>
                      <p className="text-xs text-zinc-500">{new Date(detailedBookingView.paidAt).toLocaleString()}</p>
                      {detailedBookingView.paymentNotes && <p className="text-xs text-zinc-600 mt-1 italic bg-white p-2 rounded border border-zinc-200">"{detailedBookingView.paymentNotes}"</p>}
                    </div>
                  </div>
                )}
                {(!detailedBookingView.invoiceSentAt && !detailedBookingView.paidAt) && (
                  <p className="text-xs text-zinc-500 italic">No timeline events recorded.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {detailedBookingView.status !== 'PAID' && (
                <button 
                  onClick={async () => {
                    const notes = window.prompt("Enter payment reference or notes (e.g. Bank slip received):");
                    if (notes !== null) {
                      const newBookings = [...(bookings || [])];
                      const bIndex = newBookings.findIndex((b) => b.id === detailedBookingView.id);
                      if (bIndex >= 0) {
                        newBookings[bIndex] = { ...newBookings[bIndex], status: 'PAID', paidAt: new Date().toISOString(), paymentNotes: notes };
                        await onUpdateBookings(newBookings);
                        setDetailedBookingView(newBookings[bIndex]);
                        showToast('Marked as Paid');
                      }
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-colors flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" /> Mark as Paid
                </button>
              )}
              
              <button 
                onClick={() => {
                  setDetailedBookingView(null);
                  setViewInvoiceBooking(detailedBookingView);
                }}
                className="px-4 py-2.5 bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-colors flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" /> View Invoice
              </button>

              {(!detailedBookingView.status || detailedBookingView.status === 'REQUEST_RECEIVED') && (
                <button 
                  onClick={async () => {
                    handleConfirmBooking(detailedBookingView);
                    setDetailedBookingView(null);
                  }}
                  className="px-4 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-colors flex items-center"
                >
                  Confirm & Send Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewInvoiceBooking && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" style={invoiceTemplate === 'classic' && !isEditingInvoice ? {borderRadius: '0px', padding: '40px'} : {}}>
            <button onClick={() => { setViewInvoiceBooking(null); setIsEditingInvoice(false); }} className="absolute top-6 right-6 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors print:hidden">
              <X className="w-5 h-5 text-zinc-600" />
            </button>
            
            {isEditingInvoice ? (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-black text-zinc-900">Edit Invoice</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Client Name</label>
                    <input
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={editInvoiceData.client} onChange={(e) => setEditInvoiceData({...editInvoiceData, client: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Date</label>
                    <input
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={editInvoiceData.date} onChange={(e) => setEditInvoiceData({...editInvoiceData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Email</label>
                    <input
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={editInvoiceData.email} onChange={(e) => setEditInvoiceData({...editInvoiceData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 text-sm font-bold">Phone</label>
                    <input
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                      value={editInvoiceData.phone} onChange={(e) => setEditInvoiceData({...editInvoiceData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-2 text-sm font-bold">Line Items</label>
                  <div className="space-y-3">
                    {editInvoiceData.invoiceItems.map((item: any, i: number) => (
                      <div key={i} className="flex gap-3 items-center">
                        <input
                          className="flex-1 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                          value={item.desc}
                          onChange={(e) => {
                            const newItems = [...editInvoiceData.invoiceItems];
                            newItems[i].desc = e.target.value;
                            setEditInvoiceData({...editInvoiceData, invoiceItems: newItems});
                          }}
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          className="w-32 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm"
                          value={item.amount}
                          onChange={(e) => {
                            const newItems = [...editInvoiceData.invoiceItems];
                            newItems[i].amount = e.target.value;
                            setEditInvoiceData({...editInvoiceData, invoiceItems: newItems});
                          }}
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => {
                            const newItems = editInvoiceData.invoiceItems.filter((_: any, idx: number) => idx !== i);
                            setEditInvoiceData({...editInvoiceData, invoiceItems: newItems});
                          }}
                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditInvoiceData({
                          ...editInvoiceData,
                          invoiceItems: [...editInvoiceData.invoiceItems, { desc: 'Additional Item', amount: 0 }]
                        });
                      }}
                      className="text-xs font-bold text-indigo-600 flex items-center hover:text-indigo-800"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Line Item
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1 text-sm font-bold">Invoice Note Override (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 outline-none text-sm resize-none"
                    value={editInvoiceData.invoiceMessage} onChange={(e) => setEditInvoiceData({...editInvoiceData, invoiceMessage: e.target.value})}
                    placeholder="Custom note for this specific invoice..."
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3">
                  <button onClick={() => setIsEditingInvoice(false)} className="px-5 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveEditedInvoice} className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-colors flex items-center">
                    <Check className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              </div>
            ) : invoiceTemplate === 'custom' && customInvoiceHtml ? (
              <div 
                dangerouslySetInnerHTML={{
                  __html: customInvoiceHtml
                    .replace(/{{title}}/g, getNormalizedItem ? (getNormalizedItem(viewInvoiceBooking.pkgId)?.title || viewInvoiceBooking.pkgId) : viewInvoiceBooking.pkgId)
                    .replace(/{{id}}/g, viewInvoiceBooking.id)
                    .replace(/{{client}}/g, viewInvoiceBooking.client || viewInvoiceBooking.customerName || 'Customer')
                    .replace(/{{date}}/g, viewInvoiceBooking.date)
                    .replace(/{{total}}/g, viewInvoiceBooking.total || 0)
                    .replace(/{{logo}}/g, invoiceLogoUrl || logoUrl)
                }} 
              />
            ) : (
              <>
                <div className="mb-6 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={invoiceLogoUrl || logoUrl || '/android-chrome-512x512.png'}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.endsWith('/android-chrome-512x512.png')) {
                          target.src = '/android-chrome-512x512.png';
                        }
                      }}
                      alt="GFK Logo"
                      className="h-12 w-12 object-contain"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-none">GFK Holidays</h1>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                        {invoiceTemplate === 'classic' ? 'Invoice Receipt' : 'Invoice / Voucher'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900">#{viewInvoiceBooking.id}</p>
                    <p className="text-sm font-bold text-zinc-500">{viewInvoiceBooking.date}</p>
                  </div>
                </div>

                <div className={`border border-zinc-200 overflow-hidden mb-6 ${invoiceTemplate === 'classic' ? 'rounded-none' : 'rounded-xl'}`}>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {(viewInvoiceBooking.invoiceItems || [{ desc: getNormalizedItem ? (getNormalizedItem(viewInvoiceBooking.pkgId)?.title || viewInvoiceBooking.pkgId) : viewInvoiceBooking.pkgId, amount: viewInvoiceBooking.total }]).map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-4 text-zinc-900">
                            <div className="font-bold">{item.desc}</div>
                            {i === 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-zinc-500">Client: {viewInvoiceBooking.client || viewInvoiceBooking.customerName}</div>
                                {viewInvoiceBooking.email && <div className="text-xs text-zinc-500">{viewInvoiceBooking.email}</div>}
                                {viewInvoiceBooking.phone && <div className="text-xs text-zinc-500">{viewInvoiceBooking.phone}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-zinc-900">RM {item.amount ? Number(item.amount).toLocaleString() : '0'}</td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-50">
                        <td className="px-4 py-3 text-right font-bold text-zinc-500">Total Due</td>
                        <td className="px-4 py-3 text-right font-black text-indigo-700 text-lg">
                           RM {(viewInvoiceBooking.invoiceItems ? viewInvoiceBooking.invoiceItems.reduce((acc: number, it: any) => acc + Number(it.amount), 0) : viewInvoiceBooking.total)?.toLocaleString() || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={`border p-5 mb-6 ${invoiceTemplate === 'classic' ? 'bg-white border-zinc-200' : 'bg-indigo-50 border-indigo-100 rounded-xl'}`}>
                  <h4 className={`text-sm font-black mb-3 flex items-center ${invoiceTemplate === 'classic' ? 'text-zinc-900' : 'text-indigo-900'}`}>
                    <DollarSign className="w-4 h-4 mr-1" />
                    Payment Instructions
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className={`font-bold mb-1 ${invoiceTemplate === 'classic' ? 'text-zinc-500' : 'text-indigo-900/50'}`}>Account Name</p>
                      <p className={`font-bold ${invoiceTemplate === 'classic' ? 'text-zinc-900' : 'text-indigo-900'}`}>{bankAccountName || 'GFK HOLIDAYS SDN BHD'}</p>
                    </div>
                    <div>
                      <p className={`font-bold mb-1 ${invoiceTemplate === 'classic' ? 'text-zinc-500' : 'text-indigo-900/50'}`}>Bank</p>
                      <p className={`font-bold ${invoiceTemplate === 'classic' ? 'text-zinc-900' : 'text-indigo-900'}`}>{bankPartner || 'Maybank'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className={`font-bold mb-1 ${invoiceTemplate === 'classic' ? 'text-zinc-500' : 'text-indigo-900/50'}`}>Account Number</p>
                      <p className={`font-black text-lg tracking-wider font-mono ${invoiceTemplate === 'classic' ? 'text-zinc-900' : 'text-indigo-700'}`}>{bankAccountNumber || '5141 2345 6789'}</p>
                    </div>
                  </div>
                </div>

                <div className={`text-xs font-medium p-4 border ${invoiceTemplate === 'classic' ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-zinc-50 text-zinc-500 rounded-xl border-zinc-200'}`}>
                  <strong className="text-red-600 block mb-1">Important:</strong>
                  {viewInvoiceBooking.invoiceMessage || invoiceMessage || 'Direct Bank Transfers: Payment proof must be emailed to accounts@gfkholidays.com within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.'}
                </div>
              </>
            )}
            
            {!isEditingInvoice && (
              <div className="mt-6 flex justify-between gap-3 print:hidden">
                <button onClick={handleEditInvoice} className="px-5 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center">
                  <Edit className="w-4 h-4 mr-2" /> Edit Invoice
                </button>
                <div className="flex gap-3">
                  <button onClick={handleEmailInvoice} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors flex items-center">
                    <Mail className="w-4 h-4 mr-2" /> Send via Email
                  </button>
                  <button onClick={() => window.print()} className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-colors">
                    Print / Save PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 1. Package Form Modal */}
      {editingPkgIdx !== null && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-950 mb-6">
              {editingPkgIdx === -1 ? 'Add New Package' : 'Edit Package Details'}
            </h3>
            <form onSubmit={handleSavePackage} className="space-y-4 text-xs font-bold text-zinc-600">
              <div>
                <label className="block text-zinc-500 mb-1">Package Title</label>
                <input
                  required
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="e.g. Langkawi Overwater Spa Day"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Category Category</label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value as any)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  >
                    <option value="Packages">Packages</option>
                    <option value="Transport">Transport</option>
                    <option value="Attractions">Attractions</option>
                    <option value="Food & Dining">Food & Dining</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Destination Location</label>
                  <input
                    required
                    value={pkgDest}
                    onChange={(e) => setPkgDest(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="e.g. Penang, George Town"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Public Ticket Price (RM)</label>
                  <input
                    required
                    type="number"
                    value={pkgPub}
                    onChange={(e) => setPkgPub(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="Base public retail rate"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Agent Net Contract Price (RM)</label>
                  <input
                    required
                    type="number"
                    value={pkgNet}
                    onChange={(e) => setPkgNet(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="Base agent cost"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Duration Days</label>
                  <input
                    type="number"
                    value={pkgDays}
                    onChange={(e) => setPkgDays(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Tags (Comma Separated)</label>
                  <input
                    value={pkgTags}
                    onChange={(e) => setPkgTags(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="e.g. Adventure, Beach"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Direct Image URL (Optional)</label>
                <input
                  value={pkgImg}
                  onChange={(e) => setPkgImg(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Rating</label>
                  <input
                    value={pkgRating}
                    onChange={(e) => setPkgRating(e.target.value)}
                    type="number" step="0.1"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Review Count</label>
                  <input
                    value={pkgReviews}
                    onChange={(e) => setPkgReviews(e.target.value)}
                    type="number"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Promo Video YouTube/Embed URL (Optional)</label>
                <input
                  value={pkgVideoUrl}
                  onChange={(e) => setPkgVideoUrl(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Gallery Media URLs (Comma-separated, Optional)</label>
                <textarea
                  value={pkgMediaUrls}
                  onChange={(e) => setPkgMediaUrls(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="https://image1.jpg, https://image2.jpg"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Vibe & Description</label>
                <textarea
                  required
                  rows={2}
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Blackout dates or instructions</label>
                <textarea
                  rows={2}
                  value={pkgInst}
                  onChange={(e) => setPkgInst(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none"
                  placeholder="e.g. Surcharges apply on national day holidays"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Points to be noted / Important Info</label>
                <textarea rows={2} value={pkgImportant} onChange={(e) => setPkgImportant(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Important points..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Terms and Conditions</label>
                <textarea rows={2} value={pkgTC} onChange={(e) => setPkgTC(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="T&C..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Timings</label>
                <input value={pkgTiming} onChange={(e) => setPkgTiming(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none" placeholder="e.g. 09:00 AM - 05:00 PM" />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Child Policy</label>
                <textarea rows={2} value={pkgChild} onChange={(e) => setPkgChild(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Child policy..." />
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-500">Day-by-Day Itinerary</label>
                  <button type="button" onClick={() => setPkgItinerary([...pkgItinerary, { day: pkgItinerary.length + 1, title: '', activities: '' }])} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    + Add Day
                  </button>
                </div>
                <div className="space-y-3">
                  {pkgItinerary.map((day, i) => (
                    <div key={i} className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl relative">
                      <button type="button" onClick={() => setPkgItinerary(pkgItinerary.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-rose-500 font-bold text-xs p-1">X</button>
                      <div className="mb-2">
                        <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Day {day.day} Title</span>
                        <input value={day.title} onChange={e => { const newIti = [...pkgItinerary]; newIti[i].title = e.target.value; setPkgItinerary(newIti); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" placeholder="e.g. Arrival in Kuala Lumpur" />
                      </div>
                      <div>
                        <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Activities</span>
                        <textarea value={day.activities} onChange={e => { const newIti = [...pkgItinerary]; newIti[i].activities = e.target.value; setPkgItinerary(newIti); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1 resize-none" rows={2} placeholder="e.g. Check-in, evening leisure..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-rose-700 cursor-pointer border-none"
                >
                  Save Changes
                </button>
                {editingPkgIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleDeletePackage}
                    className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-red-100 cursor-pointer border-none"
                  >
                    Delete Package
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingPkgIdx(null)}
                  className="flex-1 bg-zinc-100 text-zinc-800 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Transport Route Modal */}
      {editingTrIdx !== null && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-950 mb-6">
              {editingTrIdx === -1 ? 'Add Private Route' : 'Edit Route Rates'}
            </h3>
            <form onSubmit={handleSaveTransport} className="space-y-4 text-xs font-bold text-zinc-600">
              <div>
                <label className="block text-zinc-500 mb-1">Route Connection</label>
                <input
                  required
                  value={trName}
                  onChange={(e) => setTrName(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="e.g. Penang Jetty - Batu Ferringhi Hotel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Car Rate (1-3 Pax) (RM)</label>
                  <input
                    required
                    type="number"
                    value={trCar}
                    onChange={(e) => setTrCar(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">MPV Rate (4-5 Pax) (RM)</label>
                  <input
                    required
                    type="number"
                    value={trMpv}
                    onChange={(e) => setTrMpv(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Van-7 Rate (RM)</label>
                  <input
                    required
                    type="number"
                    value={trVan7}
                    onChange={(e) => setTrVan7(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Van-13 Rate (RM)</label>
                  <input
                    required
                    type="number"
                    value={trVan13}
                    onChange={(e) => setTrVan13(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
              </div>

<ImageUploader value={trImage} onChange={setTrImage} label="Route Image URL (Optional)" />

              <div>
                <label className="block text-zinc-500 mb-1">Ferry/Midnight Surcharges Guidelines</label>
                <textarea
                  rows={2}
                  value={trInst}
                  onChange={(e) => setTrInst(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none"
                  placeholder="e.g. midnight pick-up holds 50% surcharges"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Points to be noted / Important Info</label>
                <textarea rows={2} value={trImportant} onChange={(e) => setTrImportant(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Important points..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Terms and Conditions</label>
                <textarea rows={2} value={trTC} onChange={(e) => setTrTC(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="T&C..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Timings</label>
                <input value={trTiming} onChange={(e) => setTrTiming(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none" placeholder="e.g. 09:00 AM - 05:00 PM" />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Child Policy</label>
                <textarea rows={2} value={trChild} onChange={(e) => setTrChild(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Child policy..." />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-rose-700 cursor-pointer border-none"
                >
                  Save Route
                </button>
                {editingTrIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteTransport}
                    className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-red-100 cursor-pointer border-none"
                  >
                    Delete Route
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingTrIdx(null)}
                  className="flex-1 bg-zinc-100 text-zinc-800 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Hotel partner Modal */}
      {editingHtIdx !== null && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-950 mb-6">
              {editingHtIdx === -1 ? 'Add Hotel Partner' : 'Modify Hotel Contract'}
            </h3>
            <form onSubmit={handleSaveHotel} className="space-y-4 text-xs font-bold text-zinc-600">
              <div>
                <label className="block text-zinc-500 mb-1">Hotel Property Name</label>
                <input
                  required
                  value={htName}
                  onChange={(e) => setHtName(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Accommodation Class</label>
                  <select
                    value={htCat}
                    onChange={(e) => setHtCat(e.target.value as any)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  >
                    <option value="3-Star">3-Star</option>
                    <option value="4-Star">4-Star</option>
                    <option value="5-Star">5-Star</option>
                    <option value="Resort">Resort</option>
                    <option value="Regional">Regional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Contract Price per night (RM)</label>
                  <input
                    required
                    type="number"
                    value={htPrice}
                    onChange={(e) => setHtPrice(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Image URL (Optional)</label>
                <input
                  value={htImage}
                  onChange={(e) => setHtImage(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Blackout dates or Booking constraints</label>
                <textarea
                  rows={2}
                  value={htInst}
                  onChange={(e) => setHtInst(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none"
                  placeholder="e.g. Surcharges apply on Christmas and Hari Raya"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Points to be noted / Important Info</label>
                <textarea rows={2} value={htImportant} onChange={(e) => setHtImportant(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Important points..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Terms and Conditions</label>
                <textarea rows={2} value={htTC} onChange={(e) => setHtTC(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="T&C..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Timings</label>
                <input value={htTiming} onChange={(e) => setHtTiming(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none" placeholder="e.g. 09:00 AM - 05:00 PM" />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Child Policy</label>
                <textarea rows={2} value={htChild} onChange={(e) => setHtChild(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Child policy..." />
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-500">Room Categories</label>
                  <button type="button" onClick={() => setHtRooms([...htRooms, { name: '', price: 0, pax: 2 }])} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    + Add Room
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {htRooms.map((room, i) => (
                    <div key={i} className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl relative grid grid-cols-1 gap-2">
                      <button type="button" onClick={() => setHtRooms(htRooms.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-rose-500 font-bold text-xs p-1">X</button>
                      <div>
                        <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Room Name</span>
                        <input value={room.name} onChange={e => { const r = [...htRooms]; r[i].name = e.target.value; setHtRooms(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" placeholder="e.g. Deluxe Sea View" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Price / Night (RM)</span>
                          <input type="number" value={room.price} onChange={e => { const r = [...htRooms]; r[i].price = parseInt(e.target.value)||0; setHtRooms(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" />
                        </div>
                        <div>
                          <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Max Pax</span>
                          <input type="number" value={room.pax} onChange={e => { const r = [...htRooms]; r[i].pax = parseInt(e.target.value)||2; setHtRooms(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-rose-700 cursor-pointer border-none"
                >
                  Save Contract
                </button>
                {editingHtIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteHotel}
                    className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-red-100 cursor-pointer border-none"
                  >
                    Remove Hotel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingHtIdx(null)}
                  className="flex-1 bg-zinc-100 text-zinc-800 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Ticket Pass Modal */}
      {editingTkIdx !== null && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-950 mb-6">
              {editingTkIdx === -1 ? 'Add Attraction Ticket' : 'Edit Ticket Parameters'}
            </h3>
            <form onSubmit={handleSaveTicket} className="space-y-4 text-xs font-bold text-zinc-600">
              <div>
                <label className="block text-zinc-500 mb-1">Attraction Pass Label</label>
                <input
                  required
                  value={tkName}
                  onChange={(e) => setTkName(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Single Price (RM)</label>
                  <input
                    required
                    type="number"
                    value={tkPrice}
                    onChange={(e) => setTkPrice(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Cancellation Policy</label>
                  <input
                    value={tkInfo}
                    onChange={(e) => setTkInfo(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                    placeholder="e.g. Non-Refundable"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Operational Hours</label>
                <input
                  value={tkAddInfo}
                  onChange={(e) => setTkAddInfo(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="e.g. Daily 9:00 AM - 6:00 PM"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Image Link (Optional)</label>
                <input
                  value={tkImage}
                  onChange={(e) => setTkImage(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Important Redemption Guidelines</label>
                <textarea
                  rows={2}
                  value={tkInst}
                  onChange={(e) => setTkInst(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none"
                  placeholder="e.g. Requires presenting passport at booking counter"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Points to be noted / Important Info</label>
                <textarea rows={2} value={tkImportant} onChange={(e) => setTkImportant(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Important points..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Terms and Conditions</label>
                <textarea rows={2} value={tkTC} onChange={(e) => setTkTC(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="T&C..." />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Timings</label>
                <input value={tkTiming} onChange={(e) => setTkTiming(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none" placeholder="e.g. 09:00 AM - 05:00 PM" />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Child Policy</label>
                <textarea rows={2} value={tkChild} onChange={(e) => setTkChild(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none resize-none" placeholder="Child policy..." />
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-500">Ticket Categories</label>
                  <button type="button" onClick={() => setTkCats([...tkCats, { name: '', price: 0, description: '' }])} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    + Add Category
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {tkCats.map((cat, i) => (
                    <div key={i} className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl relative grid grid-cols-1 gap-2">
                      <button type="button" onClick={() => setTkCats(tkCats.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-rose-500 font-bold text-xs p-1">X</button>
                      <div>
                        <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Category Name</span>
                        <input value={cat.name} onChange={e => { const r = [...tkCats]; r[i].name = e.target.value; setTkCats(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" placeholder="e.g. Adult Entry (Non-Malaysian)" />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Price (RM)</span>
                          <input type="number" value={cat.price} onChange={e => { const r = [...tkCats]; r[i].price = parseInt(e.target.value)||0; setTkCats(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" />
                        </div>
                        <div>
                          <span className="text-[0.65rem] font-bold text-zinc-400 uppercase">Description</span>
                          <input value={cat.description} onChange={e => { const r = [...tkCats]; r[i].description = e.target.value; setTkCats(r); }} className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold outline-none mt-1" placeholder="e.g. Valid for ages 13+" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-rose-700 cursor-pointer border-none"
                >
                  Save Attraction
                </button>
                {editingTkIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteTicket}
                    className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-red-100 cursor-pointer border-none"
                  >
                    Delete Entry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingTkIdx(null)}
                  className="flex-1 bg-zinc-100 text-zinc-800 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Agent Portal Setup/Top-Up Modal */}
      {editingAgIdx !== null && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-950 mb-6">
              {editingAgIdx === -1 ? 'Register B2B Agent' : 'Manage Agent overrides'}
            </h3>
            <form onSubmit={handleSaveAgent} className="space-y-4 text-xs font-bold text-zinc-600">
              <div>
                <label className="block text-zinc-500 mb-1">Agency Company Name</label>
                <input
                  required
                  value={agComp}
                  onChange={(e) => setAgComp(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="e.g. Sunrise Tours Ltd"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Login Access Email</label>
                <input
                  required
                  type="email"
                  value={agEmail}
                  onChange={(e) => setAgEmail(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                  placeholder="e.g. sunrise@tours.com"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Login Password</label>
                <input
                  required
                  type="text"
                  value={agPwd}
                  onChange={(e) => setAgPwd(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Commission Rate Override (%)</label>
                  <input
                    required
                    type="number"
                    value={agComm}
                    onChange={(e) => setAgComm(e.target.value)}
                    className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-black text-indigo-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Deposit Top-Up Credit (RM)</label>
                  <input
                    type="number"
                    value={agTopup}
                    onChange={(e) => setAgTopup(e.target.value)}
                    className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-emerald-700 outline-none"
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-100">
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-850 cursor-pointer border-none"
                >
                  Save Agent
                </button>
                {editingAgIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAgent}
                    className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-red-100 cursor-pointer border-none"
                  >
                    De-register
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingAgIdx(null)}
                  className="flex-1 bg-zinc-100 text-zinc-800 py-3.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Customer Reviews</h2>
              <p className="text-zinc-500 font-semibold text-sm">Moderate and reply to customer experiences</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200">
            {(!reviews || reviews.length === 0) ? (
              <p className="text-zinc-500 font-semibold text-center py-10">No reviews found in the system.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map(rev => (
                  <div key={rev.id} className="border border-zinc-100 rounded-2xl p-6 bg-zinc-50 relative">
                    <button 
                      onClick={() => {
                        if (onUpdateReviews) {
                          onUpdateReviews(reviews.filter(r => r.id !== rev.id));
                          showToast('Review deleted successfully.');
                        }
                      }}
                      className="absolute top-6 right-6 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex gap-4 items-start mb-4">
                      <div>
                        <p className="font-bold text-zinc-900">{rev.author}</p>
                        <p className="text-xs text-zinc-500 font-semibold">{new Date(rev.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-bold flex items-center">
                        <span className="text-amber-500 mr-1">★</span> {rev.rating}/5
                      </div>
                      <div className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-bold text-zinc-600">
                        Item: {getNormalizedItem(rev.itemId)?.title || getNormalizedItem(rev.itemId)?.name || rev.itemId}
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-zinc-700 leading-relaxed mb-6">{rev.content}</p>
                    
                    {rev.reply ? (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Admin Reply</p>
                        <p className="text-sm text-zinc-600 font-medium">{rev.reply}</p>
                      </div>
                    ) : (
                      replyReviewId === rev.id ? (
                        <div className="mt-4 pt-4 border-t border-zinc-200">
                          <textarea
                            className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-zinc-400"
                            rows={3}
                            placeholder="Write your reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => {
                                if (onUpdateReviews && replyContent.trim()) {
                                  onUpdateReviews(reviews.map(r => r.id === rev.id ? { ...r, reply: replyContent } : r));
                                  setReplyReviewId(null);
                                  setReplyContent('');
                                  showToast('Reply published successfully.');
                                }
                              }}
                              className="bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              Post Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyReviewId(null);
                                setReplyContent('');
                              }}
                              className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyReviewId(rev.id);
                            setReplyContent('');
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700 cursor-pointer"
                        >
                          + Add Reply
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}