import React, { useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Loader2, UserPlus } from 'lucide-react';

export default function AddMemberModal({ isOpen, onClose, groupId, onMemberAdded }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setError('Please provide an email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.addMember(groupId, { email: clean });
      showToast(res.message || 'Member added successfully!');
      setEmail('');
      onMemberAdded(res.group);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member to Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Member Email Address *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. friend@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
          />
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            The user must already have a registered SplitSmart account. If they haven't registered yet, ask them to sign up with this email.
          </p>
        </div>

        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Add Member</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
