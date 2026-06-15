import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const provinceId = searchParams.get('provinceId')

    const where: Record<string, unknown> = {}
    if (search) {
      where.name = { contains: search }
    }
    if (provinceId) {
      where.provinceId = provinceId
    }

    const cities = await db.city.findMany({
      where,
      include: { province: true },
      orderBy: [{ province: { name: 'asc' } }, { name: 'asc' }],
    })

    const formatted = cities.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      province: c.province.name,
      label: `${c.type} ${c.name}, ${c.province.name}`,
    }))

    return NextResponse.json({ status: 'ok', data: formatted })
  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json({ status: 'error', message: 'Gagal mengambil data kota' }, { status: 500 })
  }
}
