import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Clock, Award, ShieldAlert, CheckCircle, Search, Filter } from 'lucide-react'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

export default function TestListingPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters state
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [testType, setTestType] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTests()
  }, [category, difficulty, testType])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (category) filters.category = category
      if (difficulty) filters.difficulty = difficulty
      if (testType) filters.test_type = testType
      
      const data = await placementService.getTests(filters)
      setTests(data)
    } catch (error) {
      toast.error("Failed to fetch placement tests")
    } finally {
      setLoading(false)
    }
  }

  const filteredTests = tests.filter(test => 
    test.title.toLowerCase().includes(search.toLowerCase()) ||
    test.category.toLowerCase().includes(search.toLowerCase())
  )

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'hard': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'aptitude': return 'Aptitude Test'
      case 'coding': return 'Coding Challenge'
      case 'mixed': return 'Mixed Assessment'
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-outfit font-extrabold tracking-tight">Placement Test Simulator</h1>
            <p className="text-white/60 text-sm mt-1">Prepare for campus placements with timed MCQs, analytical logic, and coding challenges.</p>
          </div>
          <Link 
            to="/dashboard/my-tests"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/10 self-start"
          >
            My Attempt History
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm placeholder-white/40"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto md:ml-auto">
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="" className="bg-[#0A0F1E]">All Categories</option>
              <option value="Engineering" className="bg-[#0A0F1E]">Engineering</option>
              <option value="Analytics" className="bg-[#0A0F1E]">Analytics</option>
              <option value="General" className="bg-[#0A0F1E]">General</option>
            </select>

            {/* Test Type Filter */}
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="" className="bg-[#0A0F1E]">All Types</option>
              <option value="aptitude" className="bg-[#0A0F1E]">Aptitude</option>
              <option value="coding" className="bg-[#0A0F1E]">Coding Only</option>
              <option value="mixed" className="bg-[#0A0F1E]">Mixed</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="" className="bg-[#0A0F1E]">All Difficulties</option>
              <option value="easy" className="bg-[#0A0F1E]">Easy</option>
              <option value="medium" className="bg-[#0A0F1E]">Medium</option>
              <option value="hard" className="bg-[#0A0F1E]">Hard</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-white/5 rounded-xl border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
            <ShieldAlert className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 font-medium">No placement tests found matching the selected filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <div 
                key={test.id} 
                className="bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden"
              >
                {/* Attempted Badge */}
                {test.attempted && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Attempted
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded">
                      {test.category}
                    </span>
                    <span className={`text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 rounded border ${getDifficultyColor(test.difficulty)}`}>
                      {test.difficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-outfit mt-4 group-hover:text-blue-400 transition-colors">
                    {test.title}
                  </h3>
                  
                  <p className="text-white/60 text-sm mt-2 line-clamp-2">
                    {test.description || "Take this placement simulator challenge to practice core concepts, problem solving, and optimize runtime performance."}
                  </p>

                  <div className="grid grid-cols-3 gap-4 mt-6 border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                      <span className="text-white/40 text-xs">Duration</span>
                      <span className="font-bold flex items-center gap-1.5 mt-0.5 text-sm">
                        <Clock className="w-4 h-4 text-blue-400" />
                        {test.duration_minutes}m
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/40 text-xs">Max Marks</span>
                      <span className="font-bold flex items-center gap-1.5 mt-0.5 text-sm">
                        <Award className="w-4 h-4 text-purple-400" />
                        {test.total_marks}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/40 text-xs">Questions</span>
                      <span className="font-bold flex items-center gap-1.5 mt-0.5 text-sm">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        {test.questions_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/tests/${test.id}`)}
                    className="w-full text-center py-2.5 bg-white/5 border border-white/10 hover:bg-blue-600 hover:border-blue-600 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    Start Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
