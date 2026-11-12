import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { BottomNav } from './components/BottomNav'
import { ToastProvider } from './components/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import DecksPage from './features/decks/DecksPage'
import EventDetailPage from './features/events/EventDetailPage'
import EventFormPage from './features/events/EventFormPage'
import EventListPage from './features/events/EventListPage'
import MatchPage from './features/matches/MatchPage'
import SettingsPage from './features/settings/SettingsPage'
import StatsPage from './features/stats/StatsPage'

/** 하단 탭이 있는 화면의 공통 틀 */
function TabLayout() {
  return (
    <>
      <main className="mx-auto max-w-md pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    // HashRouter: 어떤 정적 호스팅에 올려도 새로고침 시 404 가 나지 않는다
    <HashRouter>
      <ToastProvider>
        <UpdatePrompt />
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<EventListPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="decks" element={<DecksPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="events/new" element={<EventFormPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="events/:eventId/edit" element={<EventFormPage />} />
          <Route path="events/:eventId/match/new" element={<MatchPage />} />
          <Route path="match/new" element={<MatchPage />} />
          <Route path="match/:matchId" element={<MatchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  )
}
