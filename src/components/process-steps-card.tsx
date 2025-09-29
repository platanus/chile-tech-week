import { CheckCircle, Hourglass } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface ProcessStep {
  number: number;
  title: string;
  description?: string;
  completed: boolean;
  isActive?: boolean;
}

interface ProcessStepsCardProps {
  currentStep: number;
}

export function ProcessStepsCard({ currentStep }: ProcessStepsCardProps) {
  // Define the steps with consistent titles and descriptions
  const steps: ProcessStep[] = [
    {
      number: 1,
      title: 'SUBMIT EVENT',
      description: 'Event submitted for review',
      completed: currentStep >= 1,
    },
    {
      number: 2,
      title: 'EVENT CHECKING & APPROVAL',
      description: 'Team reviewing and approving event details',
      completed: currentStep >= 2,
      isActive: currentStep === 2,
    },
    {
      number: 3,
      title: 'EDIT LUMA & PUBLISH',
      description: 'Luma event creation and final preparations',
      completed: currentStep >= 3,
      isActive: currentStep === 3,
    },
    {
      number: 4,
      title: 'EVENT PUBLISHED',
      description: 'Event live on Chile Tech Week website',
      completed: currentStep >= 4,
      isActive: currentStep === 4,
    },
  ];

  const getStepIcon = (step: ProcessStep) => {
    // Special case for step 2 - show hourglass when currentStep is 1 (submitted state)
    // This indicates that step 2 (approval) is "in progress"
    if (step.number === 2 && currentStep === 1) {
      return <Hourglass className="h-6 w-6 text-black" />;
    }

    // Special case for step 3 - show hourglass when currentStep is 3 (waiting-luma-edit state)
    // This indicates that step 3 (Luma editing) is "in progress"
    if (step.number === 3 && currentStep === 3) {
      return <Hourglass className="h-6 w-6 text-black" />;
    }

    if (step.completed) {
      return <CheckCircle className="h-6 w-6 text-black" />;
    }

    // For active step (in status page), show yellow circle
    if (step.isActive) {
      return (
        <div className="h-6 w-6 rounded-full border-4 border-black bg-yellow-400"></div>
      );
    }

    // Default pending state
    return (
      <div className="h-6 w-6 rounded-full border-4 border-black bg-white"></div>
    );
  };

  const getStepBackground = (step: ProcessStep) => {
    if (step.completed) {
      return 'bg-primary';
    }
    if (step.isActive) {
      return 'bg-yellow-200';
    }
    return 'bg-gray-100';
  };

  const getStepStatusText = (step: ProcessStep) => {
    // Special case for step 3 when currentStep is 3 (waiting-luma-edit state)
    if (step.number === 3 && currentStep === 3) {
      return 'WAITING FOR LUMA EDITION AND PUBLISH';
    }

    // Special case for step 2 when currentStep is 1 (submitted state)
    if (step.number === 2 && currentStep === 1) {
      return 'IN PROGRESS...';
    }

    if (step.completed) {
      return 'COMPLETED ✓';
    }
    if (step.isActive) {
      return 'IN PROGRESS...';
    }
    return 'PENDING';
  };

  const getStepStatusTextColor = (step: ProcessStep) => {
    // Special case for step 3 when currentStep is 3 (waiting-luma-edit state)
    if (step.number === 3 && currentStep === 3) {
      return 'text-black';
    }

    // Special case for step 2 when currentStep is 1 (submitted state)
    if (step.number === 2 && currentStep === 1) {
      return 'text-gray-600';
    }

    if (step.completed) {
      return 'text-black';
    }
    if (step.isActive) {
      return 'text-yellow-800';
    }
    return 'text-gray-600';
  };

  return (
    <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
      <CardHeader>
        <CardTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
          PROCESS STEPS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex items-center gap-4 rounded border-4 border-black p-4 ${getStepBackground(step)}`}
            >
              {getStepIcon(step)}
              <div className="flex-1">
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  {step.number}. {step.title}
                </p>
                <p
                  className={`font-mono text-xs ${getStepStatusTextColor(step)}`}
                >
                  {getStepStatusText(step)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
