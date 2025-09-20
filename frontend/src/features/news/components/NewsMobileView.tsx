import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNewsContext } from '../hooks/useNewsContext';
import { NewsCard } from './NewsCard';
import { NewsStatus } from '../data/news.schema';

export const NewsMobileView = () => {
  const { newsByStatus } = useNewsContext();

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-white/95 backdrop-blur-sm">
        <TabsTrigger value="pending" className="relative">
          To Read
          <Badge
            variant="secondary"
            className="ml-2 bg-yellow-100 text-yellow-900"
          >
            {newsByStatus.pending.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="reading" className="relative">
          Reading
          <Badge
            variant="secondary"
            className="ml-2 bg-blue-100 text-blue-900"
          >
            {newsByStatus.reading.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="read" className="relative">
          Completed
          <Badge
            variant="secondary"
            className="ml-2 bg-green-100 text-green-900"
          >
            {newsByStatus.read.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4">
        <MobileNewsColumn items={newsByStatus.pending} status={NewsStatus.PENDING} />
      </TabsContent>

      <TabsContent value="reading" className="mt-4">
        <MobileNewsColumn items={newsByStatus.reading} status={NewsStatus.READING} />
      </TabsContent>

      <TabsContent value="read" className="mt-4">
        <MobileNewsColumn items={newsByStatus.read} status={NewsStatus.READ} />
      </TabsContent>
    </Tabs>
  );
};

interface MobileNewsColumnProps {
  items: any[];
  status: NewsStatus;
}

const MobileNewsColumn = ({ items, status }: MobileNewsColumnProps) => {
  const { updateNewsStatus } = useNewsContext();

  const getNextStatus = (currentStatus: NewsStatus): NewsStatus | null => {
    switch (currentStatus) {
      case NewsStatus.PENDING:
        return NewsStatus.READING;
      case NewsStatus.READING:
        return NewsStatus.READ;
      case NewsStatus.READ:
        return null;
      default:
        return null;
    }
  };

  const getPreviousStatus = (currentStatus: NewsStatus): NewsStatus | null => {
    switch (currentStatus) {
      case NewsStatus.READ:
        return NewsStatus.READING;
      case NewsStatus.READING:
        return NewsStatus.PENDING;
      case NewsStatus.PENDING:
        return null;
      default:
        return null;
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
      <div className="space-y-3 pr-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No items</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="relative">
              <NewsCard item={item} />
              
              {/* Status change buttons for mobile */}
              <div className="flex gap-2 mt-2 px-2">
                {getPreviousStatus(status) && (
                  <button
                    onClick={() => updateNewsStatus(item.id, getPreviousStatus(status)!)}
                    className="flex-1 text-xs py-1 px-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    ← Move to {getPreviousStatus(status)}
                  </button>
                )}
                {getNextStatus(status) && (
                  <button
                    onClick={() => updateNewsStatus(item.id, getNextStatus(status)!)}
                    className="flex-1 text-xs py-1 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    Move to {getNextStatus(status)} →
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};