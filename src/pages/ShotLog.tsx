import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { StatsCard }    from '@/components/shot-log/StatsCard'
import { FilterStrip }  from '@/components/shot-log/FilterStrip'
import type { FeedbackFilter } from '@/components/shot-log/FilterStrip'
import { ShotRow }      from '@/components/shot-log/ShotRow'
import { DetailDrawer } from '@/components/shot-log/DetailDrawer'
import type { ShotLog as ShotLogEntry } from '@/types/shot'

function dayKey(d: Date): string { return d.toISOString().slice(0, 10) }

function fmtDateHeader(iso: string): string {
  const d    = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * PRD F-05 -- Shot Log
 * Historical shots grouped by date, filterable by feedback + grinder.
 */
export default function ShotLog() {
  const { shots, grinders, beans } = useAppStore()

  const [feedback,   setFeedback]   = useState<FeedbackFilter>('all')
  const [grinderIds, setGrinderIds] = useState<Set<string>>(new Set())
  const [activeShot, setActiveShot] = useState<ShotLogEntry | null>(null)

  const toggleGrinder = useCallback((id: string) => {
    setGrinderIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const filtered = shots.filter(s => {
    if (feedback !== 'all' && s.feedback !== feedback) return false
    if (grinderIds.size > 0 && !grinderIds.has(s.grinderId)) return false
    return true
  })

  const groupMap = new Map<string, ShotLogEntry[]>()
  for (const s of filtered) {
    const k = dayKey(new Date(s.createdAt))
    if (!groupMap.has(k)) groupMap.set(k, [])
    groupMap.get(k)!.push(s)
  }
  const groups = Array.from(groupMap.entries()).map(([key, rows]) => ({
    key,
    label: fmtDateHeader(rows[0].createdAt),
    shots: rows,
  }))

  const activeBean    = activeShot ? beans.find(b => b.id === activeShot.beanId)       : undefined
  const activeGrinder = activeShot ? grinders.find(g => g.id === activeShot.grinderId) : undefined

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl landscape:max-w-5xl mx-auto">

        {/* Stats card */}
        <div className="px-4 pt-4">
          <StatsCard shots={shots} />
        </div>

        {/* Filter strip */}
        <div className="px-4">
          <FilterStrip
            feedback={feedback}
            grinderIds={grinderIds}
            onFeedback={setFeedback}
            onToggleGrinder={toggleGrinder}
          />
        </div>

        {/* Shot list */}
        <div className="px-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[60px] text-center">
              <div className="text-[48px] opacity-30 mb-4">🔍</div>
              <div className="text-[15px] text-[var(--muted)] leading-[1.7]">
                No shots match this filter.<br />Try adjusting the filters above.
              </div>
            </div>
          ) : (
            groups.map(group => {
              const perfInGroup = group.shots.filter(s => s.feedback === 'perfect').length
              return (
                <div key={group.key} className="mt-5">
                  {/* Date header */}
                  <div className="flex items-center gap-[10px] mb-[10px]">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-[.8px] whitespace-nowrap">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[10px] text-[var(--muted)] bg-[var(--card2)] border border-[var(--border)] rounded-full px-[9px] py-[2px] whitespace-nowrap">
                      {group.shots.length} shots \u00B7 {perfInGroup} perfect
                    </span>
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col gap-2">
                    {group.shots.map(shot => (
                      <ShotRow
                        key={shot.id}
                        shot={shot}
                        bean={beans.find(b => b.id === shot.beanId)}
                        grinder={grinders.find(g => g.id === shot.grinderId)}
                        onClick={() => setActiveShot(shot)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Detail drawer */}
      <DetailDrawer
        shot={activeShot}
        bean={activeBean}
        grinder={activeGrinder}
        onClose={() => setActiveShot(null)}
      />
    </div>
  )
}
