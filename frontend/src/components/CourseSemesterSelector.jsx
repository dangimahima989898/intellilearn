import { useState, useEffect, useMemo } from "react"
import courseService from "../services/courseService"
import { Loader2, Users } from "lucide-react"

export default function CourseSemesterSelector({ onSelect, required = false, initialCourseId = "", initialSemester = "" }) {
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId)
  const [selectedSemester, setSelectedSemester] = useState(initialSemester ? String(initialSemester) : "")
  const [studentCount, setStudentCount] = useState(null)
  const [countLoading, setCountLoading] = useState(false)

  // Sync prop changes
  useEffect(() => {
    if (initialCourseId !== undefined) {
      setSelectedCourseId(initialCourseId)
    }
  }, [initialCourseId])

  useEffect(() => {
    if (initialSemester !== undefined) {
      setSelectedSemester(initialSemester ? String(initialSemester) : "")
    }
  }, [initialSemester])

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true)
      try {
        const data = await courseService.getCourses()
        setCourses(data)
      } catch (err) {
        console.error("Failed to load courses for selector:", err)
      } finally {
        setCoursesLoading(false)
      }
    }
    fetchCourses()
  }, [])

  // Find active course object
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)
  }, [courses, selectedCourseId])

  // Fetch estimated recipients when selection changes
  useEffect(() => {
    const fetchStudentCount = async () => {
      if (!selectedCourseId) {
        setStudentCount(null)
        return
      }
      setCountLoading(true)
      try {
        const data = await courseService.getStudentCount(selectedCourseId, selectedSemester || "")
        setStudentCount(data.count)
      } catch (err) {
        console.error("Failed to fetch students count:", err)
      } finally {
        setCountLoading(false)
      }
    }
    
    fetchStudentCount()
    
    // Fire callback
    onSelect({
      courseId: selectedCourseId || null,
      semesterNumber: selectedSemester ? parseInt(selectedSemester) : null,
      courseName: activeCourse?.name || null,
      courseCode: activeCourse?.code || null
    })
  }, [selectedCourseId, selectedSemester, activeCourse, onSelect])

  // Reset semester selection when course changes
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId)
    setSelectedSemester("")
  }

  return (
    <div className="flex flex-col gap-3.5 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
          Target Course & Semester {required && <span className="text-red-400">*</span>}
        </label>
        {countLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Course Dropdown */}
        <div>
          {coursesLoading ? (
            <div className="h-11 flex items-center justify-center text-xs text-white/40 bg-white/5 rounded-xl border border-white/5">
              <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-400" />
              Loading Courses...
            </div>
          ) : (
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              required={required}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer font-medium appearance-none"
            >
              <option value="" className="bg-[#0f172a] text-white/40">
                {required ? "Select Course..." : "All Courses (Global)"}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id} className="bg-[#0f172a] text-white">
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Semester Dropdown */}
        <div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedCourseId}
            className="w-full h-11 bg-white/5 disabled:opacity-40 border border-white/10 disabled:border-white/5 rounded-xl px-4 text-sm text-white disabled:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer font-medium appearance-none"
          >
            <option value="" className="bg-[#0f172a] text-white/40">
              {selectedCourseId ? "All Semesters (Global)" : "Select Course First..."}
            </option>
            {activeCourse &&
              Array.from({ length: activeCourse.total_semesters }).map((_, i) => {
                const semNum = i + 1
                return (
                  <option key={semNum} value={semNum} className="bg-[#0f172a] text-white">
                    Semester {semNum}
                  </option>
                )
              })}
          </select>
        </div>
      </div>

      {/* Recipient Audience indicator */}
      {selectedCourseId && studentCount !== null && (
        <div className="animate-fade-in flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/10 rounded-xl px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <Users className="w-3.5 h-3.5" />
          <span>
            Target Audience: ~{studentCount} {activeCourse?.code}{" "}
            {selectedSemester ? `Semester ${selectedSemester}` : "students (Global)"}
          </span>
        </div>
      )}
    </div>
  )
}
