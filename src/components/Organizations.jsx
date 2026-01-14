import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Organizations({ profile, onMessageOrg }) {
  const [organizations, setOrganizations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)
  const [myOrg, setMyOrg] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: ''
  })
  const [availability, setAvailability] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' }
  })

  useEffect(() => {
    fetchOrganizations()
    fetchMyOrg()
  }, [])

  async function fetchOrganizations() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name')
    
    setOrganizations(data || [])
  }

  async function fetchMyOrg() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()
    
    setMyOrg(data)
    if (data) {
      setEditForm({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        description: data.description || ''
      })
      if (data.availability) {
        setAvailability(data.availability)
      }
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()

    const { error } = await supabase
      .from('organizations')
      .update(editForm)
      .eq('id', profile.organization_id)

    if (error) {
      alert('Error updating profile: ' + error.message)
    } else {
      alert('Profile updated successfully!')
      setShowEditProfile(false)
      fetchMyOrg()
      fetchOrganizations()
    }
  }

  async function handleUpdateAvailability(e) {
    e.preventDefault()

    const { error } = await supabase
      .from('organizations')
      .update({ availability })
      .eq('id', profile.organization_id)

    if (error) {
      alert('Error updating availability: ' + error.message)
    } else {
      alert('Availability updated successfully!')
      setShowAvailability(false)
      fetchMyOrg()
    }
  }

  function updateDayAvailability(day, field, value) {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  function handleSendMessage(orgId, orgName) {
    onMessageOrg(orgId, orgName)
}

  const filteredOrgs = organizations.filter(org => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      org.name?.toLowerCase().includes(query) ||
      org.address?.toLowerCase().includes(query) ||
      org.description?.toLowerCase().includes(query)
    )
  })

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div>
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Network Agencies</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setShowAvailability(!showAvailability)
                setShowEditProfile(false)
              }}
              className="bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md border-2 border-gray-200"
            >
              {showAvailability ? 'Cancel' : 'Set Availability'}
            </button>
            <button
              onClick={() => {
                setShowEditProfile(!showEditProfile)
                setShowAvailability(false)
              }}
              className="bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md border-2 border-gray-200"
            >
              {showEditProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Availability Settings */}
        {showAvailability && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold mb-4">Set Pickup Availability</h3>
            <p className="text-gray-600 text-sm mb-6">Set your organization's hours for food pickups. Other agencies will see these times when scheduling pickups.</p>
            
            <form onSubmit={handleUpdateAvailability} className="space-y-4">
              {daysOfWeek.map(day => (
                <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-32">
                    <input
                      type="checkbox"
                      id={`${day}-enabled`}
                      checked={availability[day].enabled}
                      onChange={(e) => updateDayAvailability(day, 'enabled', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor={`${day}-enabled`} className="font-semibold capitalize">
                      {day}
                    </label>
                  </div>

                  {availability[day].enabled && (
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={availability[day].start}
                          onChange={(e) => updateDayAvailability(day, 'start', e.target.value)}
                          className="border-2 border-gray-200 rounded px-3 py-2"
                        />
                      </div>
                      <span className="text-gray-500">to</span>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">End Time</label>
                        <input
                          type="time"
                          value={availability[day].end}
                          onChange={(e) => updateDayAvailability(day, 'end', e.target.value)}
                          className="border-2 border-gray-200 rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  )}

                  {!availability[day].enabled && (
                    <span className="text-gray-400 text-sm">Closed</span>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="w-full bg-blue-500 text-black py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Save Availability
              </button>
            </form>
          </div>
        )}

        {/* Edit Profile Form */}
        {showEditProfile && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold mb-4">Edit Organization Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
                  rows="4"
                  placeholder="Tell other agencies about your organization, services, and mission..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 text-black py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agencies by name, location, or description..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-blue-400 transition"
          />
          <svg 
            className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Organization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredOrgs.map(org => (
          <div 
            key={org.id} 
            className={`bg-white p-6 rounded-lg shadow-md ${
              org.id === profile.organization_id ? 'border-2 border-blue-500' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{org.name}</h3>
                {org.id === profile.organization_id && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mb-2">
                    Your Organization
                  </span>
                )}
              </div>
            </div>

            {org.description && (
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">{org.description}</p>
            )}

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {org.address && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{org.address}</span>
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{org.phone}</span>
                </div>
              )}
              {org.email && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{org.email}</span>
                </div>
              )}
            </div>

            {org.id !== profile.organization_id && (
              <button
                onClick={() => handleSendMessage(org.id, org.name)}
                className="w-full bg-blue-500 text-black py-2 rounded-lg hover:bg-blue-600 font-semibold text-sm"
              >
                Send Message
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No agencies match your search.
        </div>
      )}
    </div>
  )
}

export default Organizations