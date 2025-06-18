
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Library, Download, Book, FileText, Search, GraduationCap, Filter } from 'lucide-react';
import { bookPDFs, BookPDF } from '@/lib/books-data';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

export default function LibrosPage() {
  const { translate, language } = useLanguage();
  const { courses } = useAppData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Group books by course
  const booksByCourse = useMemo(() => {
    const grouped = bookPDFs.reduce((acc, book) => {
      if (!acc[book.course]) {
        acc[book.course] = [];
      }
      acc[book.course].push(book);
      return acc;
    }, {} as Record<string, BookPDF[]>);

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const filteredGrouped: Record<string, BookPDF[]> = {};
      Object.entries(grouped).forEach(([course, books]) => {
        const filteredBooks = books.filter(book => 
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.course.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filteredBooks.length > 0) {
          filteredGrouped[course] = filteredBooks;
        }
      });
      return filteredGrouped;
    }

    return grouped;
  }, [searchQuery]);

  const handleDownloadPdf = (book: BookPDF) => {
    window.open(book.pdfUrl, '_blank');
    toast({
      title: 'PDF Abierto',
      description: `Abriendo ${book.title}`,
      variant: 'default'
    });
  };

  const totalBooks = bookPDFs.length;
  const totalCourses = Object.keys(booksByCourse).length;
  const filteredBooks = Object.values(booksByCourse).flat().length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Library className="w-12 h-12 text-green-500 dark:text-green-400" />
        </div>
        <h1 className="text-4xl font-bold font-headline mb-2">
          {translate('digitalLibraryTitle')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {translate('digitalLibrarySub')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar libros, materias o cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-3 text-base"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCourses}</div>
              <div className="text-sm text-muted-foreground">Cursos Disponibles</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalBooks}</div>
              <div className="text-sm text-muted-foreground">Total Libros PDF</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{filteredBooks}</div>
              <div className="text-sm text-muted-foreground">Libros Mostrados</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Books by Course */}
      <div className="space-y-8">
        {Object.entries(booksByCourse).length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron libros</h3>
            <p className="text-muted-foreground">
              No hay libros que coincidan con tu búsqueda "{searchQuery}"
            </p>
          </div>
        ) : (
          Object.entries(booksByCourse).map(([course, books]) => (
            <div key={course} className="space-y-4">
              {/* Course Title */}
              <div className="flex items-center gap-3 mb-6">
                <GraduationCap className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-foreground">{course}</h2>
                <Badge variant="secondary" className="ml-auto">
                  {books.length} {books.length === 1 ? 'libro' : 'libros'}
                </Badge>
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {books.map((book, index) => (
                  <Card key={`${book.course}-${book.subject}-${index}`} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-2">
                        <Book className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                            {book.title}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {book.subject}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <Badge variant="outline" className="text-xs">
                          {book.course}
                        </Badge>
                        <Button
                          onClick={() => handleDownloadPdf(book)}
                          className={cn(
                            "w-full font-semibold text-sm home-card-button-green",
                            "hover:brightness-110 hover:shadow-lg hover:scale-105 transition-all duration-200"
                          )}
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
