import { useSearchParams } from 'react-router-dom'
import { BookOpen, Sparkles } from 'lucide-react'
import HubLayout from '../../components/HubLayout'
import NotesPage from './NotesPage'
import StudentSummaryView from './StudentSummaryView'

export default function StudentNotesHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'notes'

  const tabs = [
    { id: 'notes', label: 'My Notes', icon: BookOpen },
    { id: 'summaries', label: 'AI Summaries', icon: Sparkles }
  ]

  const handleTabChange = (id) => {
    setSearchParams({ tab: id })
  }

  return (
    <HubLayout 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        {activeTab === 'notes' && <NotesPage />}
        {activeTab === 'summaries' && <StudentSummaryView />}
      </div>
    </HubLayout>
  )
}
