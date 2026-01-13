import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Messages({ profile, messageRecipient, onMessageSent }) {
  const [messages, setMessages] = useState([])
  const [showCompose, setShowCompose] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgUsers, setSelectedOrgUsers] = useState([])
  const [recipientType, setRecipientType] = useState('organization') // 'organization' or 'individual'
  const [formData, setFormData] = useState({
    to_org_id: '',
    to_user_id: '',
    subject: '',
    message: ''
  })

  useEffect(() => {
    if (profile) {
        fetchMessages()
        fetchOrganizations()
    }
    
    // Auto-open compose if there's a pre-filled recipient
    if (messageRecipient) {
        setShowCompose(true)
        setFormData(prev => ({
        ...prev,
        to_org_id: messageRecipient.to_org_id
        }))
    }
    }, [profile, messageRecipient])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`from_org_id.eq.${profile.organization_id},to_org_id.eq.${profile.organization_id},to_user_id.eq.${profile.id}`)
      .order('created_at', { ascending: false })

    // Manually fetch org and user names
    const messagesWithDetails = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: fromOrg } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', msg.from_org_id)
          .single()

        const { data: toOrg } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', msg.to_org_id)
          .single()

        const { data: fromUser } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.from_user_id)
          .single()

        let toUser = null
        if (msg.to_user_id) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', msg.to_user_id)
            .single()
          toUser = userData
        }

        return {
          ...msg,
          from_org: fromOrg,
          to_org: toOrg,
          from_user: fromUser,
          to_user: toUser
        }
      })
    )

    setMessages(messagesWithDetails)
  }

  async function fetchOrganizations() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .neq('id', profile.organization_id)
      .order('name')

    setOrganizations(data || [])
  }

  async function fetchOrgUsers(orgId) {
    if (!orgId) {
      setSelectedOrgUsers([])
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .order('full_name')

    setSelectedOrgUsers(data || [])
  }

  async function handleSend(e) {
    e.preventDefault()

    const messageData = {
        from_org_id: profile.organization_id,
        to_org_id: formData.to_org_id,
        from_user_id: profile.id,
        subject: formData.subject,
        message: formData.message
    }

    if (recipientType === 'individual' && formData.to_user_id) {
        messageData.to_user_id = formData.to_user_id
    }

    const { error } = await supabase
        .from('messages')
        .insert(messageData)

    if (error) {
        alert('Error sending message: ' + error.message)
    } else {
        setShowCompose(false)
        setFormData({ to_org_id: '', to_user_id: '', subject: '', message: '' })
        setRecipientType('organization')
        setSelectedOrgUsers([])
        fetchMessages()
        if (onMessageSent) onMessageSent() // Clear pre-fill in parent
    }
}

  function handleOrgChange(orgId) {
    setFormData({...formData, to_org_id: orgId, to_user_id: ''})
    if (recipientType === 'individual') {
      fetchOrgUsers(orgId)
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Messages</h2>
        <button
            onClick={() => {
                setShowCompose(!showCompose)
                if (onMessageSent) onMessageSent()
            }}
            className="bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 border-2 border-gray-200"
            >
            {showCompose ? 'Cancel' : 'New Message'}
        </button>
      </div>

      {showCompose && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Compose Message</h3>
          <form onSubmit={handleSend} className="space-y-4">
            {/* Recipient Type Toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="organization"
                    checked={recipientType === 'organization'}
                    onChange={(e) => {
                      setRecipientType(e.target.value)
                      setFormData({...formData, to_user_id: ''})
                      setSelectedOrgUsers([])
                    }}
                    className="mr-2"
                  />
                  Entire Organization
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="individual"
                    checked={recipientType === 'individual'}
                    onChange={(e) => {
                      setRecipientType(e.target.value)
                      if (formData.to_org_id) {
                        fetchOrgUsers(formData.to_org_id)
                      }
                    }}
                    className="mr-2"
                  />
                  Specific Person
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
              <select
                required
                value={formData.to_org_id}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-400 transition"
              >
                <option value="">Select organization...</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {recipientType === 'individual' && formData.to_org_id && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient</label>
                <select
                  required
                  value={formData.to_user_id}
                  onChange={(e) => setFormData({...formData, to_user_id: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-400 transition"
                >
                  <option value="">Select person...</option>
                  {selectedOrgUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-400 transition"
                placeholder="Message subject"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-400 transition"
                rows="6"
                placeholder="Type your message here..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-black py-3 rounded-lg font-semibold hover:bg-blue-600 transition shadow-md"
            >
              Send Message
            </button>
          </form>
        </div>
      )}

      {/* Messages List */}
      <div className="space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    msg.from_org_id === profile.organization_id 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {msg.from_org_id === profile.organization_id ? 'SENT' : 'RECEIVED'}
                  </span>
                  {msg.to_user_id && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                      DIRECT
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold">{msg.subject}</h3>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>

            <p className="text-gray-700 mb-3 whitespace-pre-wrap">{msg.message}</p>

            <div className="text-sm text-gray-500 border-t pt-3 mt-3">
              {msg.from_org_id === profile.organization_id ? (
                <>
                  <p>To: <span className="font-semibold">{msg.to_org?.name}</span></p>
                  {msg.to_user && (
                    <p className="text-purple-600">Direct to: <span className="font-semibold">{msg.to_user?.full_name}</span></p>
                  )}
                </>
              ) : (
                <>
                  <p>From: <span className="font-semibold">{msg.from_org?.name}</span> ({msg.from_user?.full_name})</p>
                  {msg.to_user_id === profile.id && (
                    <p className="text-purple-600 font-semibold">Sent directly to you</p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No messages yet. Start a conversation!
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages