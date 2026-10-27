import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import SummaryCard from '../components/SummaryCard';
import CategoryBadge from '../components/CategoryBadge';
import CategoryChart from '../components/CategoryChart';
import CreateGroupModal from '../components/CreateGroupModal';
import ExpenseModal from '../components/ExpenseModal';
import {
  TrendingDown,
  TrendingUp,
  Users,
  ArrowLeftRight,
  Plus,
  ArrowRight,
  Receipt,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroupForExpense, setSelectedGroupForExpense] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, groupsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getGroups()
      ]);

      if (dashRes.success) {
        setData(dashRes.summary);
      }
      if (groupsRes.success) {
        setUserGroups(groupsRes.groups);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleOpenAddExpense = (group = null) => {
    if (group) {
      setSelectedGroupForExpense(group);
    } else if (userGroups.length > 0) {
      setSelectedGroupForExpense(userGroups[0]);
    }
    setAddExpenseOpen(true);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const summary = data || {
    totalOwedMinor: 0,
    totalReceivableMinor: 0,
    netBalanceMinor: 0,
    activeGroupsCount: 0,
    pendingSettlementsCount: 0,
    groups: [],
    recentExpenses: [],
    recentSettlements: [],
    categorySpending: []
  };

  const hasGroups = summary.groups.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header with Greetings & Primary CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hi, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is your financial balance across all shared groups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>New Group</span>
          </button>

          {hasGroups && (
            <button
              onClick={() => handleOpenAddExpense()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm shadow-emerald-600/20"
            >
              <Receipt className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="You Are Owed"
          value={formatCurrency(summary.totalReceivableMinor)}
          subtitle="From all your groups"
          icon={TrendingUp}
          variant="positive"
        />

        <SummaryCard
          title="You Owe"
          value={formatCurrency(summary.totalOwedMinor)}
          subtitle="Outstanding debts"
          icon={TrendingDown}
          variant={summary.totalOwedMinor > 0 ? 'negative' : 'default'}
        />

        <SummaryCard
          title="Active Groups"
          value={summary.activeGroupsCount.toString()}
          subtitle="Trips, rooms, events"
          icon={Users}
          variant="default"
        />

        <SummaryCard
          title="Settlement Actions"
          value={summary.pendingSettlementsCount.toString()}
          subtitle="Suggested repayments"
          icon={ArrowLeftRight}
          variant={summary.pendingSettlementsCount > 0 ? 'info' : 'default'}
        />
      </div>

      {/* Empty State when user has no groups */}
      {!hasGroups && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Groups Yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Create your first group to start recording shared expenses with friends, roommates, or travel buddies.
          </p>
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Group</span>
          </button>
        </div>
      )}

      {/* Main Content Grid: Groups Overview & Category Chart */}
      {hasGroups && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Group Summaries */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Your Groups</h2>
              <Link
                to="/groups"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.groups.map((group) => {
                const isPositive = group.myNetBalanceMinor > 0;
                const isNegative = group.myNetBalanceMinor < 0;

                return (
                  <Link
                    key={group.groupId}
                    to={`/groups/${group.groupId}`}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {group.type}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {group.memberCount} members
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {group.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Your balance</span>
                      <span
                        className={`text-sm font-bold ${
                          isPositive
                            ? 'text-emerald-600'
                            : isNegative
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(group.myNetBalanceMinor, group.currency)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right 1 Col: Spending by Category Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Spending by Category</h2>
            <div className="flex-1">
              <CategoryChart data={summary.categorySpending} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid: Recent Expenses & Recent Settlements */}
      {hasGroups && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Expenses</h2>
              <Link
                to="/expenses"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                All expenses <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {summary.recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.recentExpenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryBadge category={expense.category} size="xs" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{expense.title}</p>
                        <p className="text-xs text-slate-400">
                          Paid by {expense.paidBy?.name?.split(' ')[0]} · {formatDate(expense.expenseDate)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(expense.amountMinor, expense.group?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Settlements */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Settlements</h2>
              <Link
                to="/settlements"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                All settlements <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {summary.recentSettlements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No repayments recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.recentSettlements.map((settlement) => (
                  <div
                    key={settlement._id}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {settlement.payer?.name?.split(' ')[0]} paid{' '}
                        {settlement.recipient?.name?.split(' ')[0]}
                      </p>
                      <p className="text-xs text-slate-400">
                        {settlement.group?.name} · {formatDate(settlement.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {formatCurrency(settlement.amountMinor, settlement.group?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onGroupCreated={() => fetchDashboard()}
      />

      {selectedGroupForExpense && (
        <ExpenseModal
          isOpen={addExpenseOpen}
          onClose={() => {
            setAddExpenseOpen(false);
            setSelectedGroupForExpense(null);
          }}
          group={selectedGroupForExpense}
          onExpenseSaved={() => fetchDashboard()}
        />
      )}
    </div>
  );
}
