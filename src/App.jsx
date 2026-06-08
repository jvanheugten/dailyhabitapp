import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <div className={styles.app}>
          <main className={styles.main}>
            {activeTab === 'today' && <Today />}
            {activeTab === 'habits' && <Habits />}
            {activeTab === 'journal' && <Journal />}
          </main>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </JournalProvider>
    </HabitsProvider>
  )
}
