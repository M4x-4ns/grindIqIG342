import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { BeanCard, BeanDrawer } from '@/components/bean-profile'
import type { BeanProfile } from '@/types/bean'

type DrawerState =
  | null
  | { mode: 'add' }
  | { mode: 'edit'; bean: BeanProfile }

export default function BeanProfiles() {
  const { beans, grinders } = useAppStore()

  const [drawer, setDrawer] = useState<DrawerState>(null)

  const activeCount = beans.filter((b) => b.isActive).length
  const hiddenCount = beans.filter((b) => !b.isActive).length

  function handleCardClick(bean: BeanProfile) {
    // If drawer is already open, switch to the new bean in place — no close/reopen
    setDrawer({ mode: 'edit', bean })
  }

  const drawerIsOpen = drawer !== null

  return (
    <div
      className="flex overflow-hidden relative"
      style={{ background: 'var(--bg)', height: 'calc(100vh - 57px)' }}
    >
      {/* Left: grid area */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8"
        style={{ opacity: drawerIsOpen ? 0.4 : 1, transition: 'opacity 180ms' }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between mb-[14px]">
          <div>
            <h1 className="text-[18px] font-black text-white">Bean Profiles</h1>
            <p className="text-[11px] text-[var(--text2)]">
              {activeCount} active · {hiddenCount} hidden
            </p>
          </div>
          <button
            onClick={() => setDrawer({ mode: 'add' })}
            className="bg-[var(--red)] text-white text-[12px] font-bold px-[14px] py-[7px] rounded-[9px]"
          >
            + Add Bean
          </button>
        </div>

        {/* 2-column card grid */}
        <div className="grid grid-cols-2 landscape:grid-cols-3 gap-[9px]">
          {beans.map((bean) => (
            <BeanCard
              key={bean.id}
              bean={bean}
              grinders={grinders}
              isSelected={
                drawer !== null &&
                drawer.mode === 'edit' &&
                drawer.bean.id === bean.id
              }
              onClick={() => handleCardClick(bean)}
            />
          ))}
          {/* Ghost "add" card — only when drawer is closed */}
          {!drawerIsOpen && (
            <button
              onClick={() => setDrawer({ mode: 'add' })}
              className="border-[1.5px] border-dashed border-[var(--border2)] rounded-[13px] p-3 text-[var(--text3)] text-[13px] flex items-center justify-center min-h-[120px] hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
            >
              + Add Bean
            </button>
          )}
        </div>
      </div>

      {/* Right: drawer — 300 px fixed; full-width overlay on mobile */}
      {drawerIsOpen && (
        <div className="flex-shrink-0 h-full overflow-hidden sm:relative sm:w-[300px] absolute right-0 top-0 w-full z-10">
          <BeanDrawer
            mode={drawer.mode}
            bean={drawer.mode === 'edit' ? drawer.bean : undefined}
            grinders={grinders}
            onClose={() => setDrawer(null)}
          />
        </div>
      )}
    </div>
  )
}
