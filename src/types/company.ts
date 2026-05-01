// ── Response DTOs ──

export interface CompanyProfileDto {
  id: number;
  companyName: string;
  industry: string | null;
  province: string | null;
  servicesDescription: string | null;
  keywords: string[] | null;
  unspscCodes: number[] | null;
  gsinCodes: string[] | null;
  certifications: string[] | null;
  companySize: string | null;
  createdAt: string;
  updatedAt: string;
  lastMatchedAt: string | null;
  matchingStatus: string;
  matchingStartedAt: string | null;
  commodityTypes: string[];
  autoKeywords: string[] | null;
  preferences: CompanyPreferencesDto | null;
}

export interface CompanyPreferencesDto {
  id: number;
  preferredOrgs: string[] | null;
  preferredNtTypes: string[] | null;
  preferredProvinces: string[] | null;
  minValue: number | null;
  maxValue: number | null;
  excludeKeywords: string[] | null;
}

export interface CompanyMatchDto {
  id: number;
  tenderId: number;
  noticeId: string | null;
  tenderTitle: string | null;
  procurementCategory: string | null;
  buyingOrganization: string | null;
  closingDate: string | null;
  noticeType: string | null;
  noticeLink: string | null;
  matchScore: number;
  matchReason: string | null;
  matchedAt: string;
  status: "new" | "viewed" | "saved" | "dismissed";
}

export interface MatchStatsDto {
  totalMatches: number;
  newCount: number;
  viewedCount: number;
  savedCount: number;
  dismissedCount: number;
  averageScore: number;
  highScoreCount: number;
}

// ── Request DTOs ──

export interface CreateCompanyProfileRequest {
  companyName: string;
  industry?: string;
  province?: string;
  servicesDescription?: string;
  keywords?: string[];
  unspscCodes?: number[];
  gsinCodes?: string[];
  certifications?: string[];
  companySize?: string;
  commodityTypes?: string[];
  preferences?: CompanyPreferencesRequest;
}

export interface UpdateCompanyProfileRequest {
  companyName?: string;
  industry?: string;
  province?: string;
  servicesDescription?: string;
  keywords?: string[];
  unspscCodes?: number[];
  gsinCodes?: string[];
  certifications?: string[];
  companySize?: string;
  commodityTypes?: string[];
}

export interface CompanyPreferencesRequest {
  preferredOrgs?: string[];
  preferredNtTypes?: string[];
  preferredProvinces?: string[];
  minValue?: number;
  maxValue?: number;
  excludeKeywords?: string[];
}

export interface UpdateMatchStatusRequest {
  status: "new" | "viewed" | "saved" | "dismissed";
}
