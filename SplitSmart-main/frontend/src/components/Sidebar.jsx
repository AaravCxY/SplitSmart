import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  LayoutDashboard,
  Users,
  Receipt,
  ArrowLeftRight,
  User,
  LogOut,
  Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Groups', path: '/groups', icon: Users },
  { name: 'All Expenses', path: '/expenses', icon: Receipt },
  { name: 'Settlements', path: '/settlements', icon: ArrowLeftRight },
  { name: 'Profile', path: '/profile', icon: User }
];

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('You have been logged out.');
      navigate('/');
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between py-5 px-3">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm shadow-emerald-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Optimal Greedy Engine</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Debts are automatically matched to minimize transactions in O(N log N) time.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          {navContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-64 bg-white shadow-2xl flex flex-col z-50">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
