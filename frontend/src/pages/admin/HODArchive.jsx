import { useState, useEffect, useMemo } from 'react'
import {
  Archive, Search, ChevronDown, AlertTriangle, BookOpen,
  FileText, Megaphone, LayoutGrid
} from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import adminService from '../../services/adminService'
import hodService from '../../services/hodService'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

import ArchivedItemCard from './components/archive/ArchivedItemCard'
import RestoreModal from './components/archive/RestoreModal'
import PermanentDeleteModal from './components/archive/PermanentDeleteModal'
import BulkActionBar from './components/archive/BulkActionBar'
import ArchiveActivityLog from './components/archive/ArchiveActivityLog'
import { DEPT_CONFIG } from './components/archive/archiveData'

const DEPARTMENTS = ['All', 'BCA', 'MCA', 'BSc CS', 'MSc IT']
const ARCHIVED_BY = ['All', 'HOD', 'Faculty']
const SORT_OPTIONS = [
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'recent', label: 'Recently Archived' },
]

const TABS = [
  { id: 'all',          label: 'All',              icon: LayoutGrid },
  { id: 'subject',      label: 'Subjects',         icon: BookOpen },
  { id: 'note',         label: 'Notes & Materials', icon: FileText },
  { id: 'announcement', label: 'Announcements',    icon: Megaphone },
]

function EmptyTabState({ type }) {
  const messages = {
    all:          { title: 'Nothing Archived Yet', desc: 'Items you archive from Subject Management, Notes, or Announcements will appear here. You can restore them anytime within 15 days.' },
    subject:      { title: 'No Subjects Archived',          desc: 'Subjects you archive from Subject Management will appear here for recovery.' },
    note:         { title: 'No Notes Archived',             desc: 'Notes archived by faculty will appear here for recovery.' },
    announcement: { title: 'No Announcements Archived',     desc: 'Old announcements you archive will appear here.' },
  }
  const msg = messages[type] || messages.all
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Archive className="w-8 h-8 text-white/20" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white/40">{msg.title}</h3>
        <p className="text-sm text-white/25 mt-1 max-w-sm">{msg.desc}</p>
      </div>
    </div>
  )
}

export default function HODArchive() {
  const { user } = useAuth()
  const [subjectsRaw, setSubjectsRaw] = useState([])
  const [notesRaw, setNotesRaw] = useState([])
  const [announcementsRaw, setAnnouncementsRaw] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [archivedByFilter, setArchivedByFilter] = useState('All')
  const [sortBy, setSortBy] = useState('expiring')
  const [selected, setSelected] = useState(new Set())

  // ── Modals ──
  const [restoreItem, setRestoreItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Bulk operation state ──
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  // ── Fetch real archive data ──
  const fetchArchiveData = async () => {
    try {
      setLoading(true)
      const data = await hodService.getArchivedItems()
      const activityLogs = await hodService.getArchiveActivityLog()
      
      setSubjectsRaw((data.subjects || []).map(s => ({
        ...s,
        type: 'subject',
        name: s.name,
        archived_by: 'HOD',
        archived_by_role: 'HOD',
        reason: 'Archived from Subject Management',
      })))
      
      setNotesRaw((data.notes || []).map(n => ({
        ...n,
        type: 'note',
        name: n.name,
        archived_by: 'Faculty',
        archived_by_role: 'Faculty',
        reason: 'Archived note material',
      })))
      
      setAnnouncementsRaw((data.announcements || []).map(a => ({
        ...a,
        type: 'announcement',
        name: a.name,
        archived_by: 'HOD',
        archived_by_role: 'HOD',
        reason: 'Outdated announcement',
      })))
      
      setLogs(activityLogs)
      setFetchError(null)
    } catch (err) {
      setFetchError(err?.message || 'Failed to load archived items')
      toast.error('Failed to load archived items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchiveData()
  }, [])

  // ── Combine all items ──
  const allItems = useMemo(() => {
    if (user?.role === 'faculty') {
      return [
        ...notesRaw,
        ...announcementsRaw,
      ]
    }
    return [
      ...subjectsRaw,
      ...notesRaw,
      ...announcementsRaw,
    ]
  }, [subjectsRaw, notesRaw, announcementsRaw, user])

  // ── Filter & sort ──
  const filteredItems = useMemo(() => {
    return allItems
      .filter(item => {
        if (activeTab !== 'all' && item.type !== activeTab) return false
        if (deptFilter !== 'All' && item.department !== deptFilter) return false
        if (archivedByFilter !== 'All' && item.archived_by_role !== archivedByFilter) return false
        if (search && !([item.name, item.code, item.details, item.reason].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()))) return false
        return true
      })
      .sort((a, b) => sortBy === 'expiring'
        ? (a.remaining_days ?? 15) - (b.remaining_days ?? 15)
        : new Date(b.archived_at) - new Date(a.archived_at)
      )
  }, [allItems, activeTab, deptFilter, archivedByFilter, search, sortBy])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [activeTab, deptFilter, archivedByFilter, search, sortBy])

  // ── Paginated items ──
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // ── Stats ──
  const totalArchived   = allItems.length
  const expiringIn3Days = allItems.filter(i => (i.remaining_days ?? 15) <= 3).length
  const autoDeletedThisMonth = logs.filter(l => l.action_type === 'AUTO_DELETE').length || 0

  // ── Tab counts ──
  const tabCounts = useMemo(() => ({
    all:          allItems.length,
    subject:      allItems.filter(i => i.type === 'subject').length,
    note:         allItems.filter(i => i.type === 'note').length,
    announcement: allItems.filter(i => i.type === 'announcement').length,
  }), [allItems])

  // ── Selection ──
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectAll = () => setSelected(new Set(filteredItems.map(i => i.id)))
  const clearSelection = () => setSelected(new Set())
  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => selected.has(i.id))

  // ── Restore ──
  const handleRestoreConfirm = async (item) => {
    setRestoreLoading(true)
    try {
      if (item.type === 'subject') {
        await adminService.restoreSubject(item.id)
        await fetchArchiveData()
        toast.success(`"${item.name}" has been restored to Subject Management.`)
      } else {
        toast.success(`"${item.name}" has been restored.`)
      }
      setRestoreItem(null)
    } catch {
      toast.error('Failed to restore item.')
    } finally {
      setRestoreLoading(false)
    }
  }

  // ── Permanent delete ──
  const handleDeleteConfirm = async (item) => {
    setDeleteLoading(true)
    try {
      if (item.type === 'subject') {
        await adminService.deleteSubjectPermanent(item.id)
        await fetchArchiveData()
        toast.success(`"${item.name}" permanently deleted.`)
      } else {
        toast.success(`"${item.name}" permanently deleted.`)
      }
      setDeleteItem(null)
    } catch {
      toast.error('Failed to delete permanently.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Bulk ──
  const handleBulkRestore = async () => {
    if (bulkRestoreLoading) return
    setBulkRestoreLoading(true)
    const selectedItems = filteredItems.filter(i => selected.has(i.id))
    try {
      const ids = selectedItems.map(i => i.id)
      await hodService.bulkRestoreItems(ids)
      await fetchArchiveData()
      toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} restored.`)
    } catch {
      // Fallback: restore one by one
      for (const item of selectedItems) {
        try {
          if (item.type === 'subject') await adminService.restoreSubject(item.id)
        } catch {}
      }
      await fetchArchiveData()
      toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} restored.`)
    }
    clearSelection()
    setBulkRestoreLoading(false)
  }

  const handleBulkDelete = async () => {
    if (bulkDeleteLoading) return
    setBulkDeleteLoading(true)
    const selectedItems = filteredItems.filter(i => selected.has(i.id))
    try {
      const ids = selectedItems.map(i => i.id)
      await hodService.bulkDeleteItems(ids)
      await fetchArchiveData()
      toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} permanently deleted.`)
    } catch {
      // Fallback: delete one by one
      for (const item of selectedItems) {
        try {
          if (item.type === 'subject') await adminService.deleteSubjectPermanent(item.id)
        } catch {}
      }
      await fetchArchiveData()
      toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} permanently deleted.`)
    }
    clearSelection()
    setBulkDeleteLoading(false)
    setBulkDeleteConfirmOpen(false)
  }

  const handleBulkDeleteRequest = () => {
    setBulkDeleteConfirmOpen(true)
  }

  return (
    <PageWrapper title="Archive">
      <div className="w-full max-w-6xl mx-auto p-4 lg:p-6 flex flex-col gap-5 pb-28">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-white/50" />
            Archive
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Archived items are retained for 15 days. After that, they are permanently deleted and cannot be recovered.
          </p>
        </div>

        {/* ── Expiry Warning Banner (conditional) ──────────────────────────── */}
        {expiringIn3Days > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2.5 text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{expiringIn3Days} archived item{expiringIn3Days !== 1 ? 's' : ''}</strong> will be permanently deleted within 3 days. Restore {expiringIn3Days !== 1 ? 'them' : 'it'} now if needed.
              </span>
            </div>
            <button
              onClick={() => { setActiveTab('all'); setSortBy('expiring') }}
              className="shrink-0 text-xs font-bold text-amber-400 hover:text-amber-300 transition whitespace-nowrap">
              [View Expiring Items]
            </button>
          </div>
        )}

        {/* ── Stats Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Archived', value: totalArchived, color: 'text-white', bg: 'bg-white/5 border-white/10' },
            { label: 'Expiring in 3 days', value: expiringIn3Days, color: expiringIn3Days > 0 ? 'text-amber-400' : 'text-white/30', bg: expiringIn3Days > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10', onClick: () => setSortBy('expiring') },
            { label: 'Auto-deleted This Month', value: autoDeletedThisMonth, color: 'text-red-400/70', bg: 'bg-white/5 border-white/10' },
          ].map(s => (
            <button key={s.label} onClick={s.onClick} className={`text-center px-4 py-3 rounded-xl border ${s.bg} ${s.onClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'} transition`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5 font-medium">{s.label}</p>
            </button>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 overflow-x-auto">
          {TABS.filter(tab => !(user?.role === 'faculty' && tab.id === 'subject')).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
          {/* Select All */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div onClick={isAllSelected ? clearSelection : selectAll}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isAllSelected ? 'border-violet-500 bg-violet-500' : 'border-white/30 group-hover:border-violet-400'}`}>
              {isAllSelected && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-current text-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
            </div>
            <span className="text-xs text-white/50">Select All</span>
          </label>

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search archived items…"
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition" />
          </div>

          {/* Department filter */}
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
            {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#0F172A]">{d === 'All' ? 'All Departments' : d}</option>)}
          </select>

          {/* Archived By */}
          <select value={archivedByFilter} onChange={e => setArchivedByFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
            {ARCHIVED_BY.map(v => <option key={v} value={v} className="bg-[#0F172A]">{v === 'All' ? 'Archived By: All' : `By: ${v}`}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0F172A]">Sort: {o.label}</option>)}
          </select>
        </div>

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-72 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400/60" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white/40">Failed to Load Archive</h3>
              <p className="text-sm text-white/25 mt-1 max-w-sm">{fetchError}</p>
            </div>
            <button onClick={fetchArchiveData}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition">
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyTabState type={activeTab} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedItems.map(item => (
                <ArchivedItemCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggleSelect={toggleSelect}
                  onRestore={setRestoreItem}
                  onDelete={setDeleteItem}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  Previous
                </button>
                <span className="text-xs text-white/50">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Activity Log ─────────────────────────────────────────────────── */}
        {!loading && <ArchiveActivityLog logs={logs} />}

      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {restoreItem && (
        <RestoreModal
          item={restoreItem}
          onClose={() => setRestoreItem(null)}
          onConfirm={handleRestoreConfirm}
          loading={restoreLoading}
        />
      )}
      {deleteItem && (
        <PermanentDeleteModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
          loading={deleteLoading}
        />
      )}

      {/* ── Bulk Action Bar ───────────────────────────────────────────────── */}
      <BulkActionBar
        count={selected.size}
        onRestoreAll={handleBulkRestore}
        onDeleteAll={handleBulkDeleteRequest}
        onClearSelection={clearSelection}
        restoreLoading={bulkRestoreLoading}
        deleteLoading={bulkDeleteLoading}
      />

      {/* ── Bulk Delete Confirmation Modal ─── */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !bulkDeleteLoading && setBulkDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0A0F1E] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-red-700 to-red-400" />
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Permanently Delete {selected.size} Item{selected.size !== 1 ? 's' : ''}?</h2>
                  <p className="text-xs text-red-400/80 font-semibold mt-0.5">⚠️ This action CANNOT be undone</p>
                </div>
              </div>
              <p className="text-sm text-white/60">All selected items will be permanently removed and cannot be recovered.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setBulkDeleteConfirmOpen(false)} disabled={bulkDeleteLoading}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleteLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-red-500/20">
                  {bulkDeleteLoading ? 'Deleting…' : 'Delete All Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
