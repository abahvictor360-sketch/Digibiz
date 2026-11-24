import { Link } from '../router.jsx'

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Digibiz home">
      <span className="logo-mark">
        <span />
      </span>
      Digibiz
    </Link>
  )
}
