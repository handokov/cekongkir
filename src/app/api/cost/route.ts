import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

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

    // Get couriers with services
    const couriers = await db.courier.findMany({
      where: { code: { in: courierCodes } },
      include: { services: { orderBy: { basePrice: 'asc' } } },
    })

    const results: CostResult[] = couriers.map(courier => ({
      courier: { code: courier.code, name: courier.name },
      services: courier.services.map(service => ({
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
        description: service.description,
        estimated: service.estimated,
        cost: calculateCost(service.basePrice, service.pricePerKg, weight, distanceMultiplier),
      })),
    }))

    // Sort results: cheapest first across all services
    results.sort((a, b) => {
      const minA = Math.min(...a.services.map(s => s.cost))
      const minB = Math.min(...b.services.map(s => s.cost))
      return minA - minB
    })

    return NextResponse.json({
      status: 'ok',
      data: {
        origin: { city: originCity.name, type: originCity.type, province: originCity.province.name },
        destination: { city: destCity.name, type: destCity.type, province: destCity.province.name },
        weight,
        distanceMultiplier: Math.round(distanceMultiplier * 100) / 100,
        results,
      }
    })
  } catch (error) {
    console.error('Error calculating cost:', error)
    return NextResponse.json({ status: 'error', message: 'Gagal menghitung ongkos kirim' }, { status: 500 })
  }
}
