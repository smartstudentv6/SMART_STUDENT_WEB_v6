
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClipboardList, PlayCircle, ChevronLeft, ChevronRight, PartyPopper, Award, Timer } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { generateEvaluationContent, type EvaluationQuestion } from '@/ai/flows/generate-evaluation-content';
import { useToast } from "@/hooks/use-toast";
import { useAIProgress } from "@/hooks/use-ai-progress";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { EvaluationHistoryItem } from '@/lib/types';
import { useSearchParams } from 'next/navigation'; 

type UserAnswer = boolean | number | number[] | null; 

// Fisher-Yates shuffle function
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const INITIAL_TIME_LIMIT = 900; // 15 minutes in seconds (15 preguntas x 1 minuto por pregunta)

export default function EvaluacionPage() {
  const { translate, language: currentUiLanguage } = useLanguage();
  const { toast } = useToast();
  const { progress, progressText, isLoading: aiIsLoading, startProgress, stopProgress } = useAIProgress();
  const searchParams = useSearchParams(); 

  // Setup state
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [topic, setTopic] = useState('');
  const [currentTopicForDisplay, setCurrentTopicForDisplay] = useState('');
  
  // Evaluation state
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  
  // Control state
  const [evaluationStarted, setEvaluationStarted] = useState(false);
  const [evaluationFinished, setEvaluationFinished] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [score, setScore] = useState(0);
  const [motivationalMessageKey, setMotivationalMessageKey] = useState('');

  // Timer state
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_LIMIT);
  const [timerActive, setTimerActive] = useState(false);

  // For pre-filling from query params
  const [initialBookFromQuery, setInitialBookFromQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    const courseFromQuery = searchParams.get('course');
    const bookFromQueryParam = searchParams.get('book');
    const topicFromQuery = searchParams.get('topic');

    if (courseFromQuery) {
      setSelectedCourse(decodeURIComponent(courseFromQuery));
    }
    if (bookFromQueryParam) {
      setInitialBookFromQuery(decodeURIComponent(bookFromQueryParam));
    } else {
      setInitialBookFromQuery(undefined);
    }
    if (topicFromQuery) {
      setTopic(decodeURIComponent(topicFromQuery));
    }
  }, [searchParams]);


  const calculateScore = useCallback(() => {
    let correctAnswers = 0;
    evaluationQuestions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.type === 'TRUE_FALSE' && userAnswer === q.correctAnswer) {
        correctAnswers++;
      } else if (q.type === 'MULTIPLE_CHOICE' && userAnswer === q.correctAnswerIndex) {
        correctAnswers++;
      } else if (q.type === 'MULTIPLE_SELECTION' && Array.isArray(userAnswer) && Array.isArray(q.correctAnswerIndices)) {
        // Check if user selected exactly the correct answers
        const userAnswerSorted = [...userAnswer].sort();
        const correctAnswerSorted = [...q.correctAnswerIndices].sort();
        if (userAnswerSorted.length === correctAnswerSorted.length &&
            userAnswerSorted.every((val, idx) => val === correctAnswerSorted[idx])) {
          correctAnswers++;
        }
      }
    });
    return correctAnswers;
  }, [evaluationQuestions, userAnswers]);

  const saveEvaluationToHistory = useCallback((finalScore: number, totalQuestions: number) => {
    if (!selectedBook || !currentTopicForDisplay || !selectedCourse) return;

    const newHistoryItem: EvaluationHistoryItem = {
      id: new Date().toISOString(),
      date: new Date().toLocaleString(translate('evalDateFormatLocale', {defaultValue: 'es-CL'}), { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + (currentUiLanguage === 'es' ? ' hrs' : ''), // Append 'hrs' only for Spanish
      courseName: selectedCourse, 
      bookTitle: selectedBook,
      topic: currentTopicForDisplay,
      score: finalScore,
      totalQuestions: totalQuestions,
    };

    try {
      const existingHistoryString = localStorage.getItem('evaluationHistory');
      const existingHistory: EvaluationHistoryItem[] = existingHistoryString ? JSON.parse(existingHistoryString) : [];
      const updatedHistory = [newHistoryItem, ...existingHistory]; 
      localStorage.setItem('evaluationHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save evaluation history:", error);
      toast({
        title: translate('evalErrorSavingHistoryTitle', {defaultValue: "Error Saving History"}),
        description: translate('evalErrorSavingHistoryDesc', {defaultValue: "Could not save evaluation to history."}),
        variant: 'destructive',
      });
    }
  }, [selectedCourse, selectedBook, currentTopicForDisplay, toast, translate, currentUiLanguage]);

  const handleFinishEvaluation = useCallback(() => {
    const finalScore = calculateScore();
    setScore(finalScore);
    
    const totalQuestions = evaluationQuestions.length;
    const percentage = totalQuestions > 0 ? (finalScore / totalQuestions) * 100 : 0;

    if (percentage === 100) {
      setMotivationalMessageKey('evalMotivationalPerfect');
    } else if (percentage >= 50) {
      setMotivationalMessageKey('evalMotivationalGood');
    } else {
      setMotivationalMessageKey('evalMotivationalImprovement');
    }
    
    setTimerActive(false); 
    setEvaluationFinished(true);
    setShowResultDialog(true);
    if (totalQuestions > 0) { 
        saveEvaluationToHistory(finalScore, totalQuestions);
    }
  }, [calculateScore, evaluationQuestions.length, saveEvaluationToHistory]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (evaluationStarted && !evaluationFinished && timerActive) {
      if (timeLeft > 0) {
        intervalId = setInterval(() => {
          setTimeLeft((prevTime) => prevTime - 1);
        }, 1000);
      } else { 
        setTimerActive(false); 
        toast({
          title: translate('evalTimeUpTitle'),
          description: translate('evalTimeUpDesc'),
          variant: "default", 
        });
        handleFinishEvaluation();
      }
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [evaluationStarted, evaluationFinished, timerActive, timeLeft, handleFinishEvaluation, toast, translate]);


  useEffect(() => {
    if (evaluationQuestions.length > 0) {
      setUserAnswers(Array(evaluationQuestions.length).fill(null));
    }
  }, [evaluationQuestions]);

  const handleCreateEvaluation = async () => {
    if (!selectedBook) {
      toast({ title: translate('errorGenerating'), description: translate('noBookSelected'), variant: 'destructive'});
      return;
    }
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      toast({ title: translate('errorGenerating'), description: translate('noTopicProvided'), variant: 'destructive'});
      return;
    }

    // Start progress simulation
    const progressInterval = startProgress('evaluation', 12000); // Extended time for PDF processing
    setEvaluationStarted(false);
    setEvaluationFinished(false);
    setEvaluationQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setMotivationalMessageKey('');
    setCurrentTopicForDisplay(trimmedTopic);
    

    try {
      // First, extract PDF content
      let pdfContent = '';
      try {
        const pdfResponse = await fetch('/api/extract-pdf-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookTitle: selectedBook
          }),
        });
        
        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          pdfContent = pdfData.pdfContent || '';
        } else {
          console.warn('Failed to extract PDF content, using fallback generation');
        }
      } catch (pdfError) {
        console.warn('Error extracting PDF content:', pdfError);
      }

      // Generate dynamic evaluation using PDF content
      const evaluationResponse = await fetch('/api/generate-dynamic-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle: selectedBook,
          topic: trimmedTopic,
          language: currentUiLanguage,
          pdfContent: pdfContent
        }),
      });

      if (!evaluationResponse.ok) {
        throw new Error('Failed to generate dynamic evaluation');
      }

      const evaluationData = await evaluationResponse.json();
      const result = evaluationData.data;
      
      if (result && result.questions && result.questions.length === 15) {
        setEvaluationTitle(result.evaluationTitle);
        setEvaluationQuestions(shuffleArray(result.questions));
        setTimeLeft(INITIAL_TIME_LIMIT);
        setTimerActive(true);
        setEvaluationStarted(true);
        setEvaluationFinished(false);
        
        // Show success notification
        toast({ 
          title: translate('evalGeneratedTitle'), 
          description: translate('evalGeneratedDesc'),
          variant: 'default'
        });
      } else {
        throw new Error(translate('evalErrorGenerationFormat', {defaultValue: "AI did not return the requested number of questions in the expected format."}));
      }
    } catch (error) {
      console.error("Error generating evaluation:", error);
      
      // Fallback to original method if dynamic generation fails
      try {
        console.log("Attempting fallback generation...");
        const result = await generateEvaluationContent({
          bookTitle: selectedBook,
          topic: trimmedTopic,
          language: currentUiLanguage,
        });
        
        if (result && result.questions && result.questions.length === 15) {
          setEvaluationTitle(result.evaluationTitle);
          setEvaluationQuestions(shuffleArray(result.questions));
          setTimeLeft(INITIAL_TIME_LIMIT);
          setTimerActive(true);
          setEvaluationStarted(true);
          setEvaluationFinished(false);
          
          toast({ 
            title: translate('evalGeneratedTitle'), 
            description: translate('evalGeneratedDesc'),
            variant: 'default'
          });
        } else {
          throw new Error('Fallback generation also failed');
        }
      } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError);
        toast({ 
          title: translate('errorGenerating'), 
          description: (error as Error).message, 
          variant: 'destructive'
        });
        setEvaluationStarted(false);
      }
    } finally {
      stopProgress(progressInterval);
    }
  };

  const handleAnswerSelect = (answer: UserAnswer) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const handleMultipleSelectionToggle = (optionIndex: number) => {
    const newAnswers = [...userAnswers];
    const currentAnswer = newAnswers[currentQuestionIndex];
    
    if (Array.isArray(currentAnswer)) {
      // If the option is already selected, remove it
      if (currentAnswer.includes(optionIndex)) {
        newAnswers[currentQuestionIndex] = currentAnswer.filter(idx => idx !== optionIndex);
      } else {
        // Add the option to the selection
        newAnswers[currentQuestionIndex] = [...currentAnswer, optionIndex];
      }
    } else {
      // Initialize as an array with the first selection
      newAnswers[currentQuestionIndex] = [optionIndex];
    }
    
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < evaluationQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRepeatEvaluation = async () => {
    if (!selectedBook || !currentTopicForDisplay) {
      toast({ 
        title: translate('errorGenerating'), 
        description: translate('noBookSelected'), 
        variant: 'destructive'
      });
      return;
    }

    // Start progress simulation for new evaluation generation
    const progressInterval = startProgress('evaluation', 12000);
    
    // Reset state
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setEvaluationFinished(false); 
    setShowResultDialog(false);
    setScore(0);
    setMotivationalMessageKey('');
    setEvaluationQuestions([]);
    setTimerActive(false);

    try {
      // First, extract PDF content
      let pdfContent = '';
      try {
        const pdfResponse = await fetch('/api/extract-pdf-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookTitle: selectedBook
          }),
        });
        
        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          pdfContent = pdfData.pdfContent || '';
        } else {
          console.warn('Failed to extract PDF content for repeat evaluation, using fallback generation');
        }
      } catch (pdfError) {
        console.warn('Error extracting PDF content for repeat evaluation:', pdfError);
      }

      // Generate NEW dynamic evaluation using PDF content
      const evaluationResponse = await fetch('/api/generate-dynamic-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle: selectedBook,
          topic: currentTopicForDisplay,
          language: currentUiLanguage,
          pdfContent: pdfContent
        }),
      });

      if (!evaluationResponse.ok) {
        throw new Error('Failed to generate new dynamic evaluation');
      }

      const evaluationData = await evaluationResponse.json();
      const result = evaluationData.data;
      
      if (result && result.questions && result.questions.length === 15) {
        setEvaluationTitle(result.evaluationTitle);
        setEvaluationQuestions(shuffleArray(result.questions));
        setUserAnswers(Array(result.questions.length).fill(null));
        setTimeLeft(INITIAL_TIME_LIMIT);
        setTimerActive(true);
        setEvaluationStarted(true);
        
        // Show success notification for new evaluation
        toast({ 
          title: translate('evalGeneratedTitle'), 
          description: translate('evalNewEvaluationGenerated', {defaultValue: 'Nueva evaluación generada con preguntas diferentes'}),
          variant: 'default'
        });
      } else {
        throw new Error('Failed to generate new evaluation with proper format');
      }
    } catch (error) {
      console.error("Error generating new evaluation for repeat:", error);
      
      // Fallback to original method if dynamic generation fails
      try {
        console.log("Attempting fallback generation for repeat...");
        const result = await generateEvaluationContent({
          bookTitle: selectedBook,
          topic: currentTopicForDisplay,
          language: currentUiLanguage,
        });
        
        if (result && result.questions && result.questions.length === 15) {
          setEvaluationTitle(result.evaluationTitle);
          setEvaluationQuestions(shuffleArray(result.questions));
          setUserAnswers(Array(result.questions.length).fill(null));
          setTimeLeft(INITIAL_TIME_LIMIT);
          setTimerActive(true);
          setEvaluationStarted(true);
          
          toast({ 
            title: translate('evalGeneratedTitle'), 
            description: translate('evalNewEvaluationGenerated', {defaultValue: 'Nueva evaluación generada'}),
            variant: 'default'
          });
        } else {
          throw new Error('Fallback generation also failed for repeat');
        }
      } catch (fallbackError) {
        console.error("Fallback generation failed for repeat:", fallbackError);
        // If all fails, just reset to the original questions but shuffle them
        setCurrentQuestionIndex(0);
        setUserAnswers(Array(evaluationQuestions.length).fill(null));
        setEvaluationFinished(false); 
        setShowResultDialog(false);
        setScore(0);
        setMotivationalMessageKey('');
        setTimeLeft(INITIAL_TIME_LIMIT);
        setTimerActive(true);
        setEvaluationStarted(true);
        
        toast({ 
          title: translate('evalGeneratedTitle'), 
          description: translate('evalFallbackRepeat', {defaultValue: 'Evaluación reiniciada con preguntas reordenadas'}),
          variant: 'default'
        });
      }
    } finally {
      stopProgress(progressInterval);
    }
  };

  const handleStartNewEvaluation = () => {
    setEvaluationStarted(false);
    setEvaluationFinished(false);
    setEvaluationQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setMotivationalMessageKey('');
    setTopic('');
    setSelectedCourse(''); 
    setSelectedBook(''); 
    setInitialBookFromQuery(undefined);
    setCurrentTopicForDisplay('');
    setShowResultDialog(false); 
    setTimeLeft(INITIAL_TIME_LIMIT);
    setTimerActive(false);
  };

  const handleCloseDialogAndShowReview = () => {
    setShowResultDialog(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const currentQuestion = evaluationQuestions[currentQuestionIndex];

  if (!evaluationStarted) {
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
              initialBookNameToSelect={initialBookFromQuery}
            />
            <div className="space-y-2">
              <Label htmlFor="eval-topic-input" className="text-left block">{translate('evalTopicPlaceholder')}</Label>
              <Textarea
                id="eval-topic-input"
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={translate('evalTopicPlaceholder')}
                className="text-base md:text-sm"
              />
            </div>
            <Button
              onClick={handleCreateEvaluation}
              disabled={aiIsLoading}
              className={cn(
                "w-full font-semibold py-3 text-base md:text-sm home-card-button-purple"
              )}
            >
              {aiIsLoading ? (
                <>{translate('loading')} {progress}%</>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  {translate('evalCreateBtn')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (aiIsLoading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md p-8 text-center shadow-xl">
                <div className="animate-pulse flex flex-col items-center space-y-4">
                    <ClipboardList className="w-16 h-16 text-muted-foreground/50" />
                    <p className="text-xl font-semibold text-muted-foreground">
                        {translate('evalGeneratingTitle', { defaultValue: "Generating Evaluation..." })}
                    </p>
                    <div className="w-3/4 h-4 bg-muted-foreground/20 rounded"></div>
                    <div className="w-1/2 h-4 bg-muted-foreground/20 rounded"></div>
                </div>
            </Card>
        </div>
    );
  }

  if (evaluationFinished && !showResultDialog) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-2xl font-bold font-headline">{evaluationTitle}</CardTitle>
          <CardDescription>
            {translate('evalReviewYourAnswers', { defaultValue: "Review your answers. Final Score:" })} {score} / {evaluationQuestions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {evaluationQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 border rounded-lg bg-card shadow">
              <p className="font-semibold mb-3 text-lg">
                {translate('evalQuestionLabel', { current: idx + 1, total: evaluationQuestions.length, defaultValue:"Question {{current}}/{{total}}" })}: {q.questionText}
              </p>
              {q.type === 'TRUE_FALSE' && (
                <div className="space-y-2 text-sm">
                  <p>{translate('evalYourAnswer', {defaultValue:"Your answer"})}: <span className={cn("font-medium", userAnswers[idx] === q.correctAnswer ? "text-green-600 dark:text-green-400" : "text-destructive")}>{userAnswers[idx] === null ? translate('evalNoAnswer', {defaultValue:"Not answered"}) : (userAnswers[idx] ? translate('evalTrue') : translate('evalFalse'))}</span></p>
                  <p>{translate('evalCorrectAnswer', {defaultValue:"Correct answer"})}: <span className="font-medium text-green-600 dark:text-green-400">{q.correctAnswer ? translate('evalTrue') : translate('evalFalse')}</span></p>
                </div>
              )}
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2 text-sm">
                   <p>{translate('evalYourAnswer', {defaultValue:"Your answer"})}: <span className={cn("font-medium", userAnswers[idx] === q.correctAnswerIndex ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                     {userAnswers[idx] === null ? translate('evalNoAnswer', {defaultValue:"Not answered"}) : q.options[userAnswers[idx] as number]}
                    </span></p>
                   <p>{translate('evalCorrectAnswer', {defaultValue:"Correct answer"})}: <span className="font-medium text-green-600 dark:text-green-400">{q.options[q.correctAnswerIndex]}</span></p>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground italic">{translate('evalExplanation', {defaultValue:"Explanation"})}: {q.explanation}</p>
            </div>
          ))}
           <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRepeatEvaluation} className="w-full sm:w-auto home-card-button-purple">
                {translate('evalRetakeButton', {defaultValue: "Retake Evaluation"})}
            </Button>
            <Button onClick={handleStartNewEvaluation} variant="outline" className="w-full sm:w-auto">
                {translate('evalNewEvaluationButton', {defaultValue: "New Evaluation"})}
            </Button>
           </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-2xl font-bold font-headline">{evaluationTitle}</CardTitle>
          <CardDescription className="flex items-center justify-center space-x-4">
            <span>{translate('evalQuestionProgress', { current: currentQuestionIndex + 1, total: evaluationQuestions.length })}</span>
            {evaluationStarted && !evaluationFinished && (
              <span className="font-mono text-base text-primary tabular-nums flex items-center">
                <Timer className="w-4 h-4 mr-1.5" />
                {translate('evalTimeLeft', { time: formatTime(timeLeft) })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 min-h-[250px] flex flex-col justify-between">
          {currentQuestion && (
            <div>
              <p className="text-lg font-medium mb-6 text-left md:text-center">{currentQuestion.questionText}</p>
              {currentQuestion.type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="ghost"
                    className={cn(
                        "py-3 text-base w-full",
                        userAnswers[currentQuestionIndex] === true ?
                        'home-card-button-purple' : 
                        'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20' 
                    )}
                    onClick={() => handleAnswerSelect(true)}
                  >
                    {translate('evalTrue')}
                  </Button>
                  <Button
                    variant="ghost"
                     className={cn(
                        "py-3 text-base w-full",
                        userAnswers[currentQuestionIndex] === false ?
                        'home-card-button-purple' : 
                        'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20' 
                    )}
                    onClick={() => handleAnswerSelect(false)}
                  >
                    {translate('evalFalse')}
                  </Button>
                </div>
              )}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className={cn(
                        "py-3 text-base justify-start text-left h-auto whitespace-normal w-full",
                        userAnswers[currentQuestionIndex] === index ?
                           'home-card-button-purple' : 
                           'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20' 
                      )}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                    </Button>
                  ))}
                </div>
              )}
              {currentQuestion.type === 'MULTIPLE_SELECTION' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground italic mb-4">
                    {translate('evalMultipleSelectionInstruction', {defaultValue: 'Selecciona todas las respuestas correctas:'})}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = Array.isArray(userAnswers[currentQuestionIndex]) && 
                                       (userAnswers[currentQuestionIndex] as number[]).includes(index);
                      return (
                        <Button
                          key={index}
                          variant="ghost"
                          className={cn(
                            "py-3 text-base justify-start text-left h-auto whitespace-normal w-full",
                            isSelected ?
                               'home-card-button-purple' : 
                               'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20' 
                          )}
                          onClick={() => handleMultipleSelectionToggle(index)}
                        >
                          <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span> 
                          <span className="mr-2">
                            {isSelected ? '✓' : '☐'}
                          </span>
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className={cn("flex mt-8", currentQuestionIndex > 0 ? "justify-between" : "justify-end")}>
            {currentQuestionIndex > 0 && (
              <Button variant="outline" onClick={handlePreviousQuestion} className="text-base py-3 px-6">
                <ChevronLeft className="w-5 h-5 mr-2" />
                {translate('evalPreviousButton')}
              </Button>
            )}
            {currentQuestionIndex < evaluationQuestions.length - 1 ? (
              <Button onClick={handleNextQuestion} className="text-base py-3 px-6 home-card-button-purple">
                {translate('evalNextButton')}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinishEvaluation} className="text-base py-3 px-6 bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700">
                <Award className="w-5 h-5 mr-2" />
                {translate('evalFinishButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="items-center text-center">
            <PartyPopper className="w-16 h-16 text-yellow-500 mb-3" />
            <AlertDialogTitle className="text-2xl font-headline">{translate('evalResultTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground mt-2">
              {translate('evalYourScore', { score: score, totalPoints: evaluationQuestions.length })}
            </AlertDialogDescription>
            {motivationalMessageKey && (
              <p className="mt-3 text-sm text-foreground text-center">
                {translate(motivationalMessageKey)}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={handleRepeatEvaluation} className="w-full home-card-button-purple">
                {translate('evalRepeatButton')}
            </Button>
            <Button onClick={handleCloseDialogAndShowReview} variant="outline" className="w-full">
                {translate('evalCloseButton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    
