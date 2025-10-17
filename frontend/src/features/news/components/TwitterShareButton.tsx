import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateTwitterUrl, openTwitterShare, getSavedTwitterHandle } from '../data/twitter.utils';
import type { NewsItem } from '../data/news.schema';

interface TwitterShareButtonProps {
  newsItem: NewsItem;
  className?: string;
}

export const TwitterShareButton = ({ newsItem, className }: TwitterShareButtonProps) => {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Get saved Twitter handle from localStorage (if any)
      const savedHandle = getSavedTwitterHandle();

      // Generate Twitter share URL
      const twitterUrl = generateTwitterUrl(newsItem, savedHandle);

      // Open Twitter share in new window
      // MUST be called directly from click event to avoid popup blockers
      openTwitterShare(twitterUrl);

      // Show success toast
      toast.success('Opening Twitter share', {
        description: `Sharing: ${newsItem.title.slice(0, 50)}${newsItem.title.length > 50 ? '...' : ''}`,
        duration: 3000,
      });
    } catch (error) {
      // Show error toast if something goes wrong
      toast.error('Failed to open Twitter', {
        description: 'Please try again or check your browser settings.',
        duration: 5000,
      });
      console.error('Twitter share error:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleShare}
      aria-label="Share on Twitter"
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
};
