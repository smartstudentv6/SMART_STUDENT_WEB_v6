
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Newspaper, Sparkles, Download, Network, FileQuestion, ClipboardList } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { generateSummary } from '@/ai/flows/generate-summary';
import { useToast } from "@/hooks/use-toast";

export default function ResumenPage() {
  const { translate, language: currentUiLanguage } = useLanguage();
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
        language: currentUiLanguage,
      });
      setSummaryResult({
        summary: result.summary, 
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

  const handleDownloadPdf = () => {
    if (!summaryResult) return;

    const title = `${translate('summaryTitlePrefix')} - ${currentTopicForDisplay.toUpperCase()}`;
    const summaryHtml = summaryResult.summary;

    let contentHtml = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
            body { font-family: 'Space Grotesk', sans-serif; margin: 25px; line-height: 1.6; }
            h1 { text-align: center; font-size: 1.5em; margin-bottom: 1em; }
            h2 { font-size: 1.2em; margin-top: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; }
            .summary-text { text-align: justify; }
            .summary-text p { margin-bottom: 0.5em; }
            .summary-text strong { font-weight: bold; }
            ul { list-style-type: disc; padding-left: 20px; }
            li { margin-bottom: 0.3em; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>${translate('summaryContentTitle')}</h2>
          <div class="summary-text">${summaryHtml}</div>
    `;

    if (keyPointsRequested && summaryResult.keyPoints && summaryResult.keyPoints.length > 0) {
      contentHtml += `<h2>${translate('summaryKeyPointsTitle')}</h2><ul>`;
      summaryResult.keyPoints.forEach(point => {
        contentHtml += `<li>${point}</li>`;
      });
      contentHtml += `</ul>`;
    }

    contentHtml += `
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(contentHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
          printWindow.print();
      }, 500);
    } else {
       toast({
        title: translate('errorGenerating'),
        description: translate('pdfDownloadErrorPopupBlocked'),
        variant: 'destructive',
      });
    }
  };


  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <Newspaper className="w-10 h-10 text-primary mb-3" />
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
              {translate('summaryIncludeKeyPointsShort')}
            </Label>
          </div>
          <Button
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className="w-full font-semibold py-3 text-base md:text-sm bg-primary hover:bg-primary/90"
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
              {translate('summaryTitlePrefix')} - {currentTopicForDisplay.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              dangerouslySetInnerHTML={{ __html: summaryResult.summary }} 
              className="prose dark:prose-invert max-w-none text-sm leading-relaxed font-headline text-justify" 
            />
            {keyPointsRequested && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 font-headline text-left">{translate('summaryKeyPointsTitle')}</h3>
                {summaryResult.keyPoints && summaryResult.keyPoints.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm font-headline text-left">
                    {summaryResult.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground font-headline text-left">{translate('summaryNoKeyPointsGenerated')}</p>
                )}
              </div>
            )}
             <div className="mt-8 pt-6 border-t border-border flex flex-wrap justify-center gap-3 sm:gap-4">
              <Button
                onClick={handleDownloadPdf}
                className="home-card-button home-card-button-green min-w-[190px] text-xs sm:text-sm"
              >
                <Download className="mr-2 h-4 w-4" /> {translate('summaryActionDownloadPdf')}
              </Button>
              <Button asChild className="home-card-button home-card-button-yellow min-w-[190px] text-xs sm:text-sm">
                <Link href="/dashboard/mapa-mental">
                  <Network className="mr-2 h-4 w-4" /> {translate('summaryActionCreateMap')}
                </Link>
              </Button>
              <Button asChild className="home-card-button home-card-button-cyan min-w-[190px] text-xs sm:text-sm">
                <Link href="/dashboard/cuestionario">
                  <FileQuestion className="mr-2 h-4 w-4" /> {translate('summaryActionCreateQuiz')}
                </Link>
              </Button>
              <Button asChild className="home-card-button home-card-button-purple min-w-[190px] text-xs sm:text-sm">
                <Link href="/dashboard/evaluacion">
                  <ClipboardList className="mr-2 h-4 w-4" /> {translate('summaryActionCreateEval')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    