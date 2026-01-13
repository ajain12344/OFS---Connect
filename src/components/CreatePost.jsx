import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CreatePost({ profile, onSuccess }) {
  const [inventory, setInventory] = useState([])
  const [useInventory, setUseInventory] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    type: 'excess',
    category: '',
    expiration_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchInventory()
  }, [])

  async function fetchInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'in_stock')
      .order('item_name')
    
    setInventory(data || [])
  }

  function handleInventorySelect(e) {
    const itemId = e.target.value
    if (!itemId) {
      setSelectedInventoryItem(null)
      setFormData({
        item_name: '',
        quantity: '',
        type: 'excess',
        category: '',
        expiration_date: '',
        notes: ''
      })
      return
    }

    const item = inventory.find(i => i.id === itemId)
    setSelectedInventoryItem(item)
    
    // Pre-fill form with inventory item data
    setFormData({
      item_name: item.item_name,
      quantity: '',
      type: 'excess',
      category: item.category || '',
      expiration_date: '',
      notes: item.notes || ''
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    const quantityNum = parseInt(formData.quantity)
    
    // If using inventory, check if we have enough
    if (useInventory && selectedInventoryItem) {
      const inventoryQuantity = parseInt(selectedInventoryItem.quantity)
      
      if (isNaN(inventoryQuantity)) {
        alert('Cannot use this inventory item - quantity is not a number')
        return
      }
      
      if (quantityNum > inventoryQuantity) {
        alert(`Cannot post ${quantityNum} units. Only ${inventoryQuantity} available in inventory.`)
        return
      }
    }

    // Create the supply post
    const { error } = await supabase
      .from('supply_posts')
      .insert({
        ...formData,
        quantity_numeric: quantityNum,
        quantity: formData.quantity + ' units',
        organization_id: profile.organization_id,
        posted_by: profile.id
      })

    if (error) {
      alert('Error creating post: ' + error.message)
      return
    }

    // If using inventory, update the inventory item
    if (useInventory && selectedInventoryItem) {
      const inventoryQuantity = parseInt(selectedInventoryItem.quantity)
      const newQuantity = inventoryQuantity - quantityNum

      if (newQuantity === 0) {
        // Delete the inventory item if quantity reaches 0
        await supabase
          .from('inventory')
          .delete()
          .eq('id', selectedInventoryItem.id)
      } else {
        // Update the inventory quantity
        await supabase
          .from('inventory')
          .update({ 
            quantity: newQuantity.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedInventoryItem.id)
      }
    }

    onSuccess()
    setFormData({
      item_name: '',
      quantity: '',
      type: 'excess',
      category: '',
      expiration_date: '',
      notes: ''
    })
    setUseInventory(false)
    setSelectedInventoryItem(null)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-bold mb-4">Create New Post</h3>
      
      {/* Toggle for using inventory */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          id="useInventory"
          checked={useInventory}
          onChange={(e) => {
            setUseInventory(e.target.checked)
            if (!e.target.checked) {
              setSelectedInventoryItem(null)
              setFormData({
                item_name: '',
                quantity: '',
                type: 'excess',
                category: '',
                expiration_date: '',
                notes: ''
              })
            }
          }}
          className="w-4 h-4"
        />
        <label htmlFor="useInventory" className="font-medium text-gray-700">
          Use item from my inventory
        </label>
      </div>

      {/* Inventory selector */}
      {useInventory && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Inventory Item</label>
          <select
            value={selectedInventoryItem?.id || ''}
            onChange={handleInventorySelect}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">Choose an item...</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id}>
                {item.item_name} - {item.quantity} available
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              required
              value={formData.item_name}
              onChange={(e) => setFormData({...formData, item_name: e.target.value})}
              disabled={useInventory && selectedInventoryItem}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
              placeholder="e.g., Fresh Tomatoes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quantity (units)
              {useInventory && selectedInventoryItem && (
                <span className="text-sm text-gray-500 ml-2">
                  (Max: {selectedInventoryItem.quantity})
                </span>
              )}
            </label>
            <input
              type="number"
              required
              min="1"
              max={useInventory && selectedInventoryItem ? parseInt(selectedInventoryItem.quantity) : undefined}
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., 50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="excess">Excess (Available)</option>
              <option value="need">Need (Requesting)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              disabled={useInventory && selectedInventoryItem}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
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
            <label className="block text-sm font-medium mb-1">Expiration Date (if applicable)</label>
            <input
              type="date"
              value={formData.expiration_date}
              onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border rounded px-3 py-2"
            rows="3"
            placeholder="Additional details..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-black py-2 rounded hover:bg-blue-700"
        >
          Create Post
        </button>
      </form>
    </div>
  )
}

export default CreatePost