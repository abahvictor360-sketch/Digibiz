import { useLocation } from './router.jsx'
import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import CardView from './pages/CardView.jsx'
import Pricing from './pages/Pricing.jsx'
import Contact from './pages/Contact.jsx'
import Nfc from './pages/Nfc.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import Wallet from './pages/Wallet.jsx'
import Billing from './pages/Billing.jsx'

export default function App() {
  const { path } = useLocation()
  if (path.startsWith('/create')) return <Editor />
  if (path.startsWith('/pricing')) return <Pricing />
  if (path.startsWith('/contact')) return <Contact />
  if (path.startsWith('/nfc')) return <Nfc />
  if (path === '/login' || path === '/signup') return <Login />
  if (path.startsWith('/dashboard')) return <Dashboard />
  if (path.startsWith('/admin')) return <Admin />
  if (path.startsWith('/wallet')) return <Wallet />
  if (path.startsWith('/billing')) return <Billing />
  if (path === '/c' || path.startsWith('/c/')) return <CardView />
  return <Landing />
}
