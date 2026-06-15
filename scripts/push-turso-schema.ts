import { createClient } from '@libsql/client'

const turso = createClient({
  url: 'libsql://grosirpj-ecommerse-handokov.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEyNDU0NTAsImlkIjoiMDE5ZWJhN2QtNWIwMS03ODAzLThiMmQtNTk5NzZkYWM5Njg0IiwicmlkIjoiNzliZTc0ZjgtMTJlNS00OWMwLTllZGMtNDAzYWU4NmQ1OWZmIn0.DEo1_5Q4GcsrxZL3kTAuCQcY3G4LpwXiCmA53bHJSuDaOijPUdNPZanVfua8Pz6Zxxrt6cdJomeXlOcerKkMDA',
})

async function pushCekOngkirSchema() {
  console.log('Pushing CekOngkir schema to Turso database...')

  // Check existing tables
  const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'")
  const tableNames = tables.rows.map(r => r.name as string)
  console.log('Existing tables:', tableNames)

  // Create Province table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS Province (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Province table ready')

  // Create City table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS City (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Kota',
      postalCode TEXT,
      rajaOngkirId INTEGER,
      provinceId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provinceId) REFERENCES Province(id),
      UNIQUE(name, provinceId)
    )
  `)
  console.log('✅ City table ready')

  // Add rajaOngkirId column if it doesn't exist (migration for existing DB)
  try {
    const cityColumns = await turso.execute("PRAGMA table_info('City')")
    const columnNames = cityColumns.rows.map(r => r.name as string)
    
    if (!columnNames.includes('rajaOngkirId')) {
      await turso.execute('ALTER TABLE City ADD COLUMN rajaOngkirId INTEGER')
      console.log('✅ Added rajaOngkirId column to City table')
    } else {
      console.log('ℹ️ rajaOngkirId column already exists')
    }

    if (!columnNames.includes('kiriminAjaDistrictId')) {
      await turso.execute('ALTER TABLE City ADD COLUMN kiriminAjaDistrictId INTEGER')
      console.log('✅ Added kiriminAjaDistrictId column to City table')
    } else {
      console.log('ℹ️ kiriminAjaDistrictId column already exists')
    }
  } catch (e) {
    console.log('⚠️ Column migration warning:', e)
  }

  // Create Courier table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS Courier (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      logo TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Courier table ready')

  // Create CourierService table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS CourierService (
      id TEXT PRIMARY KEY NOT NULL,
      courierId TEXT NOT NULL,
      serviceCode TEXT NOT NULL,
      serviceName TEXT NOT NULL,
      description TEXT,
      estimated TEXT,
      basePrice INTEGER NOT NULL DEFAULT 0,
      pricePerKg INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courierId) REFERENCES Courier(id),
      UNIQUE(courierId, serviceCode)
    )
  `)
  console.log('✅ CourierService table ready')

  // Verify tables
  const finalTables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'")
  console.log('\n📋 All tables in Turso:', finalTables.rows.map(r => r.name))

  console.log('\n🎉 CekOngkir schema push complete!')
  await turso.close()
}

pushCekOngkirSchema().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
