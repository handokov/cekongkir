import { db } from '@/lib/db'

async function main() {
  console.log('Seeding database...')

  // Seed Provinces
  const provinces = [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
    'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
    'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
    'Sumatera Selatan', 'Jambi', 'Bengkulu', 'Lampung', 'Bangka Belitung',
    'Aceh', 'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan',
    'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara',
    'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
    'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara',
    'Papua', 'Papua Barat'
  ]

  const provinceMap: Record<string, string> = {}
  for (const name of provinces) {
    const existing = await db.province.findUnique({ where: { name } })
    if (existing) {
      provinceMap[name] = existing.id
    } else {
      const record = await db.province.create({ data: { name } })
      provinceMap[name] = record.id
    }
  }
  console.log(`Seeded ${provinces.length} provinces`)

  // Seed Cities - batch by province
  const cityGroups: Record<string, Array<{ name: string; type: string }>> = {
    'DKI Jakarta': [
      { name: 'Jakarta Pusat', type: 'Kota' }, { name: 'Jakarta Utara', type: 'Kota' },
      { name: 'Jakarta Barat', type: 'Kota' }, { name: 'Jakarta Selatan', type: 'Kota' },
      { name: 'Jakarta Timur', type: 'Kota' }, { name: 'Kepulauan Seribu', type: 'Kabupaten' },
    ],
    'Jawa Barat': [
      { name: 'Bandung', type: 'Kota' }, { name: 'Bandung Barat', type: 'Kabupaten' },
      { name: 'Bogor', type: 'Kota' }, { name: 'Bekasi', type: 'Kota' },
      { name: 'Depok', type: 'Kota' }, { name: 'Cirebon', type: 'Kota' },
      { name: 'Sukabumi', type: 'Kota' }, { name: 'Tasikmalaya', type: 'Kota' },
      { name: 'Garut', type: 'Kabupaten' }, { name: 'Subang', type: 'Kabupaten' },
      { name: 'Purwakarta', type: 'Kabupaten' }, { name: 'Karawang', type: 'Kabupaten' },
      { name: 'Sumedang', type: 'Kabupaten' }, { name: 'Indramayu', type: 'Kabupaten' },
      { name: 'Majalengka', type: 'Kabupaten' }, { name: 'Kuningan', type: 'Kabupaten' },
    ],
    'Jawa Tengah': [
      { name: 'Semarang', type: 'Kota' }, { name: 'Solo', type: 'Kota' },
      { name: 'Magelang', type: 'Kota' }, { name: 'Pekalongan', type: 'Kota' },
      { name: 'Salatiga', type: 'Kota' }, { name: 'Tegal', type: 'Kota' },
      { name: 'Kudus', type: 'Kabupaten' }, { name: 'Jepara', type: 'Kabupaten' },
      { name: 'Demak', type: 'Kabupaten' }, { name: 'Kendal', type: 'Kabupaten' },
      { name: 'Brebes', type: 'Kabupaten' }, { name: 'Banyumas', type: 'Kabupaten' },
      { name: 'Cilacap', type: 'Kabupaten' }, { name: 'Klaten', type: 'Kabupaten' },
      { name: 'Boyolali', type: 'Kabupaten' }, { name: 'Karanganyar', type: 'Kabupaten' },
    ],
    'DI Yogyakarta': [
      { name: 'Yogyakarta', type: 'Kota' }, { name: 'Sleman', type: 'Kabupaten' },
      { name: 'Bantul', type: 'Kabupaten' }, { name: 'Gunung Kidul', type: 'Kabupaten' },
      { name: 'Kulon Progo', type: 'Kabupaten' },
    ],
    'Jawa Timur': [
      { name: 'Surabaya', type: 'Kota' }, { name: 'Malang', type: 'Kota' },
      { name: 'Sidoarjo', type: 'Kabupaten' }, { name: 'Gresik', type: 'Kabupaten' },
      { name: 'Kediri', type: 'Kota' }, { name: 'Mojokerto', type: 'Kota' },
      { name: 'Jember', type: 'Kabupaten' }, { name: 'Probolinggo', type: 'Kota' },
      { name: 'Blitar', type: 'Kota' }, { name: 'Madiun', type: 'Kota' },
      { name: 'Pasuruan', type: 'Kota' }, { name: 'Banyuwangi', type: 'Kabupaten' },
      { name: 'Tulungagung', type: 'Kabupaten' }, { name: 'Bojonegoro', type: 'Kabupaten' },
      { name: 'Tuban', type: 'Kabupaten' }, { name: 'Lamongan', type: 'Kabupaten' },
    ],
    'Banten': [
      { name: 'Tangerang', type: 'Kota' }, { name: 'Tangerang Selatan', type: 'Kota' },
      { name: 'Serang', type: 'Kota' }, { name: 'Cilegon', type: 'Kota' },
      { name: 'Pandeglang', type: 'Kabupaten' }, { name: 'Lebak', type: 'Kabupaten' },
    ],
    'Bali': [
      { name: 'Denpasar', type: 'Kota' }, { name: 'Badung', type: 'Kabupaten' },
      { name: 'Gianyar', type: 'Kabupaten' }, { name: 'Tabanan', type: 'Kabupaten' },
      { name: 'Buleleng', type: 'Kabupaten' }, { name: 'Karangasem', type: 'Kabupaten' },
    ],
    'Nusa Tenggara Barat': [
      { name: 'Mataram', type: 'Kota' }, { name: 'Bima', type: 'Kota' },
      { name: 'Lombok Barat', type: 'Kabupaten' }, { name: 'Lombok Tengah', type: 'Kabupaten' },
      { name: 'Lombok Timur', type: 'Kabupaten' }, { name: 'Sumbawa', type: 'Kabupaten' },
    ],
    'Nusa Tenggara Timur': [
      { name: 'Kupang', type: 'Kota' }, { name: 'Ende', type: 'Kabupaten' },
      { name: 'Maumere', type: 'Kabupaten' },
    ],
    'Sumatera Utara': [
      { name: 'Medan', type: 'Kota' }, { name: 'Binjai', type: 'Kota' },
      { name: 'Pematangsiantar', type: 'Kota' }, { name: 'Deli Serdang', type: 'Kabupaten' },
      { name: 'Langkat', type: 'Kabupaten' }, { name: 'Simalungun', type: 'Kabupaten' },
    ],
    'Sumatera Barat': [
      { name: 'Padang', type: 'Kota' }, { name: 'Bukittinggi', type: 'Kota' },
      { name: 'Payakumbuh', type: 'Kota' }, { name: 'Solok', type: 'Kota' },
    ],
    'Riau': [
      { name: 'Pekanbaru', type: 'Kota' }, { name: 'Dumai', type: 'Kota' },
    ],
    'Kepulauan Riau': [
      { name: 'Batam', type: 'Kota' }, { name: 'Tanjung Pinang', type: 'Kota' },
    ],
    'Sumatera Selatan': [
      { name: 'Palembang', type: 'Kota' }, { name: 'Prabumulih', type: 'Kota' },
    ],
    'Jambi': [{ name: 'Jambi', type: 'Kota' }],
    'Bengkulu': [{ name: 'Bengkulu', type: 'Kota' }],
    'Lampung': [
      { name: 'Bandar Lampung', type: 'Kota' }, { name: 'Metro', type: 'Kota' },
      { name: 'Lampung Tengah', type: 'Kabupaten' },
    ],
    'Bangka Belitung': [
      { name: 'Pangkal Pinang', type: 'Kota' }, { name: 'Bangka', type: 'Kabupaten' },
    ],
    'Aceh': [
      { name: 'Banda Aceh', type: 'Kota' }, { name: 'Lhokseumawe', type: 'Kota' },
      { name: 'Langsa', type: 'Kota' },
    ],
    'Kalimantan Barat': [
      { name: 'Pontianak', type: 'Kota' }, { name: 'Singkawang', type: 'Kota' },
    ],
    'Kalimantan Tengah': [{ name: 'Palangka Raya', type: 'Kota' }],
    'Kalimantan Selatan': [
      { name: 'Banjarmasin', type: 'Kota' }, { name: 'Banjarbaru', type: 'Kota' },
    ],
    'Kalimantan Timur': [
      { name: 'Samarinda', type: 'Kota' }, { name: 'Balikpapan', type: 'Kota' },
      { name: 'Bontang', type: 'Kota' },
    ],
    'Kalimantan Utara': [
      { name: 'Tarakan', type: 'Kota' }, { name: 'Nunukan', type: 'Kabupaten' },
    ],
    'Sulawesi Utara': [
      { name: 'Manado', type: 'Kota' }, { name: 'Bitung', type: 'Kota' },
    ],
    'Sulawesi Tengah': [{ name: 'Palu', type: 'Kota' }],
    'Sulawesi Selatan': [
      { name: 'Makassar', type: 'Kota' }, { name: 'Parepare', type: 'Kota' },
      { name: 'Gowa', type: 'Kabupaten' },
    ],
    'Sulawesi Tenggara': [
      { name: 'Kendari', type: 'Kota' }, { name: 'Bau-Bau', type: 'Kota' },
    ],
    'Gorontalo': [{ name: 'Gorontalo', type: 'Kota' }],
    'Sulawesi Barat': [{ name: 'Mamuju', type: 'Kabupaten' }],
    'Maluku': [{ name: 'Ambon', type: 'Kota' }],
    'Maluku Utara': [
      { name: 'Ternate', type: 'Kota' }, { name: 'Tidore', type: 'Kota' },
    ],
    'Papua': [{ name: 'Jayapura', type: 'Kota' }, { name: 'Merauke', type: 'Kabupaten' }],
    'Papua Barat': [{ name: 'Sorong', type: 'Kota' }, { name: 'Manokwari', type: 'Kabupaten' }],
  }

  let cityCount = 0
  for (const [provinceName, cityList] of Object.entries(cityGroups)) {
    const provinceId = provinceMap[provinceName]
    if (!provinceId) continue

    for (const city of cityList) {
      const existing = await db.city.findFirst({
        where: { name: city.name, provinceId }
      })
      if (!existing) {
        await db.city.create({
          data: { name: city.name, type: city.type, provinceId }
        })
        cityCount++
      } else {
        cityCount++
      }
    }
  }
  console.log(`Seeded ${cityCount} cities`)

  // Seed Couriers
  const courierData = [
    { code: 'jne', name: 'JNE (Jalur Nugraha Ekakurir)', services: [
      { serviceCode: 'REG', serviceName: 'JNE Reguler', description: 'Layanan pengiriman reguler', estimated: '2-3 hari', basePrice: 18000, pricePerKg: 5000 },
      { serviceCode: 'YES', serviceName: 'JNE YES', description: 'Yakin Esok Sampai', estimated: '1-2 hari', basePrice: 28000, pricePerKg: 8000 },
      { serviceCode: 'OKE', serviceName: 'JNE OKE', description: 'Layanan ekonomis', estimated: '3-5 hari', basePrice: 14000, pricePerKg: 4000 },
      { serviceCode: 'CTC', serviceName: 'JNE City Courier', description: 'Layanan within kota', estimated: '1 hari', basePrice: 12000, pricePerKg: 3000 },
      { serviceCode: 'SPS', serviceName: 'JNE Super Speed', description: 'Pengiriman super cepat', estimated: 'Same day', basePrice: 45000, pricePerKg: 12000 },
    ]},
    { code: 'tiki', name: 'TIKI (Citra Van Titipan Kilat)', services: [
      { serviceCode: 'REG', serviceName: 'TIKI Reguler', description: 'Layanan pengiriman reguler', estimated: '2-4 hari', basePrice: 16000, pricePerKg: 4500 },
      { serviceCode: 'ECO', serviceName: 'TIKI Economical', description: 'Layanan ekonomis', estimated: '4-6 hari', basePrice: 12000, pricePerKg: 3500 },
      { serviceCode: 'ONS', serviceName: 'TIKI Overnight Service', description: 'Pengiriman semalam', estimated: '1 hari', basePrice: 30000, pricePerKg: 9000 },
    ]},
    { code: 'pos', name: 'POS Indonesia', services: [
      { serviceCode: 'PAKETPOS_BIASA', serviceName: 'Paket Pos Biasa', description: 'Layanan paket biasa', estimated: '4-7 hari', basePrice: 10000, pricePerKg: 3000 },
      { serviceCode: 'PAKETPOS_KILAT', serviceName: 'Paket Pos Kilat Khusus', description: 'Pengiriman kilat khusus', estimated: '2-3 hari', basePrice: 20000, pricePerKg: 6000 },
      { serviceCode: 'EXPRESS_NEXT_DAY', serviceName: 'POS Express Next Day', description: 'Pengiriman besok sampai', estimated: '1 hari', basePrice: 35000, pricePerKg: 10000 },
    ]},
    { code: 'jnt', name: 'J&T Express', services: [
      { serviceCode: 'EZ', serviceName: 'J&T EZ', description: 'Layanan express zone', estimated: '2-3 hari', basePrice: 15000, pricePerKg: 4500 },
      { serviceCode: 'YES', serviceName: 'J&T YES', description: 'Yakin Esok Sampai', estimated: '1 hari', basePrice: 26000, pricePerKg: 7500 },
      { serviceCode: 'SUPER', serviceName: 'J&T Super', description: 'Pengiriman super cepat', estimated: 'Same day', basePrice: 40000, pricePerKg: 11000 },
    ]},
    { code: 'sicepat', name: 'SiCepat Express', services: [
      { serviceCode: 'REG', serviceName: 'SiCepat Reguler', description: 'Layanan reguler', estimated: '2-3 hari', basePrice: 15000, pricePerKg: 4500 },
      { serviceCode: 'BEST', serviceName: 'SiCepat Best', description: 'Pengiriman cepat', estimated: '1-2 hari', basePrice: 25000, pricePerKg: 7000 },
      { serviceCode: 'GOKIL', serviceName: 'SiCepat Gokil', description: 'Pengiriman hemat', estimated: '3-5 hari', basePrice: 10000, pricePerKg: 3000 },
    ]},
    { code: 'anteraja', name: 'AnterAja', services: [
      { serviceCode: 'REG', serviceName: 'AnterAja Reguler', description: 'Layanan reguler', estimated: '2-4 hari', basePrice: 14000, pricePerKg: 4000 },
      { serviceCode: 'EXP', serviceName: 'AnterAja Express', description: 'Pengiriman cepat', estimated: '1-2 hari', basePrice: 24000, pricePerKg: 7000 },
    ]},
    { code: 'wahana', name: 'Wahana Prestasi Logistik', services: [
      { serviceCode: 'REG', serviceName: 'Wahana Reguler', description: 'Layanan reguler', estimated: '3-5 hari', basePrice: 12000, pricePerKg: 3500 },
      { serviceCode: 'EXP', serviceName: 'Wahana Express', description: 'Pengiriman cepat', estimated: '1-2 hari', basePrice: 22000, pricePerKg: 6500 },
    ]},
    { code: 'ninja', name: 'Ninja Xpress', services: [
      { serviceCode: 'STANDARD', serviceName: 'Ninja Standard', description: 'Layanan standar', estimated: '2-4 hari', basePrice: 14000, pricePerKg: 4000 },
      { serviceCode: 'EXPRESS', serviceName: 'Ninja Express', description: 'Pengiriman express', estimated: '1-2 hari', basePrice: 24000, pricePerKg: 7000 },
    ]},
    { code: 'lion', name: 'Lion Parcel', services: [
      { serviceCode: 'REGPACK', serviceName: 'Lion Regpack', description: 'Paket reguler', estimated: '2-4 hari', basePrice: 13000, pricePerKg: 4000 },
      { serviceCode: 'ONEPACK', serviceName: 'Lion Onepack', description: 'Pengiriman 1 hari', estimated: '1 hari', basePrice: 25000, pricePerKg: 7000 },
    ]},
    { code: 'gosend', name: 'GoSend (Gojek)', services: [
      { serviceCode: 'SAMEDAY', serviceName: 'GoSend Same Day', description: 'Pengiriman di hari yang sama', estimated: 'Same day', basePrice: 18000, pricePerKg: 5000 },
      { serviceCode: 'INSTANT', serviceName: 'GoSend Instant', description: 'Pengiriman instan', estimated: '1-3 jam', basePrice: 25000, pricePerKg: 8000 },
    ]},
    { code: 'grab', name: 'GrabExpress', services: [
      { serviceCode: 'SAMEDAY', serviceName: 'GrabExpress Same Day', description: 'Pengiriman di hari yang sama', estimated: 'Same day', basePrice: 20000, pricePerKg: 5500 },
      { serviceCode: 'INSTANT', serviceName: 'GrabExpress Instant', description: 'Pengiriman instan', estimated: '1-3 jam', basePrice: 28000, pricePerKg: 8500 },
    ]},
  ]

  for (const c of courierData) {
    let courier = await db.courier.findUnique({ where: { code: c.code } })
    if (!courier) {
      courier = await db.courier.create({ data: { code: c.code, name: c.name } })
    }

    for (const s of c.services) {
      const existing = await db.courierService.findUnique({
        where: { courierId_serviceCode: { courierId: courier.id, serviceCode: s.serviceCode } }
      })
      if (!existing) {
        await db.courierService.create({
          data: {
            courierId: courier.id,
            serviceCode: s.serviceCode,
            serviceName: s.serviceName,
            description: s.description,
            estimated: s.estimated,
            basePrice: s.basePrice,
            pricePerKg: s.pricePerKg,
          }
        })
      }
    }
  }
  console.log(`Seeded ${courierData.length} couriers with services`)
  console.log('Seeding completed!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
