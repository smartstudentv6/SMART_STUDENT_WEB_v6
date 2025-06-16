
"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClipboardList, PlayCircle, ChevronLeft, ChevronRight, PartyPopper, Award, AlertCircle } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { generateEvaluationContent, type EvaluationQuestion, type GenerateEvaluationInput } from '@/ai/flows/generate-evaluation-content'; 
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type UserAnswer = boolean | number | null; // boolean for T/F, number for MC index

export default function EvaluacionPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();

  // Setup state
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [topic, setTopic] = useState('');
  
  // Evaluation state
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  
  // Control state
  const [isLoading, setIsLoading] = useState(false);
  const [evaluationStarted, setEvaluationStarted] = useState(false);
  const [evaluationFinished, setEvaluationFinished] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [score, setScore] = useState(0);

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

    setIsLoading(true);
    setEvaluationStarted(false);
    setEvaluationFinished(false);
    setEvaluationQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);

    try {
      const result = await generateEvaluationContent({
        bookTitle: selectedBook,
        topic: trimmedTopic,
      });
      if (result && result.questions && result.questions.length === 3) { // Updated to 3 questions
        setEvaluationTitle(result.evaluationTitle);
        setEvaluationQuestions(result.questions);
        setEvaluationStarted(true);
      } else {
        throw new Error(translate('evalErrorGenerationFormat', {defaultValue: "AI did not return the 3 questions in the expected format."})); // Updated default value
      }
    } catch (error) {
      console.error("Error generating evaluation:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setEvaluationStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: UserAnswer) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < evaluationQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    evaluationQuestions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.type === 'TRUE_FALSE' && userAnswer === q.correctAnswer) {
        correctAnswers++;
      } else if (q.type === 'MULTIPLE_CHOICE' && userAnswer === q.correctAnswerIndex) {
        correctAnswers++;
      }
    });
    return correctAnswers;
  };

  const handleFinishEvaluation = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setEvaluationFinished(true);
    setShowResultDialog(true);
  };

  const handleRepeatEvaluation = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(Array(evaluationQuestions.length).fill(null));
    setEvaluationFinished(false);
    setShowResultDialog(false);
    setScore(0);
    // Optional: re-enable the evaluation setup to generate new questions
    // setEvaluationStarted(false); 
    // setEvaluationQuestions([]);
  };

  const handleCloseDialog = () => {
    setShowResultDialog(false);
    // User can review their answers if they close.
    // To reset completely:
    // setEvaluationStarted(false);
    // setEvaluationQuestions([]);
    // setTopic(''); // if desired
  };

  const currentQuestion = evaluationQuestions[currentQuestionIndex];

  if (!evaluationStarted) {
    return (
      <div className="flex flex-col items-center text-center">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="items-center">
            <ClipboardList className="w-10 h-10 text-custom-purple-800 dark:text-custom-purple-100 mb-3" />
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
              disabled={isLoading}
              className="w-full font-semibold py-3 text-base md:text-sm bg-custom-purple-100 text-custom-purple-800 hover:bg-custom-purple-100/80 dark:bg-custom-purple-800 dark:text-custom-purple-100 dark:hover:bg-custom-purple-800/90"
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
      </div>
    );
  }

  if (isLoading) {
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
    // Show review mode after closing dialog
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-2xl font-bold font-headline">{evaluationTitle}</CardTitle>
          <CardDescription>
            {translate('evalReviewYourAnswers', { defaultValue: "Review your answers. Score:" })} {score} / {evaluationQuestions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {evaluationQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 border rounded-lg bg-card">
              <p className="font-semibold mb-2">
                {translate('evalQuestionLabel', { current: idx + 1, total: evaluationQuestions.length })}: {q.questionText}
              </p>
              {q.type === 'TRUE_FALSE' && (
                <div className="space-y-1 text-sm">
                  <p>{translate('evalYourAnswer')}: <span className={cn(userAnswers[idx] === q.correctAnswer ? "text-green-600" : "text-destructive")}>{userAnswers[idx] ? translate('evalTrue') : translate('evalFalse')}</span></p>
                  <p>{translate('evalCorrectAnswer')}: <span className="font-medium">{q.correctAnswer ? translate('evalTrue') : translate('evalFalse')}</span></p>
                </div>
              )}
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1 text-sm">
                   <p>{translate('evalYourAnswer')}: <span className={cn(userAnswers[idx] === q.correctAnswerIndex ? "text-green-600" : "text-destructive")}>{q.options[userAnswers[idx] as number] || translate('evalNoAnswer')}</span></p>
                   <p>{translate('evalCorrectAnswer')}: <span className="font-medium">{q.options[q.correctAnswerIndex]}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{translate('evalExplanation')}: {q.explanation}</p>
                </div>
              )}
            </div>
          ))}
           <Button onClick={handleRepeatEvaluation} className="w-full mt-6 home-card-button-purple">
              {translate('evalRetakeButton', {defaultValue: "Retake Evaluation"})}
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-2xl font-bold font-headline">{evaluationTitle}</CardTitle>
          <CardDescription>
            {translate('evalQuestionProgress', { current: currentQuestionIndex + 1, total: evaluationQuestions.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 min-h-[250px] flex flex-col justify-between">
          {currentQuestion && (
            <div>
              <p className="text-lg font-medium mb-6 text-left md:text-center">{currentQuestion.questionText}</p>
              {currentQuestion.type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant={userAnswers[currentQuestionIndex] === true ? 'default': 'outline'}
                    className={cn(
                        "py-3 text-base",
                        userAnswers[currentQuestionIndex] === true ? 'bg-primary text-primary-foreground' : 'border-primary text-primary hover:bg-primary/10'
                    )}
                    onClick={() => handleAnswerSelect(true)}
                  >
                    {translate('evalTrue')}
                  </Button>
                  <Button
                    variant={userAnswers[currentQuestionIndex] === false ? 'default': 'outline'}
                     className={cn(
                        "py-3 text-base",
                        userAnswers[currentQuestionIndex] === false ? 'bg-primary text-primary-foreground' : 'border-primary text-primary hover:bg-primary/10'
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
                      variant={userAnswers[currentQuestionIndex] === index ? 'default' : 'outline'}
                      className={cn(
                        "py-3 text-base justify-start text-left h-auto whitespace-normal",
                         userAnswers[currentQuestionIndex] === index ? 'bg-primary text-primary-foreground' : 'border-primary text-primary hover:bg-primary/10'
                      )}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                    </Button>
                  ))}
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
            <p className="mt-3 text-sm text-foreground">
              {translate('evalMotivationalMessage1')}
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 grid grid-cols-2 gap-3">
            <Button onClick={handleRepeatEvaluation} className="w-full home-card-button-purple">
                {translate('evalRepeatButton')}
            </Button>
            <Button onClick={handleCloseDialog} variant="outline" className="w-full">
                {translate('evalCloseButton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

