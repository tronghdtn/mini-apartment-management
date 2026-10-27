
export interface TabItem<T extends string = string> {
  id: T
  label: string
  count?: number
}

interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (tabId: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  className = '',
}: TabsProps<T>) {
  const sizeStyles = {
    sm: 'text-xs sm:text-sm px-3 py-1.5 gap-1.5 font-medium',
    md: 'text-sm px-4 py-2 gap-2 font-medium',
  }

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              sizeStyles[size]
            } ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
