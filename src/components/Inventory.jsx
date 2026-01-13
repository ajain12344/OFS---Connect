import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Inventory({ profile }) {
  const [inventory, setInventory] = useState([])
  const [claimedPosts, setClaimedPosts] = useState([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    category: '',
    location: '',
    notes: '',
    status: 'in_stock'
  })

  useEffect(() => {
    if (profile) {
      fetchInventory()
      fetchClaimedPosts()
    }
  }, [profile])

  async function fetchInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    setInventory(data || [])
  }

  async function fetchClaimedPosts() {
    const { data } = await supabase
      .from('claims')
      .select('*, supply_posts(*)')
      .eq('supply_posts.organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    // Fetch claiming org names
    const claimsWithOrgs = await Promise.all(
      (data || []).map(async (claim) => {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', claim.claiming_org_id)
          .single()
        
        return {
          ...claim,
          claiming_org: org
        }
      })
    )

    setClaimedPosts(claimsWithOrgs)
  }

  async function handleAddItem(e) {
    e.preventDefault()

    const { error } = await supabase
      .from('inventory')
      .insert({
        ...formData,
        organization_id: profile.organization_id
      })

    if (error) {
      alert('Error adding item: ' + error.message)
    } else {
      setShowAddItem(false)
      setFormData({
        item_name: '',
        quantity: '',
        category: '',
        location: '',
        notes: '',
        status: 'in_stock'
      })
      fetchInventory()
    }
  }

  async function handleDeleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting item: ' + error.message)
    } else {
      fetchInventory()
    }
  }

  async function handleMarkClaimed(claimId, status, claimData) {
  const { error } = await supabase
    .from('claims')
    .update({ status })
    .eq('id', claimId)

  if (error) {
    alert('Error updating claim: ' + error.message)
    return
  }

  // If cancelled, send notification message and make post active again
  if (status === 'cancelled') {
    // Send message to claiming org
    await supabase
      .from('messages')
      .insert({
        from_org_id: profile.organization_id,
        to_org_id: claimData.claiming_org_id,
        from_user_id: profile.id,
        subject: `Claim Cancelled: ${claimData.supply_posts?.item_name}`,
        message: `Your claim for "${claimData.supply_posts?.item_name}" has been cancelled by ${profile.organizations.name}. The item is now available again.`,
        post_id: claimData.post_id
      })

    // Make the post active again
    await supabase
      .from('supply_posts')
      .update({ status: 'active' })
      .eq('id', claimData.post_id)
  }

  // If completed, mark the post as completed
  if (status === 'completed') {
    await supabase
      .from('supply_posts')
      .update({ status: 'completed' })
      .eq('id', claimData.post_id)
  }

  fetchClaimedPosts()
}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Side - Inventory */}
      <div className="order-2 md:order-none">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">Your Inventory</h3>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md flex items-center gap-2 border-2 border-gray-200"
          >
            {showAddItem ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {showAddItem && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h4 className="text-lg font-bold mb-4">Add Inventory Item</h4>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                    placeholder="e.g., Canned Beans"
                  />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                    <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                        placeholder="e.g., 100"
                    />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select category</option>
                    <option value="produce">Produce</option>
                    <option value="canned">Canned Goods</option>
                    <option value="dairy">Dairy</option>
                    <option value="frozen">Frozen</option>
                    <option value="dry_goods">Dry Goods</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                  rows="2"
                  placeholder="Additional details..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 text-black py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Add Item
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {inventory.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-bold">{item.item_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                      item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {item.category && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-1">Quantity: {item.quantity}</p>
                  {item.location && (
                    <p className="text-gray-600 text-sm mb-1">Location: {item.location}</p>
                  )}
                  {item.notes && (
                    <p className="text-gray-500 text-sm">{item.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {inventory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No inventory items yet.
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Claimed Items */}
        <div className="order-1 md:order-none">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Claimed Items</h3>
        <div className="space-y-4">
            {claimedPosts
            .filter(claim => claim.status !== 'cancelled' && claim.status !== 'completed')
            .map(claim => (
                <div key={claim.id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-3">
                    <div>
                    <h4 className="text-lg font-bold">{claim.supply_posts?.item_name}</h4>
                    <p className="text-sm text-gray-600">
                        Quantity Claimed: <span className="font-semibold">{claim.quantity_claimed || 'N/A'}</span> units
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        Claimed by: <span className="font-semibold">{claim.claiming_org?.name}</span>
                    </p>
                    {claim.pickup_time && (
                        <p className="text-sm text-blue-600 mt-2 font-semibold">
                         Pickup: {new Date(claim.pickup_time).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                        </p>
                    )}
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                    claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    claim.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    claim.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                    }`}>
                    {claim.status.toUpperCase()}
                    </span>
                </div>

                {claim.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => handleMarkClaimed(claim.id, 'confirmed', claim)}
                        className="flex-1 bg-blue-500 text-black py-2 rounded-lg hover:bg-blue-600 text-sm font-semibold"
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => handleMarkClaimed(claim.id, 'cancelled', claim)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                    </div>
                )}

                {claim.status === 'confirmed' && (
                    <button
                    onClick={() => handleMarkClaimed(claim.id, 'completed', claim)}
                    className="w-full bg-green-500 text-black py-2 rounded-lg hover:bg-green-600 text-sm font-semibold mt-3"
                    >
                    Mark as Completed
                    </button>
                )}

                <p className="text-xs text-gray-500 mt-2">
                    Claimed: {new Date(claim.created_at).toLocaleString()}
                </p>
                </div>
            ))}

            {claimedPosts.filter(claim => claim.status !== 'cancelled' && claim.status !== 'completed').length === 0 && (
            <div className="text-center py-8 text-gray-500">
                No claimed items yet.
            </div>
            )}
        </div>
        </div>
    </div>
  )
}

export default Inventory