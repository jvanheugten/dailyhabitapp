import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { HealthProvider } from './contexts/HealthContext'
import { VitalsProvider } from './contexts/VitalsContext'
import { SyncProvider } from './contexts/SyncContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { Health } from './screens/Health'
import { Stats } from './screens/Stats'
import { Settings } from './screens/Settings'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <HealthProvider>
          <VitalsProvider>
            <SyncProvider>
              <div className={styles.app}>
                <main className={styles.main}>
                  {activeTab === 'today' && <Today />}
                  {activeTab === 'habits' && <Habits />}
                  {activeTab === 'journal' && <Journal />}
                  {activeTab === 'health' && <Health />}
                  {activeTab === 'stats' && <Stats />}
                  {activeTab === 'settings' && <Settings />}
                </main>
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </SyncProvider>
          </VitalsProvider>
        </HealthProvider>
      </JournalProvider>
    </HabitsProvider>
  )
}
