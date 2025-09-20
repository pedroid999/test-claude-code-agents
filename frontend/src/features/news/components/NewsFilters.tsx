import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, Filter, X } from 'lucide-react';
import { useNewsContext } from '../hooks/useNewsContext';
import { NewsCategory } from '../data/news.schema';

export const NewsFilters = () => {
  const { filters, setFilters } = useNewsContext();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const handleCategoryFilter = (category: NewsCategory | null) => {
    setFilters({
      ...filters,
      category: category || undefined,
    });
  };

  const handleFavoriteToggle = (checked: boolean) => {
    setShowFavoritesOnly(checked);
    setFilters({
      ...filters,
      is_favorite: checked || undefined,
    });
  };

  const clearFilters = () => {
    setFilters({});
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = filters.category || filters.is_favorite;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-lg border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Category
            {filters.category && (
              <Badge variant="secondary">{filters.category}</Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleCategoryFilter(null)}>
            All Categories
          </DropdownMenuItem>
          {Object.values(NewsCategory).map(category => (
            <DropdownMenuItem
              key={category}
              onClick={() => handleCategoryFilter(category)}
            >
              <Badge
                variant="outline"
                className="mr-2 capitalize"
              >
                {category}
              </Badge>
              {category}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center space-x-2">
        <Switch
          id="favorites"
          checked={showFavoritesOnly}
          onCheckedChange={handleFavoriteToggle}
        />
        <Label htmlFor="favorites" className="cursor-pointer">
          Favorites only
        </Label>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );
};