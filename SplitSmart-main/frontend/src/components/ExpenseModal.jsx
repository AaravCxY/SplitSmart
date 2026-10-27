import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, SPLIT_METHODS } from '../utils/constants';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/formatters';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function ExpenseModal({
  isOpen,
  onClose,
  group,
  expenseToEdit = null,
  onExpenseSaved
}) {
  const { showToast } = useToast();
  const members = group?.members || [];
  const currency = group?.currency || 'INR';

  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState('Food');
  const [paidBy, setPaidBy] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splitMethod, setSplitMethod] = useState('EQUAL');

  // Selected participant IDs for EQUAL split
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Exact split shares: map of memberId -> string amount
  const [exactShares, setExactShares] = useState({});

  // Percentage split: map of memberId -> string percent
  const [percentageShares, setPercentageShares] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form state when opening modal
  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmountInput(toMajorUnits(expenseToEdit.amountMinor).toString());
      setCategory(expenseToEdit.category || 'Other');
      setPaidBy(String(expenseToEdit.paidBy?._id || expenseToEdit.paidBy));
      setExpenseDate(
        expenseToEdit.expenseDate
          ? new Date(expenseToEdit.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNotes(expenseToEdit.notes || '');
      setSplitMethod(expenseToEdit.splitMethod || 'EQUAL');

      const participantIds = expenseToEdit.participants.map((p) =>
        String(p.user?._id || p.user)
      );
      setSelectedParticipants(participantIds);

      const exactMap = {};
      const pctMap = {};
      expenseToEdit.participants.forEach((p) => {
        const uid = String(p.user?._id || p.user);
        exactMap[uid] = toMajorUnits(p.shareMinor).toString();
        if (p.percentage !== undefined) {
          pctMap[uid] = p.percentage.toString();
        }
      });
      setExactShares(exactMap);
      setPercentageShares(pctMap);
    } else {
      // Default: new expense
      setTitle('');
      setAmountInput('');
      setCategory('Food');
      setPaidBy(members[0]?._id ? String(members[0]._id) : '');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSplitMethod('EQUAL');

      // Select all members by default
      const allMemberIds = members.map((m) => String(m._id || m));
      setSelectedParticipants(allMemberIds);

      const initExact = {};
      const initPct = {};
      allMemberIds.forEach((id) => {
        initExact[id] = '';
        initPct[id] = '';
      });
      setExactShares(initExact);
      setPercentageShares(initPct);
    }
    setError('');
  }, [isOpen, expenseToEdit, group]);

  const numAmount = parseFloat(amountInput) || 0;
  const totalMinor = toMinorUnits(numAmount);

  // Toggle participant in equal split
  const toggleParticipant = (memberId) => {
    const id = String(memberId);
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length <= 1) {
        setError('At least one participant must be included in the expense');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((p) => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
    setError('');
  };

  // Select all or clear all
  const handleSelectAll = () => {
    setSelectedParticipants(members.map((m) => String(m._id || m)));
  };

  // Exact split calculations & validation
  const exactTotal = Object.entries(exactShares).reduce((sum, [uid, val]) => {
    if (selectedParticipants.includes(uid)) {
      return sum + (parseFloat(val) || 0);
    }
    return sum;
  }, 0);
  const exactRemaining = +(numAmount - exactTotal).toFixed(2);

  // Percentage split calculations & validation
  const percentageTotal = Object.entries(percentageShares).reduce((sum, [uid, val]) => {
    if (selectedParticipants.includes(uid)) {
      return sum + (parseFloat(val) || 0);
    }
    return sum;
  }, 0);
  const percentageRemaining = +(100 - percentageTotal).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Expense title is required');
      return;
    }

    if (numAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Select at least one participant');
      return;
    }

    let payloadParticipants = [];

    if (splitMethod === 'EQUAL') {
      payloadParticipants = selectedParticipants;
    } else if (splitMethod === 'EXACT') {
      if (Math.abs(exactRemaining) > 0.01) {
        setError(
          `Exact shares sum (${formatCurrency(toMinorUnits(exactTotal), currency)}) must match expense total (${formatCurrency(totalMinor, currency)}). Difference: ${exactRemaining > 0 ? '+' : ''}${exactRemaining}`
        );
        return;
      }
      payloadParticipants = selectedParticipants.map((uid) => ({
        user: uid,
        shareMinor: toMinorUnits(parseFloat(exactShares[uid]) || 0)
      }));
    } else if (splitMethod === 'PERCENTAGE') {
      if (Math.abs(percentageRemaining) > 0.01) {
        setError(`Percentages must sum to 100%. Current sum: ${percentageTotal}%.`);
        return;
      }
      payloadParticipants = selectedParticipants.map((uid) => ({
        user: uid,
        percentage: parseFloat(percentageShares[uid]) || 0
      }));
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        amountMinor: totalMinor,
        currency,
        category,
        paidBy: paidBy || members[0]._id,
        participants: payloadParticipants,
        splitMethod,
        expenseDate,
        notes: notes.trim()
      };

      let res;
      if (expenseToEdit) {
        res = await api.updateExpense(expenseToEdit._id, payload);
        showToast('Expense updated successfully!');
      } else {
        res = await api.createExpense(group._id, payload);
        showToast('Expense recorded successfully!');
      }

      onExpenseSaved(res.expense);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Description *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner, Taxi, Villa Booking"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount ({currency}) *
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
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Category, Paid By, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Paid By *
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
            />
          </div>
        </div>

        {/* Split Method Tabs */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Split Method
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition"
            >
              Select All Members
            </button>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-3">
            {SPLIT_METHODS.map((sm) => (
              <button
                key={sm.id}
                type="button"
                onClick={() => setSplitMethod(sm.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  splitMethod === sm.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sm.label}
              </button>
            ))}
          </div>

          {/* Participants Selection & Custom Split Form */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            {members.map((member) => {
              const mid = String(member._id);
              const isSelected = selectedParticipants.includes(mid);

              return (
                <div
                  key={mid}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    isSelected ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/50 border-transparent opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(mid)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-800">{member.name}</span>
                  </label>

                  {/* Equal split share preview */}
                  {splitMethod === 'EQUAL' && isSelected && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {numAmount > 0
                        ? formatCurrency(
                            Math.floor(totalMinor / selectedParticipants.length),
                            currency
                          )
                        : formatCurrency(0, currency)}
                    </span>
                  )}

                  {/* Exact split input */}
                  {splitMethod === 'EXACT' && isSelected && (
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-bold">
                        {currency === 'INR' ? '₹' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={exactShares[mid] || ''}
                        onChange={(e) =>
                          setExactShares({ ...exactShares, [mid]: e.target.value })
                        }
                        className="w-full pl-6 pr-2 py-1 text-right text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  )}

                  {/* Percentage split input */}
                  {splitMethod === 'PERCENTAGE' && isSelected && (
                    <div className="relative w-24">
                      <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-bold">
                        %
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={percentageShares[mid] || ''}
                        onChange={(e) =>
                          setPercentageShares({ ...percentageShares, [mid]: e.target.value })
                        }
                        className="w-full pl-2 pr-6 py-1 text-right text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Verification status for Exact split */}
            {splitMethod === 'EXACT' && (
              <div
                className={`flex items-center justify-between text-xs px-2 pt-2 border-t font-semibold ${
                  Math.abs(exactRemaining) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <span>Total Allocated: {formatCurrency(toMinorUnits(exactTotal), currency)}</span>
                <span>
                  {Math.abs(exactRemaining) < 0.01 ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Balanced
                    </span>
                  ) : (
                    `Remaining: ${formatCurrency(toMinorUnits(exactRemaining), currency)}`
                  )}
                </span>
              </div>
            )}

            {/* Verification status for Percentage split */}
            {splitMethod === 'PERCENTAGE' && (
              <div
                className={`flex items-center justify-between text-xs px-2 pt-2 border-t font-semibold ${
                  Math.abs(percentageRemaining) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <span>Total Allocated: {percentageTotal}%</span>
                <span>
                  {Math.abs(percentageRemaining) < 0.01 ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> 100% Complete
                    </span>
                  ) : (
                    `Remaining: ${percentageRemaining}%`
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add invoice, hotel reference, or notes"
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
            <span>{expenseToEdit ? 'Save Changes' : 'Record Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
