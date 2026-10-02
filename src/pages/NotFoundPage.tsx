import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="block">
      <h2>There is nothing at this address</h2>
      <p className="lead">The page you asked for does not exist on the board.</p>
      <Link to="/overview">Go to the overview</Link>
    </section>
  )
}
