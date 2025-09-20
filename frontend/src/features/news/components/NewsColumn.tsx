import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NewsCard } from './NewsCard';
import { NewsStatus, type NewsItem } from '../data/news.schema';
import { cn } from '@/lib/utils';

interface NewsColumnProps {
  title: string;
  status: NewsStatus;
  items: NewsItem[];
  count: number;
}

const statusColors = {
  [NewsStatus.PENDING]: 'bg-yellow-100 border-yellow-400 text-yellow-900',
  [NewsStatus.READING]: 'bg-blue-100 border-blue-400 text-blue-900',
  [NewsStatus.READ]: 'bg-green-100 border-green-400 text-green-900',
};

export const NewsColumn = ({ title, status, items, count }: NewsColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-h-[400px] rounded-lg border-2 transition-all h-full',
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div className={cn('p-4 border-b', statusColors[status])}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="secondary" className="ml-2">
            {count}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No items</p>
                <p className="text-xs mt-1">Drag items here</p>
              </div>
            ) : (
              items.map(item => (
                <NewsCard key={item.id} item={item} />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
};