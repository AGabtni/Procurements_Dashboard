export interface IndustryElements {
  examples: string[];
  inclusions: string[];
  exclusions: string[];
  examplesFr: string[];
  inclusionsFr: string[];
  exclusionsFr: string[];
}

export interface IndustryNode {
  code: string;
  titleEn: string;
  titleFr: string | null;
  level: number;
  parentCode: string | null;
  hasChildren: boolean;
  elements: IndustryElements | null;
}

export interface IndustrySearchResult extends IndustryNode {
  ancestorTitles: string[];
}

export interface IndustryLabelDto {
  code: string;
  titleEn: string;
}
