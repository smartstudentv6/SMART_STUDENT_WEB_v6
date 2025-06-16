
"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Library } from 'lucide-react';
import type { CourseData } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function LibrosPage() {
  const { translate, language } = useLanguage();
  const { courses } = useAppData();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [booksForCourse, setBooksForCourse] = useState<string[]>([]);

  useEffect(() => {
    if (selectedCourse && courses[selectedCourse]) {
      setBooksForCourse(courses[selectedCourse][language] || []);
      setSelectedBook(''); // Reset book selection when course changes
    } else {
      setBooksForCourse([]);
    }
  }, [selectedCourse, language, courses]);

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
  };

  const handleBookChange = (value: string) => {
    setSelectedBook(value);
  };

  const handleDownloadPdf = () => {
    const cienciasNaturalesEs = "Ciencias Naturales";
    const cienciasNaturalesEn = "Natural Sciences";
    const googleDriveLink = "https://drive.google.com/file/d/11CRuh_h2pNqYdOsWadQMXicjKAp9VimH/view";

    if (
      selectedCourse === "8vo Básico" &&
      (selectedBook === cienciasNaturalesEs || selectedBook === cienciasNaturalesEn)
    ) {
      window.open(googleDriveLink, '_blank');
    } else {
      alert(`${translate('downloadPDF')} for ${selectedBook} (Not implemented for this book)`);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center">
          <Library className="w-10 h-10 text-green-500 dark:text-green-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">{translate('digitalLibraryTitle')}</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-xl">
            {translate('digitalLibrarySub')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select onValueChange={handleCourseChange} value={selectedCourse}>
            <SelectTrigger className="w-full py-3 text-base md:text-sm">
              <SelectValue placeholder={translate('selectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(courses).map(courseName => (
                <SelectItem key={courseName} value={courseName}>
                  {courseName.replace(/Básico/g, 'Básico').replace(/Medio/g, 'Medio')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleBookChange} value={selectedBook} disabled={!selectedCourse || booksForCourse.length === 0}>
            <SelectTrigger className="w-full py-3 text-base md:text-sm">
              <SelectValue placeholder={translate('selectBook')} />
            </SelectTrigger>
            <SelectContent>
              {booksForCourse.map(bookName => (
                <SelectItem key={bookName} value={bookName}>
                  {bookName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadPdf}
            disabled={!selectedBook}
            variant={selectedBook ? 'default' : 'secondary'}
            className={cn(
              "w-full font-semibold py-3 text-base md:text-sm",
              selectedBook && 
                "bg-[hsl(var(--custom-green-solid-bg-light))] text-[hsl(var(--custom-green-solid-fg-light))] dark:bg-[hsl(var(--custom-green-solid-bg-dark))] dark:text-[hsl(var(--custom-green-solid-fg-dark))] hover:bg-[hsl(var(--custom-green-solid-bg-light))]/90 dark:hover:bg-[hsl(var(--custom-green-solid-bg-dark))]/90",
              "hover:brightness-110 hover:shadow-lg hover:scale-105 transition-all duration-200"
            )}
          >
            {translate('downloadPDF')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
