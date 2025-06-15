
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
  const [bookContentInput, setBookContentInput] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    setSummaryResult('');
    try {
      const result = await generateSummary({
        bookTitle: selectedBook,
        topic: topic,
        includeKeywords: includeKeywords,
        bookContent: bookContentInput.trim() || undefined,
      });
      setSummaryResult(result.summary.replace(/\n/g, '<br />'));
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setSummaryResult(`<p class="text-destructive">${translate('errorGenerating')}</p>`);
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
            onBookChange={setSelectedBook}
          />
          <div className="space-y-2">
            <Label htmlFor="summary-topic-input" className="text-left block">{translate('summaryTopicPlaceholder')}</Label>
            <Textarea
              id="summary-topic-input"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={translate('summaryTopicPlaceholder')}
              className="text-base md:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary-book-content-input" className="text-left block">{translate('summaryBookContentPlaceholder')}</Label>
            <Textarea
              id="summary-book-content-input"
              rows={5}
              value={bookContentInput}
              onChange={(e) => setBookContentInput(e.target.value)}
              placeholder={translate('summaryBookContentPlaceholderOptional')}
              className="text-base md:text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-keywords"
              checked={includeKeywords}
              onCheckedChange={(checked) => setIncludeKeywords(Boolean(checked))}
            />
            <Label htmlFor="include-keywords" className="text-sm font-medium">
              {translate('summaryIncludeKeywords')}
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
            <CardTitle className="font-headline">{translate('summaryResultTitle', {defaultValue: "Generated Summary"})}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: summaryResult }} className="prose dark:prose-invert max-w-none" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
