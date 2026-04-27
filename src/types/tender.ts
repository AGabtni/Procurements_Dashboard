export interface TenderListDto {
  id: number;
  noticeId: string | null;
  title: string | null;
  procurementCategory: string | null;
  buyingOrganization: string | null;
  publicationDate: string | null;
  closingDate: string | null;
  noticeType: string | null;
  procurementMethod: string | null;
  hasDocuments: boolean | null;
}

export interface TenderDetailDto {
  id: number;
  noticeId: string | null;
  title: string | null;
  procurementCategory: string | null;
  buyingOrganization: string | null;
  publicationDate: string | null;
  closingDate: string | null;
  noticeType: string | null;
  procurementMethod: string | null;
  selectionCriteria: string | null;
  unspsc: number[] | null;
  gsin: string[] | null;
  noticeLink: string | null;
  externalLink: string | null;
  hasDocuments: boolean | null;
  description: string | null;
  regionOfDelivery: string | null;
  regionOfOpportunity: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  documents: DocumentDto[];
}

export interface DocumentDto {
  id: number;
  title: string | null;
  url: string | null;
  language: string | null;
  type: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TenderSearchParams {
  keyword?: string;
  category?: string;
  organization?: string;
  noticeType?: string;
  openOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}
