import { Pool } from "pg";

const rimiPool = new Pool({
  connectionString: process.env.CATEGORIES_DB_URL,
});

export interface RimiCategory {
  category_id: number;
  rimi_category_code: string;
  name_lv: string;
  name_en: string | null;
  parent_category_id: number | null;
  level: number;
}

export async function getRimiCategories(): Promise<RimiCategory[]> {
  const client = await rimiPool.connect();
  try {
    const result = await client.query<RimiCategory>(
      `SELECT category_id, rimi_category_code, name_lv, name_en, parent_category_id, level 
       FROM normalized_categories 
       ORDER BY level, category_id`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\-–—'"()[\]{}!?:;]/g, '')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface MatchResult {
  matched: number;
  unmatched: number;
  total: number;
  matchedCategories: { barboraId: string; barboraName: string; rimiCategoryId: number; rimiName: string }[];
}

export async function matchBarboraWithRimi(
  barboraCategories: { id: string; name: string; isGrocery: boolean }[]
): Promise<MatchResult> {
  const rimiCategories = await getRimiCategories();
  
  const rimiLookup = new Map<string, RimiCategory>();
  for (const rimi of rimiCategories) {
    const normalizedLv = normalizeString(rimi.name_lv);
    if (!rimiLookup.has(normalizedLv)) {
      rimiLookup.set(normalizedLv, rimi);
    }
    if (rimi.name_en) {
      const normalizedEn = normalizeString(rimi.name_en);
      if (!rimiLookup.has(normalizedEn)) {
        rimiLookup.set(normalizedEn, rimi);
      }
    }
  }
  
  const groceryCategories = barboraCategories.filter(c => c.isGrocery);
  const matchedCategories: MatchResult['matchedCategories'] = [];
  let matched = 0;
  let unmatched = 0;
  
  for (const barbora of groceryCategories) {
    const normalizedName = normalizeString(barbora.name);
    const rimiMatch = rimiLookup.get(normalizedName);
    
    if (rimiMatch) {
      matched++;
      matchedCategories.push({
        barboraId: barbora.id,
        barboraName: barbora.name,
        rimiCategoryId: rimiMatch.category_id,
        rimiName: rimiMatch.name_lv
      });
    } else {
      unmatched++;
    }
  }
  
  return {
    matched,
    unmatched,
    total: groceryCategories.length,
    matchedCategories
  };
}
