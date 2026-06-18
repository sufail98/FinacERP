/**
 * Nominatim Geocoding Service (100% Free, No API Key)
 *
 * OpenStreetMap Nominatim Usage Policy:
 * - Maximum 1 request per second
 * - Provide a meaningful User-Agent / Referer
 * - No bulk/heavy usage
 * - https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Rate Limiter (1 req/sec)
let lastRequestTimestamp = 0;
const MIN_INTERVAL_MS = 1100;

const enforceRateLimit = async () => {
  const elapsed = Date.now() - lastRequestTimestamp;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_INTERVAL_MS - elapsed)
    );
  }
  lastRequestTimestamp = Date.now();
};

const getHeaders = () => ({
  Accept: "application/json",
  "Accept-Language": "en",
});

const parseAddressComponents = (address) => {
  if (!address) {
    return {
      addressLine: "",
      street: "",
      district: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    };
  }

  const street = [address.house_number, address.road || address.street]
    .filter(Boolean)
    .join(" ");

  const addressLine = [
    street,
    address.neighbourhood || address.suburb || address.quarter,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    addressLine,
    street: address.road || address.street || "",
    district:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.district ||
      "",
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      "",
    state:
      address.state ||
      address.region ||
      address.province ||
      address.state_district ||
      "",
    country: address.country || "",
    postalCode: address.postcode || "",
  };
};

export const searchLocation = async (query, signal) => {
  if (!query || query.trim().length < 3) return [];

  await enforceRateLimit();

  const params = new URLSearchParams({
    q: query.trim(),
    format: "json",
    addressdetails: "1",
    limit: "5",
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: getHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed: ${response.status}`);
  }

  const data = await response.json();

  return data.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    address: parseAddressComponents(item.address),
  }));
};

export const reverseGeocode = async (lat, lng, signal) => {
  await enforceRateLimit();

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: "json",
    addressdetails: "1",
    zoom: "18",
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
    headers: getHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Nominatim reverse geocode failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    displayName: data.display_name,
    address: parseAddressComponents(data.address),
  };
};