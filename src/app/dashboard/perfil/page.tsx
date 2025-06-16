
"use client";

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCircle, BarChart3, History as HistoryIcon, Download, Trash2, Edit3 } from 'lucide-react';
import type { UserProfile, SubjectProgress, EvaluationHistoryItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

// Mock Data - UserProfile remains mock for now
const userProfileData: UserProfile = {
  name: "Felipe",
  levelKey: "profileLevelValue",
  activeCoursesKey: "profileCourse8thGradeValue", // Updated key
  subjects: [
    { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
    { tag: "CIE", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
    { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" }, // Updated color class
    { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" }, // Added Language
  ],
  evaluationsCompleted: 0, // This will be updated by history length
};

// Template for learning stats structure with specific subject colors (now gradients)
const learningStatsTemplate: SubjectProgress[] = [
  { nameKey: "subjectMath", progress: 0, colorClass: "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" },
  { nameKey: "subjectScience", progress: 0, colorClass: "bg-gradient-to-r from-green-400 via-green-500 to-green-600" },
  { nameKey: "subjectHistory", progress: 0, colorClass: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" }, // Using amber for brownish
  { nameKey: "subjectLanguage", progress: 0, colorClass: "bg-gradient-to-r from-red-400 via-red-500 to-red-600" },
];

// Template for profile stats cards
const profileStatsCardsTemplate = [
    { value: "0", labelKey: "statEvals", colorClass: "bg-purple-500 dark:bg-purple-600" }, 
    { value: "0%", labelKey: "statAvgScore", colorClass: "bg-green-500 dark:bg-green-600" }, 
    { value: "0", labelKey: "statSummaries", colorClass: "bg-blue-500 dark:bg-blue-600" },
    { value: "0", labelKey: "statMaps", colorClass: "bg-yellow-500 dark:bg-yellow-600" },
    { value: "0", labelKey: "statQuizzes", colorClass: "bg-cyan-500 dark:bg-cyan-600" },
];


export default function PerfilPage() {
  const { translate, language } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [dynamicLearningStats, setDynamicLearningStats] = useState<SubjectProgress[]>(learningStatsTemplate);
  const [dynamicProfileCards, setDynamicProfileCards] = useState(profileStatsCardsTemplate);

  useEffect(() => {
    const storedHistoryString = localStorage.getItem('evaluationHistory');
    if (storedHistoryString) {
      try {
        const storedHistory: EvaluationHistoryItem[] = JSON.parse(storedHistoryString);
        setEvaluationHistory(storedHistory);
      } catch (error) {
        console.error("Failed to parse evaluation history from localStorage:", error);
        setEvaluationHistory([]); 
      }
    }
     // Load counts for summaries, maps, and quizzes
    const summariesCount = localStorage.getItem('summariesCreatedCount') || '0';
    const mapsCount = localStorage.getItem('mapsCreatedCount') || '0';
    const quizzesCount = localStorage.getItem('quizzesCreatedCount') || '0';


    setDynamicProfileCards(prevCards => prevCards.map(card => {
        if (card.labelKey === "statSummaries") return { ...card, value: summariesCount };
        if (card.labelKey === "statMaps") return { ...card, value: mapsCount };
        if (card.labelKey === "statQuizzes") return { ...card, value: quizzesCount };
        return card;
    }));

  }, []);

  useEffect(() => {
    const subjectMappings: Record<string, { es: string[], en: string[] }> = {
      subjectScience: {
        es: ["Ciencias", "Ciencias Naturales", "Biología", "Física", "Química", "Ciencias para la Ciudadanía"],
        en: ["Science", "Natural Sciences", "Biology", "Physics", "Chemistry", "Science for Citizenship"]
      },
      subjectHistory: {
        es: ["Historia", "Historia, Geografía y Ciencias Sociales", "Educación Ciudadana", "Filosofía"],
        en: ["History", "History, Geography and Social Sciences", "Civic Education", "Philosophy"]
      },
      subjectLanguage: {
        es: ["Lenguaje", "Lenguaje y Comunicación", "Lengua y Literatura"],
        en: ["Language", "Language and Communication", "Language and Literature"]
      },
      subjectMath: {
        es: ["Matemáticas"],
        en: ["Mathematics"]
      }
    };

    const newLearningStats = learningStatsTemplate.map(statTemplate => {
      const categoryKey = statTemplate.nameKey;
      let subjectEvaluations: EvaluationHistoryItem[] = [];

      if (subjectMappings[categoryKey]) {
        const currentLangSubjectNames = subjectMappings[categoryKey][language] || [];
        const otherLang = language === 'es' ? 'en' : 'es';
        const otherLangSubjectNames = subjectMappings[categoryKey][otherLang] || [];
        
        const titlesToMatch = [
          ...currentLangSubjectNames,
          ...otherLangSubjectNames
        ].map(title => title.toLowerCase());

        subjectEvaluations = evaluationHistory.filter(histItem => 
          titlesToMatch.includes(histItem.bookTitle.toLowerCase())
        );
      }
      
      let maxPercentage = 0;
      if (subjectEvaluations.length > 0) {
        subjectEvaluations.forEach(ev => {
          const percentage = ev.totalQuestions > 0 ? (ev.score / ev.totalQuestions) * 100 : 0;
          if (percentage > maxPercentage) {
            maxPercentage = percentage;
          }
        });
      }
      return {
        ...statTemplate, 
        progress: Math.round(maxPercentage),
      };
    });
    setDynamicLearningStats(newLearningStats);

    let totalScoreSum = 0;
    let totalPossibleScoreSum = 0;
    evaluationHistory.forEach(item => {
      totalScoreSum += item.score;
      totalPossibleScoreSum += item.totalQuestions;
    });
    const averageScorePercentage = totalPossibleScoreSum > 0 
      ? Math.round((totalScoreSum / totalPossibleScoreSum) * 100) 
      : 0;
    
    const summariesCount = localStorage.getItem('summariesCreatedCount') || '0';
    const mapsCount = localStorage.getItem('mapsCreatedCount') || '0';
    const quizzesCount = localStorage.getItem('quizzesCreatedCount') || '0';


    const newProfileCards = profileStatsCardsTemplate.map(card => {
      if (card.labelKey === "statEvals") {
        return { ...card, value: evaluationHistory.length.toString() };
      }
      if (card.labelKey === "statAvgScore") {
        return { ...card, value: `${averageScorePercentage}%` };
      }
      if (card.labelKey === "statSummaries") {
        return { ...card, value: summariesCount };
      }
      if (card.labelKey === "statMaps") {
        return { ...card, value: mapsCount };
      }
      if (card.labelKey === "statQuizzes") {
        return { ...card, value: quizzesCount };
      }
      return card; 
    });
    setDynamicProfileCards(newProfileCards);

  }, [evaluationHistory, language, translate]);


  const handleDeleteHistory = () => {
    localStorage.removeItem('evaluationHistory');
    localStorage.removeItem('summariesCreatedCount'); 
    localStorage.removeItem('mapsCreatedCount'); 
    localStorage.removeItem('quizzesCreatedCount');
    setEvaluationHistory([]); 
    setCurrentPage(1);

    // Update profile cards immediately
    setDynamicProfileCards(prevCards => prevCards.map(card => {
        if (card.labelKey === "statEvals") return { ...card, value: "0" };
        if (card.labelKey === "statAvgScore") return { ...card, value: "0%" };
        if (card.labelKey === "statSummaries") return { ...card, value: "0" };
        if (card.labelKey === "statMaps") return { ...card, value: "0" };
        if (card.labelKey === "statQuizzes") return { ...card, value: "0" };
        return card;
    }));

    toast({ 
        title: translate('historyDeletedTitle'), 
        description: translate('historyDeletedDesc') 
    });
  };

  const handleDownloadHistoryXlsx = () => {
    if (evaluationHistory.length === 0) {
        toast({
            title: translate('historyEmptyTitle'),
            description: translate('historyEmptyDesc'),
            variant: "default"
        });
        return;
    }

    const headers = [
        translate('tableDate'),
        translate('tableCourse'),
        translate('tableBook'),
        translate('tableTopic'),
        translate('tableGrade') + " (%)",
        translate('tablePoints')
    ];

    const dataForSheet = evaluationHistory.map(item => {
        const gradePercentage = item.totalQuestions > 0 ? Math.round((item.score / item.totalQuestions) * 100) : 0;
        const points = `${item.score}/${item.totalQuestions}`;
        return [
            item.date,
            item.courseName,
            item.bookTitle,
            item.topic,
            gradePercentage, 
            points
        ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataForSheet]);
    
    const columnWidths = [
      {wch: 20}, // Date
      {wch: 20}, // Course
      {wch: 30}, // Book
      {wch: 30}, // Topic
      {wch: 10}, // Grade
      {wch: 10}  // Points
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Evaluaciones");

    XLSX.writeFile(wb, "historial_evaluaciones_scholarai.xlsx");
  };

  const handleRepasar = (item: EvaluationHistoryItem) => {
    router.push(`/dashboard/evaluacion?course=${encodeURIComponent(item.courseName)}&book=${encodeURIComponent(item.bookTitle)}&topic=${encodeURIComponent(item.topic)}`);
  };
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = evaluationHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(evaluationHistory.length / itemsPerPage);


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <UserCircle className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl font-headline">{translate('profilePersonalTitle')}</CardTitle>
          </div>
          <CardDescription>{translate('profilePersonalSub')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md">
              <span className="text-5xl font-bold text-primary-foreground">{userProfileData.name.charAt(0)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 flex-grow text-sm">
              <div><strong>{translate('profileName')}</strong> {userProfileData.name}</div>
              <div><strong>{translate('profileLevel')}</strong> {translate(userProfileData.levelKey)}</div>
              <div><strong>{translate('profileCourses')}</strong> {translate(userProfileData.activeCoursesKey)}</div>
              <div>
                <strong>{translate('profileSubjects')}</strong>
                <div className="inline-flex gap-2 ml-2">
                  {userProfileData.subjects.map(subject => (
                    <span key={subject.tag} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${subject.colorClass}`}>
                      {subject.tag}
                    </span>
                  ))}
                </div>
              </div>
              <div><strong>{translate('profileEvalsCompleted')}</strong> {evaluationHistory.length}</div>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm"><Edit3 className="mr-2 h-4 w-4" />{translate('profileChangePass')}</Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="bg-custom-yellow-100 text-custom-yellow-800 hover:bg-custom-yellow-100/80 dark:bg-custom-yellow-800 dark:text-custom-yellow-100"
                onClick={handleDownloadHistoryXlsx}
            >
              <Download className="mr-2 h-4 w-4" />{translate('profileDownloadHistory')}
            </Button>
            <Button 
                variant="destructive" 
                size="sm" 
                className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-700/30 dark:text-red-300 dark:hover:bg-red-700/40"
                onClick={handleDeleteHistory}
            >
              <Trash2 className="mr-2 h-4 w-4" />{translate('profileDeleteHistory')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl font-headline">{translate('profileStatsTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-4 text-lg font-headline">{translate('profileProgressBySub')}</h3 >
          <div className="space-y-4 text-sm">
            {dynamicLearningStats.map(stat => (
              <div key={stat.nameKey} className="flex items-center gap-4">
                <span className="w-28 shrink-0">{translate(stat.nameKey)}</span>
                <Progress value={stat.progress} className="w-full h-3" indicatorClassName={stat.colorClass} />
                <span className="w-12 text-right">{stat.progress}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          {dynamicProfileCards.map(stat => ( 
            <Card 
              key={stat.labelKey} 
              className={cn(
                stat.colorClass, 
                "text-card-foreground", // Changed from text-primary-foreground
                "shadow-md", 
                "hover:shadow-lg", 
                "hover:brightness-110", 
                "transition-all", 
                "duration-200",
                "cursor-pointer"
               )}
            >
                <CardContent className="p-4">
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm opacity-90">{translate(stat.labelKey)}</div>
                </CardContent>
            </Card>
          ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <HistoryIcon className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl font-headline">{translate('historyTitle')}</CardTitle>
          </div>
          <CardDescription>{translate('historySub')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate('tableDate')}</TableHead>
                  <TableHead>{translate('tableCourse')}</TableHead>
                  <TableHead>{translate('tableBook')}</TableHead>
                  <TableHead>{translate('tableTopic')}</TableHead>
                  <TableHead>{translate('tableGrade')}</TableHead>
                  <TableHead>{translate('tablePoints')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell>{item.bookTitle}</TableCell>
                      <TableCell>{item.topic}</TableCell>
                      <TableCell>
                        {item.totalQuestions > 0 ? 
                          `${Math.round((item.score / item.totalQuestions) * 100)}%` : 
                          'N/A'}
                      </TableCell>
                      <TableCell>
                        {`${item.score}/${item.totalQuestions}`}
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => handleRepasar(item)}>{translate('tableReview')}</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {translate('historyNoData', { defaultValue: "No evaluation history yet."})}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                {translate('paginationPrevious', { defaultValue: 'Previous' })}
              </Button>
              <span className="text-sm text-muted-foreground">
                {translate('paginationPageInfo', { currentPage: currentPage, totalPages: totalPages, defaultValue: `Page ${currentPage} of ${totalPages}` })}
              </span>
              <Button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                {translate('paginationNext', { defaultValue: 'Next' })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    

    
