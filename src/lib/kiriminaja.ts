/**
 * KiriminAja Mitra API Integration
 * 
 * Official API documentation: https://developer.kiriminaja.com/docs
 * 
 * Features:
 * - Get Pricing Express (regular shipping rates)
 * - Get Pricing Instant (same-day: Grab Express, GoSend, etc.)
 * - Full Shipping Price (all available couriers)
 * - 18+ courier partners
 * - Uses district/kecamatan-based addressing
 * 
 * Note: Requires commitment fee deposit (Rp 2.000.000) for production access.
 * Staging mode is available for testing without deposit.
 */

const KIRIMINAJA_API_KEY = process.env.KIRIMINAJA_API_KEY || ''
const KIRIMINAJA_BASE_URL = process.env.KIRIMINAJA_BASE_URL || 'https://mitra.kiriminaja.com'

// KiriminAja-supported courier codes (from their courier list)
// These couriers can get real-time pricing from KiriminAja
export const KIRIMINAJA_COURIERS = [
  'jne', 'jnt', 'sicepat', 'tiki', 'pos', 'anteraja', 'wahana',
  'ninja', 'lion', 'idl', 'rpx', 'sap', 'jet', 'dse', 'first',
  'ncs', 'star', 'sentral', 'pandu'
]

// Map our courier codes to KiriminAja courier codes
export const COURIER_CODE_MAP: Record<string, string> = {
  'jne': 'jne',
  'jnt': 'jnt',
  'sicepat': 'sicepat',
  'tiki': 'tiki',
  'pos': 'pos',
  'anteraja': 'anteraja',
  'wahana': 'wahana',
  'ninja': 'ninja',
  'lion': 'lion',
  'idl': 'idl',
  'rpx': 'rpx',
  'sap': 'sap',
  'jet': 'jet',
  'dse': 'dse',
  'first': 'first',
  'ncs': 'ncs',
  'star': 'star',
  'sentral': 'sentral',
  'pandu': 'pandu',
}

export interface KiriminAjaPriceService {
  service: string
  service_code: string
  description: string
  price: number
  etd: string
}

export interface KiriminAjaPriceResult {
  courier: string
  courier_code: string
  services: KiriminAjaPriceService[]
}

export interface KiriminAjaPriceResponse {
  status: boolean
  message: string
  data: KiriminAjaPriceResult[]
}

export interface KiriminAjaFullPriceResponse {
  status: boolean
  message: string
  data: KiriminAjaPriceResult[]
}

/**
 * Get express shipping prices from KiriminAja API
 * Uses district/kecamatan IDs for origin and destination
 */
export async function fetchKiriminAjaPrice(
  originDistrictId: number,
  destDistrictId: number,
  weight: number, // in grams
  courierCodes: string[],
  itemValue: number = 0
): Promise<KiriminAjaPriceResult[] | null> {
  if (!KIRIMINAJA_API_KEY) {
    console.warn('[KiriminAja] API key not configured, skipping real-time pricing')
    return null
  }

  try {
    const weightKg = Math.max(1, Math.ceil(weight / 1000))

    // KiriminAja getPrice accepts multiple couriers in one request
    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/shipping/pricing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        origin: originDistrictId,
        destination: destDistrictId,
        weight: weightKg,
        item_value: itemValue,
        courier: courierCodes.map(code => COURIER_CODE_MAP[code] || code),
      }),
    })

    const data: KiriminAjaPriceResponse = await response.json()

    if (data.status && data.data && data.data.length > 0) {
      return data.data
    }

    console.warn('[KiriminAja] API returned no results:', data.message)
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching prices:', error)
    return null
  }
}

/**
 * Get full shipping prices from KiriminAja (all available couriers)
 */
export async function fetchKiriminAjaFullPrice(
  originDistrictId: number,
  destDistrictId: number,
  weight: number // in grams
): Promise<KiriminAjaPriceResult[] | null> {
  if (!KIRIMINAJA_API_KEY) {
    console.warn('[KiriminAja] API key not configured, skipping full pricing')
    return null
  }

  try {
    const weightKg = Math.max(1, Math.ceil(weight / 1000))

    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/shipping/full-pricing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        origin: originDistrictId,
        destination: destDistrictId,
        weight: weightKg,
      }),
    })

    const data: KiriminAjaFullPriceResponse = await response.json()

    if (data.status && data.data && data.data.length > 0) {
      return data.data
    }

    console.warn('[KiriminAja] Full pricing API returned no results:', data.message)
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching full prices:', error)
    return null
  }
}

/**
 * Get instant shipping prices (Grab Express, GoSend, etc.)
 */
export async function fetchKiriminAjaInstantPrice(
  originLat: number,
  originLong: number,
  originAddress: string,
  destLat: number,
  destLong: number,
  destAddress: string,
  weight: number, // in grams
  services: string[] = ['grab_express', 'gosend'],
  vehicle: 'motor' | 'mobil' = 'motor'
): Promise<KiriminAjaPriceResult[] | null> {
  if (!KIRIMINAJA_API_KEY) {
    console.warn('[KiriminAja] API key not configured, skipping instant pricing')
    return null
  }

  try {
    const weightKg = Math.max(1, Math.ceil(weight / 1000))

    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/shipping/pricing-instant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        service: services,
        item_price: 0,
        origin: { lat: originLat, long: originLong, address: originAddress },
        destination: { lat: destLat, long: destLong, address: destAddress },
        weight: weightKg,
        vehicle: vehicle,
        timezone: 'Asia/Jakarta',
      }),
    })

    const data = await response.json()

    if (data.status && data.data && data.data.length > 0) {
      return data.data
    }

    console.warn('[KiriminAja] Instant pricing API returned no results:', data.message)
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching instant prices:', error)
    return null
  }
}

/**
 * Get list of provinces from KiriminAja
 */
export async function getKiriminAjaProvinces(): Promise<Array<{ id: number; name: string }> | null> {
  if (!KIRIMINAJA_API_KEY) return null

  try {
    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/provinces`, {
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    if (data.status && data.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching provinces:', error)
    return null
  }
}

/**
 * Get cities by province from KiriminAja
 */
export async function getKiriminAjaCities(provinceId: number): Promise<Array<{ id: number; name: string; province_id: number }> | null> {
  if (!KIRIMINAJA_API_KEY) return null

  try {
    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/cities?province_id=${provinceId}`, {
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    if (data.status && data.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching cities:', error)
    return null
  }
}

/**
 * Get districts by city from KiriminAja
 */
export async function getKiriminAjaDistricts(cityId: number): Promise<Array<{ id: number; name: string; city_id: number }> | null> {
  if (!KIRIMINAJA_API_KEY) return null

  try {
    const response = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/districts?city_id=${cityId}`, {
      headers: {
        'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    if (data.status && data.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('[KiriminAja] Error fetching districts:', error)
    return null
  }
}

/**
 * Check if KiriminAja API is configured
 */
export function isKiriminAjaConfigured(): boolean {
  return !!KIRIMINAJA_API_KEY
}

/**
 * Get courier codes that are supported by KiriminAja
 */
export function getKiriminAjaSupportedCouriers(courierCodes: string[]): string[] {
  return courierCodes.filter(code => KIRIMINAJA_COURIERS.includes(code))
}

/**
 * Get courier codes NOT supported by KiriminAja
 */
export function getKiriminAjaUnsupportedCouriers(courierCodes: string[]): string[] {
  return courierCodes.filter(code => !KIRIMINAJA_COURIERS.includes(code))
}
