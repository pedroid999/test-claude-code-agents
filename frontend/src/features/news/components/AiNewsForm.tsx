import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Bot } from "lucide-react";
import { useNewsContext } from "../hooks/useNewsContext";
import { AiNewsLoadingState } from "./AiNewsLoadingState";

export const AiNewsForm = () => {
  const { generateAiNews, aiGeneration } = useNewsContext();
  const [count, setCount] = useState<number>(5);
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateAiNews({
      count,
      is_public: isPublic,
    });
  };

  if (aiGeneration.isLoading) {
    return <AiNewsLoadingState count={count} />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Bot className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              AI will generate fresh and current news about artificial intelligence
            </span>
          </div>
          <p className="text-xs text-purple-600">
            Using Perplexity AI to search for the latest AI breakthroughs, research, and industry updates
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Number of news items to generate</Label>
          <RadioGroup
            value={count.toString()}
            onValueChange={(value) => setCount(parseInt(value))}
            className="grid grid-cols-3 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="5" id="count-5" />
              <Label htmlFor="count-5" className="cursor-pointer">5 items</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="10" id="count-10" />
              <Label htmlFor="count-10" className="cursor-pointer">10 items</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="15" id="count-15" />
              <Label htmlFor="count-15" className="cursor-pointer">15 items</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="is-public" className="text-sm font-medium">
              Make news public
            </Label>
            <p className="text-xs text-gray-500">
              Public news can be seen by all users
            </p>
          </div>
          <Switch
            id="is-public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium transition-all duration-200"
          disabled={aiGeneration.isLoading}
        >
          {aiGeneration.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate AI News
            </>
          )}
        </Button>

        {aiGeneration.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {aiGeneration.error.message || 'Failed to generate AI news. Please try again.'}
            </p>
          </div>
        )}
      </form>
    </div>
  );
};