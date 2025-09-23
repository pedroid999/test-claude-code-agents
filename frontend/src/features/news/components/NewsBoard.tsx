import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useNewsContext } from '../hooks/useNewsContext';
import { NewsColumn } from './NewsColumn';
import { NewsCard } from './NewsCard';
import { NewsMobileView } from './NewsMobileView';
import { NewsFilters } from './NewsFilters';
import { NewsStats } from './NewsStats';
import { CreateNewsButton } from './CreateNewsButton';
import { AiNewsButton } from './AiNewsButton';
import { NewsStatus } from '../data/news.schema';

export const NewsBoard = () => {
  const { newsByStatus, updateNewsStatus, isLoading } = useNewsContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const newsId = active.id as string;
    const newStatus = over.id as NewsStatus;
    
    // Find the news item
    const allNews = [
      ...newsByStatus.pending,
      ...newsByStatus.reading,
      ...newsByStatus.read,
    ];
    const newsItem = allNews.find(item => item.id === newsId);
    
    if (newsItem && newsItem.status !== newStatus) {
      updateNewsStatus(newsId, newStatus);
    }
  };

  // Find active item for drag overlay
  const activeItem = activeId
    ? [...newsByStatus.pending, ...newsByStatus.reading, ...newsByStatus.read].find(
        item => item.id === activeId
      )
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <NewsStats />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <NewsFilters />
          <div className="flex gap-2">
            <CreateNewsButton />
            <AiNewsButton />
          </div>
        </div>
        <NewsMobileView />
      </div>
    );
  }

  // Desktop Kanban board
  return (
    <div className="space-y-6">
      <NewsStats />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <NewsFilters />
        <div className="flex gap-2">
          <CreateNewsButton />
          <AiNewsButton />
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-6">
          <NewsColumn
            title="To Read"
            status={NewsStatus.PENDING}
            items={newsByStatus.pending}
            count={newsByStatus.pending.length}
          />
          <NewsColumn
            title="Reading"
            status={NewsStatus.READING}
            items={newsByStatus.reading}
            count={newsByStatus.reading.length}
          />
          <NewsColumn
            title="Completed"
            status={NewsStatus.READ}
            items={newsByStatus.read}
            count={newsByStatus.read.length}
          />
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="opacity-80">
              <NewsCard item={activeItem} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};