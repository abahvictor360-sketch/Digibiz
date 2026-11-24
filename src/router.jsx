import { useEffect, useState } from 'react'

export function navigate(to) {
  if (to === window.location.pathname + window.location.hash) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

export function useLocation() {
  const [loc, setLoc] = useState(() => ({ path: window.location.pathname, hash: window.location.hash }))
  useEffect(() => {
    const update = () => setLoc({ path: window.location.pathname, hash: window.location.hash })
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])
  return loc
}

export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || to.startsWith('#')) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
