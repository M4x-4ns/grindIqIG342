import { useAppStore } from '@/store/useAppStore'
import { BeanForm } from './BeanForm'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

interface BeanDrawerProps {
  mode: 'add' | 'edit'
  bean?: BeanProfile
  grinders: GrinderConfig[]
  onClose: () => void
}

export function BeanDrawer({ mode, bean, grinders, onClose }: BeanDrawerProps) {
  const { createBean, updateBean, deleteBean, isSaving } = useAppStore()

  async function handleSave(saved: BeanProfile) {
    if (mode === 'add') {
      await createBean(saved)
    } else {
      await updateBean(saved)
    }
    onClose()
  }

  async function handleHide() {
    if (!bean) return
    await updateBean({ ...bean, isActive: false })
    onClose()
  }

  async function handleDelete() {
    if (!bean) return
    await deleteBean(bean.id)
    onClose()
  }

  return (
    <div className="flex flex-col h-full bg-[var(--card2)] border-l border-[var(--border)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--card2)] border-b border-[var(--border)] px-[14px] py-[12px] flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold text-[var(--text)]">
            {mode === 'add' ? 'New Bean Profile' : 'Edit Bean Profile'}
          </div>
          {mode === 'edit' && bean && (
            <div className="text-[11px] text-[var(--text2)] mt-[1px]">{bean.name}</div>
          )}
        </div>
        <button
          onClick={onClose}
          disabled={isSaving}
          aria-label="Close drawer"
          className="text-[18px] text-[var(--text3)] leading-none ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px]">
        <BeanForm
          key={mode === 'edit' ? bean?.id : 'new'}
          initialBean={mode === 'edit' ? bean : undefined}
          grinders={grinders}
          onSave={handleSave}
          onHide={mode === 'edit' ? handleHide : undefined}
          onDelete={mode === 'edit' ? handleDelete : undefined}
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}
