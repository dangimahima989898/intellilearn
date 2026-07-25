/**
 * AdminScheduleHub — unified Schedule page with 2 tabs:
 *   timetable | events
 *
 * URL: /admin/schedule?tab=timetable (default)
 */
import { useSearchParams } from 'react-router-dom'
import { Calendar, CalendarDays } from 'lucide-react'
import HubLayout from '../../components/HubLayout'
import TimetablePage from './TimetablePage'
import EventsPage from './EventsPage'

export default function AdminScheduleHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'timetable'

  const tabs = [
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'events', label: 'Events & Exams', icon: CalendarDays }
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
        {activeTab === 'timetable' && <TimetablePage />}
        {activeTab === 'events' && <EventsPage />}
      </div>
    </HubLayout>
  )
}
