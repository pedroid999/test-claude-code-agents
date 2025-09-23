import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bot, Sparkles, Zap, Brain } from "lucide-react";
import { useEffect, useState } from "react";

interface AiNewsLoadingStateProps {
  count: number;
}

const loadingSteps = [
  { icon: Brain, text: "Analyzing current AI trends..." },
  { icon: Zap, text: "Searching latest research papers..." },
  { icon: Sparkles, text: "Generating news summaries..." },
  { icon: Bot, text: "Finalizing content..." },
];

export const AiNewsLoadingState = ({ count }: AiNewsLoadingStateProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = loadingSteps[currentStep].icon;

  return (
    <div className="space-y-6 py-4">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-pulse opacity-20 scale-110"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-full">
                <CurrentIcon className="h-6 w-6 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Generating {count} AI News Items
              </h3>
              <p className="text-sm text-purple-700 animate-pulse">
                {loadingSteps[currentStep].text}
              </p>
            </div>

            <div className="w-full space-y-2">
              <Progress
                value={progress}
                className="h-2 bg-purple-100"
              />
              <p className="text-xs text-purple-600">
                This may take 10-30 seconds to ensure fresh, quality content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {loadingSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={index}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-purple-100 border border-purple-300'
                  : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <StepIcon
                className={`h-4 w-4 ${
                  isActive
                    ? 'text-purple-600 animate-pulse'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              />
              <span className={`text-xs ${
                isActive
                  ? 'text-purple-700 font-medium'
                  : isCompleted
                    ? 'text-green-700'
                    : 'text-gray-500'
              }`}>
                {step.text.split('...')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};