import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { NyVaxtProvider } from './components/NyVaxt'
import { RullaUpp } from './components/RullaUpp'
import { DataProvider } from './data/DataProvider'
import { PlaceraProvider } from './data/PlaceraProvider'
import { HemView } from './views/HemView'
import { LoggaInView } from './views/LoggaInView'
import { LoggView } from './views/LoggView'
import { PlatsView } from './views/PlatsView'
import { RitaView } from './views/RitaView'
import { RitningView } from './views/RitningView'
import { VaxterView } from './views/VaxterView'
import { VaxtView } from './views/VaxtView'

function AppRoutes() {
  const auth = useAuth()
  if (auth.status === 'laddar') return null
  if (auth.status === 'utloggad') return <LoggaInView />
  return (
    <DataProvider>
      <PlaceraProvider>
        <NyVaxtProvider>
          <RullaUpp />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HemView />} />
              <Route path="ritning" element={<RitningView />} />
              <Route path="ritning/rita" element={<RitaView />} />
              <Route path="vaxter" element={<VaxterView />} />
              <Route path="vaxter/:id" element={<VaxtView />} />
              <Route path="platser/:id" element={<PlatsView />} />
              <Route path="logg" element={<LoggView />} />
              <Route path="*" element={<HemView />} />
            </Route>
          </Routes>
        </NyVaxtProvider>
      </PlaceraProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        {/* Toasts ligger ovanför bottenraden i mobilen. */}
        <Toaster
          position="bottom-center"
          offset={88}
          mobileOffset={88}
          toastOptions={{ unstyled: true, className: 'w-full' }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
