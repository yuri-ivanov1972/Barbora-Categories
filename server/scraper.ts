import puppeteer, { Browser, HTTPResponse } from "puppeteer";
import type { Category, FlatCategory, ScrapeResult, ScrapeStatus } from "@shared/schema";

let currentStatus: ScrapeStatus = {
  status: 'idle',
  progress: 0,
  currentCategory: null,
  message: null,
  result: null
};

export function getScrapeStatus(): ScrapeStatus {
  return currentStatus;
}

export function resetScrapeStatus(): void {
  currentStatus = {
    status: 'idle',
    progress: 0,
    currentCategory: null,
    message: null,
    result: null
  };
}

function generateId(name: string, index: number): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || `cat-${index}`;
}

interface RawCategory {
  id?: string | number;
  name?: string;
  title?: string;
  url?: string;
  href?: string;
  link?: string;
  slug?: string;
  externalId?: string;
  children?: RawCategory[];
  subcategories?: RawCategory[];
  items?: RawCategory[];
  subCategories?: RawCategory[];
}

function normalizeCategory(raw: RawCategory, level: number, parentId: string | null, index: number): Category | null {
  const name = raw.name || raw.title || '';
  if (!name || name.length < 2) return null;

  const url = raw.url || raw.href || raw.link || raw.slug || raw.externalId || '';
  const id = raw.id?.toString() || raw.externalId || generateId(name, index);

  const children: Category[] = [];
  const rawChildren = raw.children || raw.subcategories || raw.items || raw.subCategories || [];
  
  let childIndex = 0;
  for (const child of rawChildren) {
    const normalizedChild = normalizeCategory(child, level + 1, id, childIndex++);
    if (normalizedChild) {
      children.push(normalizedChild);
    }
  }

  return {
    id,
    name,
    url: url.startsWith('/') ? url : (url ? `/${url}` : ''),
    level,
    parentId,
    children
  };
}

function flattenCategories(categories: Category[], parentName: string | null = null, path: string[] = []): FlatCategory[] {
  const result: FlatCategory[] = [];
  
  for (const cat of categories) {
    const currentPath = [...path, cat.name];
    result.push({
      id: cat.id,
      name: cat.name,
      url: cat.url,
      level: cat.level,
      parentId: cat.parentId,
      parentName: parentName,
      fullPath: currentPath.join(' > ')
    });
    
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, cat.name, currentPath));
    }
  }
  
  return result;
}

function getMaxDepth(categories: Category[], currentDepth: number = 1): number {
  let maxDepth = currentDepth;
  
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      const childDepth = getMaxDepth(cat.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }
  
  return maxDepth;
}

// Browser-side extraction script
const extractionScript = `
(function() {
  var categories = [];
  var seenUrls = {};

  function extractFromElements(elements, level, parentId) {
    var result = [];
    
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var link = el.tagName === 'A' ? el : el.querySelector('a');
      if (!link) continue;

      var href = link.pathname || link.getAttribute('href') || '';
      var name = (link.textContent || '').trim();

      if (!href || href === '/' || !name || name.length < 2) continue;
      if (href.indexOf('login') >= 0 || href.indexOf('register') >= 0 || href.indexOf('cart') >= 0) continue;
      if (seenUrls[href]) continue;
      seenUrls[href] = true;

      var id = href.replace(/^\\//, '').replace(/\\//g, '-') || name.toLowerCase().replace(/\\s+/g, '-');

      var parentLi = el.closest('li');
      var children = [];
      
      if (parentLi) {
        var nestedUl = parentLi.querySelector(':scope > ul, :scope > div > ul, :scope > .submenu');
        if (nestedUl) {
          var childItems = nestedUl.querySelectorAll(':scope > li > a, :scope > li');
          children = extractFromElements(childItems, level + 1, id);
        }
      }

      result.push({
        id: id,
        name: name,
        url: href,
        level: level,
        parentId: parentId,
        children: children
      });
    }

    return result;
  }

  // Strategy 1: Mobile menu structure
  var mobileMenuSelectors = [
    '.mobile-menu--category-list > li',
    '.mobile-menu--item',
    '[class*="mobile-menu"] li',
    '[class*="mobile"] [class*="category"]'
  ];

  for (var s = 0; s < mobileMenuSelectors.length; s++) {
    var items = document.querySelectorAll(mobileMenuSelectors[s]);
    if (items.length > 0) {
      var extracted = extractFromElements(items, 1, null);
      if (extracted.length > 0) {
        for (var j = 0; j < extracted.length; j++) {
          categories.push(extracted[j]);
        }
      }
    }
  }

  // Strategy 2: Navigation categories
  if (categories.length < 5) {
    var navSelectors = [
      'nav [class*="category"]',
      '.b-categories-root-desktop a',
      '.categories-sidebar a',
      '[class*="sidebar"] [class*="category"]',
      'aside a[href^="/"]'
    ];

    for (var s = 0; s < navSelectors.length; s++) {
      var items = document.querySelectorAll(navSelectors[s]);
      if (items.length > 3) {
        var extracted = extractFromElements(items, 1, null);
        if (extracted.length > categories.length) {
          categories = extracted;
        }
      }
    }
  }

  // Strategy 3: Look for any category-like links
  if (categories.length < 5) {
    var allLinks = document.querySelectorAll('a[href^="/"]');
    var categoryLinks = [];
    
    for (var i = 0; i < allLinks.length; i++) {
      var link = allLinks[i];
      var href = link.pathname;
      var text = (link.textContent || '').trim();
      
      var segments = href.split('/').filter(function(s) { return s.length > 0; });
      if (segments.length >= 1 && segments.length <= 3 && text.length > 2 && text.length < 50) {
        if (href.indexOf('login') < 0 && href.indexOf('cart') < 0 && href.indexOf('account') < 0 &&
            href.indexOf('help') < 0 && href.indexOf('contact') < 0 && href.indexOf('about') < 0) {
          categoryLinks.push(link);
        }
      }
    }

    if (categoryLinks.length > categories.length) {
      categories = [];
      
      var level1 = [];
      var level2Map = {};
      var level3Map = {};

      for (var i = 0; i < categoryLinks.length; i++) {
        var link = categoryLinks[i];
        var href = link.pathname;
        var name = (link.textContent || '').trim();
        if (seenUrls[href]) continue;
        seenUrls[href] = true;

        var segments = href.split('/').filter(function(s) { return s.length > 0; });
        var id = href.replace(/^\\//, '').replace(/\\//g, '-');

        var cat = { id: id, name: name, url: href, level: segments.length, parentId: null, children: [] };

        if (segments.length === 1) {
          level1.push(cat);
        } else if (segments.length === 2) {
          var parentPath = '/' + segments[0];
          if (!level2Map[parentPath]) level2Map[parentPath] = [];
          cat.parentId = segments[0];
          level2Map[parentPath].push(cat);
        } else if (segments.length === 3) {
          var parentPath = '/' + segments.slice(0, 2).join('/');
          if (!level3Map[parentPath]) level3Map[parentPath] = [];
          cat.parentId = segments.slice(0, 2).join('-');
          level3Map[parentPath].push(cat);
        }
      }

      for (var i = 0; i < level1.length; i++) {
        var l1 = level1[i];
        var l2Children = level2Map[l1.url] || [];
        for (var j = 0; j < l2Children.length; j++) {
          var l2 = l2Children[j];
          var l3Children = level3Map[l2.url] || [];
          l2.children = l3Children;
        }
        l1.children = l2Children;
      }

      categories = level1;
    }
  }

  return categories;
})()
`;

export async function startScraping(): Promise<ScrapeResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  
  currentStatus = {
    status: 'running',
    progress: 0,
    currentCategory: 'Initializing browser...',
    message: null,
    result: null
  };

  try {
    console.log('Starting Puppeteer browser...');
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Store the main categories API response
    let mainCategoriesData: any = null;
    const capturedResponses: any[] = [];
    
    page.on('response', async (response: HTTPResponse) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          
          // Priority: Main categories API endpoint
          if (url.includes('/categories') && url.includes('country')) {
            console.log(`Found main categories API: ${url}`);
            mainCategoriesData = data;
          } else if (url.includes('categor') || url.includes('menu') || url.includes('nav')) {
            capturedResponses.push({ url, data });
            console.log(`Captured API response from: ${url}`);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    currentStatus.currentCategory = 'Loading barbora.lv...';
    currentStatus.progress = 10;
    
    console.log('Navigating to barbora.lv...');
    await page.goto('https://barbora.lv', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    currentStatus.currentCategory = 'Looking for menu elements...';
    currentStatus.progress = 20;

    // Try to open the mobile menu to trigger category loading
    const menuSelectors = [
      '[data-testid="menu-button"]',
      '.b-header--menu-btn',
      '.hamburger-menu',
      'button[aria-label*="menu"]',
      '.mobile-menu-trigger',
      '.b-header-menu',
      '[class*="menu-toggle"]',
      '[class*="burger"]',
      'nav button',
      '.header button'
    ];

    for (const selector of menuSelectors) {
      try {
        const menuButton = await page.$(selector);
        if (menuButton) {
          console.log(`Found menu button with selector: ${selector}`);
          await menuButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    currentStatus.currentCategory = 'Extracting categories from page...';
    currentStatus.progress = 40;

    // Extract categories from DOM
    const domCategories = await page.evaluate(extractionScript) as any[];
    console.log(`Extracted ${domCategories.length} categories from DOM`);

    currentStatus.progress = 60;
    currentStatus.currentCategory = 'Processing API responses...';

    // Process the main categories API first (priority)
    let finalCategories: Category[] = [];

    if (mainCategoriesData) {
      console.log('Processing main categories API data...');
      
      // The main categories endpoint returns an array of category objects with nested structure
      const processMainCategories = (data: any): Category[] => {
        if (!data) return [];
        
        // Handle different response structures
        let rawCategories: RawCategory[] = [];
        
        if (Array.isArray(data)) {
          rawCategories = data;
        } else if (data.categories && Array.isArray(data.categories)) {
          rawCategories = data.categories;
        } else if (data.data && Array.isArray(data.data)) {
          rawCategories = data.data;
        } else if (typeof data === 'object') {
          // Try to find an array in the response
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key]) && data[key].length > 0) {
              const first = data[key][0];
              if (first && (first.name || first.title || first.children || first.subCategories)) {
                rawCategories = data[key];
                break;
              }
            }
          }
        }

        const normalized: Category[] = [];
        let index = 0;
        for (const raw of rawCategories) {
          const cat = normalizeCategory(raw, 1, null, index++);
          if (cat) normalized.push(cat);
        }
        
        return normalized;
      };

      finalCategories = processMainCategories(mainCategoriesData);
      console.log(`Processed ${finalCategories.length} categories from main API`);
    }

    // If main API didn't work, try other captured responses
    if (finalCategories.length === 0) {
      for (const { url, data } of capturedResponses) {
        // Skip promo/offer endpoints as they don't contain main categories
        if (url.includes('promo') || url.includes('offer') || url.includes('recommend') || 
            url.includes('banner') || url.includes('event')) {
          continue;
        }

        const findCategories = (obj: any, depth: number = 0): RawCategory[] => {
          if (!obj || typeof obj !== 'object' || depth > 5) return [];
          
          if (Array.isArray(obj)) {
            if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].title)) {
              // Check if this looks like a real category list (has children or subcategories)
              const hasHierarchy = obj.some((item: any) => 
                item.children?.length > 0 || 
                item.subcategories?.length > 0 || 
                item.subCategories?.length > 0
              );
              if (hasHierarchy || obj.length > 10) {
                return obj;
              }
            }
            for (const item of obj) {
              const found = findCategories(item, depth + 1);
              if (found.length > 0) return found;
            }
          } else {
            for (const key of Object.keys(obj)) {
              if (['categories', 'menu', 'navigation', 'items', 'children', 'tree'].includes(key.toLowerCase())) {
                if (Array.isArray(obj[key]) && obj[key].length > 0) {
                  return obj[key];
                }
              }
              const found = findCategories(obj[key], depth + 1);
              if (found.length > 0) return found;
            }
          }
          return [];
        };

        const rawCategories = findCategories(data);
        if (rawCategories.length > 0) {
          console.log(`Found ${rawCategories.length} raw categories from: ${url}`);
          
          const normalized: Category[] = [];
          let index = 0;
          for (const raw of rawCategories) {
            const cat = normalizeCategory(raw, 1, null, index++);
            if (cat) normalized.push(cat);
          }
          
          // Prefer responses with deeper hierarchy
          const newMaxDepth = getMaxDepth(normalized);
          const currentMaxDepth = getMaxDepth(finalCategories);
          
          if (normalized.length > finalCategories.length || newMaxDepth > currentMaxDepth) {
            finalCategories = normalized;
            console.log(`Using ${normalized.length} categories from API (depth: ${newMaxDepth})`);
          }
        }
      }
    }

    // Fallback to DOM categories
    if (finalCategories.length === 0 && domCategories.length > 0) {
      finalCategories = domCategories.filter((cat: any) => 
        cat.name && cat.name.length > 1 && cat.url
      );
      console.log(`Using ${finalCategories.length} categories from DOM extraction`);
    }

    currentStatus.currentCategory = 'Building final category structure...';
    currentStatus.progress = 80;

    const flatCategories = flattenCategories(finalCategories);
    const maxDepth = finalCategories.length > 0 ? getMaxDepth(finalCategories) : 0;
    const totalCount = flatCategories.length;

    const duration = Date.now() - startTime;

    const result: ScrapeResult = {
      categories: finalCategories,
      flatCategories,
      totalCount,
      maxDepth,
      scrapedAt: new Date().toISOString(),
      duration
    };

    currentStatus = {
      status: 'completed',
      progress: 100,
      currentCategory: null,
      message: `Successfully scraped ${totalCount} categories with max depth ${maxDepth}`,
      result
    };

    console.log(`Scraping completed: ${totalCount} categories (max depth: ${maxDepth}) in ${duration}ms`);
    
    return result;

  } catch (error) {
    console.error('Scraping error:', error);
    
    currentStatus = {
      status: 'error',
      progress: 0,
      currentCategory: null,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      result: null
    };

    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
