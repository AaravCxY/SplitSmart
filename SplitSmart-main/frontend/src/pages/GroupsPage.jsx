import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import CreateGroupModal from '../components/CreateGroupModal';
import {
  Users,
  Plus,
  Search,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getGroups();
      if (res.success) {
        setGroups(res.groups);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Groups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your shared trips, household expenses, and event splits.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups by name..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-sm bg-white"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-xl mx-auto">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {search ? 'No matching groups found' : 'No groups yet'}
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            {search
              ? 'Try adjusting your search query.'
              : 'Create a group to start tracking expenses with your friends.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Link
              key={group._id}
              to={`/groups/${group._id}`}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                    {group.type}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {group.currency}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  {group.name}
                </h3>

                {group.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {group.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {group.members?.length || 0} members
                </span>

                <span className="font-bold text-slate-800">
                  {formatCurrency(group.totalSpendingMinor || 0, group.currency)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGroupCreated={(newGroup) => {
          setGroups([newGroup, ...groups]);
        }}
      />
    </div>
  );
}
