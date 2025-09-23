import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AiNewsForm } from "./AiNewsForm";
import type { ReactNode } from "react";

interface AiNewsDialogProps {
  children: ReactNode;
}

export const AiNewsDialog = ({ children }: AiNewsDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Generate AI News
          </DialogTitle>
        </DialogHeader>
        <AiNewsForm />
      </DialogContent>
    </Dialog>
  );
};