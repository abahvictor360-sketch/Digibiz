import { useLocation } from './router.jsx'
import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import CardView from './pages/CardView.jsx'

export default function App() {
  const { path } = useLocation()
  if (path.startsWith('/create')) return <Editor />
  if (path === '/c' || path.startsWith('/c/')) return <CardView />
  return <Landing />
}
