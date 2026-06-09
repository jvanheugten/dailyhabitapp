import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { HealthProvider } from './contexts/HealthContext'
import { VitalsProvider } from './contexts/VitalsContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { Health } from './screens/Health'
import { Stats } from './screens/Stats'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <HealthProvider>
          <VitalsProvider>
            <div className={styles.app}>
              <main className={styles.main}>
                {activeTab === 'today' && <Today />}
                {activeTab === 'habits' && <Habits />}
                {activeTab === 'journal' && <Journal />}
                {activeTab === 'health' && <Health />}
                {activeTab === 'stats' && <Stats />}
              </main>
              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </VitalsProvider>
        </HealthProvider>
      </JournalProvider>
    </HabitsProvider>
  )
}
