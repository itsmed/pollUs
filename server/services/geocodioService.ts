import { CURRENT_CONGRESS } from '../CONSTANTS';

const GEOCODIO_API_BASE = 'https://api.geocod.io/v1.11';

interface GeocodioBio {
  first_name: string;
  last_name: string;
  party?: string;
  photo_url?: string;
}

interface GeocodioLegislator {
  type: string;
  bio: GeocodioBio;
  references: { bioguide_id: string };
}

interface MappedLegislator {
  name: string;
  role: string;
  party: string;
  photo_url: string | null;
  api_id: string;
  state: string;
  district: string | null;
}

function mapGeocodioLegislator(
  legislator: GeocodioLegislator,
  state: string,
  districtNumber: number | null
): MappedLegislator {
  const { bio, references, type } = legislator;
  const isRepresentative = type === 'representative';

  return {
    name: `${bio.first_name} ${bio.last_name}`,
    role: isRepresentative ? 'Representative' : 'Senator',
    party: bio.party ?? 'Unknown',
    photo_url: bio.photo_url ?? null,
    api_id: references.bioguide_id,
    state,
    district: isRepresentative && districtNumber != null ? String(districtNumber) : null,
  };
}

async function findLegislators(
  address: string
): Promise<{ address: string; state: string; legislators: MappedLegislator[] }> {
  const apiKey = process.env.GEOCOD_API_KEY;
  if (!apiKey) throw new Error('GEOCOD_API_KEY environment variable is not set');

  const params = new URLSearchParams({
    q: address,
    fields: `cd${CURRENT_CONGRESS}`,
    api_key: apiKey,
    limit: '1',
  });

  const url = `${GEOCODIO_API_BASE}/geocode?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocodio API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    results?: Array<{
      formatted_address: string;
      address_components?: { state?: string };
      fields?: {
        congressional_districts?: Array<{
          district_number: number;
          proportion: number;
          current_legislators?: GeocodioLegislator[];
        }>;
      };
    }>;
  };

  const result = data.results?.[0];
  if (!result) throw new Error('Address not found');

  const state = result.address_components?.state ?? '';
  const districts = result.fields?.congressional_districts ?? [];

  const district = [...districts].sort((a, b) => b.proportion - a.proportion)[0];
  if (!district) throw new Error('No congressional district found for this address');

  const legislators = (district.current_legislators ?? []).map((leg) =>
    mapGeocodioLegislator(leg, state, district.district_number)
  );

  return { address: result.formatted_address, state, legislators };
}

export { findLegislators, mapGeocodioLegislator };
