import { useState } from 'react'
import { Users, Search, Activity, SearchX } from 'lucide-react'

// Placeholder for StudentsPage (Since the exact endpoint isn't fully defined yet in the prompt for Step 5, we'll mock the view or use a simple UI state)
// Note: We can implement the real API call later when auth module exposes a get_all_users.
export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dummy data for visual layout
  const mockStudents = [
    { id: 1, name: "Mahima Dangi", email: "mahima@student.com", streak: 5, last_active: "2 hours ago", status: "active" },
    { id: 2, name: "John Doe", email: "john@student.com", streak: 2, last_active: "1 day ago", status: "active" },
    { id: 3, name: "Jane Smith", email: "jane@student.com", streak: 0, last_active: "2 weeks ago", status: "inactive" },
  ]

  const filtered = mockStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Students</h1>
          <p className="text-navy-400 text-sm">Monitor student progress, streaks, and activity.</p>
        </div>
      </div>

      <div className="card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-navy-700 bg-navy-800/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
            <input 
              type="text" 
              placeholder="Search students by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-navy-700 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl text-white outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-900/50 text-navy-400 text-xs uppercase tracking-wider border-b border-navy-700">
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Email Address</th>
                <th className="p-4 font-semibold text-center">Streak</th>
                <th className="p-4 font-semibold">Last Active</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-navy-500">
                    <SearchX className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No students found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-navy-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center border border-brand/30">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-white font-medium text-sm">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-navy-300 text-sm">{student.email}</td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold">
                        🔥 {student.streak}
                      </div>
                    </td>
                    <td className="p-4 text-navy-400 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" /> {student.last_active}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                        student.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
