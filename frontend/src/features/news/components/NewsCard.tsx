import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink, Trash2 } from 'lucide-react';
import { useNewsContext } from '../hooks/useNewsContext';
import { CATEGORY_COLORS, STATUS_COLORS, type NewsItem } from '../data/news.schema';
import { cn } from '@/lib/utils';

interface NewsCardProps {
  item: NewsItem;
  isDragging?: boolean;
}

export const NewsCard = ({ item, isDragging = false }: NewsCardProps) => {
  const { toggleFavorite, deleteNews, deleteState } = useNewsContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.link, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNews(item.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        (isDragging || isSortableDragging) && 'opacity-50'
      )}
    >
      <Card
        className={cn(
          'bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all',
          STATUS_COLORS[item.status]
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.source}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleFavoriteClick}
              >
                <Heart
                  className={cn(
                    'h-4 w-4',
                    item.is_favorite && 'fill-red-500 text-red-500'
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleLinkClick}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:text-destructive"
                onClick={handleDeleteClick}
                aria-label="Delete news item"
                disabled={deleteState.isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {item.summary}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn('text-xs', CATEGORY_COLORS[item.category])}
            >
              {item.category}
            </Badge>
            
            {item.is_public && (
              <Badge variant="outline" className="text-xs">
                Public
              </Badge>
            )}
          </div>
          
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="mt-3 w-full h-24 object-cover rounded"
              loading="lazy"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};