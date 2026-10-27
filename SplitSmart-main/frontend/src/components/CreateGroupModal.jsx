import React, { useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { GROUP_TYPES, CURRENCIES } from '../utils/constants';
import { Loader2, Plus, X } from 'lucide-react';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Trip');
  const [currency, setCurrency] = useState('INR');
  const [emailInput, setEmailInput] = useState('');
  const [initialEmails, setInitialEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddEmail = (e) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean) return;
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError('Please enter a valid email address');
      return;
    }
    if (initialEmails.includes(clean)) {
      setError('Email already added');
      return;
    }
    setInitialEmails([...initialEmails, clean]);
    setEmailInput('');
    setError('');
  };

  const handleRemoveEmail = (target) => {
    setInitialEmails(initialEmails.filter((e) => e !== target));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        type,
        currency,
        initialMemberEmails: initialEmails
      });

      showToast(`Group "${res.group.name}" created!`);
      if (res.notice) {
        showToast(res.notice, 'info');
      }

      // Reset
      setName('');
      setDescription('');
      setType('Trip');
      setCurrency('INR');
      setInitialEmails([]);
      setEmailInput('');

      onGroupCreated(res.group);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Group Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip 2026, Apartment 4B"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Group Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
            >
              {GROUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Base Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} ({c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : '£'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group for?"
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Add Members by Email (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
            />
            <button
              type="button"
              onClick={handleAddEmail}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {initialEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {initialEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="hover:text-emerald-950 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            You will automatically be added as the group creator.
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
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Create Group</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
