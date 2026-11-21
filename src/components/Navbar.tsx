import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';

interface NavbarProps {
  activeView: 'home' | 'admin';
  onNavigateView: (view: 'home' | 'admin', sectionId?: string) => void;
}

export function Navbar({ activeView, onNavigateView }: NavbarProps) {
  const { user, isAdmin, signingIn, signInWithGoogle, signOut } = useFirebase();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = (sectionId: string) => {
    setMobileOpen(false);
    onNavigateView('home', sectionId);
  };

  const handleAdminClick = () => {
    setMobileOpen(false);
    onNavigateView('admin');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateView('home', 'top');
          }}
          className="font-display text-2xl font-extrabold tracking-tight text-white hover:text-orange-400 transition-colors whitespace-nowrap shrink-0"
        >
          TXP Esports
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
          <a
            href="#tournaments"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('tournaments');
            }}
            className={`hover:text-white hover:underline underline-offset-8 decoration-orange-500 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'home' ? '' : 'text-zinc-400'
            }`}
          >
            Tournaments
          </a>
          <a
            href="#wallet"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('wallet');
            }}
            className="hover:text-white hover:underline underline-offset-8 decoration-orange-500 transition-colors whitespace-nowrap shrink-0"
          >
            Wallet
          </a>
          <a
            href="#room-access"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('room-access');
            }}
            className="hover:text-white hover:underline underline-offset-8 decoration-orange-500 transition-colors whitespace-nowrap shrink-0"
          >
            Room Access
          </a>
          <a
            href="#results"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('results');
            }}
            className="hover:text-white hover:underline underline-offset-8 decoration-orange-500 transition-colors whitespace-nowrap shrink-0"
          >
            Results
          </a>
          {isAdmin && (
            <button
              type="button"
              onClick={handleAdminClick}
              className={`hover:text-orange-400 hover:underline underline-offset-8 decoration-orange-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'admin' ? 'text-orange-400 underline' : 'text-zinc-200'
              }`}
            >
              Admin Panel
            </button>
          )}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-zinc-100 bg-[#14151A] hover:bg-[#1C1D24] border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={user.email || 'Signed in player'}
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-zinc-950 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Signing In...' : 'Player Sign In'}
            </button>
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-zinc-200 hover:text-white rounded-lg border border-white/10"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0D0E12] border-b border-white/10 px-6 py-4 space-y-3">
          <div className="flex flex-col gap-3 text-sm font-medium text-zinc-200">
            <button
              type="button"
              onClick={() => handleLinkClick('tournaments')}
              className="text-left py-1.5 hover:text-orange-400"
            >
              Tournaments
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('wallet')}
              className="text-left py-1.5 hover:text-orange-400"
            >
              Wallet
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('room-access')}
              className="text-left py-1.5 hover:text-orange-400"
            >
              Room Access
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('results')}
              className="text-left py-1.5 hover:text-orange-400"
            >
              Results
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleAdminClick}
                className="text-left py-1.5 text-orange-400 font-semibold"
              >
                Admin Panel
              </button>
            )}
          </div>
          <div className="pt-3 border-t border-white/10">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signOut();
                }}
                className="w-full py-2.5 text-xs font-semibold text-zinc-100 bg-[#14151A] border border-white/15 rounded-lg"
              >
                Sign Out ({user.displayName || user.email})
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => {
                  setMobileOpen(false);
                  void signInWithGoogle();
                }}
                className="w-full py-2.5 text-xs font-semibold text-zinc-950 bg-orange-500 rounded-lg"
              >
                {signingIn ? 'Signing In...' : 'Player Sign In'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
