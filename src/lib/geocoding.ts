export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export async function geocode(address: string): Promise<Location | null> {
  if (!address.trim()) return null;

  try {
    // Nominatim API (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&countrycodes=br&limit=1&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "RotaOtimizadaApp/1.0"
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
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
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=br&limit=5&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "RotaOtimizadaApp/1.0"
        },
      }
    );

    const data = await response.json();
    return data.map((item: any) => item.display_name);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return [];
  }
}
