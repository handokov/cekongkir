import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const provinces = await db.province.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ status: 'ok', data: provinces })
  } catch (error) {
    console.error('Error fetching provinces:', error)
    return NextResponse.json({ status: 'error', message: 'Gagal mengambil data provinsi' }, { status: 500 })
  }
}
