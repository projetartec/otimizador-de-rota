export interface Location {
  lat: number;
  lng: number;
  address: string;
}

/**
 * Geocodes an address string into a Location object.
 * Uses a multi-stage fallback strategy for maximum reliability in Brazil.
 * Strategies: ArcGIS (Best for incomplete) -> Nominatim (Precise) -> Photon (Fuzzy)
 */
export async function geocode(address: string): Promise<Location | null> {
  if (!address.trim()) return null;

  const cleanAddress = address.trim();
  const queryWithBrasil = cleanAddress.toLowerCase().includes("brasil") ? cleanAddress : `${cleanAddress}, Brasil`;

  // Strategy 1: ArcGIS World Geocoding (Excellent for incomplete addresses and Brazil)
  try {
    const response = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(queryWithBrasil)}&maxLocations=1&outFields=Match_addr`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        return {
          lat: candidate.location.y,
          lng: candidate.location.x,
          address: candidate.address,
        };
      }
    }
  } catch (error) {
    console.error("ArcGIS attempt failed:", error);
  }

  // Strategy 2: Nominatim (Official OSM search)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithBrasil)}&countrycodes=br&limit=1&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "comercialgomescontraincendio@gmail.com"
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name,
        };
      }
    }
  } catch (error) {
    console.error("Nominatim attempt failed:", error);
  }

  // Strategy 3: Photon (Fuzzy search fallback)
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(queryWithBrasil)}&limit=1&lang=pt`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const { coordinates } = feature.geometry;
        const p = feature.properties;
        
        const parts = [
          p.name || p.street,
          p.housenumber,
          p.district || p.locality,
          p.city,
          p.state
        ].filter(Boolean);

        return {
          lat: coordinates[1],
          lng: coordinates[0],
          address: parts.join(", ") || p.name || cleanAddress,
        };
      }
    }
  } catch (error) {
    console.error("Photon fallback failed:", error);
  }

  return null;
}

export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 3) return [];

  const searchQuery = query.toLowerCase().includes("brasil") ? query : `${query}, Brasil`;

  // We'll try ArcGIS first for suggestions too as it's very robust
  try {
    const response = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&text=${encodeURIComponent(searchQuery)}&maxSuggestions=5`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.suggestions) {
        return data.suggestions.map((s: any) => s.text);
      }
    }
  } catch (error) {
    console.error("ArcGIS suggest failed:", error);
  }

  // Fallback to Photon for suggestions
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5&lang=pt`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.features) {
        return data.features.map((feature: any) => {
          const p = feature.properties;
          const parts = [
            p.name || p.street,
            p.housenumber,
            p.district || p.locality,
            p.city,
            p.state
          ].filter(Boolean);
          return parts.join(", ");
        });
      }
    }
  } catch (error) {
    console.error("Photon suggest failed:", error);
  }

  return [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "comercialgomescontraincendio@gmail.com"
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data.display_name || null;
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
  }
  return null;
}
