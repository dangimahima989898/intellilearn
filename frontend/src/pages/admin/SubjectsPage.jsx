import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BookOpen, Plus, Search, X, AlertCircle, ChevronLeft, ChevronRight,
  ChevronDown, MoreVertical, Check, Eye, Edit2, Trash2, UserCheck,
  ToggleLeft, ToggleRight, Layers, FlaskConical, GraduationCap,
  BookMarked, ShieldAlert, Users, AlertTriangle
} from 'lucide-react'
import hodService from '../../services/hodService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'

// ─── Color / badge helpers ────────────────────────────────────────────────────
const TYPE_META = {
  Theory:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: BookOpen },
  Lab:       { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: FlaskConical },
  Practical: { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   icon: FlaskConical },
  Elective:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: BookMarked },
  Mandatory: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: GraduationCap },
}
const DEFAULT_TYPE_META = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: BookOpen }

function TypeBadge({ type }) {
  const m = TYPE_META[type] || DEFAULT_TYPE_META
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      <Icon className="w-3 h-3" /> {type || '—'}
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'Active') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Active</span>
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />Inactive</span>
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="h-6 w-10 bg-slate-200 rounded mt-1 animate-pulse" />
          : <p className="text-xl font-extrabold text-[#1F2937] mt-0.5">{value ?? 0}</p>
        }
      </div>
    </div>
  )
}

// ─── Actions Dropdown (three-dot) ─────────────────────────────────────────────
function ActionsDropdown({ subject, onView, onEdit, onAssignFaculty, onToggleStatus, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = subject.status === 'Active'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937] transition cursor-pointer"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-48 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 animate-fade-in">
          <button onClick={() => { onView(subject); setOpen(false) }}
            className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-[#F6F8FB] flex items-center gap-2 cursor-pointer">
            <Eye className="w-3.5 h-3.5 text-[#7C3AED]" /> View Details
          </button>
          <button onClick={() => { onEdit(subject); setOpen(false) }}
            className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-[#F6F8FB] flex items-center gap-2 cursor-pointer">
            <Edit2 className="w-3.5 h-3.5 text-[#7C3AED]" /> Edit Subject
          </button>
          <button onClick={() => { onAssignFaculty(subject); setOpen(false) }}
            className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-[#F6F8FB] flex items-center gap-2 cursor-pointer">
            <UserCheck className="w-3.5 h-3.5 text-[#7C3AED]" /> Assign Faculty
          </button>
          <button onClick={() => { onToggleStatus(subject); setOpen(false) }}
            className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-[#F6F8FB] flex items-center gap-2 cursor-pointer">
            {isActive
              ? <ToggleLeft className="w-3.5 h-3.5 text-amber-500" />
              : <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <div className="h-px bg-[#E5E7EB] my-1" />
          {subject.can_delete ? (
            <button onClick={() => { onDelete(subject); setOpen(false) }}
              className="w-full px-4 py-2.5 text-xs text-[#DC2626] font-semibold hover:bg-red-50 flex items-center gap-2 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div className="relative group">
              <button disabled
                className="w-full px-4 py-2.5 text-xs text-gray-300 font-semibold flex items-center gap-2 cursor-not-allowed">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="absolute right-full top-0 mr-2 w-52 bg-gray-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 hidden group-hover:block z-50 leading-snug pointer-events-none">
                Cannot delete — has linked {subject.delete_blocked_reason}. Deactivate instead.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <tr key={i} className="border-b border-[#E5E7EB] animate-pulse">
          {[...Array(9)].map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 bg-slate-200 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Searchable Faculty Dropdown ──────────────────────────────────────────────
function FacultySearchDropdown({ facultyList, value, onChange, placeholder = "Search faculty..." }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = facultyList.find(f => f.id === value)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = facultyList.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.employee_id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(p => !p)}
        className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] flex items-center justify-between cursor-pointer focus-within:border-[#7C3AED]"
      >
        <span className={selected ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}>
          {selected ? selected.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button onClick={e => { e.stopPropagation(); onChange('') }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-[#6B7280]" />
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg max-h-56 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[#E5E7EB]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full px-4 py-2.5 text-xs text-[#6B7280] font-semibold hover:bg-[#F6F8FB] text-left cursor-pointer"
            >
              — No Faculty (Unassigned)
            </button>
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => { onChange(f.id); setOpen(false); setSearch('') }}
                className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-[#F6F8FB] text-left flex items-center justify-between cursor-pointer"
              >
                <span>{f.name}</span>
                <span className="text-[10px] text-[#9CA3AF]">{f.employee_id || f.designation}</span>
                {value === f.id && <Check className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 ml-1" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-[#9CA3AF] text-center">No faculty found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubjectsPage() {
  // Data
  const [subjects, setSubjects] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState(null)
  const [departments, setDepartments] = useState([])
  const [facultyList, setFacultyList] = useState([])

  // Loading states
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [semFilter, setSemFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [typeFilter, setTypeFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const LIMIT = 15

  // Derived semesters for filter (from all departments max)
  const maxSemesters = departments.reduce((acc, d) => Math.max(acc, d.total_semesters || 8), 0) || 8

  // Modal state
  const [modalMode, setModalMode] = useState(null) // null | 'create' | 'edit' | 'view' | 'assign' | 'delete'
  const [selectedSubject, setSelectedSubject] = useState(null)

  // Form
  const defaultForm = {
    subject_code: '',
    subject_name: '',
    department_id: '',
    semester_no: 1,
    credits: 3,
    subject_type: 'Theory',
    faculty_id: '',
    description: '',
    status: 'Active'
  }
  const [form, setForm] = useState(defaultForm)
  const [formErrors, setFormErrors] = useState({})
  const [deptSemesters, setDeptSemesters] = useState([]) // dynamic semesters for selected dept

  // ── Load subjects
  const loadSubjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: currentPage, limit: LIMIT }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (deptFilter !== 'All') params.department_id = deptFilter
      if (semFilter !== 'All') params.semester_no = semFilter
      if (statusFilter !== 'All') params.status = statusFilter
      if (typeFilter !== 'All') params.subject_type = typeFilter

      const data = await hodService.getSubjects(params)
      setSubjects(data.subjects || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (err) {
      // Only show toast if the error wasn't already handled by the global interceptor
      // (timeouts, network errors, and 401s are handled globally in api.js)
      const isHandledGlobally = err.code === 'ECONNABORTED' || !err.response || err.response?.status === 401
      if (!isHandledGlobally) {
        toast.error(err.response?.data?.detail || 'Failed to load subjects', { id: 'subjects_load_error' })
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, deptFilter, semFilter, statusFilter, typeFilter])

  // ── Load stats
  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const data = await hodService.getSubjectStats()
      setStats(data)
    } catch {
      // non-fatal
    } finally {
      setStatsLoading(false)
    }
  }

  // ── Load departments (open endpoint — no auth required)
  const loadDepartments = async () => {
    try {
      const data = await hodService.getSubjectDepartments()
      // data is a plain array: [{department_id, department_name, department_code, total_semesters}]
      setDepartments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load departments:', err?.response?.data || err?.message)
      // Fallback: try the HOD departments API
      try {
        const fallback = await hodService.getDepartments({ limit: 100 })
        const depts = fallback.departments || []
        setDepartments(depts.map(d => ({
          department_id: d.department_id,
          department_name: d.department_name,
          department_code: d.department_code,
          total_semesters: d.total_semesters || 8
        })))
      } catch (e2) {
        console.error('Fallback also failed:', e2?.message)
        setDepartments([])
      }
    }
  }


  // ── Initial load
  useEffect(() => {
    loadDepartments()
    loadStats()
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, deptFilter, semFilter, statusFilter, typeFilter])

  // ── When dept changes in form, load its semesters
  useEffect(() => {
    if (!form.department_id) {
      setDeptSemesters([]);
      return;
    }
    hodService.getDeptSemesters(form.department_id).then(data => {
      const sems = data.semesters || [];
      setDeptSemesters(sems);
      // Reset semester if out of range or not set
      if (form.semester_no && !sems.includes(Number(form.semester_no))) {
        setForm(p => ({ ...p, semester_no: sems[0] || 1 }));
      } else if (!form.semester_no && sems.length > 0) {
        setForm(p => ({ ...p, semester_no: sems[0] }));
      }
    }).catch(() => setDeptSemesters([]))
  }, [form.department_id])

  // ── When dept changes in form, load faculty
  useEffect(() => {
    if (!form.department_id) {
      setFacultyList([]);
      return;
    }
    hodService.getSubjectFaculty(form.department_id).then(data => {
      const list = data || [];
      setFacultyList(list);
      // Reset faculty_id if it's no longer valid for the selected department
      if (form.faculty_id && !list.some(f => f.id === form.faculty_id)) {
        setForm(p => ({ ...p, faculty_id: '' }));
      }
    }).catch(() => setFacultyList([]))
  }, [form.department_id])


  // ── Validate form
  const validate = () => {
    const errs = {}
    const code = (form.subject_code || '').trim()
    const name = (form.subject_name || '').trim()
    const desc = (form.description || '').trim()
    const credsStr = (String(form.credits) || '').trim()

    // Subject Code
    if (!code) {
      errs.subject_code = 'Subject code is required'
    } else if (code.length < 2) {
      errs.subject_code = 'Subject code must be at least 2 characters'
    } else if (code.length > 20) {
      errs.subject_code = 'Subject code must not exceed 20 characters'
    } else if (!/^[A-Z0-9\-_]{2,20}$/i.test(code)) {
      errs.subject_code = 'Code must be alphanumeric characters, hyphens, or underscores'
    }

    // Subject Name
    if (!name) {
      errs.subject_name = 'Subject name is required'
    } else if (name.length > 255) {
      errs.subject_name = 'Subject name must not exceed 255 characters'
    } else if (!/^[A-Za-z0-9\s\-_\.\(\)]+$/.test(name)) {
      errs.subject_name = 'Subject name contains invalid characters'
    }

    // Department
    if (!form.department_id) {
      errs.department_id = 'Department is required'
    }

    // Semester
    if (!form.semester_no) {
      errs.semester_no = 'Semester is required'
    }

    // Credits
    if (!credsStr) {
      errs.credits = 'Credits is required'
    } else {
      const creditsNum = Number(credsStr)
      if (isNaN(creditsNum) || !/^\d+$/.test(credsStr)) {
        errs.credits = 'Credits must be a valid number'
      } else if (creditsNum < 1 || creditsNum > 10) {
        errs.credits = 'Credits must be between 1 and 10'
      }
    }

    // Description
    if (desc.length > 255) {
      errs.description = 'Description must not exceed 255 characters'
    } else if (desc && !/^[A-Za-z0-9\s\-_,\.\?\!\(\)\/\n\r]+$/.test(desc)) {
      errs.description = 'Description contains invalid characters'
    }

    return errs
  }


  // ── Open modals
  const openCreate = () => {
    setForm(defaultForm)
    setFormErrors({})
    setSelectedSubject(null)
    setModalMode('create')
  }

  const openEdit = (subject) => {
    setForm({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      department_id: subject.department_id || '',
      semester_no: subject.semester_no || 1,
      credits: subject.credits || 3,
      subject_type: subject.subject_type || 'Theory',
      faculty_id: subject.faculty?.id || '',
      description: subject.description || '',
      status: subject.status || 'Active'
    })
    setFormErrors({})
    setSelectedSubject(subject)
    setModalMode('edit')
  }

  const openView = (subject) => {
    setSelectedSubject(subject)
    setModalMode('view')
  }

  const openAssignFaculty = (subject) => {
    setForm(p => ({ ...p, department_id: subject.department_id || '', faculty_id: subject.faculty?.id || '' }))
    setFormErrors({})
    setSelectedSubject(subject)
    setModalMode('assign')
  }

  const openDelete = (subject) => {
    setSelectedSubject(subject)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedSubject(null)
  }

  // ── Save (create / edit)
  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        subject_code: form.subject_code.trim().toUpperCase(),
        subject_name: form.subject_name.trim(),
        department_id: form.department_id,
        semester_no: Number(form.semester_no),
        credits: Number(form.credits),
        subject_type: form.subject_type,
        faculty_id: form.faculty_id || null,
        description: form.description.trim() || null,
        status: form.status
      }

      if (modalMode === 'create') {
        await hodService.createSubject(payload)
        toast.success('Subject created successfully')
      } else {
        await hodService.updateSubject(selectedSubject.id, payload)
        toast.success('Subject updated successfully')
      }
      closeModal()
      loadSubjects()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save subject')
    } finally {
      setSaving(false)
    }
  }

  // ── Assign Faculty only
  const handleAssignFaculty = async () => {
    setSaving(true)
    try {
      await hodService.updateSubject(selectedSubject.id, { faculty_id: form.faculty_id || null })
      toast.success('Faculty assigned successfully')
      closeModal()
      loadSubjects()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign faculty')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle status
  const handleToggleStatus = async (subject) => {
    const newStatus = subject.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await hodService.patchSubjectStatus(subject.id, newStatus)
      toast.success(`Subject ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`)
      loadSubjects()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    }
  }

  // ── Delete
  const handleDelete = async () => {
    setSaving(true)
    try {
      await hodService.deleteSubject(selectedSubject.id)
      toast.success('Subject deleted successfully')
      closeModal()
      loadSubjects()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete subject')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (field) =>
    `w-full bg-[#F6F8FB] border rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none transition ${
      formErrors[field] ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#7C3AED]'
    }`

  const selectCls = (field) =>
    `w-full bg-[#F6F8FB] border rounded-[10px] pl-4 pr-10 py-2.5 text-sm text-[#1F2937] focus:outline-none cursor-pointer transition appearance-none ${
      formErrors[field] ? 'border-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#7C3AED]'
    }`

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] p-4 lg:p-8 font-dm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* ── Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Subject Management</h1>
              <p className="text-[#6B7280] text-sm mt-0.5 font-medium">
                Create, manage and assign department subjects across all semesters.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 h-[42px] px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] transition text-sm font-semibold shrink-0 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>

          {/* ── 5 Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Subjects"     value={stats?.total}      icon={BookOpen}     color="bg-[#7C3AED]" loading={statsLoading} />
            <StatCard label="Theory"             value={stats?.theory}     icon={BookMarked}   color="bg-blue-500"  loading={statsLoading} />
            <StatCard label="Labs"               value={stats?.lab}        icon={FlaskConical} color="bg-teal-500"  loading={statsLoading} />
            <StatCard label="Pending Faculty"    value={stats?.no_faculty} icon={Users}        color="bg-amber-500" loading={statsLoading} />
            <StatCard label="Inactive"           value={stats?.inactive}   icon={ShieldAlert}  color="bg-slate-400" loading={statsLoading} />
          </div>

          {/* ── Search & Filters */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search by subject code or name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] text-[#1F2937]"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Department */}
                <div className="relative">
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-3 pr-8 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer text-[#1F2937] appearance-none"
                  >
                    <option value="All">All Departments</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280] pointer-events-none" />
                </div>

                {/* Semester */}
                <div className="relative">
                  <select
                    value={semFilter}
                    onChange={e => setSemFilter(e.target.value)}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-3 pr-8 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer text-[#1F2937] appearance-none"
                  >
                    <option value="All">All Semesters</option>
                    {[...Array(maxSemesters)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280] pointer-events-none" />
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-3 pr-8 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer text-[#1F2937] appearance-none"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280] pointer-events-none" />
                </div>

                {/* Subject Type */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-3 pr-8 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer text-[#1F2937] appearance-none"
                  >
                    <option value="All">All Types</option>
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                    <option value="Lab">Lab</option>
                    <option value="Elective">Elective</option>
                    <option value="Mandatory">Mandatory</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280] pointer-events-none" />
                </div>
              </div>

              <div className="text-xs font-semibold text-[#6B7280] ml-auto whitespace-nowrap self-center">
                {total} subject{total !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* ── Table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm text-[#1F2937]">
                <thead>
                  <tr className="bg-[#F6F8FB] border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider text-xs h-[48px] sticky top-0 z-10">
                    <th className="px-5">Code</th>
                    <th className="px-5">Subject Name</th>
                    <th className="px-5">Department</th>
                    <th className="px-5">Semester</th>
                    <th className="px-5">Credits</th>
                    <th className="px-5">Faculty</th>
                    <th className="px-5">Type</th>
                    <th className="px-5">Status</th>
                    <th className="px-5 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="py-20 flex flex-col items-center gap-4 text-center">
                          <svg className="w-20 h-20 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <div>
                            <h3 className="text-base font-bold text-[#1F2937]">No subjects available</h3>
                            <p className="text-sm text-[#6B7280] mt-1">
                              Click <span className="font-semibold text-[#7C3AED]">+ Add Subject</span> to create the first subject.
                            </p>
                          </div>
                          <button
                            onClick={openCreate}
                            className="mt-2 flex items-center gap-2 h-[38px] px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] transition text-sm font-semibold cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> Add Subject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    subjects.map((subject, idx) => (
                      <tr
                        key={subject.id}
                        className={`border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition ${idx % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {subject.subject_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <p className="font-semibold text-[#1F2937] text-sm truncate">{subject.subject_name}</p>
                          {subject.description && (
                            <p className="text-[11px] text-[#6B7280] mt-0.5 truncate max-w-[180px]">{subject.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-[#374151]">{subject.department_code || subject.department_name || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-[#374151]">Sem {subject.semester_no}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold text-[#374151]">{subject.credits}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {subject.faculty ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-black text-[#7C3AED]">
                                  {subject.faculty.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-[#374151] truncate max-w-[120px]">{subject.faculty.name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <TypeBadge type={subject.subject_type} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={subject.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ActionsDropdown
                            subject={subject}
                            onView={openView}
                            onEdit={openEdit}
                            onAssignFaculty={openAssignFaculty}
                            onToggleStatus={handleToggleStatus}
                            onDelete={openDelete}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E5E7EB] bg-white">
                <p className="text-xs text-[#6B7280] font-medium">
                  Page {currentPage} of {totalPages} • {total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F6F8FB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                            : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F6F8FB]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F6F8FB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CREATE / EDIT MODAL
      ════════════════════════════════════════ */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-lg font-bold text-[#1F2937]">
                  {modalMode === 'create' ? 'Create Subject' : `Edit Subject — ${selectedSubject?.subject_code}`}
                </h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F8FB] text-[#6B7280] cursor-pointer transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 flex flex-col gap-5">
              {/* Row 1: Code + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Subject Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. CS101"
                    value={form.subject_code}
                    onChange={e => {
                      const filtered = e.target.value.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();
                      setForm(p => ({ ...p, subject_code: filtered }));
                      setFormErrors(p => ({ ...p, subject_code: '' }));
                    }}
                    className={inputCls('subject_code')}
                    maxLength={20}
                  />
                  {formErrors.subject_code && <p className="text-xs text-[#DC2626] mt-1">{formErrors.subject_code}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Subject Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Data Structures"
                    value={form.subject_name}
                    onChange={e => {
                      const filtered = e.target.value.replace(/[^A-Za-z0-9\s\-_\.\(\)]/g, '');
                      setForm(p => ({ ...p, subject_name: filtered }));
                      setFormErrors(p => ({ ...p, subject_name: '' }));
                    }}
                    className={inputCls('subject_name')}
                    maxLength={255}
                  />
                  {formErrors.subject_name && <p className="text-xs text-[#DC2626] mt-1">{formErrors.subject_name}</p>}
                </div>
              </div>

              {/* Row 2: Department + Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={form.department_id}
                      onChange={e => {
                        setForm(p => ({ ...p, department_id: e.target.value, semester_no: 1, faculty_id: '' }));
                        setFormErrors(p => ({ ...p, department_id: '', semester_no: '', faculty_id: '' }));
                      }}
                      className={selectCls('department_id')}
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                  </div>
                  {formErrors.department_id && <p className="text-xs text-[#DC2626] mt-1">{formErrors.department_id}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Semester <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={form.semester_no}
                      onChange={e => { setForm(p => ({ ...p, semester_no: Number(e.target.value) })); setFormErrors(p => ({ ...p, semester_no: '' })) }}
                      disabled={!form.department_id}
                      className={selectCls('semester_no') + ' disabled:opacity-50'}
                    >
                      {deptSemesters.length === 0 && <option value="">Select Department first</option>}
                      {deptSemesters.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                  </div>
                  {formErrors.semester_no && <p className="text-xs text-[#DC2626] mt-1">{formErrors.semester_no}</p>}
                </div>
              </div>

              {/* Row 3: Credits + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Credits <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 3"
                    value={form.credits}
                    onChange={e => {
                      const filtered = e.target.value.replace(/[^0-9]/g, '');
                      setForm(p => ({ ...p, credits: filtered }));
                      setFormErrors(p => ({ ...p, credits: '' }));
                    }}
                    className={inputCls('credits')}
                    maxLength={3}
                  />
                  {formErrors.credits && <p className="text-xs text-[#DC2626] mt-1">{formErrors.credits}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1.5">Subject Type</label>
                  <div className="relative">
                    <select
                      value={form.subject_type}
                      onChange={e => setForm(p => ({ ...p, subject_type: e.target.value }))}
                      className={selectCls('subject_type')}
                    >
                      <option value="Theory">Theory</option>
                      <option value="Lab">Lab</option>
                      <option value="Practical">Practical</option>
                      <option value="Elective">Elective</option>
                      <option value="Mandatory">Mandatory</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Faculty <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
                <FacultySearchDropdown
                  facultyList={facultyList}
                  value={form.faculty_id}
                  onChange={v => setForm(p => ({ ...p, faculty_id: v }))}
                  placeholder={form.department_id ? 'Search faculty in this department…' : 'Select a department first'}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Status</label>
                <div className="flex gap-3">
                  {['Active', 'Inactive'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex-1 h-[40px] rounded-[10px] text-sm font-semibold border transition cursor-pointer ${
                        form.status === s
                          ? s === 'Active'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-gray-100 border-gray-400 text-gray-600'
                          : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F6F8FB]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Description <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the subject…"
                  value={form.description}
                  onChange={e => {
                    const filtered = e.target.value.replace(/[^A-Za-z0-9\s\-_,\.\?\!\(\)\/\n\r]/g, '');
                    setForm(p => ({ ...p, description: filtered }));
                    setFormErrors(p => ({ ...p, description: '' }));
                  }}
                  className={`w-full bg-[#F6F8FB] border rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none resize-none transition ${
                    formErrors.description ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#7C3AED]'
                  }`}
                  maxLength={255}
                />
                {formErrors.description && <p className="text-xs text-[#DC2626] mt-1">{formErrors.description}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#E5E7EB] flex gap-3 shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 h-[42px] border border-[#E5E7EB] text-[#6B7280] rounded-[10px] text-sm font-semibold hover:bg-[#F6F8FB] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-[42px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] text-sm font-semibold transition cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Subject' : 'Update Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ASSIGN FACULTY MODAL
      ════════════════════════════════════════ */}
      {modalMode === 'assign' && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-lg font-bold text-[#1F2937]">Assign Faculty</h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F8FB] text-[#6B7280] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-[#F6F8FB] rounded-xl p-4 border border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280] font-medium">Assigning faculty to</p>
                <p className="text-sm font-bold text-[#1F2937] mt-0.5">{selectedSubject.subject_name}</p>
                <p className="text-xs font-mono text-[#7C3AED] mt-0.5">{selectedSubject.subject_code}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Select Faculty</label>
                <FacultySearchDropdown
                  facultyList={facultyList}
                  value={form.faculty_id}
                  onChange={v => setForm(p => ({ ...p, faculty_id: v }))}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex gap-3">
              <button onClick={closeModal} className="flex-1 h-[38px] border border-[#E5E7EB] text-[#6B7280] rounded-[10px] text-sm font-semibold hover:bg-[#F6F8FB] cursor-pointer">Cancel</button>
              <button onClick={handleAssignFaculty} disabled={saving} className="flex-1 h-[38px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] text-sm font-semibold cursor-pointer disabled:opacity-60">
                {saving ? 'Assigning…' : 'Assign Faculty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          VIEW DETAILS MODAL
      ════════════════════════════════════════ */}
      {modalMode === 'view' && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-lg font-bold text-[#1F2937] truncate">{selectedSubject.subject_name}</h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F8FB] text-[#6B7280] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#7C3AED] bg-purple-50 px-3 py-1 rounded-full border border-purple-200">{selectedSubject.subject_code}</span>
                <TypeBadge type={selectedSubject.subject_type} />
                <StatusBadge status={selectedSubject.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Department', value: selectedSubject.department_name },
                  { label: 'Semester', value: `Semester ${selectedSubject.semester_no}` },
                  { label: 'Credits', value: selectedSubject.credits },
                  { label: 'Notes', value: selectedSubject.notes_count ?? 0 },
                  { label: 'Questions', value: selectedSubject.questions_count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F6F8FB] rounded-xl p-3.5 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-[#1F2937] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#F6F8FB] rounded-xl p-3.5 border border-[#E5E7EB]">
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Faculty</p>
                {selectedSubject.faculty ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
                      <span className="text-xs font-black text-[#7C3AED]">{selectedSubject.faculty.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1F2937]">{selectedSubject.faculty.name}</p>
                      <p className="text-[11px] text-[#6B7280]">{selectedSubject.faculty.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">No faculty assigned</span>
                  </div>
                )}
              </div>

              {selectedSubject.description && (
                <div className="bg-[#F6F8FB] rounded-xl p-3.5 border border-[#E5E7EB]">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-[#374151]">{selectedSubject.description}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E5E7EB] shrink-0 flex gap-3">
              <button onClick={closeModal} className="flex-1 h-[38px] border border-[#E5E7EB] text-[#6B7280] rounded-[10px] text-sm font-semibold hover:bg-[#F6F8FB] cursor-pointer">Close</button>
              <button onClick={() => { closeModal(); openEdit(selectedSubject) }} className="flex-1 h-[38px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] text-sm font-semibold cursor-pointer">
                Edit Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ════════════════════════════════════════ */}
      {modalMode === 'delete' && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">Delete Subject?</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  Are you sure you want to delete <span className="font-semibold text-[#1F2937]">{selectedSubject.subject_name}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="w-full flex gap-3">
                <button onClick={closeModal} className="flex-1 h-[40px] border border-[#E5E7EB] text-[#6B7280] rounded-[10px] text-sm font-semibold hover:bg-[#F6F8FB] cursor-pointer">Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 h-[40px] bg-[#DC2626] hover:bg-red-700 text-white rounded-[10px] text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
