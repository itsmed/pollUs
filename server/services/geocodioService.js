'use strict';

const { CURRENT_CONGRESS } = require('../CONSTANTS');

const GEOCODIO_API_BASE = 'https://api.geocod.io/v1.11';

/**
 * Maps a single Geocodio legislator object to our internal shape.
 * @param {Object} legislator - Legislator from congressional_districts[n].current_legislators
 * @param {string} state - Two-letter state abbreviation from address_components
 * @param {number|null} districtNumber - Numeric district from congressional_districts[n].district_number
 * @returns {Object} Mapped legislator
 */
function mapGeocodioLegislator(legislator, state, districtNumber) {
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

/**
 * Geocodes a US address and returns the congressional legislators (representative + senators).
 * Uses the Geocodio API with the congressional district field append.
 *
 * @param {string} address - Full US mailing address
 * @returns {Promise<{ address: string; state: string; legislators: Array }>}
 * @throws {Error} When GEOCOD_API_KEY is missing, address not found, or API error
 */
async function findLegislators(address) {
  const apiKey = process.env.GEOCOD_API_KEY;
  if (!apiKey) {
    throw new Error('GEOCOD_API_KEY environment variable is not set');
  }

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

  const data = await response.json();
  const result = data.results?.[0];

  if (!result) {
    throw new Error('Address not found');
  }

  const state = result.address_components?.state ?? '';
  const districts = result.fields?.congressional_districts ?? [];

  // Pick the district with the highest proportion (relevant for addresses near boundaries)
  const district = [...districts].sort((a, b) => b.proportion - a.proportion)[0];

  if (!district) {
    throw new Error('No congressional district found for this address');
  }

  const legislators = (district.current_legislators ?? []).map((leg) =>
    mapGeocodioLegislator(leg, state, district.district_number)
  );

  return {
    address: result.formatted_address,
    state,
    legislators,
  };
}

module.exports = { findLegislators, mapGeocodioLegislator };
