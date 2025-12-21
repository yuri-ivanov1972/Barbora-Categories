import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Play, 
  Loader2, 
  FolderTree, 
  Clock, 
  Layers, 
  Hash,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Table,
  List,
  Globe
} from "lucide-react";
import type { Category, FlatCategory, ScrapeStatus, ScrapeResult } from "@shared/schema";

function CategoryTreeItem({ 
  category, 
  expandedIds, 
  toggleExpand 
}: { 
  category: Category; 
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children && category.children.length > 0;
  const indent = category.level * 24;

  return (
    <div data-testid={`category-item-${category.id}`}>
      <div 
        className="flex items-center gap-2 py-2 px-3 hover-elevate rounded-md cursor-pointer group"
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={() => hasChildren && toggleExpand(category.id)}
      >
        {hasChildren ? (
          <button className="p-0.5" data-testid={`toggle-${category.id}`}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="flex-1 text-sm font-medium truncate" data-testid={`category-name-${category.id}`}>
          {category.name}
        </span>
        {hasChildren && (
          <Badge variant="secondary" className="text-xs">
            {category.children.length}
          </Badge>
        )}
        <Badge 
          variant="outline" 
          className="text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
        >
          L{category.level}
        </Badge>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeItem 
              key={child.id} 
              category={child} 
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTable({ categories }: { categories: FlatCategory[] }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="grid grid-cols-12 gap-4 bg-muted/50 p-3 text-xs font-medium text-muted-foreground border-b">
        <div className="col-span-1">Level</div>
        <div className="col-span-3">Category</div>
        <div className="col-span-3">Parent</div>
        <div className="col-span-5">Full Path</div>
      </div>
      <ScrollArea className="h-[500px]">
        {categories.map((cat, index) => (
          <div 
            key={cat.id} 
            className={`grid grid-cols-12 gap-4 p-3 text-sm ${index % 2 === 0 ? '' : 'bg-muted/20'}`}
            data-testid={`table-row-${cat.id}`}
          >
            <div className="col-span-1">
              <Badge variant="outline" className="font-mono">{cat.level}</Badge>
            </div>
            <div className="col-span-3 font-medium truncate">{cat.name}</div>
            <div className="col-span-3 text-muted-foreground truncate">
              {cat.parentName || '-'}
            </div>
            <div className="col-span-5 font-mono text-xs text-muted-foreground truncate">
              {cat.fullPath}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
              {value}
            </p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ status }: { status: ScrapeStatus['status'] }) {
  const config = {
    idle: { color: 'bg-muted-foreground', label: 'Idle' },
    running: { color: 'bg-amber-500', label: 'Running' },
    completed: { color: 'bg-green-500', label: 'Completed' },
    error: { color: 'bg-destructive', label: 'Error' }
  };

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color} ${status === 'running' ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function Home() {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: scrapeStatus, isLoading: statusLoading } = useQuery<ScrapeStatus>({
    queryKey: ['/api/scrape/status'],
    refetchInterval: (query) => {
      const data = query.state.data as ScrapeStatus | undefined;
      return data?.status === 'running' ? 1000 : false;
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/scrape/start', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrape/status'] });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (scrapeStatus?.result?.categories) {
      const getAllIds = (cats: Category[]): string[] => {
        return cats.flatMap(cat => [cat.id, ...getAllIds(cat.children || [])]);
      };
      setExpandedIds(new Set(getAllIds(scrapeStatus.result.categories)));
    }
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const downloadCSV = () => {
    if (!scrapeStatus?.result?.flatCategories) return;
    
    const headers = ['ID', 'Name', 'URL', 'Level', 'Parent ID', 'Parent Name', 'Full Path'];
    const rows = scrapeStatus.result.flatCategories.map(cat => [
      cat.id,
      cat.name,
      cat.url,
      cat.level.toString(),
      cat.parentId || '',
      cat.parentName || '',
      cat.fullPath
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `barbora-categories-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const result = scrapeStatus?.result;
  const isRunning = scrapeStatus?.status === 'running';

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Barbora Category Scraper</h1>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator status={scrapeStatus?.status || 'idle'} />
            <Separator orientation="vertical" className="h-6" />
            <Button
              onClick={() => scrapeMutation.mutate()}
              disabled={isRunning}
              data-testid="button-start-scrape"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Scrape
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadCSV}
              disabled={!result?.flatCategories?.length}
              data-testid="button-download-csv"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Categories" 
            value={result?.totalCount ?? 0} 
            icon={Hash} 
          />
          <StatCard 
            title="Max Depth" 
            value={result?.maxDepth ?? 0} 
            icon={Layers} 
          />
          <StatCard 
            title="Scrape Duration" 
            value={result?.duration ? `${(result.duration / 1000).toFixed(1)}s` : '-'} 
            icon={Clock} 
          />
          <StatCard 
            title="Last Scraped" 
            value={result?.scrapedAt ? new Date(result.scrapedAt).toLocaleTimeString() : '-'} 
            icon={RefreshCw} 
          />
        </div>

        {/* Progress Bar when running */}
        {isRunning && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Scraping in progress...</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${scrapeStatus?.progress || 0}%` }}
                />
              </div>
              {scrapeStatus?.currentCategory && (
                <p className="text-sm text-muted-foreground mt-2">
                  Current: {scrapeStatus.currentCategory}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Category Results
              {result?.totalCount ? (
                <Badge variant="secondary">{result.totalCount} items</Badge>
              ) : null}
            </CardTitle>
            <div className="flex items-center gap-2">
              {viewMode === 'tree' && result?.categories?.length ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={expandAll}
                    data-testid="button-expand-all"
                  >
                    Expand All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={collapseAll}
                    data-testid="button-collapse-all"
                  >
                    Collapse All
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              ) : null}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('tree')}
                  data-testid="button-view-tree"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                  data-testid="button-view-table"
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : result?.categories?.length ? (
              viewMode === 'tree' ? (
                <ScrollArea className="h-[500px] pr-4">
                  {result.categories.map((category) => (
                    <CategoryTreeItem
                      key={category.id}
                      category={category}
                      expandedIds={expandedIds}
                      toggleExpand={toggleExpand}
                    />
                  ))}
                </ScrollArea>
              ) : (
                <CategoryTable categories={result.flatCategories} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FolderTree className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click the "Start Scrape" button above to extract category data from barbora.lv
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {scrapeStatus?.status === 'error' && (
          <Card className="mt-8 border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">Scraping Error</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scrapeStatus.message || 'An error occurred while scraping. Please try again.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {scrapeStatus?.status === 'completed' && result && (
          <Card className="mt-8 border-green-500/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400">Scraping Complete</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Successfully extracted {result.totalCount} categories in {(result.duration / 1000).toFixed(1)} seconds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
