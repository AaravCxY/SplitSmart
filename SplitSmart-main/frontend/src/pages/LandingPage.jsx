import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Split,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Users,
  Compass,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <span className="font-extrabold text-base tracking-tight">S²</span>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-none">
                Split<span className="text-emerald-600">Smart</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Fair settlements
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 hover:text-slate-900 font-semibold text-sm transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm shadow-emerald-600/20"
                >
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Shared expenses. Clear balances. Fair settlements.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none mb-6">
            Split expenses without the <span className="text-emerald-600">headaches</span>.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Whether traveling with friends, sharing an apartment, or hosting group events — SplitSmart calculates who owes what and finds the minimum payments needed to settle all debts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition shadow-lg shadow-emerald-600/25"
            >
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-base transition"
            >
              Live Demo Log In
            </Link>
          </div>
        </section>

        {/* Real Example Walkthrough */}
        <section className="py-12 bg-white border-y border-slate-200/80 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5">
                How It Works
              </h2>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                A simple 3-person vacation split
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-sm mb-3">
                  1
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Alice pays ₹900</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Villa accommodation split equally among Alice, Bob, and Carol (₹300 each).
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                  Alice is owed ₹600
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-extrabold flex items-center justify-center text-sm mb-3">
                  2
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Bob pays ₹300</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dinner for Bob and Carol only (₹150 each). Alice was not part of this meal.
                </p>
                <div className="mt-3 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md inline-block">
                  Bob owes ₹150 net
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center text-sm mb-3">
                  3
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Optimized Settlement</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instead of confusing circular payments, greedy optimization generates just 2 transfers!
                </p>
                <div className="mt-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md inline-block">
                  Bob & Carol pay Alice
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Split className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Fair Expense Splitting</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Equal, exact, or percentage splits with deterministic minor-unit rounding. Never lose a single cent or paisa.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Live Balance Calculations</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Instant net balance derivation with zero data drift. The sum of all member balances is mathematically guaranteed to equal zero.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Greedy Settlements</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Deterministic O(N log N) settlement engine matches debtors and creditors to settle entire groups with minimum transfers.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SplitSmart. Software Engineering End-Term Project.</p>
          <p className="text-slate-400">Node.js · Express · MongoDB Atlas · React · Vite · Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
