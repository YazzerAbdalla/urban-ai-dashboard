/**
 * Mock POI generator. In production this comes from
 *   `GET /api/v1/grid/{grid_id}/details` (PRD §6.2)
 * which queries OSM POI features intersecting the cell's bbox.
 */
import type { CellDatum, LandUseClass } from "@/lib/api/types";

export interface PoiPin {
  id: string;
  name: string;
  category: string;
  class: LandUseClass;
  lat: number;
  lng: number;
}

const CATEGORIES: Record<LandUseClass, { name: string; cat: string }[]> = {
  Residential: [
    { name: "Al-Nour Apartments", cat: "apartments" },
    { name: "Al-Salam School", cat: "school" },
    { name: "Sayyida Aisha Mosque", cat: "mosque" },
    { name: "Family Clinic", cat: "clinic" },
    { name: "Al-Andalus Park", cat: "park" },
    { name: "Sunrise Kindergarten", cat: "kindergarten" },
    { name: "Al-Rahma Pharmacy", cat: "pharmacy" },
  ],
  Commercial: [
    { name: "City Stars Mall", cat: "mall" },
    { name: "NBE Bank Branch", cat: "bank" },
    { name: "Abou El Sid Restaurant", cat: "restaurant" },
    { name: "Zara Boutique", cat: "shop" },
    { name: "Innovation Hub Offices", cat: "office" },
    { name: "Starbucks Café", cat: "cafe" },
    { name: "Hilton Hotel", cat: "hotel" },
  ],
  Industrial: [
    { name: "Eastern Metal Works", cat: "factory" },
    { name: "Nile Logistics Depot", cat: "warehouse" },
    { name: "Al-Salam Workshop", cat: "workshop" },
    { name: "Cairo Freight Center", cat: "logistics" },
    { name: "Steel Manufacturing Co.", cat: "manufacturing" },
    { name: "Power Substation 14", cat: "power_substation" },
    { name: "Fuel Distribution Yard", cat: "fuel" },
  ],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Deterministic POI list for a cell. Quantity scales with road density. */
export function poisForCell(cell: CellDatum): PoiPin[] {
  const rnd = hash(cell.id);
  const pool = CATEGORIES[cell.class];
  const count = Math.max(4, Math.min(10, Math.round(cell.road_density * 1.3)));
  const ring = cell.geometry.coordinates[0];
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const pad = 0.0015;
  const pois: PoiPin[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = pool[Math.floor(rnd() * pool.length)];
    pois.push({
      id: `${cell.id}-poi-${i}`,
      name: tpl.name,
      category: tpl.cat,
      class: cell.class,
      lng: minLng + pad + rnd() * (maxLng - minLng - pad * 2),
      lat: minLat + pad + rnd() * (maxLat - minLat - pad * 2),
    });
  }
  return pois;
}