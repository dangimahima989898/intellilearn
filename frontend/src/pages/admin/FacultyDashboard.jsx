import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Clock, ArrowRight } from 'lucide-react'
import api from '../../services/api'
import PageWrapper from '../../components/PageWrapper'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    const fetchAssignedSubjects = async () => {
      try {
        const res = await api.get('/api/v1/hod/faculty')
        const me = res.data.find(f => f.email === user?.email)
        if (me && me.subjects) {
          setSubjects(me.subjects)
        }
      } catch (err) {
        toast.error("Failed to load assigned subjects")
      } finally {
        setLoading(false)
      }
    }
    fetchAssignedSubjects()
  }, [user])

  return (
    <PageWrapper title="Faculty Dashboard">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-6">
        
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name}</h1>
          <p className="text-white/50 text-sm">Here are the subjects you are currently managing.</p>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            {[1,2].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/10"></div>)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No Subjects Assigned</h3>
            <p className="text-sm text-white/50">Your HOD has not assigned any subjects to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map(sub => (
              <div key={sub.assignment_id} className="il-card relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BookOpen size={80} className="text-brand"/>
                </div>
                
                <div className="il-icon-badge il-icon-badge-blue mb-4">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">{sub.code}</h3>
                <p className="text-sm font-medium text-white/50 mb-6">{sub.name}</p>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/admin/notes?tab=browse&subjectId=${sub.subject_id}`)}
                    className="il-btn il-btn-secondary flex-1 text-xs font-semibold py-2"
                  >
                    Manage Notes
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/notes?tab=analytics&subjectId=${sub.subject_id}`)}
                    className="il-btn il-btn-primary flex-1 text-xs font-semibold py-2"
                  >
                    Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
