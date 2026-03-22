interface BadgeProps {
  icon: string
  value: string
  variant: 'pos' | 'neg' | 'zero'
}

const variantStyles: Record<BadgeProps['variant'], string> = {
  pos:  'border-[rgba(255,160,100,.3)] text-[#ffb080]',
  neg:  'border-[rgba(100,180,255,.3)] text-[#90c8ff]',
  zero: 'border-transparent text-white/40',
}

export function Badge({ icon, value, variant }: BadgeProps) {
  return (
    <div
      className={`flex items-center gap-[5px] bg-black/30 border border-white/10 rounded-full px-[10px] py-[5px] text-xs font-bold whitespace-nowrap ${variantStyles[variant]}`}
    >
      <span className="text-[11px]">{icon}</span>
      {value}
    </div>
  )
}
