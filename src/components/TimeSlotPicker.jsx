import { useState, useEffect } from 'react'

function TimeSlotPicker({ availability, onSelect, onCancel }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots()
    }
  }, [selectedDate])

  function getNext7Days() {
    const days = []
    for (let i = 1; i <= 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      days.push(date)
    }
    return days
  }

  function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  }

  function generateTimeSlots() {
    const date = new Date(selectedDate)
    const dayName = getDayName(date)
    const dayAvailability = availability[dayName]

    if (!dayAvailability || !dayAvailability.enabled) {
      setAvailableSlots([])
      return
    }

    const slots = []
    const [startHour, startMin] = dayAvailability.start.split(':').map(Number)
    const [endHour, endMin] = dayAvailability.end.split(':').map(Number)

    let currentHour = startHour
    let currentMin = startMin

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
      slots.push(timeString)

      // Increment by 30 minutes
      currentMin += 30
      if (currentMin >= 60) {
        currentMin = 0
        currentHour += 1
      }
    }

    setAvailableSlots(slots)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (selectedDate && selectedTime) {
      const pickupDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
      onSelect(pickupDateTime)
    }
  }

  const next7Days = getNext7Days()

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Schedule Pickup Time</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
            <select
              required
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSelectedTime('')
              }}
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
            >
              <option value="">Choose a date...</option>
              {next7Days.map(date => {
                const dayName = getDayName(date)
                const dayAvail = availability[dayName]
                const dateString = date.toISOString().split('T')[0]
                const displayDate = date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })

                return (
                  <option 
                    key={dateString} 
                    value={dateString}
                    disabled={!dayAvail || !dayAvail.enabled}
                  >
                    {displayDate} {(!dayAvail || !dayAvail.enabled) && '(Closed)'}
                  </option>
                )
              })}
            </select>
          </div>

          {selectedDate && availableSlots.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Time</label>
              <select
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
              >
                <option value="">Choose a time...</option>
                {availableSlots.map(time => (
                  <option key={time} value={time}>
                    {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDate && availableSlots.length === 0 && (
            <p className="text-red-600 text-sm">This organization is closed on this day.</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedDate || !selectedTime}
              className="flex-1 bg-blue-500 text-black py-2 rounded-lg hover:bg-blue-600 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Confirm Pickup
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TimeSlotPicker