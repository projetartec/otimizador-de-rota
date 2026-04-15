export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export async function geocode(address: string): Promise<Location | null> {
  if (!address.trim()) return null;

  try {
    // Photon API (Powered by OpenStreetMap data, but with better search logic)
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lang=pt`
    );

    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const { coordinates } = feature.geometry;
      const p = feature.properties;
      
      // Construct a readable address from properties
      const parts = [
        p.name || p.street,
        p.housenumber,
        p.district || p.locality,
        p.city,
        p.state,
        p.postcode
      ].filter(Boolean);

      return {
        lat: coordinates[1],
        lng: coordinates[0],
        address: parts.join(", ") || p.name || address,
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=pt`
    );

    const data = await response.json();
    
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
  } catch (error) {
    console.error("Autocomplete error:", error);
    return [];
  }
}
