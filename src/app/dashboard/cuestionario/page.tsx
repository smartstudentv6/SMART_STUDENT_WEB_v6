
"use client";

import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileQuestion, Sparkles } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { useToast } from "@/hooks/use-toast";

export default function CuestionarioPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [topic, setTopic] = useState('');
  const [quizResult, setQuizResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQuiz = async () => {
    if (!selectedBook) {
      toast({ title: translate('errorGenerating'), description: translate('noBookSelected'), variant: 'destructive'});
      return;
    }
    if (!topic.trim()) {
      toast({ title: translate('errorGenerating'), description: translate('noTopicProvided'), variant: 'destructive'});
      return;
    }
    
    setIsLoading(true);
    setQuizResult('');
    try {
      const result = await generateQuiz({
        bookTitle: selectedBook,
        topic: topic,
        courseName: selectedCourse || "General", // Course name might be optional or derived
      });
       // Format quiz text for better display, e.g., bold questions, highlight correct answers
      let formattedQuiz = result.quiz.replace(/\n\n/g, '<hr class="my-4 border-border" /><br />'); // Separate questions
      formattedQuiz = formattedQuiz.replace(/\n/g, '<br />');
      // Example: Bold questions (assuming questions end with '?')
      // formattedQuiz = formattedQuiz.replace(/^(Q[0-9]+:.*?)\?/gm, '<strong>$1?</strong>');
      // Example: Highlight correct answer (assuming it's marked like "Correct Answer: C)")
      // formattedQuiz = formattedQuiz.replace(/(Correct Answer: .*?\))/g, '<span class="text-green-600 dark:text-green-400 font-semibold">$1</span>');
      
      setQuizResult(formattedQuiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setQuizResult(`<p class="text-destructive">${translate('errorGenerating')}</p>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <FileQuestion className="w-10 h-10 text-cyan-500 dark:text-cyan-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">{translate('quizPageTitle')}</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-2xl">
            {translate('quizPageSub')}
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
            id="quiz-input"
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={translate('quizTopicPlaceholder')}
            className="text-base md:text-sm"
          />
          <Button
            onClick={handleGenerateQuiz}
            disabled={isLoading}
            className="w-full font-semibold py-3 text-base md:text-sm bg-cyan-500 hover:bg-cyan-600 dark:bg-custom-cyan-800 dark:text-custom-cyan-100 dark:hover:bg-cyan-700"
          >
            {isLoading ? (
              <>{translate('loading')}...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {translate('quizGenerateBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="mt-6 text-lg text-muted-foreground animate-pulse">{translate('generatingQuiz')}</p>
      )}

      {quizResult && !isLoading && (
        <Card className="mt-6 w-full max-w-lg text-left shadow-md">
          <CardHeader>
             <CardTitle className="font-headline">{translate('quizResultTitle', {defaultValue: "Generated Quiz"})}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: quizResult }} className="prose dark:prose-invert max-w-none text-sm leading-relaxed" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    