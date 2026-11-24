export declare const CATEGORY_THRESHOLDS: Readonly<Record<string, number>>;
export declare const LIGHTHOUSE_FLAGS: Readonly<Record<string, unknown>>;
export declare const CATALOG_JS_BYTE_BUDGET: number;

export declare function categoryScores(result: unknown): Record<string, number | null>;
export declare function assertCategoryScores(
  result: unknown,
  label: string,
): Record<string, number | null>;
export declare function assertStaticCatalog(html: string): boolean;
export declare function assertCatalogJsBudget(bytes: number): boolean;
