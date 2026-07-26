import { toast } from 'sonner'

/**
 * Appens enda kvittens. Sonner körs `unstyled` så att toasten följer paletten
 * i stället för att ta med sig ett främmande utseende.
 *
 * Ångra i sex sekunder. Den valfria extra åtgärden används av beskärningen
 * ("Ta en bild") — händelsen är redan sparad, bilden är ett erbjudande.
 */
export function kvittera({
  text,
  onAngra,
  extra,
}: {
  text: string
  onAngra: () => void
  extra?: { etikett: string; onKlick: () => void }
}): void {
  toast.custom(
    (t) => (
      <div
        role="status"
        className="flex w-full items-center gap-2 rounded-xl border border-linje bg-panel px-4 py-3 shadow-lg shadow-botten/60"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-tusch">{text}</span>
        {extra && (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t)
              extra.onKlick()
            }}
            className="min-h-9 shrink-0 rounded-lg border border-linje px-3 text-sm text-tra"
          >
            {extra.etikett}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t)
            onAngra()
          }}
          className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-medium text-fermob-text"
        >
          Ångra
        </button>
      </div>
    ),
    { duration: 6000 },
  )
}
