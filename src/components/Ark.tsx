import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

/**
 * "Ark" — appens enda överlagring. Bottensheet i mobilen, samma sak centrerad
 * på desktop. Aldrig modaler (se CLAUDE.md). Vaul sköter draggest, snappunkt
 * och fokusfångst.
 */
export function Ark({
  oppen,
  onOppenChange,
  titel,
  beskrivning,
  children,
  fotnot,
}: {
  oppen: boolean
  onOppenChange: (oppen: boolean) => void
  titel: string
  beskrivning?: string
  children: ReactNode
  fotnot?: ReactNode
}) {
  return (
    <Drawer.Root open={oppen} onOpenChange={onOppenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-botten/75" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg
            flex-col rounded-t-2xl border-t border-linje bg-panel outline-none"
        >
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-linje" aria-hidden />
          <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-1">
            <Drawer.Title className="font-display text-lg font-semibold text-ljus">
              {titel}
            </Drawer.Title>
          </div>
          {beskrivning ? (
            <Drawer.Description className="px-5 pb-1 text-sm text-dis">
              {beskrivning}
            </Drawer.Description>
          ) : (
            <Drawer.Description className="sr-only">{titel}</Drawer.Description>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5">{children}</div>
          {fotnot && (
            <div className="shrink-0 border-t border-linje px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {fotnot}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
