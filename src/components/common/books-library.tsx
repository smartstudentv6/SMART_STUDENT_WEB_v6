"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, Eye, FileText } from 'lucide-react';
import { booksData, type Course, type Book } from '@/lib/books-data';

const courseNames = {
  '8vo-basico': '8vo Básico'
};

export default function BooksLibrary() {
  const [selectedCourse, setSelectedCourse] = useState<Course>('8vo-basico');

  const openPDF = (book: Book) => {
    if (book.pdfUrl) {
      window.open(book.pdfUrl, '_blank');
    } else {
      alert('PDF no disponible. Contacta al administrador.');
    }
  };

  const downloadPDF = (book: Book) => {
    if (book.pdfUrl) {
      const link = document.createElement('a');
      link.href = book.pdfUrl;
      link.download = `${book.title.replace(/\s+/g, '-')}.pdf`;
      link.click();
    } else {
      alert('PDF no disponible para descarga.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            📚 Biblioteca Digital
          </h1>
          <p className="text-muted-foreground text-sm">
            Accede a todos los libros digitales organizados por curso
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <Select value={selectedCourse} onValueChange={(value: Course) => setSelectedCourse(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Seleccionar curso" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(courseNames).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {booksData[selectedCourse].map((book) => (
          <Card key={book.id} className="flex flex-col h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <Badge variant="secondary" className="text-xs">{book.grade}</Badge>
              </div>
              <CardTitle className="text-base leading-tight">{book.title}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">{book.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0 flex-1 flex flex-col justify-between">
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>{book.pages} páginas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    book.pdfUrl ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {book.pdfUrl ? '✓ Disponible' : '⚠ No disponible'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => openPDF(book)}
                  className="flex-1"
                  variant="default"
                  size="sm"
                  disabled={!book.pdfUrl}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button 
                  onClick={() => downloadPDF(book)}
                  variant="outline"
                  size="sm"
                  disabled={!book.pdfUrl}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {booksData[selectedCourse].length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-muted-foreground">
            No hay libros disponibles para este curso
          </h3>
        </div>
      )}
    </div>
  );
}
