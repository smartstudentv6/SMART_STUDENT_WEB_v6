
"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Library, Download, Book, FileText } from 'lucide-react';
import { bookPDFs, getPDFUrl, getDriveId, getSubjectsForCourse } from '@/lib/books-data';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

export default function LibrosPage() {
  const { translate, language } = useLanguage();
  const { courses } = useAppData();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Get available courses that have PDFs
  const availableCourses = [...new Set(bookPDFs.map(book => book.course))];

  useEffect(() => {
    if (selectedCourse) {
      const subjects = getSubjectsForCourse(selectedCourse);
      setAvailableSubjects(subjects);
      setSelectedSubject(''); // Reset subject selection when course changes
    } else {
      setAvailableSubjects([]);
    }
  }, [selectedCourse]);

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
  };

  const handleDownloadPdf = () => {
    if (!selectedCourse || !selectedSubject) {
      toast({
        title: translate('errorGenerating'),
        description: 'Por favor selecciona un curso y una materia',
        variant: 'destructive'
      });
      return;
    }

    const pdfUrl = getPDFUrl(selectedCourse, selectedSubject);
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      toast({
        title: 'PDF Abierto',
        description: `Abriendo ${selectedSubject} - ${selectedCourse}`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'PDF no encontrado',
        description: 'No se encontró el PDF para esta selección',
        variant: 'destructive'
      });
    }
  };



  // Get current book info
  const currentBook = bookPDFs.find(book => 
    book.course === selectedCourse && book.subject === selectedSubject
  );

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="items-center">
          <Library className="w-10 h-10 text-green-500 dark:text-green-400 mb-3" />
          <CardTitle className="text-3xl font-bold font-headline">
            {translate('digitalLibraryTitle')}
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground max-w-xl">
            {translate('digitalLibrarySub')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-left block">Seleccionar Curso</label>
            <Select onValueChange={handleCourseChange} value={selectedCourse}>
              <SelectTrigger className="w-full py-3 text-base md:text-sm">
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map(courseName => (
                  <SelectItem key={courseName} value={courseName}>
                    {courseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-left block">Seleccionar Materia</label>
            <Select 
              onValueChange={handleSubjectChange} 
              value={selectedSubject} 
              disabled={!selectedCourse || availableSubjects.length === 0}
            >
              <SelectTrigger className="w-full py-3 text-base md:text-sm">
                <SelectValue placeholder="Selecciona una materia" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map(subjectName => (
                  <SelectItem key={subjectName} value={subjectName}>
                    {subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentBook && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Book className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">{currentBook.title}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {currentBook.course}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentBook.subject}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleDownloadPdf}
              disabled={!selectedSubject}
              className={cn(
                "w-full font-semibold py-3 text-base md:text-sm home-card-button-green",
                "hover:brightness-110 hover:shadow-lg hover:scale-105 transition-all duration-200"
              )}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Biblioteca Digital
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{availableCourses.length}</div>
              <div className="text-sm text-muted-foreground">Cursos Disponibles</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{bookPDFs.length}</div>
              <div className="text-sm text-muted-foreground">Libros PDF</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
