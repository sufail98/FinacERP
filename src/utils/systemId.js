// Reverse geocode coordinates into a readable address
const reverseGeocode = async (lat, lon) => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
            {
                headers: {
                    "Accept-Language": "en" // get results in English
                }
            }
        )
        const data = await res.json()
        return data.display_name || null
    } catch (err) {
        console.error("Reverse geocode failed:", err)
        return null
    }
}

export const getBrowserLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                const address = await reverseGeocode(latitude, longitude)
                resolve(address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
            },
            (error) => {
                console.error("Geolocation error code:", error.code, "-", error.message)
                resolve(null)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        )
    })
}


// Persisted random ID — final fallback if geolocation is blocked too
const getPersistedFallbackId = () => {
    let fallbackId = localStorage.getItem("fallbackSystemId")
    if (!fallbackId) {
        fallbackId = crypto.randomUUID()
        localStorage.setItem("fallbackSystemId", fallbackId)
    }
    return fallbackId
}

// Main function — call this from your component
export const getSystemId = async () => {
    // 1️⃣ Electron: real computer name
    if (window.electronAPI?.getComputerName) {
        try {
            const name = await window.electronAPI.getComputerName()
            if (name) return name
        } catch (err) {
            console.error("Error getting computer name:", err)
        }
    }

    // 2️⃣ Browser fallback: geolocation coordinates
    const location = await getBrowserLocation()
    if (location) return location

    // 3️⃣ Last resort: persisted random ID
    return getPersistedFallbackId()
}