
"use client";

import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Newspaper, Sparkles } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { generateSummary } from '@/ai/flows/generate-summary';
import { useToast } from "@/hooks/use-toast";

export default function ResumenPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [topic, setTopic] = useState('');
  const [includeKeyPoints, setIncludeKeyPoints] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{ summary: string; keyPoints?: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [keyPointsRequested, setKeyPointsRequested] = useState(false);
  const [currentTopicForDisplay, setCurrentTopicForDisplay] = useState('');

  const handleGenerateSummary = async () => {
    if (!selectedBook) {
      toast({ title: translate('errorGenerating'), description: translate('noBookSelected'), variant: 'destructive'});
      return;
    }
    if (!topic.trim()) {
      toast({ title: translate('errorGenerating'), description: translate('noTopicProvided'), variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setSummaryResult(null);
    setKeyPointsRequested(includeKeyPoints); 
    const topicForSummary = topic.trim() || "General Summary";
    setCurrentTopicForDisplay(topicForSummary); 

    try {
      const result = await generateSummary({
        bookTitle: selectedBook,
        topic: topicForSummary,
        includeKeyPoints: includeKeyPoints,
      });
      setSummaryResult({
        summary: result.summary.replace(/\n/g, '<br />'),
        keyPoints: result.keyPoints
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setSummaryResult({ summary: `<p class="text-destructive">${translate('errorGenerating')}</p>` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <Newspaper className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">{translate('summaryPageTitle')}</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-2xl">
            {translate('summaryPageSub')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BookCourseSelector
            selectedCourse={selectedCourse}
            selectedBook={selectedBook}
            onCourseChange={setSelectedCourse}
            onBookChange={(book) => {
              setSelectedBook(book);
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="summary-topic-input" className="text-left block">{translate('summaryTopicPlaceholder')}</Label>
            <Textarea
              id="summary-topic-input"
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={translate('summaryTopicPlaceholder')}
              className="text-base md:text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-key-points"
              checked={includeKeyPoints}
              onCheckedChange={(checked) => setIncludeKeyPoints(Boolean(checked))}
            />
            <Label htmlFor="include-key-points" className="text-sm font-medium">
              {translate('summaryIncludeKeyPoints')}
            </Label>
          </div>
          <Button
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className="w-full font-semibold py-3 text-base md:text-sm"
          >
            {isLoading ? (
              <>{translate('loading')}...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {translate('summaryGenerateBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="mt-6 text-lg text-muted-foreground animate-pulse">{translate('generatingSummary')}</p>
      )}

      {summaryResult && !isLoading && (
        <Card className="mt-6 w-full max-w-lg text-left shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-center">
              SUMMARY - {currentTopicForDisplay.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: summaryResult.summary }} className="prose dark:prose-invert max-w-none text-sm leading-relaxed" />
            {keyPointsRequested && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 font-headline">{translate('summaryKeyPointsTitle')}</h3>
                {summaryResult.keyPoints && summaryResult.keyPoints.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {summaryResult.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{translate('summaryNoKeyPointsGenerated')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
