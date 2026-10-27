import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/formatters';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function SettleModal({
  isOpen,
  onClose,
  group,
  suggestedTransfer = null,
  onSettlementRecorded
}) {
  const { showToast } = useToast();
  const members = group?.members || [];
  const currency = group?.currency || 'INR';

  const [payerId, setPayerId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (suggestedTransfer) {
      setPayerId(suggestedTransfer.payerId);
      setRecipientId(suggestedTransfer.recipientId);
      setAmountInput(toMajorUnits(suggestedTransfer.amountMinor).toString());
      setNote('Settled as recommended by SplitSmart');
    } else {
      setPayerId(members[0]?._id ? String(members[0]._id) : '');
      setRecipientId(members[1]?._id ? String(members[1]._id) : '');
      setAmountInput('');
      setNote('');
    }
    setError('');
  }, [isOpen, suggestedTransfer, group]);

  const numAmount = parseFloat(amountInput) || 0;
  const amountMinor = toMinorUnits(numAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!payerId || !recipientId) {
      setError('Please select both payer and recipient');
      return;
    }

    if (payerId === recipientId) {
      setError('Payer and recipient cannot be the same person');
      return;
    }

    if (numAmount <= 0) {
      setError('Settlement amount must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      // Generate a client idempotency key to prevent double submits
      const idempotencyKey = `settle_${group._id}_${payerId}_${recipientId}_${amountMinor}_${Date.now()}`;

      const res = await api.createSettlement(group._id, {
        payerId,
        recipientId,
        amountMinor,
        currency,
        note: note.trim(),
        idempotencyKey
      });

      showToast('Settlement payment recorded successfully!');
      onSettlementRecorded(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Debt Settlement">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Record a repayment made in cash, UPI, or bank transfer outside SplitSmart. This updates everyone's balances immediately.
          </p>
        </div>

        {/* Payer and Recipient */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Who Paid? (Debtor)
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white font-medium"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center pt-5 sm:pt-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Who Received? (Creditor)
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white font-medium"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Amount Paid ({currency}) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
              {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm font-bold text-emerald-800"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Paid via Google Pay / UPI"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
          />
        </div>

        {/* Footer Actions */}
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
            <span>Confirm Settlement</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
