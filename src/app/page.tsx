'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Package,
  MapPin,
  Weight,
  Truck,
  Search,
  ArrowRightLeft,
  ChevronDown,
  X,
  Loader2,
  Clock,
  CircleDollarSign,
  Route,
  AlertCircle,
  CheckCircle2,
  Zap,
  Ship,
  Plane,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Types
interface City {
  id: string
  name: string
  type: string
  province: string
  label: string
}

interface Courier {
  id: string
  code: string
  name: string
  services: CourierService[]
}

interface CourierService {
  id: string
  serviceCode: string
  serviceName: string
  description: string | null
  estimated: string | null
  basePrice: number
  pricePerKg: number
}

interface CostService {
  serviceCode: string
  serviceName: string
  description: string | null
  estimated: string | null
  cost: number
  isRealTime?: boolean // true = from real API (RajaOngkir/KiriminAja), false = estimated
  source?: string // 'rajaongkir' | 'kiriminaja' | 'estimation'
}

interface CostResult {
  courier: { code: string; name: string }
  services: CostService[]
}

interface CostResponse {
  origin: { city: string; type: string; province: string }
  destination: { city: string; type: string; province: string }
  weight: number
  distanceMultiplier: number
  results: CostResult[]
  apiSources?: string[] // Which APIs are providing real-time data
  disclaimer?: string
}

// City Search Dropdown Component
function CitySelector({
  label,
  placeholder,
  selectedCity,
  onSelect,
}: {
  label: string
  placeholder: string
  selectedCity: City | null
  onSelect: (city: City | null) => void
}) {
  const [search, setSearch] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCities([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/city?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.status === 'ok') {
        setCities(data.data.slice(0, 50))
      }
    } catch {
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setSearch(value)
    if (selectedCity) {
      onSelect(null)
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCities(value), 300)
  }

  const handleSelect = (city: City) => {
    onSelect(city)
    setSearch('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setSearch('')
    setCities([])
  }

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4 text-emerald-500" />
        {label}
      </Label>
      <div className="relative">
        {selectedCity ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200 truncate">
                {selectedCity.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center rounded-lg border border-input bg-background cursor-text"
            onClick={handleOpen}
          >
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={search}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            <ChevronDown className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
          </div>
        )}

        {isOpen && !selectedCity && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
            <ScrollArea className="max-h-64">
              {loading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : cities.length > 0 ? (
                <div className="py-1">
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => handleSelect(city)}
                    >
                      <span className="font-medium">{city.type} {city.name}</span>
                      <span className="text-muted-foreground">, {city.province}</span>
                    </button>
                  ))}
                </div>
              ) : search.length >= 2 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Kota tidak ditemukan
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Ketik minimal 2 huruf untuk mencari kota
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}

// Courier Icon Mapping
function getCourierIcon(code: string) {
  switch (code) {
    case 'gosend':
    case 'grab':
      return <Zap className="h-5 w-5" />
    case 'lion':
      return <Plane className="h-5 w-5" />
    case 'jne':
    case 'tiki':
    case 'pos':
    case 'jnt':
    case 'sicepat':
    case 'anteraja':
    case 'wahana':
    case 'ninja':
    default:
      return <Ship className="h-5 w-5" />
  }
}

function getCourierColor(code: string) {
  const colors: Record<string, string> = {
    jne: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    tiki: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    pos: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    jnt: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
    sicepat: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
    anteraja: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    wahana: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    ninja: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
    lion: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    gosend: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
    grab: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  }
  return colors[code] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

// Format currency to Rupiah
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Main Page
export default function Home() {
  const { toast } = useToast()
  const [originCity, setOriginCity] = useState<City | null>(null)
  const [destCity, setDestCity] = useState<City | null>(null)
  const [weight, setWeight] = useState<string>('1000')
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [costResult, setCostResult] = useState<CostResponse | null>(null)
  const [sortBy, setSortBy] = useState<'price' | 'speed'>('price')

  // Load couriers on mount
  useEffect(() => {
    async function loadCouriers() {
      try {
        const res = await fetch('/api/courier')
        const data = await res.json()
        if (data.status === 'ok') {
          setCouriers(data.data)
          // Select popular couriers by default
          const defaultCouriers = ['jne', 'jnt', 'sicepat', 'tiki', 'pos']
          const availableCodes = data.data.map((c: Courier) => c.code)
          setSelectedCouriers(defaultCouriers.filter(c => availableCodes.includes(c)))
        }
      } catch {
        toast({ title: 'Gagal memuat data kurir', variant: 'destructive' })
      } finally {
        setLoadingCouriers(false)
      }
    }
    loadCouriers()
  }, [toast])

  const toggleCourier = (code: string) => {
    setSelectedCouriers(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const handleSwap = () => {
    const temp = originCity
    setOriginCity(destCity)
    setDestCity(temp)
  }

  const handleCheckCost = async () => {
    if (!originCity) {
      toast({ title: 'Pilih kota asal terlebih dahulu', variant: 'destructive' })
      return
    }
    if (!destCity) {
      toast({ title: 'Pilih kota tujuan terlebih dahulu', variant: 'destructive' })
      return
    }
    if (originCity.id === destCity.id) {
      toast({ title: 'Kota asal dan tujuan tidak boleh sama', variant: 'destructive' })
      return
    }
    const weightNum = parseInt(weight)
    if (!weightNum || weightNum < 1) {
      toast({ title: 'Masukkan berat paket yang valid (minimal 1 gram)', variant: 'destructive' })
      return
    }
    if (selectedCouriers.length === 0) {
      toast({ title: 'Pilih minimal satu kurir', variant: 'destructive' })
      return
    }

    setCalculating(true)
    setCostResult(null)

    try {
      const res = await fetch('/api/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCityId: originCity.id,
          destinationCityId: destCity.id,
          weight: weightNum,
          courierCodes: selectedCouriers,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setCostResult(data.data)
        toast({ title: 'Ongkir berhasil dihitung!', description: `Ditemukan ${data.data.results.length} kurir dengan berbagai layanan` })
      } else {
        toast({ title: data.message || 'Gagal menghitung ongkir', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Terjadi kesalahan saat menghitung ongkir', variant: 'destructive' })
    } finally {
      setCalculating(false)
    }
  }

  // Sort services
  const getSortedResults = () => {
    if (!costResult) return []
    const sorted = [...costResult.results]
    return sorted.map(result => {
      const services = [...result.services]
      if (sortBy === 'price') {
        services.sort((a, b) => a.cost - b.cost)
      } else {
        // Sort by estimated delivery speed
        services.sort((a, b) => {
          const getDays = (est: string | null) => {
            if (!est) return 99
            if (est.toLowerCase().includes('same day') || est.toLowerCase().includes('jam')) return 0
            if (est.toLowerCase().includes('1 hari')) return 1
            const match = est.match(/(\d+)-?(\d+)?\s*hari/)
            if (match) return parseInt(match[1])
            return 99
          }
          return getDays(a.estimated) - getDays(b.estimated)
        })
      }
      return { ...result, services }
    })
  }

  // Find cheapest and fastest across all results
  const allServices = costResult?.results.flatMap(r =>
    r.services.map(s => ({ ...s, courierCode: r.courier.code, courierName: r.courier.name }))
  ) || []

  const cheapestService = allServices.length > 0
    ? allServices.reduce((min, s) => s.cost < min.cost ? s : min, allServices[0])
    : null

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      {/* Header */}
      <header className="border-b border-border bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">CekOngkir</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Cek ongkos kirim semua ekspedisi</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-normal hidden sm:flex">
            11 Ekspedisi Tersedia
          </Badge>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-2 py-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cek Ongkos Kirim <span className="text-emerald-600 dark:text-emerald-400">Termurah</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Bandingkan tarif pengiriman dari berbagai ekspedisi Indonesia. Cepat, mudah, dan gratis!
          </p>
        </div>

        {/* Search Form Card */}
        <Card className="border-border shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Route className="h-5 w-5" />
              Form Pengecekan Ongkir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Origin & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-end">
              <CitySelector
                label="Kota Asal"
                placeholder="Cari kota asal..."
                selectedCity={originCity}
                onSelect={setOriginCity}
              />
              <div className="flex justify-center sm:pb-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  onClick={handleSwap}
                  title="Tukar kota asal & tujuan"
                >
                  <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                </Button>
              </div>
              <CitySelector
                label="Kota Tujuan"
                placeholder="Cari kota tujuan..."
                selectedCity={destCity}
                onSelect={setDestCity}
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Weight className="h-4 w-4 text-emerald-500" />
                Berat Paket
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Input
                    type="number"
                    min="1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="pr-14 text-sm"
                    placeholder="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">gram</span>
                </div>
                <div className="flex gap-1.5">
                  {[{ label: '100g', val: '100' }, { label: '500g', val: '500' }, { label: '1kg', val: '1000' }, { label: '5kg', val: '5000' }, { label: '10kg', val: '10000' }].map(preset => (
                    <Button
                      key={preset.val}
                      variant={weight === preset.val ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs h-7 px-2 ${weight === preset.val ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      onClick={() => setWeight(preset.val)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Courier Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  Pilih Kurir
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-emerald-600 hover:text-emerald-700"
                    onClick={() => setSelectedCouriers(couriers.map(c => c.code))}
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => setSelectedCouriers([])}
                  >
                    Hapus Semua
                  </Button>
                </div>
              </div>
              {loadingCouriers ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {couriers.map((courier) => (
                    <div
                      key={courier.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all text-sm cursor-pointer ${
                        selectedCouriers.includes(courier.code)
                          ? getCourierColor(courier.code) + ' border shadow-sm'
                          : 'border-border bg-background hover:bg-accent'
                      }`}
                      onClick={() => toggleCourier(courier.code)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCourier(courier.code) } }}
                    >
                      <Checkbox
                        checked={selectedCouriers.includes(courier.code)}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-xs truncate block">
                          {courier.code.toUpperCase()}
                        </span>
                        <span className="text-[10px] opacity-70 truncate block">
                          {courier.services.length} layanan
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
              onClick={handleCheckCost}
              disabled={calculating}
            >
              {calculating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Menghitung Ongkir...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Cek Ongkir Sekarang
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {costResult && (
          <div className="space-y-4">
            {/* Result Summary */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{costResult.origin.type} {costResult.origin.city}</span>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-medium">{costResult.destination.type} {costResult.destination.city}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" />
                      {costResult.weight >= 1000 ? `${(costResult.weight / 1000).toFixed(1)} kg` : `${costResult.weight} gr`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="h-3.5 w-3.5" />
                      Faktor jarak: {costResult.distanceMultiplier}x
                    </span>
                  </div>
                </div>

                {cheapestService && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 text-sm">
                      <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                      <span className="text-muted-foreground">Termurah:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {formatRupiah(cheapestService.cost)}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 border-emerald-300 dark:border-emerald-700">
                        {cheapestService.courierName} - {cheapestService.serviceName}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sort Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                Hasil Pengecekan
              </h3>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <Button
                  variant={sortBy === 'price' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs h-7 ${sortBy === 'price' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => setSortBy('price')}
                >
                  <CircleDollarSign className="h-3.5 w-3.5 mr-1" />
                  Termurah
                </Button>
                <Button
                  variant={sortBy === 'speed' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs h-7 ${sortBy === 'speed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => setSortBy('speed')}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Tercepat
                </Button>
              </div>
            </div>

            {/* Courier Result Cards */}
            <div className="space-y-3">
              {getSortedResults().map((result) => (
                <Card key={result.courier.code} className="overflow-hidden border-border hover:shadow-md transition-shadow">
                  <CardHeader className={`py-3 px-4 ${getCourierColor(result.courier.code)} border-b`}>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      {getCourierIcon(result.courier.code)}
                      {result.courier.name}
                      <Badge variant="outline" className="ml-auto text-[10px] border-current/30">
                        {result.services.length} layanan
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {result.services.map((service, idx) => {
                        const isCheapest = cheapestService &&
                          service.cost === cheapestService.cost &&
                          result.courier.code === cheapestService.courierCode

                        return (
                          <div
                            key={service.serviceCode}
                            className={`flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent/50 ${
                              isCheapest ? 'bg-emerald-50/50 dark:bg-emerald-950/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{service.serviceName}</span>
                                  {service.isRealTime ? (
                                    <Badge className={`text-[10px] h-5 px-1.5 ${
                                      service.source === 'kiriminaja' ? 'bg-purple-600' : 'bg-blue-600'
                                    }`}>
                                      {service.source === 'kiriminaja' ? 'KiriminAja' : 'Real-time'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-300">
                                      Estimasi
                                    </Badge>
                                  )}
                                  {isCheapest && (
                                    <Badge className="bg-emerald-600 text-[10px] h-5 px-1.5">
                                      Termurah
                                    </Badge>
                                  )}
                                  {idx === 0 && sortBy === 'speed' && (
                                    <Badge className="bg-teal-600 text-[10px] h-5 px-1.5">
                                      Tercepat
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  {service.description && <span>{service.description}</span>}
                                  {service.estimated && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {service.estimated}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <div className={`font-bold ${isCheapest ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                                {formatRupiah(service.cost)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* API Sources & Disclaimer */}
            {costData?.apiSources && costData.apiSources.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <Zap className="h-4 w-4 shrink-0 text-blue-500" />
                <p>
                  Data real-time dari: {costData.apiSources.join(', ')}
                </p>
              </div>
            )}
            {costData?.disclaimer ? (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{costData.disclaimer}</p>
              </div>
            ) : costData?.apiSources && costData.apiSources.length > 0 ? null : (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  Harga bersifat estimasi. Hubungi kurir untuk harga pasti.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>CekOngkir - Cek ongkos kirim semua ekspedisi Indonesia</span>
          <span>Data harga bersifat estimasi</span>
        </div>
      </footer>
    </div>
  )
}
