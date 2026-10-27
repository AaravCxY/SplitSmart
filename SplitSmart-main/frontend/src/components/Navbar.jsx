import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Menu, X, User as UserIcon, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar({ onMobileMenuToggle, isMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('You have been logged out.');
      navigate('/');
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:bg-emerald-700 transition">
              <span className="font-extrabold text-base tracking-tight">S²</span>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-none">
                Split<span className="text-emerald-600">Smart</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase hidden sm:block">
                Fair settlements
              </span>
            </div>
          </Link>
        </div>

        {/* Right: User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full hover:bg-slate-100 border border-slate-200 transition"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <span className="text-sm font-semibold text-slate-700 hidden sm:block max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  Your Profile
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
