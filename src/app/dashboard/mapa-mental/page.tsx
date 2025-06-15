
"use client";

import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Network, Sparkles } from 'lucide-react';
import { BookCourseSelector } from '@/components/common/book-course-selector';
import { createMindMap } from '@/ai/flows/create-mind-map';
import { useToast } from "@/hooks/use-toast";

export default function MapaMentalPage() {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [centralTheme, setCentralTheme] = useState('');
  const [isHorizontal, setIsHorizontal] = useState(false); // This option is UI only, AI doesn't use it
  const [mindMapResult, setMindMapResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateMap = async () => {
     if (!selectedBook) {
      toast({ title: translate('errorGenerating'), description: translate('noBookSelected'), variant: 'destructive'});
      return;
    }
    if (!centralTheme.trim()) {
      toast({ title: translate('errorGenerating'), description: translate('noTopicProvided'), variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setMindMapResult('');
    try {
      // For mind map, bookContent could be fetched or a placeholder.
      // The AI flow expects 'bookContent'. We'll send a placeholder or selectedBook title.
      const result = await createMindMap({
        centralTheme: centralTheme,
        bookContent: `Content from the book: ${selectedBook}. Focus on the theme: ${centralTheme}.`, // Simplified input
      });
      // Mind map is text based, format for display
      setMindMapResult(`<pre class="whitespace-pre-wrap">${result.mindMap}</pre>`);
    } catch (error) {
      console.error("Error generating mind map:", error);
      toast({ title: translate('errorGenerating'), description: (error as Error).message, variant: 'destructive'});
      setMindMapResult(`<p class="text-destructive">${translate('errorGenerating')}</p>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <Network className="w-10 h-10 text-yellow-500 dark:text-yellow-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">{translate('mapPageTitle')}</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-2xl">
            {translate('mapPageSub')}
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
            value={centralTheme}
            onChange={(e) => setCentralTheme(e.target.value)}
            placeholder={translate('mapCentralThemePlaceholder')}
            className="text-base md:text-sm"
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="horizontal-orientation"
              checked={isHorizontal}
              onCheckedChange={(checked) => setIsHorizontal(Boolean(checked))}
            />
            <Label htmlFor="horizontal-orientation" className="text-sm font-medium">
              {translate('mapHorizontalOrientation')}
            </Label>
          </div>
          <Button
            onClick={handleGenerateMap}
            disabled={isLoading}
            className="w-full font-semibold py-3 text-base md:text-sm bg-yellow-500 hover:bg-yellow-600 dark:bg-custom-yellow-800 dark:text-custom-yellow-100 dark:hover:bg-yellow-700"
          >
            {isLoading ? (
              <>{translate('loading')}...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {translate('mapGenerateBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
         <p className="mt-6 text-lg text-muted-foreground animate-pulse">{translate('generatingMindMap')}</p>
      )}

      {mindMapResult && !isLoading && (
        <Card className="mt-6 w-full max-w-lg text-left shadow-md">
           <CardHeader>
            <CardTitle className="font-headline">{translate('mindMapResultTitle', {defaultValue: "Generated Mind Map"})}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: mindMapResult }} className="prose dark:prose-invert max-w-none text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    