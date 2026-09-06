import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  Store, 
  Share2, 
  Wrench, 
  ShoppingBag,
  MoreVertical,
  X,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { 
  UserProfile, 
  UserRole, 
  UserAccountStatus 
} from '../../types';
import { 
  getAllUsersFromFirestore, 
  subscribeToAllUsersInFirestore,
  updateUserRoleAndStatusInFirestore, 
  deleteUserFromFirestore 
} from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';

export const AdminUserManagement: React.FC = () => {
  const { userProfile: currentAdminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit User Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [editStatus, setEditStatus] = useState<UserAccountStatus>('active');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Feedback Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isOwnerEmail = (email?: string) => {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return lower === 'nexoviratech@gmail.com' || lower === 'nexovirasupport@gmail.com';
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const fetched = await getAllUsersFromFirestore();
      setUsers(fetched);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Could not load users from Firestore.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllUsersInFirestore(
      (liveUsers) => {
        setUsers(liveUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Real-time users error:', err);
        setLoading(false);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    await loadUsers();
  };

  const openEditModal = (target: UserProfile) => {
    setSelectedUser(target);
    setEditRole(target.role || 'customer');
    setEditStatus(target.accountStatus || 'active');
    setEditNotes(target.internalNotes || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    setFeedback(null);

    try {
      await updateUserRoleAndStatusInFirestore(
        selectedUser.uid,
        {
          role: editRole,
          accountStatus: editStatus,
          internalNotes: editNotes.trim() || undefined
        },
        currentAdminProfile?.role
      );

      setFeedback({
        type: 'success',
        message: `Account "${selectedUser.displayName || selectedUser.email}" updated to ${editRole.toUpperCase()} (${editStatus.toUpperCase()}).`
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Update user error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update user account.'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickApprove = async (target: UserProfile) => {
    setFeedback(null);
    try {
      await updateUserRoleAndStatusInFirestore(
        target.uid, 
        { accountStatus: 'active' }, 
        currentAdminProfile?.role
      );
      setFeedback({
        type: 'success',
        message: `Account for "${target.displayName || target.email}" has been Approved and Activated.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Approval action failed.'
      });
    }
  };

  const handleQuickSuspendToggle = async (target: UserProfile) => {
    setFeedback(null);
    const newStatus: UserAccountStatus = target.accountStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserRoleAndStatusInFirestore(
        target.uid, 
        { accountStatus: newStatus }, 
        currentAdminProfile?.role
      );
      setFeedback({
        type: 'success',
        message: `Account for "${target.displayName || target.email}" status changed to ${newStatus.toUpperCase()}.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Status toggle failed.'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setFeedback(null);

    try {
      await deleteUserFromFirestore(userToDelete.uid);
      setFeedback({
        type: 'success',
        message: `User record for "${userToDelete.displayName || userToDelete.email}" was removed.`
      });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete user.'
      });
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q)) ||
      (u.storeName && u.storeName.toLowerCase().includes(q))
    );

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (u.accountStatus || 'active') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-red-500/20 to-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 inline-flex">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 inline-flex">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Admin
          </span>
        );
      case 'management':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 inline-flex">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            Management
          </span>
        );
      case 'content_editor':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 inline-flex">
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            Content Editor
          </span>
        );
      case 'seller':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 inline-flex">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            Seller
          </span>
        );
      case 'affiliate':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 inline-flex">
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            Affiliate
          </span>
        );
      case 'expert':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 inline-flex">
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            Tech Expert
          </span>
        );
      case 'customer':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 inline-flex">
            <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
            Customer
          </span>
        );
    }
  };

  const getStatusBadge = (status?: UserAccountStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            Pending Review
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
            Suspended
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Global User Accounts &amp; Ecosystem Roles
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage users, role permissions, seller approvals, and account statuses across Nexovira.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          {refreshing ? 'Syncing...' : 'Refresh Users'}
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Total Users</span>
          <div className="text-2xl font-black text-white mt-1">{users.length}</div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Admins &amp; Staff</span>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {users.filter(u => u.role === 'super_admin' || u.role === 'admin' || u.role === 'management' || u.role === 'content_editor').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Verified Sellers</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {users.filter(u => u.role === 'seller' && u.accountStatus === 'active').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Affiliate Partners</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {users.filter(u => u.role === 'affiliate' || u.isAffiliate).length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Tech Experts</span>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {users.filter(u => u.role === 'expert').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-bold uppercase text-slate-500">Pending Review</span>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {users.filter(u => u.accountStatus === 'pending').length}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          )}
          <span className="leading-relaxed font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or store name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-44">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter users by role"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="management">Management</option>
              <option value="content_editor">Content Editor</option>
              <option value="seller">Seller</option>
              <option value="affiliate">Affiliate</option>
              <option value="expert">Tech Expert</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter users by status"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending Review</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading Nexovira users from Firestore...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No users found</p>
            <p className="text-slate-500">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isOwner = isOwnerEmail(u.email);

                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isOwner 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : u.role === 'seller'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : u.role === 'affiliate'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {(u.displayName || u.email || 'U').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.displayName || 'NEXOVIRA Member'}</span>
                              {isOwner && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">UID: {u.uid.substring(0, 12)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-300 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email || 'No email provided'}</span>
                          </div>
                          {u.phone && (
                            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(u.accountStatus)}
                      </td>

                      {/* Extra info (store/affiliate code) */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {u.storeName && (
                          <div className="text-[11px] text-amber-300 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            <span>{u.storeName}</span>
                          </div>
                        )}
                        {u.affiliateCode && (
                          <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            <span>Code: {u.affiliateCode}</span>
                          </div>
                        )}
                        {u.internalNotes && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px] italic">
                            "{u.internalNotes}"
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Approve Button if Pending */}
                          {u.accountStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(u)}
                              title="Approve & Activate Account"
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          {/* Quick Suspend/Activate toggle (not for owner) */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleQuickSuspendToggle(u)}
                              title={u.accountStatus === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
                              className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                                u.accountStatus === 'suspended'
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                            >
                              {u.accountStatus === 'suspended' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Edit Role & Status Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="Edit Role & Permissions"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button (strictly blocked for owner) */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete User Record"
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role & Status Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  Manage User Account &amp; Role
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedUser.displayName} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isOwnerEmail(selectedUser.email) && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                <span>This is a Protected Nexovira Super Admin Account. Role and Status cannot be demoted.</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Assigned Platform Role
                </label>
                <select
                  value={editRole}
                  disabled={isOwnerEmail(selectedUser.email)}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  <option value="customer">Customer (Standard shopper)</option>
                  <option value="seller">Seller (Marketplace merchant)</option>
                  <option value="affiliate">Affiliate (Commission partner)</option>
                  <option value="expert">Tech Expert (Engineering &amp; Services provider)</option>
                  <option value="content_editor">Content Editor (Catalog &amp; Academy editor)</option>
                  <option value="management">Management (Operational leadership)</option>
                  <option value="admin">Admin (Full administrative access)</option>
                  <option value="super_admin">Super Admin (System Owner)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Adjusting the role changes access to dashboards, admin tabs, and service privileges.
                </p>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  disabled={isOwnerEmail(selectedUser.email)}
                  onChange={(e) => setEditStatus(e.target.value as UserAccountStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  <option value="active">Active (Full access)</option>
                  <option value="pending">Pending Review (Awaiting verification)</option>
                  <option value="suspended">Suspended (Blocked from logging in)</option>
                  <option value="rejected">Rejected (Application declined)</option>
                </select>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Verified CAC documents for seller store, or approved affiliate commission tier."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm User Deletion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete the user record for{' '}
              <strong className="text-white">{userToDelete.displayName || userToDelete.email}</strong>?
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This will remove their profile document from Firestore. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
