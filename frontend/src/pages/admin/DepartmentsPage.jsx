import { useState, useEffect, useRef } from 'react'
import { 
  Building, Plus, Search, X, AlertCircle, 
  ChevronLeft, ChevronRight, ChevronDown, GraduationCap, Check, Info, MoreVertical,
  User, BookOpen, Layers, ShieldAlert
} from 'lucide-react'
import hodService from '../../services/hodService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortFilter, setSortFilter] = useState('name')
  const [academicYearFilter, setAcademicYearFilter] = useState('2026-27')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dropdown States
  const [activeDropdownId, setActiveDropdownId] = useState(null)

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isAssignHodModalOpen, setIsAssignHodModalOpen] = useState(false)
  const [viewingDept, setViewingDept] = useState(null)
  const [editingDept, setEditingDept] = useState(null)
  const [deptForHodAssignment, setDeptForHodAssignment] = useState(null)
  
  // HOD Dropdown Search States
  const [eligibleHods, setEligibleHods] = useState([])
  const [hodSearch, setHodSearch] = useState('')
  const [isHodDropdownOpen, setIsHodDropdownOpen] = useState(false)
  const hodDropdownRef = useRef(null)
  const rowDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    department_name: '',
    department_code: '',
    department_type: 'Engineering', // Default
    total_semesters: 8, // Default
    hod_id: '',
    status: 'Active',
    description: ''
  })
  
  // Validation Errors
  const [errors, setErrors] = useState({
    department_name: '',
    department_code: ''
  })

  // Delete Modal
  const [deptToDelete, setDeptToDelete] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reusable helper to format API errors safely and avoid rendering crashes
  const getErrorMessage = (err, fallback = 'An error occurred') => {
    if (err.response?.data?.detail) {
      const detail = err.response.data.detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
    }
    return err.message || fallback
  }

  // Load departments with filters
  const loadDepartments = async () => {
    setLoading(true)
    try {
      const data = await hodService.getDepartments({
        search: searchQuery,
        status: statusFilter,
        sort: sortFilter,
        page: currentPage,
        limit: itemsPerPage,
        academic_year: academicYearFilter
      })
      setDepartments(data.departments || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load departments'))
    } finally {
      setLoading(false)
    }
  }

  // Load eligible HODs list
  const loadEligibleHods = async () => {
    try {
      const hods = await hodService.getEligibleHods()
      setEligibleHods(hods || [])
    } catch {
      console.error('Failed to load eligible HODs')
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [searchQuery, statusFilter, sortFilter, academicYearFilter, currentPage])

  useEffect(() => {
    loadEligibleHods()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (hodDropdownRef.current && !hodDropdownRef.current.contains(event.target)) {
        setIsHodDropdownOpen(false)
      }
      if (rowDropdownRef.current && !rowDropdownRef.current.contains(event.target)) {
        // Only close if we didn't click the trigger button
        if (!event.target.closest('.dropdown-trigger')) {
          setActiveDropdownId(null)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [hodDropdownRef, rowDropdownRef])

  const validateField = (name, value) => {
    let errorMsg = ''
    if (name === 'department_name') {
      if (!value.trim()) {
        errorMsg = 'Department name is required.'
      } else if (value.trim().length < 3) {
        errorMsg = 'Department name must be at least 3 characters.'
      } else if (value.trim().length > 100) {
        errorMsg = 'Department name cannot exceed 100 characters.'
      }
    } else if (name === 'department_code') {
      if (!value.trim()) {
        errorMsg = 'Department code is required.'
      } else if (!/^[A-Z0-9]+$/i.test(value)) {
        errorMsg = 'Department code must be alphanumeric.'
      }
    }
    setErrors(prev => ({ ...prev, [name]: errorMsg }))
    return errorMsg === ''
  }

  const openCreateModal = () => {
    setEditingDept(null)
    setFormData({
      department_name: '',
      department_code: '',
      department_type: 'Engineering',
      total_semesters: 8,
      hod_id: '',
      status: 'Active',
      description: ''
    })
    setHodSearch('')
    setErrors({ department_name: '', department_code: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (dept) => {
    setEditingDept(dept)
    setFormData({
      department_name: dept.department_name,
      department_code: dept.department_code,
      department_type: dept.department_type || 'Engineering',
      total_semesters: dept.total_semesters || 8,
      hod_id: dept.hod_id || '',
      status: dept.status || 'Active',
      description: dept.description || ''
    })
    const assignedHod = eligibleHods.find(h => h.id === dept.hod_id)
    setHodSearch(assignedHod ? assignedHod.name : '')
    setErrors({ department_name: '', department_code: '' })
    setIsModalOpen(true)
    setActiveDropdownId(null)
  }

  const openViewModal = (dept) => {
    setViewingDept(dept)
    setIsViewModalOpen(true)
    setActiveDropdownId(null)
  }

  const openAssignHodModal = (dept) => {
    setDeptForHodAssignment(dept)
    const assignedHod = eligibleHods.find(h => h.id === dept.hod_id)
    setHodSearch(assignedHod ? assignedHod.name : '')
    setFormData(prev => ({ ...prev, hod_id: dept.hod_id || '' }))
    setIsAssignHodModalOpen(true)
    setActiveDropdownId(null)
  }

  const handleStatusToggle = async (dept) => {
    const nextStatus = dept.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await hodService.patchDepartmentStatus(dept.department_id, nextStatus)
      toast.success(`Department status updated successfully`)
      loadDepartments()
      setActiveDropdownId(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'))
    }
  }

  const handleSaveDepartment = async (e) => {
    e.preventDefault()
    if (submitting) return

    const isNameValid = validateField('department_name', formData.department_name)
    const isCodeValid = validateField('department_code', formData.department_code)

    if (!isNameValid || !isCodeValid) {
      toast.error('Please correct the validation errors before saving.')
      return
    }

    const isNameDuplicate = departments.some(d => 
      d.department_name.trim().toLowerCase() === formData.department_name.trim().toLowerCase() &&
      (!editingDept || d.department_id !== editingDept.department_id)
    )
    if (isNameDuplicate) {
      setErrors(prev => ({ ...prev, department_name: 'Department name already exists.' }))
      toast.error('Department name must be unique.')
      return
    }

    const isCodeDuplicate = departments.some(d => 
      d.department_code.trim().toUpperCase() === formData.department_code.trim().toUpperCase() &&
      (!editingDept || d.department_id !== editingDept.department_id)
    )
    if (isCodeDuplicate) {
      setErrors(prev => ({ ...prev, department_code: 'Department code already exists.' }))
      toast.error('Department code must be unique.')
      return
    }

    const payload = {
      ...formData,
      department_code: formData.department_code.toUpperCase(),
      hod_id: formData.hod_id || null
    }

    setSubmitting(true)
    try {
      if (editingDept) {
        await hodService.updateDepartment(editingDept.department_id, payload)
        toast.success('Department updated successfully')
      } else {
        await hodService.createDepartment(payload)
        toast.success('Department created successfully')
      }
      setIsModalOpen(false)
      loadDepartments()
      loadEligibleHods()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save department'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveHodAssignment = async (e) => {
    e.preventDefault()
    if (!deptForHodAssignment) return
    try {
      await hodService.updateDepartment(deptForHodAssignment.department_id, {
        hod_id: formData.hod_id || null
      })
      toast.success('HOD assigned successfully')
      setIsAssignHodModalOpen(false)
      loadDepartments()
      loadEligibleHods()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign HOD'))
    }
  }

  const openDeleteModal = (dept) => {
    setDeptToDelete(dept)
    setIsDeleteModalOpen(true)
    setActiveDropdownId(null)
  }

  const handleDeleteDepartment = async () => {
    if (!deptToDelete || submitting) return
    
    const hasLinkedRecords = 
      (deptToDelete.students || 0) > 0 || 
      (deptToDelete.faculty || 0) > 0 || 
      (deptToDelete.subjects || 0) > 0
 
    if (hasLinkedRecords) {
      toast.error('Department cannot be deleted because it contains academic records.')
      setIsDeleteModalOpen(false)
      return
    }
 
    setSubmitting(true)
    try {
      await hodService.deleteDepartment(deptToDelete.department_id)
      toast.success('Department deleted successfully')
      setIsDeleteModalOpen(false)
      setDeptToDelete(null)
      loadDepartments()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete department'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectHod = (hod) => {
    setFormData(prev => ({ ...prev, hod_id: hod.id }))
    setHodSearch(hod.name)
    setIsHodDropdownOpen(false)
  }

  const clearSelectedHod = () => {
    setFormData(prev => ({ ...prev, hod_id: '' }))
    setHodSearch('')
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  
  const filteredHodsList = eligibleHods.filter(h => 
    h.name.toLowerCase().includes(hodSearch.toLowerCase()) || 
    h.email.toLowerCase().includes(hodSearch.toLowerCase()) ||
    h.employee_id.toLowerCase().includes(hodSearch.toLowerCase())
  )

  const toggleDropdown = (id) => {
    setActiveDropdownId(activeDropdownId === id ? null : id)
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F6F8FB] text-[#1F2937] p-4 lg:p-8 font-dm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Department Management</h1>
              <p className="text-[#6B7280] text-sm mt-0.5 font-medium">Manage academic departments and assign department heads.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 h-[42px] px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] transition text-sm font-semibold shrink-0 cursor-pointer shadow-sm active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          {/* Search, Filters, and Stats */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
            {/* Top row: search & stats */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search by Department Name"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] text-[#1F2937]"
                />
              </div>
              <div className="text-sm font-semibold text-[#6B7280] self-end md:self-auto shrink-0">
                Showing {total} Departments
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-[#E5E7EB] w-full" />

            {/* Bottom row: filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Academic Year */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Academic Year</label>
                <select
                  value={academicYearFilter}
                  onChange={e => { setAcademicYearFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer text-[#1F2937]"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer text-[#1F2937]"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Sort</label>
                <select
                  value={sortFilter}
                  onChange={e => { setSortFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer text-[#1F2937]"
                >
                  <option value="name">Department Name</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Department List Table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {/* Table Header skeleton */}
                <div className="h-[48px] bg-[#F6F8FB] border-b border-[#E5E7EB] rounded-t-lg animate-pulse" />
                {/* 5 Rows skeleton */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[56px] bg-white border-b border-[#E5E7EB] flex items-center px-4 justify-between animate-pulse">
                    <div className="w-1/4 h-4 bg-slate-200 rounded" />
                    <div className="w-1/12 h-4 bg-slate-200 rounded" />
                    <div className="w-1/6 h-4 bg-slate-200 rounded" />
                    <div className="w-1/12 h-4 bg-slate-200 rounded" />
                    <div className="w-1/12 h-4 bg-slate-200 rounded" />
                    <div className="w-1/12 h-4 bg-slate-200 rounded" />
                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : departments.length === 0 ? (
              <div className="p-16 text-center max-w-md mx-auto">
                <svg className="w-20 h-20 text-[#E5E7EB] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-base font-bold text-[#1F2937]">No departments found</h3>
                <p className="text-sm text-[#6B7280] mt-1 font-medium">There are no academic departments matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse text-sm text-[#1F2937]">
                  <thead>
                    <tr className="bg-[#F6F8FB] border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider text-xs h-[48px] sticky top-0 z-10">
                      <th className="px-6">Department Name</th>
                      <th className="px-6">Code</th>
                      <th className="px-6">Type</th>
                      <th className="px-6">HOD</th>
                      <th className="px-6">Students</th>
                      <th className="px-6">Faculty</th>
                      <th className="px-6">Status</th>
                      <th className="px-6 text-right pr-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => {
                      const isDeleteDisabled = (dept.students || 0) > 0 || (dept.faculty || 0) > 0 || (dept.subjects || 0) > 0
                      
                      return (
                        <tr key={dept.department_id} className="border-b border-[#E5E7EB] hover:bg-slate-50/50 transition h-[56px]">
                          <td className="px-6 font-semibold text-[#1F2937] max-w-xs truncate">
                            {dept.department_name}
                          </td>
                          <td className="px-6 font-mono font-bold text-[#6B7280]">
                            {dept.department_code}
                          </td>
                          <td className="px-6 text-[#6B7280] font-semibold text-xs">
                            {dept.department_type}
                          </td>
                          <td className="px-6 text-[#1F2937] font-medium">
                            {dept.hod_name || <span className="text-[#6B7280] italic">Not Assigned</span>}
                          </td>
                          <td className="px-6 font-semibold text-[#1F2937]">{dept.students || 0}</td>
                          <td className="px-6 font-semibold text-[#1F2937]">{dept.faculty || 0}</td>
                          <td className="px-6">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              dept.status === 'Active'
                                ? 'bg-[#1F6E43]/10 text-[#1F6E43] border border-[#1F6E43]/20'
                                : 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/20'
                            }`}>
                              {dept.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 text-right pr-12 relative">
                            <button
                              onClick={() => toggleDropdown(dept.department_id)}
                              className="dropdown-trigger p-1.5 rounded-full hover:bg-slate-100 text-[#6B7280] hover:text-[#1F2937] transition cursor-pointer active:scale-[0.9]"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
 
                            {/* Dropdown Menu */}
                            {activeDropdownId === dept.department_id && (
                              <div 
                                ref={rowDropdownRef}
                                className="absolute right-12 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden text-left"
                              >
                                <button
                                  onClick={() => openViewModal(dept)}
                                  className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer flex items-center gap-2"
                                >
                                  <Layers className="w-3.5 h-3.5 text-[#7C3AED]" />
                                  View Details
                                </button>
                                
                                <button
                                  onClick={() => openEditModal(dept)}
                                  className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer flex items-center gap-2"
                                >
                                  <Building className="w-3.5 h-3.5 text-[#7C3AED]" />
                                  Edit Department
                                </button>
 
                                <button
                                  onClick={() => openAssignHodModal(dept)}
                                  className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer flex items-center gap-2"
                                >
                                  <User className="w-3.5 h-3.5 text-[#7C3AED]" />
                                  Assign HOD
                                </button>

                                 <button
                                  onClick={() => handleStatusToggle(dept)}
                                  className="w-full px-4 py-2.5 text-xs text-[#1F2937] font-semibold hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer flex items-center gap-2 border-t border-[#E5E7EB]"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                                  {dept.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
 
                                {/* Delete Menu Option with Group Hover for Tooltip */}
                                <div className="group relative w-full border-t border-[#E5E7EB]">
                                  <button
                                    disabled={isDeleteDisabled}
                                    onClick={() => openDeleteModal(dept)}
                                    className={`w-full px-4 py-2.5 text-xs font-semibold text-left transition flex items-center gap-2 ${
                                      isDeleteDisabled 
                                        ? 'text-gray-400 bg-gray-50/50 cursor-not-allowed'
                                        : 'text-[#C62828] hover:bg-rose-50 active:bg-rose-100 cursor-pointer'
                                    }`}
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                  
                                  {/* Custom Styled Tooltip */}
                                  {isDeleteDisabled && (
                                    <div className="absolute hidden group-hover:block bg-[#1F2937] text-white text-[10px] p-2.5 rounded-lg shadow-md w-52 right-full mr-2 -top-2 z-30 font-semibold leading-relaxed">
                                      Department cannot be deleted because it contains academic records. Suggestion: Deactivate Department instead.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && totalPages > 1 && (
              <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between bg-[#F6F8FB]">
                <div className="text-xs text-[#6B7280] font-semibold">
                  Showing {Math.min(total, (currentPage - 1) * itemsPerPage + 1)}–{Math.min(total, currentPage * itemsPerPage)} of {total} Departments
                </div>
                <div className="flex gap-1.5 items-center">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-xs font-semibold text-[#6B7280] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer active:scale-[0.97]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-[10px] text-xs font-bold border transition cursor-pointer active:scale-[0.9] ${
                        currentPage === i + 1
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-xs font-semibold text-[#6B7280] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer active:scale-[0.97]"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-fade-in text-[#1F2937]">
          <div className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-lg overflow-hidden flex flex-col shadow-xl max-h-[90vh]">

            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">
                  {editingDept ? 'Edit Department' : 'Create Department'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
                  {editingDept ? 'Update this academic department.' : 'Add a new academic department.'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDepartment} className="flex flex-col overflow-hidden">
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">

                {/* Name & Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Science"
                      value={formData.department_name}
                      onChange={e => {
                        setFormData({ ...formData, department_name: e.target.value })
                        validateField('department_name', e.target.value)
                      }}
                      className={`bg-[#F6F8FB] border rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] ${
                        errors.department_name ? 'border-[#C62828]' : 'border-[#E5E7EB]'
                      }`}
                    />
                    {errors.department_name && (
                      <span className="text-[11px] font-semibold text-[#C62828] flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" /> {errors.department_name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSE"
                      value={formData.department_code}
                      onChange={e => {
                        const val = e.target.value.toUpperCase()
                        setFormData({ ...formData, department_code: val })
                        validateField('department_code', val)
                      }}
                      className={`bg-[#F6F8FB] border rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] font-mono font-bold ${
                        errors.department_code ? 'border-[#C62828]' : 'border-[#E5E7EB]'
                      }`}
                    />
                    {errors.department_code && (
                      <span className="text-[11px] font-semibold text-[#C62828] flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" /> {errors.department_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Type & Semesters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Type *</label>
                    <select
                      value={formData.department_type}
                      onChange={e => setFormData({ ...formData, department_type: e.target.value })}
                      className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] cursor-pointer font-semibold"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Management">Management</option>
                      <option value="Science">Science</option>
                      <option value="Arts">Arts</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Medical">Medical</option>
                      <option value="Law">Law</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Semesters *</label>
                    <input
                      type="number"
                      required
                      min={2}
                      max={10}
                      value={formData.total_semesters}
                      onChange={e => setFormData({ ...formData, total_semesters: parseInt(e.target.value) || 2 })}
                      className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] font-semibold"
                    />
                  </div>
                </div>

                {/* Searchable HOD Dropdown */}
                <div className="flex flex-col gap-1 relative" ref={hodDropdownRef}>
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">HOD (Optional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search HOD name..."
                      value={hodSearch}
                      onChange={e => {
                        setHodSearch(e.target.value)
                        setIsHodDropdownOpen(true)
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, hod_id: '' }))
                        }
                      }}
                      onFocus={() => setIsHodDropdownOpen(true)}
                      className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 pr-10 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81]"
                    />
                    {formData.hod_id ? (
                      <button
                        type="button"
                        onClick={clearSelectedHod}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                    )}
                  </div>

                  {/* Dropdown Items */}
                  {isHodDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-[60] max-h-48 overflow-y-auto">
                      {filteredHodsList.length === 0 ? (
                        <div className="p-3 text-xs text-[#6B7280] italic text-center">
                          No eligible faculty found
                        </div>
                      ) : (
                        filteredHodsList.map(hod => (
                          <button
                            key={hod.id}
                            type="button"
                            onClick={() => handleSelectHod(hod)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 transition flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-[#1F2937]">{hod.name}</div>
                              <div className="text-[10px] text-[#6B7280]">
                                ID: <span className="font-bold">{hod.employee_id}</span> · Dept: {hod.department}
                              </div>
                            </div>
                            {formData.hod_id === hod.id && (
                              <Check className="w-4 h-4 text-[#7C3AED] shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] cursor-pointer font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    placeholder="Enter department scope and details..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    maxLength={300}
                    className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81] resize-none"
                  />
                  <div className="text-right text-[10px] font-semibold text-[#6B7280] mt-0.5">
                    {formData.description.length}/300 characters
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#E5E7EB] flex items-center justify-end gap-3 bg-[#F6F8FB] shrink-0">
                <button 
                  type="button" 
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)} 
                  className="h-[42px] px-5 bg-white border border-[#E5E7EB] rounded-[10px] text-[#6B7280] hover:text-[#1F2937] text-sm font-semibold transition cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="h-[42px] px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] text-sm font-semibold transition cursor-pointer shadow-sm active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (editingDept ? 'Update Department' : 'Create Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN HOD MODAL ── */}
      {isAssignHodModalOpen && deptForHodAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-fade-in text-[#1F2937]">
          <div className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-lg font-bold text-[#1F2937]">Assign HOD</h2>
              </div>
              <button 
                onClick={() => setIsAssignHodModalOpen(false)} 
                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <form onSubmit={handleSaveHodAssignment}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <span className="text-xs text-[#6B7280] font-bold uppercase">Department</span>
                  <div className="text-sm font-bold text-[#1F2937] mt-0.5">{deptForHodAssignment.department_name}</div>
                </div>

                {/* HOD search inside Assign HOD popup */}
                <div className="flex flex-col gap-1 relative" ref={hodDropdownRef}>
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Select Department Head</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search HOD name..."
                      value={hodSearch}
                      onChange={e => {
                        setHodSearch(e.target.value)
                        setIsHodDropdownOpen(true)
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, hod_id: '' }))
                        }
                      }}
                      onFocus={() => setIsHodDropdownOpen(true)}
                      className="w-full bg-[#F6F8FB] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 pr-10 text-sm text-[#1F2937] focus:outline-none focus:border-[#0F4C81]"
                    />
                    {formData.hod_id ? (
                      <button
                        type="button"
                        onClick={clearSelectedHod}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                    )}
                  </div>

                  {/* Dropdown Items */}
                  {isHodDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-[60] max-h-42 overflow-y-auto">
                      {filteredHodsList.length === 0 ? (
                        <div className="p-3 text-xs text-[#6B7280] italic text-center">
                          No eligible faculty found
                        </div>
                      ) : (
                        filteredHodsList.map(hod => (
                          <button
                            key={hod.id}
                            type="button"
                            onClick={() => handleSelectHod(hod)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 transition flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-[#1F2937]">{hod.name}</div>
                              <div className="text-[10px] text-[#6B7280]">
                                ID: <span className="font-bold">{hod.employee_id}</span> · Dept: {hod.department}
                              </div>
                            </div>
                            {formData.hod_id === hod.id && (
                              <Check className="w-4 h-4 text-[#7C3AED] shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#F6F8FB] border-t border-[#E5E7EB] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignHodModalOpen(false)}
                  className="h-[38px] px-4 bg-white border border-[#E5E7EB] rounded-[10px] text-[#6B7280] hover:text-[#1F2937] text-sm font-semibold transition cursor-pointer active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-[38px] px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-[10px] text-sm font-semibold transition cursor-pointer active:scale-[0.97]"
                >
                  Assign HOD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW DETAILS MODAL ── */}
      {isViewModalOpen && viewingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-fade-in text-[#1F2937]">
          <div className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-lg font-bold text-[#1F2937] truncate">{viewingDept.department_name}</h2>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Code</div>
                  <div className="text-sm font-mono font-bold text-[#1F2937] mt-0.5">{viewingDept.department_code}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Status</div>
                  <div className="mt-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      viewingDept.status === 'Active'
                        ? 'bg-[#1F6E43]/10 text-[#1F6E43] border border-[#1F6E43]/20'
                        : 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/20'
                    }`}>
                      {viewingDept.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Type</div>
                  <div className="text-sm text-[#1F2937] font-semibold mt-0.5">{viewingDept.department_type}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Semesters</div>
                  <div className="text-sm text-[#1F2937] font-semibold mt-0.5">{viewingDept.total_semesters} Semesters</div>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Department Head (HOD)</div>
                <div className="text-sm text-[#1F2937] mt-0.5 font-semibold">
                  {viewingDept.hod_name || <span className="text-[#6B7280] italic">Not Assigned</span>}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Description</div>
                <div className="text-sm text-[#6B7280] mt-1 whitespace-pre-wrap leading-relaxed">
                  {viewingDept.description || <span className="italic">No description provided.</span>}
                </div>
              </div>

              <div className="h-[1px] bg-[#E5E7EB] my-1" />

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#F6F8FB] p-3 rounded-[10px] border border-[#E5E7EB]">
                  <div className="text-lg font-bold text-[#1F2937]">{viewingDept.students || 0}</div>
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mt-0.5">Students</div>
                </div>
                <div className="bg-[#F6F8FB] p-3 rounded-[10px] border border-[#E5E7EB]">
                  <div className="text-lg font-bold text-[#1F2937]">{viewingDept.faculty || 0}</div>
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mt-0.5">Faculty</div>
                </div>
                <div className="bg-[#F6F8FB] p-3 rounded-[10px] border border-[#E5E7EB]">
                  <div className="text-lg font-bold text-[#1F2937]">{viewingDept.subjects || 0}</div>
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mt-0.5">Subjects</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F6F8FB] border-t border-[#E5E7EB] flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="h-[38px] px-4 bg-white border border-[#E5E7EB] rounded-[10px] text-[#6B7280] hover:text-[#1F2937] text-sm font-semibold transition cursor-pointer active:scale-[0.97]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && deptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-fade-in text-[#1F2937]">
          <div className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertCircle className="w-6 h-6 text-[#C62828]" />
            </div>
            <h3 className="text-lg font-bold text-[#1F2937] mb-1.5">Delete Department</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-5">
              Are you sure you want to delete <span className="font-extrabold text-[#1F2937]">{deptToDelete.department_name}</span>? This action cannot be undone.
            </p>
            
            {/* If linked records exist, block and warn (redundant safety) */}
            {((deptToDelete.students || 0) > 0 || (deptToDelete.faculty || 0) > 0 || (deptToDelete.subjects || 0) > 0) ? (
              <div className="bg-[#C62828]/5 border border-[#C62828]/20 rounded-[10px] p-4 text-left flex gap-3 items-start mb-6">
                <Info className="w-4 h-4 text-[#C62828] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#C62828] uppercase tracking-wider">Cannot Delete</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    This department contains active academic records ({deptToDelete.students || 0} students, {deptToDelete.faculty || 0} faculty, {deptToDelete.subjects || 0} subjects).
                  </p>
                  <p className="text-xs font-semibold text-[#1F2937] mt-2">
                    Suggestion: Deactivate Department instead.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button 
                disabled={submitting}
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-xs font-bold text-[#6B7280] hover:text-[#1F2937] transition cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                disabled={submitting || (deptToDelete.students || 0) > 0 || (deptToDelete.faculty || 0) > 0 || (deptToDelete.subjects || 0) > 0}
                onClick={handleDeleteDepartment} 
                className="flex-1 py-2.5 bg-[#C62828] hover:bg-[#b91c1c] text-white rounded-[10px] text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
