/**
 * Script to sync RajaOngkir city IDs to our CekOngkir database
 * 
 * This fetches all cities from RajaOngkir API and matches them
 * to our database cities by name + province, then updates the
 * rajaOngkirId field.
 * 
 * Usage: npx tsx scripts/sync-rajaongkir-ids.ts
 */

import { db } from '@/lib/db'

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || ''
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/starter'

interface RajaOngkirCity {
  city_id: string
  province_id: string
  province: string
  type: string
  city_name: string
  postal_code: string
}

async function fetchRajaOngkirCities(): Promise<RajaOngkirCity[]> {
  const res = await fetch(`${RAJAONGKIR_BASE_URL}/city`, {
    headers: { key: RAJAONGKIR_API_KEY },
  })
  const data = await res.json()
  
  if (data.rajaongkir?.status?.code !== 200) {
    throw new Error(`RajaOngkir API error: ${data.rajaongkir?.status?.description || 'Unknown error'}`)
  }
  
  return data.rajaongkir.results
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(kota|kabupaten)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

async function main() {
  if (!RAJAONGKIR_API_KEY) {
    console.error('ERROR: RAJAONGKIR_API_KEY not set in environment')
    process.exit(1)
  }

  console.log('Fetching cities from RajaOngkir...')
  const roCities = await fetchRajaOngkirCities()
  console.log(`Found ${roCities.length} cities in RajaOngkir`)

  // Get our cities
  const ourCities = await db.city.findMany({ include: { province: true } })
  console.log(`Found ${ourCities.length} cities in our database`)

  // Build RajaOngkir lookup: normalized city name + province -> rajaOngkirId
  const roLookup = new Map<string, RajaOngkirCity>()
  for (const rc of roCities) {
    const key = `${normalizeName(rc.city_name)}|${normalizeName(rc.province)}`
    roLookup.set(key, rc)
  }

  let matched = 0
  let unmatched = 0
  const unmatchedCities: string[] = []

  for (const city of ourCities) {
    const key = `${normalizeName(city.name)}|${normalizeName(city.province.name)}`
    const roCity = roLookup.get(key)

    if (roCity) {
      const roId = parseInt(roCity.city_id, 10)
      await db.city.update({
        where: { id: city.id },
        data: { rajaOngkirId: roId },
      })
      matched++
      console.log(`  ✅ ${city.name}, ${city.province.name} -> RajaOngkir ID: ${roId}`)
    } else {
      // Try alternate matching strategies
      let found = false
      
      // Try with Kab/Kota prefix variations
      const prefixes = ['kab ', 'kabupaten ', 'kota ']
      for (const prefix of prefixes) {
        const altKey = `${prefix}${normalizeName(city.name)}|${normalizeName(city.province.name)}`
        const altCity = roLookup.get(altKey)
        if (altCity) {
          const roId = parseInt(altCity.city_id, 10)
          await db.city.update({
            where: { id: city.id },
            data: { rajaOngkirId: roId },
          })
          matched++
          found = true
          console.log(`  ✅ ${city.name}, ${city.province.name} -> RajaOngkir ID: ${roId} (via "${prefix}" prefix)`)
          break
        }
      }
      
      if (!found) {
        unmatched++
        unmatchedCities.push(`${city.name}, ${city.province.name}`)
        console.log(`  ❌ ${city.name}, ${city.province.name} - NO MATCH`)
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Matched: ${matched}`)
  console.log(`Unmatched: ${unmatched}`)
  if (unmatchedCities.length > 0) {
    console.log(`Unmatched cities: ${unmatchedCities.join(', ')}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
