import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, Award, BookOpen, ChevronRight, ShieldAlert, ArrowLeft } from 'lucide-react'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

export default function TestInstructionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTestDetail()
  }, [id])

  const fetchTestDetail = async () => {
    try {
      const data = await placementService.getTestDetail(id)
      setTest(data)
    } catch (error) {
      toast.error("Failed to load test details")
      navigate('/tests')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTest = async () => {
    try {
      await placementService.startOrResumeTest(id)
      toast.success("Attempt started successfully!")
      navigate(`/tests/${id}/start`)
    } catch (error) {
      toast.error("Failed to initialize test attempt")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back Link */}
        <Link to="/tests" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to all tests
        </Link>

        {/* Test Card Header */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded">
                {test.category}
              </span>
              <span className="text-xs uppercase tracking-wider font-extrabold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                {test.difficulty}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold font-outfit mt-4">
              {test.title}
            </h1>
            
            <p className="text-white/75 text-sm mt-3 leading-relaxed">
              {test.description || "Prepare for top engineering roles by testing your fundamentals, algorithmic implementation, and analytical speed."}
            </p>
          </div>

          {/* Test Meta Info */}
          <div className="grid grid-cols-3 gap-6 bg-white/5 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-white/40">Duration</div>
                <div className="font-bold text-sm md:text-base">{test.duration_minutes} Minutes</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-white/40">Total Marks</div>
                <div className="font-bold text-sm md:text-base">{test.total_marks} Marks</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-white/40">Questions</div>
                <div className="font-bold text-sm md:text-base">{test.questions_count || 0} Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Breakdown & Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold font-outfit mb-4">Section Breakdown</h2>
            <div className="space-y-3">
              {test.sections_breakdown && Object.keys(test.sections_breakdown).length > 0 ? (
                Object.entries(test.sections_breakdown).map(([section, count]) => (
                  <div key={section} className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                    <span className="font-medium text-white/80">{section}</span>
                    <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-400">
                      {count} {count === 1 ? 'question' : 'questions'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm py-2">No sections defined.</div>
              )}
            </div>
          </div>

          {/* Test Rules */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-outfit">Assessment Rules</h2>
            <ul className="space-y-3 text-sm text-white/80 list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Time Limit:</strong> Once started, you have exactly {test.duration_minutes} minutes to complete the test.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>No Tab Switching:</strong> Swapping to other browser tabs or windows is logged as a violation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Full-Screen Mode:</strong> The test runs in full-screen mode to maintain academic integrity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Auto-Submit:</strong> When the countdown timer reaches zero, the attempt is submitted automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Answer Persistence:</strong> Answers are automatically saved to the database in real-time.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Start Button */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/60">
              Ensure you have a stable internet connection before launching. You can resume an in-progress attempt if you are disconnected.
            </p>
          </div>
          <button
            onClick={handleStartTest}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-extrabold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 shrink-0"
          >
            Launch Assessment
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
