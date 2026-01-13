import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TimeSlotPicker from './TimeSlotPicker'

function SupplyFeed({ profile }) {
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [claimData, setClaimData] = useState(null)
  const [posterAvailability, setPosterAvailability] = useState(null)
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [myPickups, setMyPickups] = useState([])
  const POSTS_PER_PAGE = 3

  useEffect(() => {
    fetchPosts()
    
    if (profile) {
      fetchMyPickups()
    }
    
    // Real-time subscription
    const subscription = supabase
      .channel('supply_posts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'supply_posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [profile])

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchQuery])

  async function fetchPosts() {
    const { data } = await supabase
      .from('supply_posts')
      .select('*, organizations(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    setPosts(data || [])
  }
  async function fetchMyPickups() {
    if (!profile?.organization_id) return
    
    const { data, error } = await supabase
      .from('claims')
      .select('*, supply_posts(*)')
      .eq('claiming_org_id', profile.organization_id)
      .not('pickup_time', 'is', null)
      .order('pickup_time', { ascending: true })

    console.log('Pickups data:', data)
    console.log('Pickups error:', error)
    
    setMyPickups(data || [])
  }
  async function handleClaim(postId, postOrgId, itemName, availableQuantity) {
    // Prompt for quantity to claim
    const quantityToClaim = prompt(`How many units would you like to claim? (Available: ${availableQuantity})`)
    
    if (!quantityToClaim || isNaN(quantityToClaim) || quantityToClaim <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    const claimAmount = parseInt(quantityToClaim)
    
    if (claimAmount > availableQuantity) {
      alert(`Cannot claim ${claimAmount}. Only ${availableQuantity} available.`)
      return
    }

    // Fetch poster's availability
    const { data: posterOrg } = await supabase
      .from('organizations')
      .select('availability')
      .eq('id', postOrgId)
      .single()

    if (!posterOrg || !posterOrg.availability) {
      alert('This organization has not set their availability yet. Please contact them directly.')
      return
    }

    // Show time picker
    setClaimData({ postId, postOrgId, itemName, availableQuantity, claimAmount })
    setPosterAvailability(posterOrg.availability)
    setShowTimePicker(true)
  }

  async function handleConfirmPickup(pickupTime) {
    const { postId, postOrgId, itemName, availableQuantity, claimAmount } = claimData

    // Get current post data
    const { data: currentPost } = await supabase
      .from('supply_posts')
      .select('quantity_claimed, quantity_numeric')
      .eq('id', postId)
      .single()

    const newClaimedTotal = (currentPost.quantity_claimed || 0) + claimAmount
    const shouldComplete = newClaimedTotal >= currentPost.quantity_numeric

    // Create the claim with pickup time
    const { error: claimError } = await supabase
      .from('claims')
      .insert({
        post_id: postId,
        claiming_org_id: profile.organization_id,
        claimed_by: profile.id,
        quantity_claimed: claimAmount,
        pickup_time: pickupTime.toISOString()
      })

    if (claimError) {
      alert('Error claiming post: ' + claimError.message)
      setShowTimePicker(false)
      return
    }

    // Update the post's claimed quantity and status
    await supabase
      .from('supply_posts')
      .update({ 
        quantity_claimed: newClaimedTotal,
        status: shouldComplete ? 'completed' : 'active'
      })
      .eq('id', postId)

    // Format pickup time for message
    const formattedTime = pickupTime.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // Send message with pickup time
    await supabase
      .from('messages')
      .insert({
        from_org_id: profile.organization_id,
        to_org_id: postOrgId,
        from_user_id: profile.id,
        subject: `Claim Request: ${itemName} (${claimAmount} units)`,
        message: `${profile.organizations.name} has claimed ${claimAmount} units of your post for "${itemName}".\n\nScheduled Pickup: ${formattedTime}\n\nPlease confirm this pickup time.`,
        post_id: postId
      })

    alert(`Successfully claimed ${claimAmount} units!\nPickup scheduled for ${formattedTime}`)
    setShowTimePicker(false)
    setClaimData(null)
    setPosterAvailability(null)
    fetchPosts()
  }

  const filteredPosts = posts
    .filter(post => filter === 'all' ? true : post.type === filter)
    .filter(post => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        post.item_name?.toLowerCase().includes(query) ||
        post.category?.toLowerCase().includes(query) ||
        post.notes?.toLowerCase().includes(query) ||
        post.organizations?.name?.toLowerCase().includes(query)
      )
    })

  // Pagination logic
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const endIndex = startIndex + POSTS_PER_PAGE
  const currentPosts = filteredPosts.slice(startIndex, endIndex)

  return (
  <div className="grid grid-cols-4 gap-6">
    {/* Main Feed - Left Side (3/4 width) */}
    <div className="col-span-3">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item name, category, organization, or notes..."
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

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-black' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('excess')}
          className={`px-4 py-2 rounded ${filter === 'excess' ? 'bg-green-600 text-black' : 'bg-gray-200'}`}
        >
          Available Excess
        </button>
        <button
          onClick={() => setFilter('need')}
          className={`px-4 py-2 rounded ${filter === 'need' ? 'bg-orange-600 text-black' : 'bg-gray-200'}`}
        >
          Needs
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {currentPosts.map(post => {
          const totalQuantity = post.quantity_numeric || 0
          const claimedQuantity = post.quantity_claimed || 0
          const availableQuantity = totalQuantity - claimedQuantity

          return (
            <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      post.type === 'excess' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {post.type === 'excess' ? 'AVAILABLE' : 'NEEDED'}
                    </span>
                    {post.category && (
                      <span className="px-3 py-1 bg-gray-100 rounded text-sm">
                        {post.category}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{post.item_name}</h3>
                  
                  {post.quantity_numeric ? (
                    <>
                      <p className="text-gray-600 mb-2">
                        Available: <span className="font-semibold text-green-600">{availableQuantity}</span> / {totalQuantity} units
                      </p>
                      {claimedQuantity > 0 && (
                        <p className="text-sm text-blue-600 mb-2">
                          ({claimedQuantity} units already claimed)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600 mb-2">Quantity: {post.quantity}</p>
                  )}
                  
                  {post.expiration_date && (
                    <p className="text-sm text-red-600 mb-2">
                      Expires: {new Date(post.expiration_date).toLocaleDateString()}
                    </p>
                  )}
                  
                  {post.notes && (
                    <p className="text-gray-700 mb-3">{post.notes}</p>
                  )}
                  
                  <p className="text-sm text-gray-500">
                    Posted by: {post.organizations?.name}
                  </p>
                </div>

                {post.type === 'excess' && 
                 post.organization_id !== profile?.organization_id && 
                 availableQuantity > 0 && (
                  <button
                    onClick={() => handleClaim(post.id, post.organization_id, post.item_name, availableQuantity)}
                    className="bg-blue-500 text-black px-6 py-2 rounded-lg hover:bg-blue-600 font-semibold shadow-md"
                  >
                    Claim
                  </button>
                )}

                {post.type === 'excess' && availableQuantity === 0 && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold">
                    Fully Claimed
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No posts match your search.' : 'No posts yet. Be the first to share!'}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-black'
                      : 'bg-white border-2 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Next
          </button>
        </div>
      )}

      {/* Results counter */}
      {filteredPosts.length > 0 && (
        <p className="text-center text-gray-500 text-sm mt-4">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredPosts.length)} of {filteredPosts.length} posts
        </p>
      )}
    </div>

    {/* Pickup Schedule Sidebar - Right Side (1/4 width) */}
    <div className="col-span-1">
      <div className="bg-white p-4 rounded-lg shadow-md sticky top-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
           My Pickups
        </h3>
        
        <div className="space-y-3">
          {myPickups.map(pickup => {
            const pickupDate = new Date(pickup.pickup_time)
            const isToday = pickupDate.toDateString() === new Date().toDateString()
            const isTomorrow = pickupDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
            
            return (
                          <div key={pickup.id} className={`p-3 rounded-lg border-2 ${
                            isToday ? 'bg-yellow-50 border-yellow-300' :
                            isTomorrow ? 'bg-blue-50 border-blue-300' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="text-xs font-semibold text-gray-500 mb-1">
                              {isToday ? 'TODAY' :
                              isTomorrow ? 'TOMORROW' :
                              pickupDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-sm font-bold text-gray-800 mb-1">
                              {pickupDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                            <div className="text-sm text-gray-700 mb-1">
                              {pickup.supply_posts?.item_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pickup.quantity_claimed} units
                            </div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                              pickup.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {pickup.status}
                            </span>
                          </div>
                        )
                      })}

                      {myPickups.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No upcoming pickups
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Slot Picker Modal */}
                {showTimePicker && posterAvailability && (
                  <TimeSlotPicker
                    availability={posterAvailability}
                    onSelect={handleConfirmPickup}
                    onCancel={() => {
                      setShowTimePicker(false)
                      setClaimData(null)
                      setPosterAvailability(null)
                    }}
                  />
                )}
              </div>
            )
}

export default SupplyFeed