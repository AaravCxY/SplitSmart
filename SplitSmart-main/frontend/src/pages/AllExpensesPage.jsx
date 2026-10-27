import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CATEGORIES } from '../utils/constants';
import CategoryBadge from '../components/CategoryBadge';
import {
  Receipt,
  Search,
  Filter,
  ArrowUpDown,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';

export default function AllExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search,
        category,
        sortBy,
        sortOrder
      };
      if (selectedGroupId) {
        params.groupId = selectedGroupId;
      }

      const [expRes, groupsRes] = await Promise.all([
        api.getAllExpenses(params),
        api.getGroups()
      ]);

      if (expRes.success) setExpenses(expRes.expenses);
      if (groupsRes.success) setGroups(groupsRes.groups);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, selectedGroupId, sortBy, sortOrder]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          All Expenses
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete global ledger of all shared transactions across your groups.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by expense title..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Group Filter */}
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'asc' ? 'Oldest / Lowest' : 'Newest / Highest'}</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading transactions...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No expenses recorded</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search || category !== 'ALL' || selectedGroupId
              ? 'No expenses matched your filter criteria.'
              : 'Record expenses inside any of your groups to see them here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Expense Title</th>
                  <th className="py-3.5 px-4">Group</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Your Share</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.map((expense) => {
                  const myShare = expense.participants?.find(
                    (p) => String(p.user?._id || p.user) === String(user?._id)
                  );
                  const isPayer = String(expense.paidBy?._id || expense.paidBy) === String(user?._id);

                  return (
                    <tr key={expense._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {expense.title}
                        {expense.notes && (
                          <p className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                            {expense.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/groups/${expense.group?._id}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {expense.group?.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <CategoryBadge category={expense.category} size="xs" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {isPayer ? (
                          <span className="font-bold text-emerald-700">You</span>
                        ) : (
                          expense.paidBy?.name || 'Member'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {myShare
                          ? formatCurrency(myShare.shareMinor, expense.group?.currency)
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm text-slate-900">
                        {formatCurrency(expense.amountMinor, expense.group?.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
