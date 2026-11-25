// GET  /api/auth                      -> { user } (null when signed out)
// POST /api/auth { action: 'signup', email, password, name }
// POST /api/auth { action: 'login', email, password }
// POST /api/auth { action: 'logout' }
import { checkPassword, clearCookie, createUser, currentUser, findUserByEmail, publicUser, sessionCookie, hashPassword } from './_auth.js'
import { refreshBilling } from './_billing.js'
import { HttpError, handleError, readBody, send } from './_card.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
let dummyHash = null

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let user = await currentUser(req)
      if (user) user = await refreshBilling(user)
      return send(res, 200, { user: publicUser(user) })
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return send(res, 405, { error: 'Method not allowed' })
    }

    const body = await readBody(req, 10_000)
    const email = String(body.email || '').trim()
    const password = String(body.password || '')

    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', clearCookie())
      return send(res, 200, { user: null })
    }

    if (body.action === 'signup') {
      if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Enter a valid email address')
      if (password.length < 8) throw new HttpError(400, 'Use at least 8 characters for your password')
      if (password.length > 200) throw new HttpError(400, 'That password is too long')
      const user = await createUser(email, password, body.name)
      res.setHeader('Set-Cookie', sessionCookie(user.id))
      return send(res, 201, { user: publicUser(user) })
    }

    if (body.action === 'login') {
      const user = EMAIL_RE.test(email) ? await findUserByEmail(email) : null
      if (!user) {
        // Spend the same time as a real check so response timing doesn't reveal which emails exist.
        dummyHash ||= await hashPassword('not-a-real-password')
        await checkPassword(password, dummyHash)
        throw new HttpError(401, 'Email or password is incorrect')
      }
      if (!(await checkPassword(password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect')
      res.setHeader('Set-Cookie', sessionCookie(user.id))
      return send(res, 200, { user: publicUser(await refreshBilling(user)) })
    }

    throw new HttpError(400, 'Unknown action')
  } catch (e) {
    handleError(res, e)
  }
}
