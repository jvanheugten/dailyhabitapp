export function SymptomThumbnail({ region, view, svgPaths }) {
  const paths = (() => {
    try {
      return JSON.parse(svgPaths || '[]')
    } catch {
      return []
    }
  })()

  const viewPaths = paths.filter((p) => p.view === view)
  const imgSrc = `${import.meta.env.BASE_URL}body/${region}-${view}.svg`

  return (
    <div
      style={{
        position: 'relative',
        width: 40,
        height: 60,
        flexShrink: 0,
        borderRadius: 6,
        overflow: 'hidden',
        background: '#070c16',
        border: '1px solid #132030',
      }}
    >
      <img
        src={imgSrc}
        alt=""
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          opacity: 0.8,
        }}
      />
      {viewPaths.length > 0 && (
        <svg
          viewBox="0 0 200 300"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {viewPaths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.color || '#3d8ef0'}
              strokeWidth={p.strokeWidth || 10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
            />
          ))}
        </svg>
      )}
    </div>
  )
}
