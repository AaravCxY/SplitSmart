import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function SettlementsPage() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettlements() {
      try {
        setLoading(true);
        const res = await api.getAllSettlements();
        if (res.success) {
          setSettlements(res.settlements);
        }
      } catch (err) {
        console.error('Failed to load settlements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettlements();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Settlement History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Log of all completed debt repayments made or received across your groups.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading settlements...</p>
        </div>
      ) : settlements.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
          <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No completed repayments</h3>
          <p className="text-xs text-slate-500 mt-1">
            When you or other group members settle debts, the completed payment receipts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Group</th>
                  <th className="py-3.5 px-4">From (Payer)</th>
                  <th className="py-3.5 px-4">To (Recipient)</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Payment Note</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.map((s) => {
                  const isPayer = String(s.payer?._id || s.payer) === String(user?._id);
                  const isRecipient = String(s.recipient?._id || s.recipient) === String(user?._id);

                  return (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/groups/${s.group?._id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                        >
                          {s.group?.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {isPayer ? (
                          <span className="font-bold text-rose-700">You</span>
                        ) : (
                          s.payer?.name
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {isRecipient ? (
                          <span className="font-bold text-emerald-700">You</span>
                        ) : (
                          s.recipient?.name
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">
                        {s.note ? `"${s.note}"` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm text-slate-900">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg ${
                            isRecipient
                              ? 'bg-emerald-50 text-emerald-700'
                              : isPayer
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isRecipient ? '+' : isPayer ? '-' : ''}
                          {formatCurrency(s.amountMinor, s.group?.currency)}
                        </span>
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
