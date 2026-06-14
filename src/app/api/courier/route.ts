import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const couriers = await db.courier.findMany({
      include: { services: { orderBy: { basePrice: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ status: 'ok', data: couriers })
  } catch (error) {
    console.error('Error fetching couriers:', error)
    return NextResponse.json({ status: 'error', message: 'Gagal mengambil data kurir' }, { status: 500 })
  }
}
