import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { FelVakt } from './components/FelVakt'
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
  // 'ej-behorig' MÅSTE fångas här. Faller den igenom kastar useDataRot inne i
  // DataProvider och hela appen blir en vit skärm utan förklaring.
  if (auth.status === 'utloggad' || auth.status === 'ej-behorig') return <LoggaInView />
  return (
    <DataProvider>
      <PlaceraProvider>
        <NyVaxtProvider>
          <RullaUpp />
          <FelVakt />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HemView />} />
              <Route path="ritning" element={<RitningView />} />
              <Route path="ritning/rita" element={<RitaView />} />
              <Route path="vaxter" element={<VaxterView />} />
              {/* key på id: annars behåller kortet state när man byter växt. */}
              <Route path="vaxter/:id" element={<NyckladVaxt />} />
              <Route path="platser/:id" element={<NykladPlats />} />
              <Route path="logg" element={<LoggView />} />
              <Route path="*" element={<HemView />} />
            </Route>
          </Routes>
        </NyVaxtProvider>
      </PlaceraProvider>
    </DataProvider>
  )
}

/** Tvingar om-montering när id:t byts, så inget state läcker mellan kort. */
function NyckladVaxt() {
  const { id } = useParams()
  return <VaxtView key={id} />
}

function NykladPlats() {
  const { id } = useParams()
  return <PlatsView key={id} />
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
