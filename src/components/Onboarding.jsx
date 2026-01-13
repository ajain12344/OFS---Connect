import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Onboarding({ session, onComplete }) {
  const [loading, setLoading] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [existingOrgs, setExistingOrgs] = useState([])
  const [formData, setFormData] = useState({
    full_name: '',
    selected_org_id: '',
    org_name: '',
    org_address: '',
    org_phone: '',
    org_email: ''
  })

  useEffect(() => {
    loadOrgs()
  }, [])

  async function loadOrgs() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name')
    setExistingOrgs(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      let orgId = formData.selected_org_id

      if (showCreateNew) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.org_name,
            address: formData.org_address,
            phone: formData.org_phone,
            email: formData.org_email
          })
          .select()
          .single()

        if (orgError) throw orgError
        orgId = org.id
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          organization_id: orgId,
          full_name: formData.full_name,
          role: showCreateNew ? 'admin' : 'member'
        })

      if (profileError) throw profileError

      onComplete()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-cyan-50 p-4">
      <div className="w-full max-w-lg p-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to OFS Connect!</h1>
          <p className="text-gray-600">Let's get you set up</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              placeholder="John Smith"
            />
          </div>

          {!showCreateNew ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Your Organization</label>
                <select
                  required
                  value={formData.selected_org_id}
                  onChange={(e) => setFormData({...formData, selected_org_id: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Choose an organization...</option>
                  {existingOrgs.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateNew(true)}
                className="w-full text-gray-800 bg-white hover:bg-gray-50 font-medium text-sm py-2 rounded-lg transition border-2 border-gray-200">
                Don't see your organization? Create a new one →
              </button>
            </>
          ) : (
            <>
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-4">Create New Organization</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name</label>
                    <input
                      type="text"
                      required
                      value={formData.org_name}
                      onChange={(e) => setFormData({...formData, org_name: e.target.value})}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="e.g., St. Louis Food Pantry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      required
                      value={formData.org_address}
                      onChange={(e) => setFormData({...formData, org_address: e.target.value})}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="123 Main St, St. Louis, MO"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.org_phone}
                      onChange={(e) => setFormData({...formData, org_phone: e.target.value})}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="(314) 555-0100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.org_email}
                      onChange={(e) => setFormData({...formData, org_email: e.target.value})}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="contact@organization.org"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateNew(false)}
                className="w-full text-gray-800 bg-white hover:bg-gray-50 font-medium text-sm py-2 rounded-lg transition border-2 border-gray-200"
              >
                ← Back to organization list
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-50 disabled:bg-gray-300 disabled:text-gray-500 transition shadow-md hover:shadow-lg border-2 border-gray-200"
          >
            {loading ? 'Setting up...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Onboarding