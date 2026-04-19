import { useEffect } from 'react'
import { NavLink, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SensorStatus } from '@/components/sensor/SensorStatus'
import { useAppStore } from '@/store/useAppStore'
import Dashboard from '@/pages/Dashboard'
import ShotLog from '@/pages/ShotLog'
import BeanProfiles from '@/pages/BeanProfiles'

function AppShell() {
  const { hydrateFromApi, isLoading } = useAppStore()

  useEffect(() => {
    hydrateFromApi()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-[32px] animate-pulse">☕</div>
          <div className="text-[13px] text-[var(--muted)]">Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-[14px] border-b border-[var(--border)]"
        style={{
          background: 'rgba(12,12,14,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-[9px]">
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[18px]"
            style={{
              background: 'linear-gradient(145deg,var(--red),var(--red2))',
              boxShadow: '0 2px 12px var(--red-glow)',
            }}
          >
            ☕
          </div>
          <div>
            <div className="text-[19px] font-black tracking-[-0.5px] text-white">GrindIQ</div>
            <div className="text-[10px] text-[var(--muted)] font-medium tracking-[.3px]">Grind Calculator</div>
          </div>
        </div>

        {/* Tab nav + sensor pill */}
        <div className="flex items-center gap-[10px]">
          <div className="flex bg-[var(--card2)] border border-[var(--border2)] rounded-[10px] p-[3px] gap-[2px]">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              ☕ Brew
            </NavLink>
            <NavLink
              to="/shots"
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              📋 Log
            </NavLink>
            <NavLink
              to="/beans"
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              🫘 Beans
            </NavLink>
          </div>
          {/* SensorStatus renders as a compact pill with click-to-expand modal */}
          <SensorStatus />
          <span className="text-[10px] text-[var(--muted)] select-none">v{__APP_VERSION__}</span>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,   element: <Dashboard /> },
      { path: 'shots', element: <ShotLog /> },
      { path: 'beans', element: <BeanProfiles /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
