import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiNewsDialog } from "./AiNewsDialog";

export const AiNewsButton = () => {
  return (
    <AiNewsDialog>
      <Button
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        size="sm"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate AI News
      </Button>
    </AiNewsDialog>
  );
};