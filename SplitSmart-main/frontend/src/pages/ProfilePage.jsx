import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import { User, Mail, Calendar, ShieldCheck, Loader2, Check } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.getProfile();
        if (res.success) {
          setProfileData(res.user);
          setName(res.user.name);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    loadProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);

    try {
      await updateProfile(name.trim());
      showToast('Profile name updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Your Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account information and preferences.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* User Avatar Card */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-2xl uppercase shadow-md shadow-emerald-600/20">
            {name ? name.charAt(0) : 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Account</span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address (Read-only)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used as your unique SplitSmart identifier for group invitations.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>

        {/* Account Metadata */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Active Groups
            </p>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {profileData?.groupCount || 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Member Since
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {formatDate(user?.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
