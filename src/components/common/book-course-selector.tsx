
"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAppData } from '@/contexts/app-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CourseData } from '@/lib/types';

interface BookCourseSelectorProps {
  onCourseChange: (course: string) => void;
  onBookChange: (book: string) => void;
  selectedCourse: string;
  selectedBook: string;
  initialBookNameToSelect?: string; // New optional prop
}

export function BookCourseSelector({ 
  onCourseChange, 
  onBookChange, 
  selectedCourse, 
  selectedBook, 
  initialBookNameToSelect 
}: BookCourseSelectorProps) {
  const { translate, language } = useLanguage();
  const { courses } = useAppData();
  const { getAccessibleCourses, hasAccessToCourse, isAdmin, user, isLoading } = useAuth();
  const [booksForCourse, setBooksForCourse] = useState<string[]>([]);

  // Early return if loading or no user
  if (isLoading || !user) {
    return (
      <div className="space-y-3">
        <div className="h-12 bg-muted animate-pulse rounded-md"></div>
        <div className="h-12 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  // Filtrar cursos basado en permisos del usuario
  const isUserAdmin = isAdmin();
  const userAccessibleCourses = getAccessibleCourses();
  const accessibleCourses = isUserAdmin ? Object.keys(courses || {}) : (userAccessibleCourses || []);
  const filteredCourses = Object.keys(courses || {}).filter(course => 
    Array.isArray(accessibleCourses) && accessibleCourses.includes(course)
  );

  useEffect(() => {
    if (selectedCourse && courses[selectedCourse] && hasAccessToCourse(selectedCourse)) {
      const newBooks = courses[selectedCourse][language] || [];
      setBooksForCourse(newBooks);
      if (initialBookNameToSelect && newBooks.includes(initialBookNameToSelect)) {
        onBookChange(initialBookNameToSelect);
      } else {
        // Only reset if not trying to set an initial book or if course itself changed significantly
        // This condition might need refinement if initialBookNameToSelect should persist across course changes that still contain it
        if (!initialBookNameToSelect || selectedBook && !newBooks.includes(selectedBook) ) {
             onBookChange('');
        }
      }
    } else {
      setBooksForCourse([]);
      onBookChange(''); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, language, courses, initialBookNameToSelect, hasAccessToCourse]); // añadido hasAccessToCourse

  return (
    <>
      <Select onValueChange={onCourseChange} value={selectedCourse}>
        <SelectTrigger className="w-full py-3 text-base md:text-sm">
          <SelectValue placeholder={translate('selectCourse')} />
        </SelectTrigger>
        <SelectContent>
          {filteredCourses.map(courseName => (
            <SelectItem key={courseName} value={courseName}>
              {courseName.replace(/Básico/g, 'Básico').replace(/Medio/g, 'Medio')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={onBookChange} value={selectedBook} disabled={!selectedCourse || booksForCourse.length === 0}>
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
    </>
  );
}
    
