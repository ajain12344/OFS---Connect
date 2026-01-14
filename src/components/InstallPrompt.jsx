import { useState, useEffect } from 'react'

function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    // Check if already installed or dismissed
    const isDismissed = localStorage.getItem('installPromptDismissed')
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // Don't show if already dismissed, installed, or on desktop
    if (isDismissed || isStandalone) return

    // For iOS devices (Safari doesn't support beforeinstallprompt)
    if (isIOS && !isStandalone) {
      setTimeout(() => setShowPrompt(true), 2000) // Show after 2 seconds
      return
    }

    // For Android/Chrome
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowPrompt(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('installPromptDismissed', 'true')
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl p-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-1">Install OFS Connect</h3>
            <p className="text-sm text-gray-600 mb-3">
              {isIOS 
                ? "Add to your home screen for quick access. Tap the share button and select 'Add to Home Screen'."
                : "Install OFS Connect on your phone for easy access anytime."}
            </p>
            
            {isIOS ? (
              // iOS instructions with share icon
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3">
                <span>Tap</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                </svg>
                <span>then "Add to Home Screen"</span>
              </div>
            ) : null}

            <div className="flex gap-2">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition"
                >
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                {isIOS ? 'Got it' : 'Not now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstallPrompt