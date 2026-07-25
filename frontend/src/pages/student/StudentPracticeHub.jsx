import { useSearchParams } from 'react-router-dom'
import { Zap, Target, Trophy } from 'lucide-react'
import HubLayout from '../../components/HubLayout'
import QuestionGeneratorPage from './QuestionGeneratorPage'
import AdaptiveQuizPage from './AdaptiveQuizPage'
import DailyChallengePage from './DailyChallengePage'

export default function StudentPracticeHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'questions'

  const tabs = [
    { id: 'questions', label: 'Questions', icon: Zap },
    { id: 'quiz', label: 'Adaptive Quiz', icon: Target },
    { id: 'challenge', label: 'Daily Challenge', icon: Trophy }
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
        {activeTab === 'questions' && <QuestionGeneratorPage />}
        {activeTab === 'quiz' && <AdaptiveQuizPage />}
        {activeTab === 'challenge' && <DailyChallengePage />}
      </div>
    </HubLayout>
  )
}
