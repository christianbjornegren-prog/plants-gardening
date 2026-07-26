import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { DataProvider } from './data/DataProvider'
import { KartaView } from './views/KartaView'
import { RedigeraKartaView } from './views/RedigeraKartaView'
import { LoggaInView } from './views/LoggaInView'
import { LoggView } from './views/LoggView'
import { VaxtDetaljView } from './views/VaxtDetaljView'
import { VaxterView } from './views/VaxterView'
import { VaxtFormView } from './views/VaxtFormView'
import { YtaDetaljView } from './views/YtaDetaljView'
import { YtaFormView } from './views/YtaFormView'
import { YtorView } from './views/YtorView'

function AppRoutes() {
  const auth = useAuth()
  if (auth.status === 'laddar') return null
  if (auth.status === 'utloggad') return <LoggaInView />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<KartaView />} />
          <Route path="karta/redigera" element={<RedigeraKartaView />} />
          <Route path="vaxter" element={<VaxterView />} />
          <Route path="vaxter/ny" element={<VaxtFormView />} />
          <Route path="vaxter/:id" element={<VaxtDetaljView />} />
          <Route path="vaxter/:id/andra" element={<VaxtFormView />} />
          <Route path="ytor" element={<YtorView />} />
          <Route path="ytor/ny" element={<YtaFormView />} />
          <Route path="ytor/:id" element={<YtaDetaljView />} />
          <Route path="ytor/:id/andra" element={<YtaFormView />} />
          <Route path="logg" element={<LoggView />} />
          <Route path="*" element={<KartaView />} />
        </Route>
      </Routes>
    </DataProvider>
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
