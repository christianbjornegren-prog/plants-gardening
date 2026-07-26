import { Tidslinje } from '../components/Tidslinje'
import { VyHuvud } from '../components/VyHuvud'
import { useData, ytaNamn } from '../data/DataProvider'

export function LoggView() {
  const { logg, vaxter, ytor, laddad } = useData()
  if (!laddad) return null

  const vaxtNamn = new Map(vaxter.map((v) => [v.id, v.name]))

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud titel="Logg" />
      <Tidslinje
        poster={logg}
        mal={(post) => {
          if (post.plantId) {
            const namn = vaxtNamn.get(post.plantId)
            return namn ? { text: namn, lank: `/vaxter/${post.plantId}` } : undefined
          }
          if (post.areaId) {
            return { text: ytaNamn(ytor, post.areaId), lank: `/ytor/${post.areaId}` }
          }
          return undefined
        }}
        tom="Inget loggat än. Öppna en växt eller yta och tryck på Vattnat, så börjar journalen här."
      />
    </div>
  )
}
