import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Search, MapPin, Loader2, Navigation, X } from "lucide-react";
import { searchLocation, reverseGeocode } from "@/services/geocodingService";
// Fix Leaflet Default Marker Icon (Vite/Webpack)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 16, { duration: 1.5 });
    }
  }, [center?.[0], center?.[1]]);
  return null;
};

const InvalidateSizeOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const LocationPicker = ({ latitude, longitude, onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [viewCenter, setViewCenter] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const searchAbortRef = useRef(null);
  const geocodeAbortRef = useRef(null);
  const debounceRef = useRef(null);
  const resultsRef = useRef(null);

  const DEFAULT_CENTER = [24.7136, 46.6753];
  const DEFAULT_ZOOM = 5;

  useEffect(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      setMarkerPosition([lat, lng]);
      setViewCenter([lat, lng]);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      geocodeAbortRef.current?.abort();
      clearTimeout(debounceRef.current);
    };
  }, []);

  const performReverseGeocode = useCallback(
    async (lat, lng) => {
      geocodeAbortRef.current?.abort();
      geocodeAbortRef.current = new AbortController();
      setGeocoding(true);
      setError(null);

      try {
        const result = await reverseGeocode(
          lat,
          lng,
          geocodeAbortRef.current.signal
        );
        setSearchQuery(result.displayName);
        onLocationSelect?.({
          lat: result.lat,
          lng: result.lng,
          displayName: result.displayName,
          address: result.address,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Could not fetch address for this location.");
          onLocationSelect?.({
            lat,
            lng,
            displayName: "",
            address: {
              addressLine: "",
              city: "",
              state: "",
              country: "",
              postalCode: "",
              street: "",
              district: "",
            },
          });
        }
      } finally {
        setGeocoding(false);
      }
    },
    [onLocationSelect]
  );

  const handleSearchInput = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError(null);

    clearTimeout(debounceRef.current);
    searchAbortRef.current?.abort();

    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      searchAbortRef.current = new AbortController();
      setSearching(true);
      try {
        const results = await searchLocation(
          value,
          searchAbortRef.current.signal
        );
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Search failed. Please try again.");
        }
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectResult = useCallback(
    (result) => {
      setMarkerPosition([result.lat, result.lng]);
      setViewCenter([result.lat, result.lng]);
      setSearchQuery(result.displayName);
      setSearchResults([]);
      setShowResults(false);
      onLocationSelect?.(result);
    },
    [onLocationSelect]
  );

  const handleMapClick = useCallback(
    (latlng) => {
      const { lat, lng } = latlng;
      setMarkerPosition([lat, lng]);
      performReverseGeocode(lat, lng);
    },
    [performReverseGeocode]
  );

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeocoding(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMarkerPosition([lat, lng]);
        setViewCenter([lat, lng]);
        performReverseGeocode(lat, lng);
      },
      () => {
        setGeocoding(false);
        setError("Location access denied. Please enable location services.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [performReverseGeocode]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative" ref={resultsRef}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              onFocus={() =>
                searchResults.length > 0 && setShowResults(true)
              }
              placeholder="Search for a location..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 
                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-teal-600"
              />
            )}
            {searchQuery && !searching && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 
                           dark:hover:text-gray-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleMyLocation}
            disabled={geocoding}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border
                       text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100 
                       dark:text-teal-400 dark:bg-teal-900/20 dark:border-teal-800 dark:hover:bg-teal-900/40 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Use my current location"
          >
            <Navigation size={14} />
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            className="absolute z-[1000] mt-1 w-full bg-white dark:bg-[#242424] border border-gray-200 
                          dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {searchResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                           text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 
                           last:border-0 flex items-start gap-2 transition-colors"
              >
                <MapPin
                  size={14}
                  className="text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5"
                />
                <span className="line-clamp-2">{result.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geocoding Loader */}
      {geocoding && (
        <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
          <Loader2 size={14} className="animate-spin" />
          <span>Fetching address details...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 
                        border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      {/* Map */}
      <div
        className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm"
        style={{ height: "380px" }}
      >
        <MapContainer
          center={markerPosition || DEFAULT_CENTER}
          zoom={markerPosition ? 16 : DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <InvalidateSizeOnMount />
          {viewCenter && <ChangeView center={viewCenter} zoom={16} />}
          {markerPosition && <Marker position={markerPosition} />}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <MapPin size={12} />
        Click anywhere on the map to select a location, or use the search box
        above.
      </p>
    </div>
  );
};

export default LocationPicker;