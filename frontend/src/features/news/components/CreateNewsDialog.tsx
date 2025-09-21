import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateNewsForm } from "./CreateNewsForm";

interface CreateNewsDialogProps {
  children: React.ReactNode;
}

export const CreateNewsDialog = ({ children }: CreateNewsDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Add News Article
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Create a new news article to add to your reading list. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] overflow-y-auto">
          <div className="px-6 pb-6">
            <CreateNewsForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};