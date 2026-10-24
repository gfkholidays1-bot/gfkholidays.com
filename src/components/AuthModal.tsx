import React from 'react';
import { useState } from 'react';
import { X, Mail, Globe, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'customer' | 'agent';
  onLogin: (email: string, role: 'customer' | 'agent', isGoogle: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, role, onLogin }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onLogin(email, role, false);
    }
  };

  const handleGoogleAuth = () => {
    onLogin('', role, true);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-zinc-100 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 border border-zinc-100 shadow-sm p-1.5">
          <img src="/android-chrome-512x512.png" alt="GFK Holidays Logo" className="w-full h-full object-contain rounded-xl" />
        </div>
        
        <h3 className="text-3xl font-black text-zinc-950 tracking-tighter mb-2">
          {role === 'agent' ? (isRegistering ? 'Apply for B2B' : 'B2B Partner Sign In') : (isRegistering ? 'Create Account' : 'Client Sign In')}
        </h3>
        
        <p className="text-sm font-bold text-zinc-500 mb-8">
          {role === 'agent' 
            ? (isRegistering ? 'Submit your agency details. Documents will be requested upon approval.' : 'Access wholesale nett rates and reservations.')
            : (isRegistering ? 'Sign up to manage your bookings and preferences.' : 'Sign in to access your bookings and exclusive deals.')}
        </p>

        
        {role === 'agent' && isRegistering ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            // Just simulate submission
            onLogin('B2B_APPLICATION', role, false);
          }} className="space-y-4 text-xs font-bold text-zinc-500">
            <div>
              <label className="block mb-1.5">Name of the company</label>
              <input required type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5">First Name</label>
                <input required type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10" />
              </div>
              <div>
                <label className="block mb-1.5">Last Name</label>
                <input required type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10" />
              </div>
            </div>
            <div>
              <label className="block mb-1.5">Contact Number</label>
              <input required type="tel" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10" />
            </div>
            <div>
              <label className="block mb-1.5">Email Address</label>
              <input required type="email" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10" />
            </div>
            <button 
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all flex items-center justify-center border-none cursor-pointer mt-4"
            >
              Submit Application
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <p className="text-center text-zinc-400 font-medium mt-2">
              Your application will be sent directly to info@gfqld.com
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-zinc-500">
            <div>
              <label className="block mb-1.5">Email Address</label>
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10 transition-shadow"
                placeholder="hello@example.com"
              />
            </div>
            <div>
              <label className="block mb-1.5">Password</label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10 transition-shadow"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit"
              className={`w-full text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all flex items-center justify-center border-none cursor-pointer ${
                role === 'agent' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zinc-950 hover:bg-zinc-800'
              }`}
            >
              {isRegistering ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        )}

        {role !== 'agent' && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-xs font-bold">
                <span className="bg-white px-4 text-zinc-400 uppercase tracking-widest">Or continue with</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleAuth}
              type="button"
              className="w-full bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border border-zinc-200 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs font-bold text-zinc-500">
            {isRegistering ? 'Already have an account?' : 'Need an account?'}
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className={`ml-2 cursor-pointer ${role === 'agent' ? 'text-amber-600 hover:text-amber-700' : 'text-zinc-900 hover:text-zinc-700'}`}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
</div>
    </div>
  );
}
