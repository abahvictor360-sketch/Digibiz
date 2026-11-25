import { useLocation } from './router.jsx'
import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import CardView from './pages/CardView.jsx'
import Pricing from './pages/Pricing.jsx'
import Contact from './pages/Contact.jsx'
import Nfc from './pages/Nfc.jsx'
import Login from './pages/Login.jsx'
import Account from './pages/Account.jsx'
import Wallet from './pages/Wallet.jsx'

export default function App() {
  const { path } = useLocation()
  if (path.startsWith('/create')) return <Editor />
  if (path.startsWith('/pricing')) return <Pricing />
  if (path.startsWith('/contact')) return <Contact />
  if (path.startsWith('/nfc')) return <Nfc />
  if (path.startsWith('/login')) return <Login />
  if (path.startsWith('/account')) return <Account />
  if (path.startsWith('/wallet')) return <Wallet />
  if (path === '/c' || path.startsWith('/c/')) return <CardView />
  return <Landing />
}
