import { Adresskylt } from '../components/Adresskylt'

export function KartaView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <Adresskylt stor />
      <p className="max-w-xs text-sm/6 text-panel/60">Tomten är inte uppritad än.</p>
    </div>
  )
}
