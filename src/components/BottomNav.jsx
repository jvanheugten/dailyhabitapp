import styles from './BottomNav.module.css'

const TABS = [
  { id: 'today', label: 'Today', icon: '✅' },
  { id: 'habits', label: 'Habits', icon: '⚙️' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'health', label: 'Health', icon: '🩺' },
  { id: 'stats', label: 'Stats', icon: '📊' },
]

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
