
"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAppData } from '@/contexts/app-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CourseData } from '@/lib/types';

interface BookCourseSelectorProps {
  onCourseChange: (course: string) => void;
  onBookChange: (book: string) => void;
  selectedCourse: string;
  selectedBook: string;
}

export function BookCourseSelector({ onCourseChange, onBookChange, selectedCourse, selectedBook }: BookCourseSelectorProps) {
  const { translate, language } = useLanguage();
  const { courses } = useAppData();
  const [booksForCourse, setBooksForCourse] = useState<string[]>([]);

  useEffect(() => {
    if (selectedCourse && courses[selectedCourse]) {
      setBooksForCourse(courses[selectedCourse][language] || []);
      onBookChange(''); // Reset book when course changes
    } else {
      setBooksForCourse([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, language, courses]); // onBookChange dependency removed to prevent infinite loop

  return (
    <>
      <Select onValueChange={onCourseChange} value={selectedCourse}>
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

    