/**
 * Sync KiriminAja district/kecamatan IDs to CekOngkir database
 * 
 * KiriminAja uses district/kecamatan-level addressing (not city-level like RajaOngkir).
 * This script maps each city in our database to a default KiriminAja district ID
 * by matching province and city names.
 * 
 * Usage: KIRIMINAJA_API_KEY=your_key npx tsx scripts/sync-kiriminaja-ids.ts
 */

import { PrismaClient } from '@prisma/client'

const KIRIMINAJA_API_KEY = process.env.KIRIMINAJA_API_KEY || ''
const KIRIMINAJA_BASE_URL = process.env.KIRIMINAJA_BASE_URL || 'https://mitra.kiriminaja.com'

const prisma = new PrismaClient()

interface KiriminAjaProvince {
  id: number
  name: string
}

interface KiriminAjaCity {
  id: number
  name: string
  province_id: number
}

interface KiriminAjaDistrict {
  id: number
  name: string
  city_id: number
}

interface KiriminAjaListResponse<T> {
  status: boolean
  message: string
  data: T[]
}

async function fetchKaProvinces(): Promise<KiriminAjaProvince[]> {
  const res = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/provinces`, {
    headers: {
      'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
      'Accept': 'application/json',
    },
  })
  const data: KiriminAjaListResponse<KiriminAjaProvince> = await res.json()
  if (data.status && data.data) return data.data
  throw new Error(`Failed to fetch provinces: ${data.message}`)
}

async function fetchKaCities(provinceId: number): Promise<KiriminAjaCity[]> {
  const res = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/cities?province_id=${provinceId}`, {
    headers: {
      'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
      'Accept': 'application/json',
    },
  })
  const data: KiriminAjaListResponse<KiriminAjaCity> = await res.json()
  if (data.status && data.data) return data.data
  throw new Error(`Failed to fetch cities for province ${provinceId}: ${data.message}`)
}

async function fetchKaDistricts(cityId: number): Promise<KiriminAjaDistrict[]> {
  const res = await fetch(`${KIRIMINAJA_BASE_URL}/api/mitra/v2/address/districts?city_id=${cityId}`, {
    headers: {
      'Authorization': `Bearer ${KIRIMINAJA_API_KEY}`,
      'Accept': 'application/json',
    },
  })
  const data: KiriminAjaListResponse<KiriminAjaDistrict> = await res.json()
  if (data.status && data.data) return data.data
  throw new Error(`Failed to fetch districts for city ${cityId}: ${data.message}`)
}

/**
 * Normalize province/city name for matching
 * e.g. "DKI Jakarta" -> "dki jakarta", "DI Yogyakarta" -> "di yogyakarta"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Try to match a name using various strategies
 */
function matchName(ourName: string, theirName: string): boolean {
  const a = normalizeName(ourName)
  const b = normalizeName(theirName)

  // Exact match
  if (a === b) return true

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true

  // Remove common prefixes/suffixes
  const cleanA = a.replace(/^(kota|kabupaten|kab)\s+/i, '')
  const cleanB = b.replace(/^(kota|kabupaten|kab)\s+/i, '')
  if (cleanA === cleanB) return true
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true

  return false
}

async function main() {
  if (!KIRIMINAJA_API_KEY) {
    console.error('ERROR: KIRIMINAJA_API_KEY environment variable is required')
    console.error('Usage: KIRIMINAJA_API_KEY=your_key npx tsx scripts/sync-kiriminaja-ids.ts')
    process.exit(1)
  }

  console.log('=== Syncing KiriminAja District IDs ===\n')

  // Get all provinces from KiriminAja
  console.log('Fetching provinces from KiriminAja...')
  const kaProvinces = await fetchKaProvinces()
  console.log(`Found ${kaProvinces.length} provinces`)

  // Get all provinces from our database
  const ourProvinces = await prisma.province.findMany({
    include: { cities: true }
  })
  console.log(`Found ${ourProvinces.length} provinces in our database`)

  let totalMatched = 0
  let totalUnmatched = 0

  // For each of our provinces, find the matching KiriminAja province
  for (const ourProvince of ourProvinces) {
    const kaProvince = kaProvinces.find(p => matchName(ourProvince.name, p.name))
    
    if (!kaProvince) {
      console.log(`\n⚠️  Province not matched: ${ourProvince.name}`)
      totalUnmatched += ourProvince.cities.length
      continue
    }

    console.log(`\n📍 Province: ${ourProvince.name} → ${kaProvince.name} (ID: ${kaProvince.id})`)

    // Fetch cities for this province from KiriminAja
    let kaCities: KiriminAjaCity[] = []
    try {
      kaCities = await fetchKaCities(kaProvince.id)
    } catch (error) {
      console.error(`  ❌ Failed to fetch cities: ${error}`)
      totalUnmatched += ourProvince.cities.length
      continue
    }

    // Match each of our cities
    for (const ourCity of ourProvinces.find(p => p.id === ourProvince.id)!.cities) {
      const kaCity = kaCities.find(c => matchName(ourCity.name, c.name))
      
      if (!kaCity) {
        console.log(`  ⚠️  City not matched: ${ourCity.name}`)
        totalUnmatched++
        continue
      }

      // Fetch districts for this city from KiriminAja
      let kaDistricts: KiriminAjaDistrict[] = []
      try {
        kaDistricts = await fetchKaDistricts(kaCity.id)
      } catch (error) {
        console.error(`  ❌ Failed to fetch districts for ${ourCity.name}: ${error}`)
        totalUnmatched++
        continue
      }

      if (kaDistricts.length === 0) {
        console.log(`  ⚠️  No districts found for: ${ourCity.name}`)
        totalUnmatched++
        continue
      }

      // Use the first district as the default for this city
      // (Users can specify a more precise district later)
      const defaultDistrict = kaDistricts[0]

      // Update the city with the KiriminAja district ID
      await prisma.city.update({
        where: { id: ourCity.id },
        data: { kiriminAjaDistrictId: defaultDistrict.id },
      })

      console.log(`  ✅ ${ourCity.name} → district: ${defaultDistrict.name} (ID: ${defaultDistrict.id})`)
      totalMatched++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n=== Sync Complete ===`)
  console.log(`Matched: ${totalMatched}`)
  console.log(`Unmatched: ${totalUnmatched}`)

  await prisma.$disconnect()
}

main().catch(error => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
