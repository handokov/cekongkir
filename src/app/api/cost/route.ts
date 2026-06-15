import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  fetchKiriminAjaPrice,
  getKiriminAjaSupportedCouriers,
  getKiriminAjaUnsupportedCouriers,
  isKiriminAjaConfigured,
} from '@/lib/kiriminaja'

// RajaOngkir integration for real-time pricing (JNE, TIKI, POS)
const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || ''
const RAJAONGKIR_BASE_URL = process.env.RAJAONGKIR_BASE_URL || 'https://api.rajaongkir.com/starter'

// Couriers supported by RajaOngkir Starter (free plan)
const RAJAONGKIR_COURIERS = ['jne', 'tiki', 'pos']

// Cost calculation logic with distance-based pricing
interface CostRequest {
  originCityId: string
  destinationCityId: string
  weight: number // in grams
  courierCodes: string[]
}

interface CostResult {
  courier: { code: string; name: string }
  services: Array<{
    serviceCode: string
    serviceName: string
    description: string | null
    estimated: string | null
    cost: number
    isRealTime: boolean // true = from real API (RajaOngkir/KiriminAja), false = estimated
    source: string // 'rajaongkir' | 'kiriminaja' | 'estimation'
  }>
}

interface RajaOngkirCostResult {
  code: string
  name: string
  costs: Array<{
    service: string
    description: string
    cost: Array<{
      value: number
      etd: string
      note: string
    }>
  }>
}

function calculateDistanceMultiplier(
  originProvince: string,
  destProvince: string,
  originCity: string,
  destCity: string
): number {
  // Same city
  if (originProvince === destProvince && originCity === destCity) return 0.7

  // Same province
  if (originProvince === destProvince) return 1.0

  // Island groups for distance calculation
  const islandGroups: Record<string, string> = {
    'DKI Jakarta': 'Jawa', 'Jawa Barat': 'Jawa', 'Jawa Tengah': 'Jawa',
    'DI Yogyakarta': 'Jawa', 'Jawa Timur': 'Jawa', 'Banten': 'Jawa',
    'Bali': 'Bali_Nusra', 'Nusa Tenggara Barat': 'Bali_Nusra', 'Nusa Tenggara Timur': 'Bali_Nusra',
    'Sumatera Utara': 'Sumatera', 'Sumatera Barat': 'Sumatera', 'Riau': 'Sumatera',
    'Kepulauan Riau': 'Sumatera', 'Sumatera Selatan': 'Sumatera', 'Jambi': 'Sumatera',
    'Bengkulu': 'Sumatera', 'Lampung': 'Sumatera', 'Bangka Belitung': 'Sumatera', 'Aceh': 'Sumatera',
    'Kalimantan Barat': 'Kalimantan', 'Kalimantan Tengah': 'Kalimantan',
    'Kalimantan Selatan': 'Kalimantan', 'Kalimantan Timur': 'Kalimantan', 'Kalimantan Utara': 'Kalimantan',
    'Sulawesi Utara': 'Sulawesi', 'Sulawesi Tengah': 'Sulawesi', 'Sulawesi Selatan': 'Sulawesi',
    'Sulawesi Tenggara': 'Sulawesi', 'Gorontalo': 'Sulawesi', 'Sulawesi Barat': 'Sulawesi',
    'Maluku': 'Maluku_Papua', 'Maluku Utara': 'Maluku_Papua',
    'Papua': 'Maluku_Papua', 'Papua Barat': 'Maluku_Papua',
  }

  const originIsland = islandGroups[originProvince] || 'Other'
  const destIsland = islandGroups[destProvince] || 'Other'

  // Same island
  if (originIsland === destIsland) return 1.3

  // Java to Sumatera (close)
  if ((originIsland === 'Jawa' && destIsland === 'Sumatera') ||
      (originIsland === 'Sumatera' && destIsland === 'Jawa')) return 1.5

  // Java to Bali (close)
  if ((originIsland === 'Jawa' && destIsland === 'Bali_Nusra') ||
      (originIsland === 'Bali_Nusra' && destIsland === 'Jawa')) return 1.4

  // Java to Kalimantan
  if ((originIsland === 'Jawa' && destIsland === 'Kalimantan') ||
      (originIsland === 'Kalimantan' && destIsland === 'Jawa')) return 1.6

  // Java to Sulawesi
  if ((originIsland === 'Jawa' && destIsland === 'Sulawesi') ||
      (originIsland === 'Sulawesi' && destIsland === 'Jawa')) return 1.7

  // Same big region (Sumatera-Kalimantan, etc.)
  if (['Sumatera', 'Kalimantan'].includes(originIsland) && ['Sumatera', 'Kalimantan'].includes(destIsland)) return 1.6

  // To/from Maluku_Papua (far)
  if (originIsland === 'Maluku_Papua' || destIsland === 'Maluku_Papua') return 2.2

  // Default cross-island
  return 1.8
}

function calculateCost(
  basePrice: number,
  pricePerKg: number,
  weightGrams: number,
  distanceMultiplier: number
): number {
  const weightKg = Math.max(1, Math.ceil(weightGrams / 1000))
  const baseCost = basePrice + (weightKg - 1) * pricePerKg
  const finalCost = Math.round(baseCost * distanceMultiplier)
  // Round to nearest 500
  return Math.round(finalCost / 500) * 500
}

/**
 * Fetch real-time shipping costs from RajaOngkir API
 */
async function fetchRajaOngkirCosts(
  originRajaOngkirId: number,
  destRajaOngkirId: number,
  weight: number,
  courierCode: string
): Promise<RajaOngkirCostResult | null> {
  if (!RAJAONGKIR_API_KEY) {
    console.warn('[RajaOngkir] API key not configured, skipping real-time pricing')
    return null
  }

  try {
    const res = await fetch(`${RAJAONGKIR_BASE_URL}/cost`, {
      method: 'POST',
      headers: {
        'key': RAJAONGKIR_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        origin: String(originRajaOngkirId),
        destination: String(destRajaOngkirId),
        weight: String(Math.max(1, Math.ceil(weight / 1000) * 1000)), // Round up to nearest kg
        courier: courierCode,
      }),
    })

    const data = await res.json()

    if (data.rajaongkir?.status?.code === 200 && data.rajaongkir?.results?.[0]) {
      return data.rajaongkir.results[0]
    }

    console.warn(`[RajaOngkir] API returned non-200 for ${courierCode}:`, data.rajaongkir?.status)
    return null
  } catch (error) {
    console.error(`[RajaOngkir] Error fetching costs for ${courierCode}:`, error)
    return null
  }
}

/**
 * Fetch real-time shipping costs from KiriminAja API
 * Uses district/kecamatan IDs
 */
async function fetchKiriminAjaCosts(
  originDistrictId: number,
  destDistrictId: number,
  weight: number,
  courierCodes: string[]
): Promise<CostResult[] | null> {
  if (!isKiriminAjaConfigured()) {
    return null
  }

  try {
    const kaResults = await fetchKiriminAjaPrice(
      originDistrictId,
      destDistrictId,
      weight,
      courierCodes
    )

    if (!kaResults || kaResults.length === 0) {
      return null
    }

    // Convert KiriminAja results to our CostResult format
    const results: CostResult[] = kaResults.map(kaResult => ({
      courier: { code: kaResult.courier_code, name: kaResult.courier },
      services: (kaResult.services || []).map(svc => ({
        serviceCode: svc.service_code || svc.service,
        serviceName: svc.description || svc.service,
        description: svc.description || null,
        estimated: svc.etd ? `${svc.etd}` : null,
        cost: svc.price || 0,
        isRealTime: true,
        source: 'kiriminaja' as const,
      })),
    }))

    return results
  } catch (error) {
    console.error('[KiriminAja] Error fetching costs:', error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body: CostRequest = await request.json()
    const { originCityId, destinationCityId, weight, courierCodes } = body

    if (!originCityId || !destinationCityId || !weight || !courierCodes?.length) {
      return NextResponse.json(
        { status: 'error', message: 'Parameter tidak lengkap. Dibutuhkan: originCityId, destinationCityId, weight, courierCodes' },
        { status: 400 }
      )
    }

    if (weight < 1) {
      return NextResponse.json(
        { status: 'error', message: 'Berat minimal 1 gram' },
        { status: 400 }
      )
    }

    // Get origin and destination city data
    const [originCity, destCity] = await Promise.all([
      db.city.findUnique({ where: { id: originCityId }, include: { province: true } }),
      db.city.findUnique({ where: { id: destinationCityId }, include: { province: true } }),
    ])

    if (!originCity || !destCity) {
      return NextResponse.json(
        { status: 'error', message: 'Kota asal atau tujuan tidak ditemukan' },
        { status: 404 }
      )
    }

    const distanceMultiplier = calculateDistanceMultiplier(
      originCity.province.name, destCity.province.name,
      originCity.name, destCity.name
    )

    const results: CostResult[] = []
    const processedCouriers = new Set<string>() // Track couriers that got real-time results
    const estimationNeeded: string[] = [] // Couriers that need estimation fallback

    // === STEP 1: Fetch from KiriminAja (18+ couriers) ===
    const kaSupportedCouriers = getKiriminAjaSupportedCouriers(courierCodes)
    const hasOriginKaId = originCity.kiriminAjaDistrictId != null
    const hasDestKaId = destCity.kiriminAjaDistrictId != null

    if (kaSupportedCouriers.length > 0 && isKiriminAjaConfigured() && hasOriginKaId && hasDestKaId) {
      console.log(`[KiriminAja] Fetching prices for ${kaSupportedCouriers.length} couriers`)
      const kaResults = await fetchKiriminAjaCosts(
        originCity.kiriminAjaDistrictId!,
        destCity.kiriminAjaDistrictId!,
        weight,
        kaSupportedCouriers
      )

      if (kaResults && kaResults.length > 0) {
        for (const result of kaResults) {
          if (result.services.length > 0) {
            results.push(result)
            processedCouriers.add(result.courier.code)
          }
        }
      }

      // Couriers that KiriminAja supports but didn't return results for
      for (const code of kaSupportedCouriers) {
        if (!processedCouriers.has(code)) {
          estimationNeeded.push(code)
        }
      }
    } else {
      // KiriminAja not configured or no district ID mapping
      if (kaSupportedCouriers.length > 0) {
        if (!isKiriminAjaConfigured()) {
          console.warn('[KiriminAja] API key not configured')
        } else {
          console.warn('[KiriminAja] No district ID mapping available for cities')
        }
      }
      // Check which KiriminAja couriers also supported by RajaOngkir
      // Those not supported by RajaOngkir go to estimation
      for (const code of kaSupportedCouriers) {
        if (!RAJAONGKIR_COURIERS.includes(code)) {
          estimationNeeded.push(code)
        }
        // RajaOngkir-supported couriers will be handled in step 2
      }
    }

    // === STEP 2: Fetch from RajaOngkir (JNE, TIKI, POS) ===
    // Only fetch from RajaOngkir if not already covered by KiriminAja
    const roCouriers = courierCodes.filter(c =>
      RAJAONGKIR_COURIERS.includes(c) && !processedCouriers.has(c)
    )

    if (roCouriers.length > 0 && RAJAONGKIR_API_KEY) {
      const hasOriginRoId = originCity.rajaOngkirId != null
      const hasDestRoId = destCity.rajaOngkirId != null

      if (hasOriginRoId && hasDestRoId) {
        const roPromises = roCouriers.map(async (courierCode) => {
          const roResult = await fetchRajaOngkirCosts(
            originCity.rajaOngkirId!,
            destCity.rajaOngkirId!,
            weight,
            courierCode
          )

          if (roResult && roResult.costs && roResult.costs.length > 0) {
            return {
              courier: { code: roResult.code, name: roResult.name },
              services: roResult.costs.map(cost => ({
                serviceCode: cost.service,
                serviceName: cost.description,
                description: cost.description,
                estimated: cost.cost[0]?.etd ? `${cost.cost[0].etd} hari` : null,
                cost: cost.cost[0]?.value || 0,
                isRealTime: true,
                source: 'rajaongkir' as const,
              })),
            } as CostResult
          }
          return null
        })

        const roResults = await Promise.all(roPromises)

        for (let i = 0; i < roResults.length; i++) {
          if (roResults[i]) {
            results.push(roResults[i]!)
            processedCouriers.add(roCouriers[i])
          } else {
            estimationNeeded.push(roCouriers[i])
          }
        }
      } else {
        console.warn('[RajaOngkir] No city ID mapping available, using estimation for:', roCouriers)
        estimationNeeded.push(...roCouriers)
      }
    } else if (roCouriers.length > 0) {
      // No API key
      estimationNeeded.push(...roCouriers)
    }

    // === STEP 3: Add remaining couriers not handled by any API ===
    for (const code of courierCodes) {
      if (!processedCouriers.has(code) && !estimationNeeded.includes(code)) {
        estimationNeeded.push(code)
      }
    }

    // === STEP 4: Calculate estimated costs for remaining couriers ===
    if (estimationNeeded.length > 0) {
      const uniqueEstNeeded = [...new Set(estimationNeeded)]
      const couriers = await db.courier.findMany({
        where: { code: { in: uniqueEstNeeded } },
        include: { services: { orderBy: { basePrice: 'asc' } } },
      })

      for (const courier of couriers) {
        results.push({
          courier: { code: courier.code, name: courier.name },
          services: courier.services.map(service => ({
            serviceCode: service.serviceCode,
            serviceName: service.serviceName,
            description: service.description,
            estimated: service.estimated,
            cost: calculateCost(service.basePrice, service.pricePerKg, weight, distanceMultiplier),
            isRealTime: false,
            source: 'estimation' as const,
          })),
        })
      }
    }

    // Sort results: cheapest first across all services
    results.sort((a, b) => {
      const minA = Math.min(...a.services.map(s => s.cost))
      const minB = Math.min(...b.services.map(s => s.cost))
      return minA - minB
    })

    // Build info about which APIs are configured
    const apiSources: string[] = []
    if (RAJAONGKIR_API_KEY) apiSources.push('RajaOngkir')
    if (isKiriminAjaConfigured()) apiSources.push('KiriminAja')

    // Build disclaimer
    const hasEstimation = results.some(r => r.services.some(s => !s.isRealTime))
    const hasRealTime = results.some(r => r.services.some(s => s.isRealTime))

    let disclaimer: string | undefined
    if (hasEstimation) {
      if (hasRealTime) {
        disclaimer = 'Harga bertanda "estimasi" bukan harga resmi kurir. Harga bertanda "Real-time" berasal dari API resmi (RajaOngkir/KiriminAja). Untuk harga pasti, hubungi kurir terkait.'
      } else {
        disclaimer = 'Harga yang ditampilkan adalah estimasi dan bukan harga resmi kurir. Untuk harga pasti, hubungi kurir terkait.'
      }
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        origin: { city: originCity.name, type: originCity.type, province: originCity.province.name },
        destination: { city: destCity.name, type: destCity.type, province: destCity.province.name },
        weight,
        distanceMultiplier: Math.round(distanceMultiplier * 100) / 100,
        results,
        apiSources: apiSources.length > 0 ? apiSources : undefined,
        disclaimer,
      }
    })
  } catch (error) {
    console.error('Error calculating cost:', error)
    return NextResponse.json({ status: 'error', message: 'Gagal menghitung ongkos kirim' }, { status: 500 })
  }
}
