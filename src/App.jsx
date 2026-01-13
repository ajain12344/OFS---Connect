import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AuthComponent from './components/Auth'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        checkProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    setProfile(data)
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Not logged in
  if (!session) {
    return <AuthComponent />
  }

  // Logged in but no profile
  if (!profile) {
    return <Onboarding session={session} onComplete={() => checkProfile(session.user.id)} />
  }

  // Logged in with profile
  return <Dashboard session={session} />
}

export default App