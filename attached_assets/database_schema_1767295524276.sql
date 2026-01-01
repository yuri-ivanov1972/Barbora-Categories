
-- Rimi Categories Database Schema
-- This file contains the complete database structure for the normalized categories system

-- Drop existing table if it exists
DROP TABLE IF EXISTS normalized_categories CASCADE;

-- Create normalized_categories table
CREATE TABLE normalized_categories (
    category_id SERIAL PRIMARY KEY,
    rimi_category_code VARCHAR(20) UNIQUE NOT NULL,
    name_lv TEXT NOT NULL,
    name_en TEXT,
    parent_category_id INTEGER REFERENCES normalized_categories(category_id),
    level INTEGER NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_parent_reference CHECK (
        (level = 1 AND parent_category_id IS NULL) OR
        (level > 1 AND parent_category_id IS NOT NULL)
    ),
    CONSTRAINT valid_level CHECK (level >= 1 AND level <= 3)
);

-- Create indexes for better performance
CREATE INDEX idx_parent_category ON normalized_categories(parent_category_id);
CREATE INDEX idx_rimi_code ON normalized_categories(rimi_category_code);
CREATE INDEX idx_level ON normalized_categories(level);

-- Comments for documentation
COMMENT ON TABLE normalized_categories IS 'Hierarchical category structure for Rimi supermarket products';
COMMENT ON COLUMN normalized_categories.category_id IS 'Unique identifier for each category';
COMMENT ON COLUMN normalized_categories.rimi_category_code IS 'Unique category code in format SH-XX-YY-ZZ';
COMMENT ON COLUMN normalized_categories.name_lv IS 'Category name in Latvian';
COMMENT ON COLUMN normalized_categories.name_en IS 'Category name in English';
COMMENT ON COLUMN normalized_categories.parent_category_id IS 'Reference to parent category (NULL for level 1)';
COMMENT ON COLUMN normalized_categories.level IS 'Category hierarchy level (1-3)';

-- Sample queries for testing the schema

-- Get all Level 1 categories
-- SELECT category_id, rimi_category_code, name_lv, name_en 
-- FROM normalized_categories 
-- WHERE level = 1
-- ORDER BY category_id;

-- Get subcategories for a specific parent
-- SELECT category_id, rimi_category_code, name_lv, name_en 
-- FROM normalized_categories 
-- WHERE parent_category_id = [parent_id]
-- ORDER BY category_id;

-- Count categories by level
-- SELECT level, COUNT(*) as category_count
-- FROM normalized_categories
-- GROUP BY level
-- ORDER BY level;

-- Get category hierarchy (recursive query)
-- WITH RECURSIVE category_path AS (
--   SELECT category_id, rimi_category_code, name_en, level, parent_category_id, 
--          ARRAY[name_en] as path
--   FROM normalized_categories
--   WHERE category_id = [target_category_id]
--   
--   UNION ALL
--   
--   SELECT c.category_id, c.rimi_category_code, c.name_en, c.level, 
--          c.parent_category_id, array_prepend(c.name_en, p.path)
--   FROM normalized_categories c
--   JOIN category_path p ON c.category_id = p.parent_category_id
-- )
-- SELECT * FROM category_path;
