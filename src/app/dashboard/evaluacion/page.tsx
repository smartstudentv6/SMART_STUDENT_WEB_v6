
"use client";

import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, PlayCircle } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
// Assuming generateQuiz can be used or adapted for evaluations
import { generateQuiz as generateEvaluationContent } from '@/ai/flows/generate-quiz'; 
import { useToast } from "@/hooks/use-toast";

export default function EvaluacionPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [topic, setTopic] = useState('');
  const [evaluationResult, setEvaluationResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateEvaluation = async () => {
    if (!selectedBook) {
      toast({ title: translate('errorGenerating'), description: translate('noBookSelected'), variant: 'destructive'});
      return;
    }
    if (!topic.trim()) {
      toast({ title: translate('errorGenerating'), description: translate('noTopicProvided'), variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setEvaluationResult('');
    try {
      // Using generateQuiz flow for evaluation content as a placeholder
      const result = await generateEvaluationContent({
        bookTitle: selectedBook,
        topic: topic,
        courseName: selectedCourse || "General",
      });
      // Format result for display
      let formattedEval = result.quiz.replace(/\n\n/g, '<hr class="my-4 border-border" /><br />');
      formattedEval = formattedEval.replace(/\n/g, '<br />');
      setEvaluationResult(formattedEval);
    } catch (error) {
      console.error("Error generating evaluation:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setEvaluationResult(`<p class="text-destructive">${translate('errorGenerating')}</p>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <ClipboardList className="w-10 h-10 text-purple-500 dark:text-purple-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">{translate('evalPageTitle')}</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-2xl">
            {translate('evalPageSub')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BookCourseSelector
            selectedCourse={selectedCourse}
            selectedBook={selectedBook}
            onCourseChange={setSelectedCourse}
            onBookChange={setSelectedBook}
          />
          <Textarea
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={translate('evalTopicPlaceholder')}
            className="text-base md:text-sm"
          />
          <Button
            onClick={handleCreateEvaluation}
            disabled={isLoading}
            className="w-full font-semibold py-3 text-base md:text-sm bg-custom-purple-100 text-custom-purple-800 hover:bg-custom-purple-100/80"
          >
            {isLoading ? (
              <>{translate('loading')}...</>
            ) : (
              <>
                <PlayCircle className="w-5 h-5 mr-2" />
                {translate('evalCreateBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="mt-6 text-lg text-muted-foreground animate-pulse">{translate('generatingEvaluation')}</p>
      )}

      {evaluationResult && !isLoading && (
        <Card className="mt-6 w-full max-w-lg text-left shadow-md">
          <CardHeader>
            <CardTitle className="font-headline">{translate('evaluationResultTitle', {defaultValue: "Generated Evaluation"})}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: evaluationResult }} className="prose dark:prose-invert max-w-none text-sm leading-relaxed" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    
