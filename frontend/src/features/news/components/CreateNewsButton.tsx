import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateNewsDialog } from "./CreateNewsDialog";

export const CreateNewsButton = () => {
  return (
    <CreateNewsDialog>
      <Button
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add News
      </Button>
    </CreateNewsDialog>
  );
};