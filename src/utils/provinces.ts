export interface ProvinceOption {
  value: string;
  label: string;
}

export const CANADA_PROVINCES: ProvinceOption[] = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland & Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

// Flat list for any code that needs all options (kept for backward compat)
export const PROVINCE_OPTIONS: ProvinceOption[] = [
  ...CANADA_PROVINCES,
  { value: "NATO", label: "NATO" },
  { value: "FED",  label: "Federal / National" },
  { value: "US",   label: "United States" },
];
