// Shared canonical list of popular Indian cities used by Voucher create form,
// LocationPickerModal, and anywhere the app needs a consistent city dropdown.
// Adding/removing a city here keeps city values consistent across vouchers and
// the "Near Me" filter (avoids Bengaluru/Bangalore mismatches).

export interface CityEntry {
  city: string;
  state: string;
}

export const POPULAR_INDIAN_CITIES: CityEntry[] = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Surat", state: "Gujarat" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Patna", state: "Bihar" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Srinagar", state: "Jammu & Kashmir" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Allahabad", state: "Uttar Pradesh" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Guwahati", state: "Assam" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Hubli", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Jammu", state: "Jammu & Kashmir" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Bhubaneswar", state: "Odisha" },
];

// Map of common aliases / misspellings → canonical city. Used when normalising
// existing free-text city values so older vouchers still match the dropdown.
export const CITY_ALIASES: Record<string, string> = {
  bengaluru: "Bangalore",
  banglore: "Bangalore",
  bangaluru: "Bangalore",
  bombay: "Mumbai",
  calcutta: "Kolkata",
  madras: "Chennai",
  mysuru: "Mysore",
  vizag: "Visakhapatnam",
  trivandrum: "Thiruvananthapuram",
  cochin: "Kochi",
  pondicherry: "Puducherry",
  gurugram: "Gurgaon",
  prayagraj: "Allahabad",
};

export function normaliseCity(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];
  const match = POPULAR_INDIAN_CITIES.find((c) => c.city.toLowerCase() === lower);
  return match ? match.city : trimmed;
}
