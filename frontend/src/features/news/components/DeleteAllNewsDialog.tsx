import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNewsContext } from '../hooks/useNewsContext';

export function DeleteAllNewsDialog() {
  const { deleteAllNews, stats, deleteState } = useNewsContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    deleteAllNews();
    setIsOpen(false);
  };

  const hasNews = stats.total > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNews || deleteState.isLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete All News Items?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete all your news items.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-md space-y-2">
          <div className="text-sm font-medium">Items to be deleted:</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reading:</span>
              <span className="font-medium">{stats.reading}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Read:</span>
              <span className="font-medium">{stats.read}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-muted-foreground">Favorites:</span>
              <span className="font-medium">{stats.favorites}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
              <span>Total:</span>
              <span>{stats.total}</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-destructive font-medium">
          ⚠️ Warning: All your news items, including favorites, will be permanently removed.
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={deleteState.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteState.isLoading}
          >
            {deleteState.isLoading ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
