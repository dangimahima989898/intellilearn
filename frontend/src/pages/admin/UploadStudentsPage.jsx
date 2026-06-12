import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Loader2,
  Table,
  ArrowLeft,
  RefreshCw
} from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"

const API_BASE_URL = "http://localhost:8000/api"

export default function UploadStudentsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [error, setError] = useState("")

  const handleFileChange = (e) => {
    setError("")
    setPreviewData(null)
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  // Trigger preview parsing (POST with preview=true)
  const handleUploadPreview = async (e) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file first")
      return
    }

    setLoading(true)
    setError("")
    
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/upload-students?preview=true`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      )
      setPreviewData(response.data)
      toast.success("File parsed successfully! Review the preview below.")
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to parse file. Ensure format is correct."
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Trigger actual saving (POST with preview=false)
  const handleConfirmUpload = async () => {
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/upload-students?preview=false`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      )
      
      const stats = response.data
      toast.success(
        `Successfully imported ${stats.success_count} students! (${stats.duplicate_count} duplicates skipped)`
      )
      
      // Redirect back to students page
      navigate("/admin/students")
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to commit upload."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-dm text-white p-8 relative overflow-hidden">
      {/* Aurora Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-blue-500/10 top-10 left-10" />
        <div className="aurora-orb w-80 h-80 bg-teal-500/10 bottom-20 right-5" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/students"
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-all hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-outfit font-bold">Bulk Upload Enrolled Cohort</h1>
              <p className="text-white/40 text-sm mt-0.5">Authorise multiple student records in bulk via CSV or Excel sheets</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* UPLOAD FORM PANEL */}
          <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl h-fit">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" /> Select File
            </h3>

            <form onSubmit={handleUploadPreview} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors relative cursor-pointer group bg-white/5">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-white/30 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                <span className="text-xs font-semibold text-white/70 block group-hover:text-white transition-colors">
                  {file ? file.name : "Drag & Drop or Click"}
                </span>
                <span className="text-[10px] text-white/40 mt-1 block">Supports CSV, XLSX, XLS</span>
              </div>

              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing Data...
                  </>
                ) : (
                  "Parse & Preview File"
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-4 text-[11px] text-white/40 leading-relaxed">
              <span className="font-semibold text-white/60 block mb-1">Required Headers:</span>
              <code>full_name, email, enrollment_number, semester, branch, section, academic_year</code>
            </div>
          </div>

          {/* PARSING PREVIEW PANEL */}
          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Table className="w-5 h-5 text-teal-400" /> Preview Sheet Content
              </h3>

              {!previewData ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/30 border border-white/5 border-dashed rounded-xl bg-white/3">
                  <FileText className="w-12 h-12 mb-3" />
                  <span className="text-sm font-semibold">No file parsed yet</span>
                  <span className="text-xs mt-1">Upload and parse a file to see preview rows</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Stats Badges */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-xs text-white/40 block">Valid Rows</span>
                      <span className="text-2xl font-bold font-outfit text-teal-400">{previewData.success_count}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-xs text-white/40 block">Duplicates (Skip)</span>
                      <span className="text-2xl font-bold font-outfit text-yellow-500">{previewData.duplicate_count}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-xs text-white/40 block">Errors Found</span>
                      <span className="text-2xl font-bold font-outfit text-red-500">{previewData.error_count}</span>
                    </div>
                  </div>

                  {/* Errors log if any */}
                  {previewData.error_count > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-h-32 overflow-y-auto">
                      <span className="text-red-400 font-semibold text-xs block mb-1">Parsing / Format Errors:</span>
                      <ul className="list-disc pl-4 text-xs text-red-300/80 space-y-1">
                        {previewData.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#0f172a]/60">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-white/70 font-semibold">
                          <th className="p-3">Name</th>
                          <th className="p-3">Enrollment No.</th>
                          <th className="p-3">Semester</th>
                          <th className="p-3">Branch</th>
                          <th className="p-3">Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.preview_rows.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                            <td className="p-3 font-medium text-white">{row.full_name}</td>
                            <td className="p-3 text-white/60 font-mono">{row.enrollment_number}</td>
                            <td className="p-3 text-white/60">Sem {row.semester}</td>
                            <td className="p-3 text-white/60">{row.branch}</td>
                            <td className="p-3 text-white/60">Sec {row.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <span className="text-[10px] text-white/40 -mt-2">Showing first {previewData.preview_rows.length} rows preview</span>
                </div>
              )}
            </div>

            {previewData && (
              <div className="flex gap-4 mt-6 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => { setPreviewData(null); setFile(null); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={loading || previewData.success_count === 0}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Records...
                    </>
                  ) : (
                    "Confirm & Import Cohort"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
