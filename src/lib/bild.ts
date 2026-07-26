/** Bildkomprimering klientside: max 1600 px längsta sida, JPEG. */

export function beraknaMalstorlek(
  bredd: number,
  hojd: number,
  maxPx = 1600,
): { bredd: number; hojd: number } {
  const storsta = Math.max(bredd, hojd)
  if (storsta <= maxPx) return { bredd, hojd }
  const skala = maxPx / storsta
  return { bredd: Math.max(1, Math.round(bredd * skala)), hojd: Math.max(1, Math.round(hojd * skala)) }
}

export async function komprimeraBild(fil: Blob, maxPx = 1600, kvalitet = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(fil, { imageOrientation: 'from-image' })
  try {
    const { bredd, hojd } = beraknaMalstorlek(bitmap.width, bitmap.height, maxPx)
    const canvas = document.createElement('canvas')
    canvas.width = bredd
    canvas.height = hojd
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kunde inte skapa canvas för bildkomprimering')
    ctx.drawImage(bitmap, 0, 0, bredd, hojd)
    return await new Promise<Blob>((losning, avslag) => {
      canvas.toBlob(
        (blob) => (blob ? losning(blob) : avslag(new Error('Kunde inte komprimera bilden'))),
        'image/jpeg',
        kvalitet,
      )
    })
  } finally {
    bitmap.close()
  }
}
