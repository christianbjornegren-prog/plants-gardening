import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { KartaView } from './views/KartaView'
import { LoggaInView } from './views/LoggaInView'
import { LoggView } from './views/LoggView'
import { VaxterView } from './views/VaxterView'
import { YtorView } from './views/YtorView'

function AppRoutes() {
  const auth = useAuth()
  if (auth.status === 'laddar') return null
  if (auth.status === 'utloggad') return <LoggaInView />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<KartaView />} />
        <Route path="vaxter" element={<VaxterView />} />
        <Route path="ytor" element={<YtorView />} />
        <Route path="logg" element={<LoggView />} />
        <Route path="*" element={<KartaView />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
