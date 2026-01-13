import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import SupplyFeed from './SupplyFeed'
import CreatePost from './CreatePost'
import Messages from './Messages'
import Inventory from './Inventory'
import Organizations from './Organizations'
import logo from '../assets/logo.png'


function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [activeTab, setActiveTab] = useState('feed') // 'feed', 'messages', or 'organizations'
  const [messageRecipient, setMessageRecipient] = useState(null)

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', session.user.id)
      .single()
    
    setProfile(data)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-cyan-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={logo} alt="OFS Logo" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">OFS Connect</h1>
                <p className="text-gray-500 text-sm">Food Resource Network</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {profile?.organizations && (
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{profile.organizations.name}</p>
                  <p className="text-gray-500 text-sm">{profile.full_name}</p>
                </div>
              )}
              <button 
                onClick={signOut}
                className="bg-white text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-50 transition font-medium border-2 border-gray-200"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('feed')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'feed'
                  ? 'border-b-4 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Supply Feed
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'messages'
                  ? 'border-b-4 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'organizations'
                  ? 'border-b-4 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Agencies
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-xl mx-auto px-8 py-8">
        {activeTab === 'feed' ? (
          <>
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Supply Feed</h2>
                <p className="text-gray-600 mt-1">Connect and share resources with your network</p>
              </div>
              <button
                onClick={() => setShowCreatePost(!showCreatePost)}
                className="bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 border-2 border-gray-200"
              >
                {showCreatePost ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Post New Supply
                  </>
                )}
              </button>
            </div>

            {showCreatePost && (
              <CreatePost 
                profile={profile} 
                onSuccess={() => setShowCreatePost(false)} 
              />
            )}

            <SupplyFeed profile={profile} />

            {/* Inventory Section */}
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <Inventory profile={profile} />
            </div>
          </>
        ) : activeTab === 'messages' ? (
          <Messages 
            profile={profile} 
            messageRecipient={messageRecipient}
            onMessageSent={() => setMessageRecipient(null)}
          />
        ) : (
          <Organizations 
            profile={profile} 
            onMessageOrg={(orgId, orgName) => {
              setMessageRecipient({ to_org_id: orgId, to_org_name: orgName })
              setActiveTab('messages')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard