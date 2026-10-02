interface PlaceholderProps {
  title: string
  lead: string
  phase: number
  items?: string[]
}

/** A tab that is planned but not built yet. Says plainly what will appear here and when. */
export function Placeholder({ title, lead, phase, items }: PlaceholderProps) {
  return (
    <section className="block">
      <h2>{title}</h2>
      <p className="lead">{lead}</p>
      <div className="empty">
        <p style={{ margin: '0 0 6px' }}>
          <b>Coming in phase {phase}.</b> Nothing to show here yet.
        </p>
        {items && items.length > 0 && (
          <p className="small" style={{ margin: 0 }}>
            This tab will show: {items.join('; ')}.
          </p>
        )}
      </div>
    </section>
  )
}
