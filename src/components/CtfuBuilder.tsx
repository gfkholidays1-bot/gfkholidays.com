import { useFirestoreCollection } from '../hooks/useFirestore';
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Calendar, CarFront, Check, Hotel, Info, Map, Plus, Trash2, Ticket, X } from 'lucide-react';
import { INITIAL_PACKAGES, INITIAL_TICKETS } from '../data';
import { signInWithGoogle, logOut, getFirebaseAuth, getFirebaseFirestore } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';

export default function CtfuBuilder() {
  const [settings] = useFirestoreCollection<any>('settings', []);
  const [paxAdult, setPaxAdult] = useState(2);
  const [paxChild, setPaxChild] = useState(0);
  const totalPax = paxAdult + paxChild;

  const [guestName, setGuestName] = useState('Guest');
  const [destination, setDestination] = useState('Malaysia');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<any[]>([]);
  const [itinerary, setItinerary] = useState<any[]>([]);

  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [user, setUser] = useState<any>(null);

  const msgBoxRef = useRef<HTMLDivElement>(null);

  // Default Init
  useEffect(() => {
    resetItinerary();
    const initAuthObserver = async () => {
      const { initAuth } = await import('../lib/firebase');
      initAuth((u) => setUser(u), () => setUser(null));
    };
    initAuthObserver();
  }, []);

  useEffect(() => {
    if (msgBoxRef.current) {
      msgBoxRef.current.scrollTop = msgBoxRef.current.scrollHeight;
    }
  }, [chatHistory, loadingAi]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request' || (e.message && e.message.includes('popup'))) {
        console.log('Sign in cancelled');
      } else {
        console.error(e);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error(e);
    }
  };

  const resetItinerary = () => {
    setItinerary([
      { day: 1, title: 'Arrival at Kuala Lumpur', meals: '(No Meal)', items: ['Pickup from airport', 'Transfer to hotel', 'Overnight in KL'], inclusions: [] },
      { day: 2, title: 'Half-day KL City Tour', meals: '(B)', items: ['Breakfast', 'KL City Tour', 'KL Tower Visit', 'Back to Hotel'], inclusions: [] },
      { day: 3, title: 'Batu Caves - Genting', meals: '(B)', items: ['Breakfast', 'Batu Caves Visit', 'Genting Cable Car', 'Overnight KL'], inclusions: [] },
      { day: 4, title: 'Departure', meals: '(B)', items: ['Breakfast', 'Free & Easy', 'Airport Transfer'], inclusions: [] },
    ]);
  };

  const saveToFirestore = async () => {
    if (!user) {
      alert("Please login first to save");
      return;
    }
    try {
      const db = getFirebaseFirestore();
      await addDoc(collection(db, 'ctfu_packages'), {
        uid: user.uid,
        guestName,
        destination,
        travelDate,
        paxAdult,
        paxChild,
        cart,
        itinerary,
        createdAt: serverTimestamp()
      });
      
      try {
        const token = settings?.find(s => s.id === 'global')?.bookingEmailToken || settings?.find(s => s.id === 'global')?.accountsEmailToken;
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            to: user.email,
            subject: `Custom Tour Request Received: ${destination}`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2>We have received your custom tour request!</h2>
              <p>Dear ${guestName},</p>
              <p>We will contact you within 30 minutes regarding your custom package to <strong>${destination}</strong> for ${travelDate}.</p>
              <p>Our team is reviewing your itinerary and will get back to you with the final quotation.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #777;">GFK Holidays & Travel Operations Management Suite</p>
            </div>`
          })
        });
      } catch (err) {
        console.error("Failed to trigger email API", err);
      }

      alert("Request received successfully! We will contact you in 30 minutes.");
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    }
  };

  const handleEmbeddedAI = async () => {
    if (!aiInput.trim()) return;
    const userText = aiInput.trim();
    setAiInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userText }]);
    setLoadingAi(true);

    try {
      const systemInstruction = `
      You are a highly intelligent Senior Travel Architect for GFK Holidays.
      Your goal is to curate the perfect travel experience.
      Output Format: Return ONLY JSON.
      {
        "reply": "Text response to user.",
        "actions": [
          // { "type": "add_transport", "index": 0, "vehicle": "van13" }
          // { "type": "build_itinerary", "days": [...] }
          // { "type": "add_ticket", "name_keyword": "kl tower" }
        ]
      }
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: systemInstruction + "\\n\\nCURRENT STATE:\\nItinerary: " + JSON.stringify(itinerary) + "\\nCart: " + JSON.stringify(cart) },
            ...chatHistory,
            { role: 'user', content: userText }
          ]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      let aiResp = JSON.parse(data.reply);
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiResp.reply }]);

      if (aiResp.actions) {
        // Implement logic to apply actions (add transport, edit itinerary)
        console.log("Actions:", aiResp.actions);
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Error: " + e.message }]);
    } finally {
      setLoadingAi(false);
    }
  };

  // Add Item states
  const [tRoute, setTRoute] = useState('');
  const [tVehicle, setTVehicle] = useState('car');
  const [tDay, setTDay] = useState('');

  const [hName, setHName] = useState('');
  const [hNights, setHNights] = useState(1);
  const [hRooms, setHRooms] = useState(1);
  const [hDay, setHDay] = useState('');

  const [tkName, setTkName] = useState('');
  const [tkQty, setTkQty] = useState(2);
  const [tkDay, setTkDay] = useState('');

  const grandTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-6 rounded-t-xl border-b border-gray-700">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-pink-500">
              CTFU BUILDER
            </h1>
            <p className="text-gray-400 text-sm">Standalone Module with Firebase Auth</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{user.displayName}</span>
                <button onClick={handleLogout} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/30">Logout</button>
                <button onClick={saveToFirestore} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md">Save Package</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md">Sign in with Google</button>
            )}
            
            <div className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-lg border border-gray-600">
              <label className="text-xs font-bold text-gray-400">Adults:</label>
              <input type="number" value={paxAdult} onChange={e => setPaxAdult(parseInt(e.target.value)||0)} className="w-12 bg-gray-800 border border-gray-600 rounded text-center text-sm p-1" />
              <label className="text-xs font-bold text-gray-400 ml-2">Child:</label>
              <input type="number" value={paxChild} onChange={e => setPaxChild(parseInt(e.target.value)||0)} className="w-12 bg-gray-800 border border-gray-600 rounded text-center text-sm p-1" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row bg-gray-800 rounded-b-xl overflow-hidden shadow-2xl border border-gray-700">
          
          {/* LEFT PANEL */}
          <div className="w-full lg:w-1/2 p-6 space-y-6 border-r border-gray-700 h-[80vh] overflow-y-auto">
            
            {/* AI Architect */}
            <div className="bg-gray-900 border-2 border-purple-500 rounded-xl p-5 relative overflow-hidden">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Bot className="text-teal-400 w-6 h-6" /> AI Architect</h3>
              
              <div ref={msgBoxRef} className="bg-gray-800 p-4 rounded-lg h-60 overflow-y-auto border border-gray-700 mb-4 space-y-3">
                <div className="text-gray-300 text-sm">Hello! I'm your Senior Travel Consultant (with Search Grounding). How can I help build your trip?</div>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-pink-400 text-right' : 'text-gray-200 text-left'}`}>
                    <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
                  </div>
                ))}
                {loadingAi && <div className="text-sm text-teal-400 animate-pulse">AI is thinking...</div>}
              </div>
              
              <div className="flex gap-2">
                <textarea 
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEmbeddedAI(); } }}
                  placeholder="Describe your trip details..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-teal-400 focus:outline-none resize-none"
                  rows={2}
                />
                <button onClick={handleEmbeddedAI} className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 rounded-lg flex items-center justify-center hover:scale-105 transition"><Check className="w-5 h-5 text-white" /></button>
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 text-gray-200">Trip Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Guest Name</label>
                  <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Destination</label>
                  <input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white" />
                </div>
              </div>
            </div>
            
            {/* Itinerary */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 text-gray-200 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-400" /> Itinerary Settings</h3>
              
              <div className="space-y-4">
                {itinerary.map((day, idx) => (
                  <div key={idx} className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-pink-400">Day {day.day}</span>
                      <button onClick={() => {
                        const newIt = [...itinerary];
                        newIt.splice(idx, 1);
                        newIt.forEach((d, i) => d.day = i + 1);
                        setItinerary(newIt);
                      }} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                    </div>
                    <input type="text" value={day.title} onChange={e => {
                      const newIt = [...itinerary];
                      newIt[idx].title = e.target.value;
                      setItinerary(newIt);
                    }} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm mb-3" />
                    
                    <div className="space-y-2 mb-3">
                      {day.items.map((item: string, iIdx: number) => (
                        <div key={iIdx} className="flex gap-2">
                          <input type="text" value={item} onChange={e => {
                            const newIt = [...itinerary];
                            newIt[idx].items[iIdx] = e.target.value;
                            setItinerary(newIt);
                          }} className="flex-1 bg-gray-900 border border-gray-700 rounded p-1.5 text-sm" />
                          <button onClick={() => {
                            const newIt = [...itinerary];
                            newIt[idx].items.splice(iIdx, 1);
                            setItinerary(newIt);
                          }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => {
                      const newIt = [...itinerary];
                      newIt[idx].items.push("New Activity");
                      setItinerary(newIt);
                    }} className="text-teal-400 text-xs font-bold flex items-center gap-1">+ Add Activity</button>
                  </div>
                ))}
                
                <button onClick={() => {
                  setItinerary([...itinerary, { day: itinerary.length + 1, title: 'Free & Easy', meals: '(B)', items: ['Free time'], inclusions: [] }]);
                }} className="w-full bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg p-3 font-bold hover:bg-teal-500/20 transition">+ Add Day</button>
              </div>
            </div>

            {/* Quick Add Custom Item to Cart */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 text-gray-200">Add to Cart</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Item Name" id="cItemName" className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm" />
                <input type="number" placeholder="Price" id="cItemPrice" className="w-24 bg-gray-800 border border-gray-700 rounded p-2 text-sm" />
                <button onClick={() => {
                  const name = (document.getElementById('cItemName') as HTMLInputElement).value;
                  const price = parseFloat((document.getElementById('cItemPrice') as HTMLInputElement).value);
                  if (name && price) {
                    setCart([...cart, { type: 'custom', desc: name, detail: 'Custom', qty: 1, price }]);
                  }
                }} className="bg-teal-500 text-white px-4 rounded font-bold">+</button>
              </div>
            </div>

          </div>
          
          {/* RIGHT PANEL - PREVIEW */}
          <div className="w-full lg:w-1/2 bg-white text-gray-900 h-[80vh] overflow-y-auto print:h-auto">
            <div className="p-8">
              {/* Header */}
              <div className="border-b-2 border-teal-600 pb-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl font-black text-teal-600 uppercase">Package Quotation</h2>
                  <div className="flex items-center gap-2">
                    <img src="/android-chrome-512x512.png" alt="GFK Holidays Logo" className="w-10 h-10 object-contain" />
                    <p className="text-sm text-gray-700 font-bold">GFK Holidays</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 uppercase font-bold">Guest / Agency</span>
                    <span className="font-bold">{guestName}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 uppercase font-bold">Destination</span>
                    <span className="font-bold">{destination}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 uppercase font-bold">Travel Date</span>
                    <span className="font-bold">{travelDate}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 uppercase font-bold">Total Pax</span>
                    <span className="font-bold">{paxAdult} Adults, {paxChild} Children</span>
                  </div>
                </div>
              </div>

              {/* Cart */}
              <div className="mb-8">
                <h3 className="text-pink-600 font-bold uppercase tracking-wider text-sm border-b border-pink-200 pb-2 mb-4">Package Inclusions</h3>
                {cart.length === 0 ? (
                  <div className="text-center text-gray-400 italic py-8 border border-dashed border-gray-300 rounded-lg">Cart is empty. Add items from the left panel.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-teal-50 text-teal-900">
                        <th className="p-2 text-left font-bold border-b border-teal-200">Description</th>
                        <th className="p-2 text-right font-bold border-b border-teal-200">Price (RM)</th>
                        <th className="p-2 w-10 border-b border-teal-200 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="p-2">
                            <strong>{item.desc}</strong>
                            <div className="text-xs text-gray-500">{item.detail}</div>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-teal-600">{item.price.toLocaleString()}</td>
                          <td className="p-2 text-right print:hidden">
                            <button onClick={() => {
                              const newCart = [...cart];
                              newCart.splice(idx, 1);
                              setCart(newCart);
                            }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
                {/* Total */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center text-gray-500 mb-2">
                    <span>Subtotal</span>
                    <span>RM {grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-2xl font-black border-t border-dashed border-gray-300 pt-4 mt-2">
                    <span>Total Package</span>
                    <span className="text-teal-600">RM {grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-right text-sm text-pink-600 mt-1 font-mono font-bold">
                    (Approx RM {(grandTotal / (totalPax || 1)).toFixed(2)} per pax)
                  </div>
                </div>
              </div>

              {/* Itinerary Preview */}
              <div>
                <h3 className="text-teal-600 font-bold uppercase tracking-wider text-sm border-b border-teal-200 pb-2 mb-4">Travel Itinerary</h3>
                <div className="space-y-6">
                  {itinerary.map((day, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-gray-200 pb-2">
                      <div className="absolute w-3 h-3 rounded-full bg-teal-500 -left-[7px] top-1.5 border-2 border-white" />
                      <div className="flex justify-between items-baseline mb-2">
                        <h4 className="font-bold text-gray-900">Day {day.day}: {day.title}</h4>
                        <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">{day.meals}</span>
                      </div>
                      <ul className="space-y-1 mt-2">
                        {day.items.map((item: string, iIdx: number) => (
                          <li key={iIdx} className="text-sm text-gray-600 relative pl-4">
                            <span className="absolute left-0 top-0.5 text-pink-400 text-[10px]">➤</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                      {day.inclusions && day.inclusions.length > 0 && (
                        <div className="mt-3 bg-teal-50 p-3 rounded text-sm border-l-4 border-teal-500">
                          <strong className="block text-teal-800 mb-1 text-xs uppercase">Inclusions</strong>
                          <ul className="list-disc pl-4 text-teal-900">
                            {day.inclusions.map((inc: string, iIdx: number) => <li key={iIdx}>{inc}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
