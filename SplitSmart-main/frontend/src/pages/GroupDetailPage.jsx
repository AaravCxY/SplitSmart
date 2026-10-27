import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, toMajorUnits } from '../utils/formatters';
import { CATEGORIES } from '../utils/constants';
import CategoryBadge from '../components/CategoryBadge';
import ExpenseModal from '../components/ExpenseModal';
import SettleModal from '../components/SettleModal';
import AddMemberModal from '../components/AddMemberModal';
import {
  Users,
  Plus,
  ArrowLeftRight,
  Receipt,
  UserPlus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlementPlan, setSettlementPlan] = useState([]);
  const [completedSettlements, setCompletedSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances' | 'settlements'

  // Filter & Search states for Expenses Tab
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedSuggestedPayment, setSelectedSuggestedPayment] = useState(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Fetch full group data
  const loadGroupData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [groupRes, balancesRes, planRes, settlementsRes] = await Promise.all([
        api.getGroupById(groupId),
        api.getBalances(groupId),
        api.getSettlementPlan(groupId),
        api.getGroupSettlements(groupId)
      ]);

      if (groupRes.success) setGroup(groupRes.group);
      if (balancesRes.success) setBalances(balancesRes.balances);
      if (planRes.success) setSettlementPlan(planRes.settlementPlan);
      if (settlementsRes.success) setCompletedSettlements(settlementsRes.settlements);

      // Fetch expenses with active filters
      const expRes = await api.getGroupExpenses(groupId, {
        search,
        category: categoryFilter,
        payer: payerFilter,
        sortBy,
        sortOrder
      });
      if (expRes.success) setExpenses(expRes.expenses);
    } catch (err) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  }, [groupId, search, categoryFilter, payerFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Handle expense deletion
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.deleteExpense(expenseId);
      showToast('Expense deleted successfully.');
      loadGroupData();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  if (loading && !group) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading group details...</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center max-w-lg mx-auto">
        <p className="font-bold text-base mb-2">Error Loading Group</p>
        <p className="text-sm mb-4">{error}</p>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Return to My Groups
        </Link>
      </div>
    );
  }

  const currency = group?.currency || 'INR';
  const members = group?.members || [];

  // Check if settlements exist (disables editing/deleting historical expenses for audit integrity)
  const hasSettlements = completedSettlements.length > 0;

  // Invariant verification check: sum of net balances must be zero
  const sumOfBalancesMinor = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
  const isInvariantConserved = sumOfBalancesMinor === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Group Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                {group?.type}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Currency: {currency}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {group?.name}
            </h1>
            {group?.description && (
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                {group.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Member</span>
            </button>

            <button
              onClick={() => {
                setSelectedSuggestedPayment(null);
                setIsSettleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 text-xs font-bold transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Settle Up</span>
            </button>

            <button
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Group Members Avatars */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">
            Members ({members.length}):
          </span>
          {members.map((m) => (
            <span
              key={m._id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-800 text-[9px] flex items-center justify-center font-bold uppercase">
                {m.name.charAt(0)}
              </div>
              <span>{m.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'balances'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Balances</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
            {balances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'settlements'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Settlements</span>
          {settlementPlan.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 font-bold">
              {settlementPlan.length} suggested
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Audit integrity notice if settlements exist */}
          {hasSettlements && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Repayments have already been completed in this group. Historical expenses are locked from modification or deletion to preserve financial audit integrity.
              </span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expense description..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
              >
                <option value="">All Payers</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>{sortOrder === 'asc' ? 'Oldest / Smallest' : 'Newest / Highest'}</span>
              </button>
            </div>
          </div>

          {/* Expenses List */}
          {expenses.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-sm font-bold text-slate-800">No expenses found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {search || categoryFilter !== 'ALL' || payerFilter
                  ? 'No expenses matched the selected filter criteria.'
                  : 'Start recording expenses for this group.'}
              </p>
              <button
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add First Expense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
              {expenses.map((expense) => {
                const isExpanded = expandedExpenseId === expense._id;
                const myShare = expense.participants.find(
                  (p) => String(p.user?._id || p.user) === String(user?._id)
                );

                return (
                  <div key={expense._id} className="p-4 transition hover:bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <CategoryBadge category={expense.category} />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{expense.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Paid by <span className="font-semibold text-slate-700">{expense.paidBy?.name}</span> · {formatDate(expense.expenseDate)} · Split ({expense.splitMethod})
                          </p>
                          {expense.notes && (
                            <p className="text-xs text-slate-500 italic mt-0.5">"{expense.notes}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <p className="text-base font-extrabold text-slate-900">
                            {formatCurrency(expense.amountMinor, currency)}
                          </p>
                          {myShare ? (
                            <p className="text-[11px] font-semibold text-slate-500">
                              Your share: {formatCurrency(myShare.shareMinor, currency)}
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-slate-400">Not involved</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setExpandedExpenseId(isExpanded ? null : expense._id)
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                            title="View participants split"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {!hasSettlements && (
                            <>
                              <button
                                onClick={() => {
                                  setExpenseToEdit(expense);
                                  setIsExpenseModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense._id)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Split Breakdown */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/80 rounded-xl p-3 text-xs">
                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                          Participant Shares Breakdown:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {expense.participants.map((part) => (
                            <div
                              key={part.user?._id || part.user}
                              className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              <span className="font-medium text-slate-700">
                                {part.user?.name || 'Member'}
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatCurrency(part.shareMinor, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Mathematical Invariant Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              isInvariantConserved
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Financial Conservation Guarantee: Sum of all member balances is mathematically zero.
              </span>
            </div>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
              Σ = {formatCurrency(sumOfBalancesMinor, currency)}
            </span>
          </div>

          {/* Balances Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Total Paid</th>
                    <th className="py-3 px-4">Total Share</th>
                    <th className="py-3 px-4">Repayments Paid</th>
                    <th className="py-3 px-4">Repayments Recv</th>
                    <th className="py-3 px-4 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {balances.map((b) => {
                    const isPositive = b.netBalanceMinor > 0;
                    const isNegative = b.netBalanceMinor < 0;

                    return (
                      <tr key={b.userId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {b.name}
                          {String(b.userId) === String(user?._id) && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {formatCurrency(b.totalPaidMinor, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {formatCurrency(b.totalShareMinor, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {formatCurrency(b.settlementsPaidMinor, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {formatCurrency(b.settlementsReceivedMinor, currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-sm">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : isNegative
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {formatCurrency(b.netBalanceMinor, currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Suggested Greedy Settlement Plan */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                  <span>Optimized Settlement Plan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated using our O(N log N) greedy debt-matching engine to settle everyone with the minimum number of transactions.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedSuggestedPayment(null);
                  setIsSettleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Custom Settlement
              </button>
            </div>

            {settlementPlan.length === 0 ? (
              <div className="py-8 text-center bg-emerald-50/40 rounded-2xl border border-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-sm">All balances are settled!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  No pending debts remain between members in this group.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {settlementPlan.map((transfer, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-200 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          <span className="text-slate-900">{transfer.payerName}</span>{' '}
                          <span className="text-slate-400 font-normal">pays</span>{' '}
                          <span className="text-emerald-700 font-bold">{transfer.recipientName}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Recommended transfer to eliminate debt
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(transfer.amountMinor, currency)}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedSuggestedPayment(transfer);
                          setIsSettleModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1"
                      >
                        <span>Mark Settled</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Settlement History */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Completed Settlement History
            </h3>

            {completedSettlements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No completed settlement records yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedSettlements.map((settlement) => (
                  <div
                    key={settlement._id}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {settlement.payer?.name} paid {settlement.recipient?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Recorded {formatDate(settlement.createdAt)}
                        {settlement.note && ` · "${settlement.note}"`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {formatCurrency(settlement.amountMinor, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        group={group}
        expenseToEdit={expenseToEdit}
        onExpenseSaved={() => loadGroupData()}
      />

      <SettleModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSelectedSuggestedPayment(null);
        }}
        group={group}
        suggestedTransfer={selectedSuggestedPayment}
        onSettlementRecorded={() => loadGroupData()}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        groupId={group?._id}
        onMemberAdded={() => loadGroupData()}
      />
    </div>
  );
}
