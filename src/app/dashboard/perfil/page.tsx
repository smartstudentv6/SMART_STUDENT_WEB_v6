
"use client";

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCircle, BarChart3, History as HistoryIcon, Download, Trash2, Edit3 } from 'lucide-react';
import type { UserProfile, SubjectProgress, EvaluationHistoryItem } from '@/lib/types';
import { useEffect, useState } from 'react';

// Mock Data - This would typically come from a backend or state management
const userProfileData: UserProfile = {
  name: "Felipe",
  levelKey: "profileLevelValue", // "Estudiante Avanzado"
  activeCoursesKey: "profileCoursesValue", // "Nivel Básico"
  subjects: [
    { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
    { tag: "CIEN", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
    { tag: "HIST", nameKey: "subjectHistory", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
  ],
  evaluationsCompleted: 33, // This will be dynamically updated later if needed
};

const learningStatsData: SubjectProgress[] = [
  { nameKey: "subjectMath", progress: 0, colorClass: "bg-primary/30" },
  { nameKey: "subjectScience", progress: 47, colorClass: "bg-green-500" },
  { nameKey: "subjectHistory", progress: 0, colorClass: "bg-primary/30" },
  { nameKey: "subjectLanguage", progress: 0, colorClass: "bg-primary/30" },
];

const profileStatsCardsData = [
    { value: "33", labelKey: "statEvals", colorClass: "bg-blue-500 dark:bg-blue-600" }, // This value could be history.length
    { value: "47.0%", labelKey: "statAvgScore", colorClass: "bg-green-500 dark:bg-green-600" }, // This would need calculation
    { value: "2", labelKey: "statGoals", colorClass: "bg-yellow-500 dark:bg-yellow-600" },
    { value: "28", labelKey: "statSummaries", colorClass: "bg-purple-500 dark:bg-purple-600" },
];


export default function PerfilPage() {
  const { translate } = useLanguage();
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([]);

  useEffect(() => {
    const storedHistoryString = localStorage.getItem('evaluationHistory');
    if (storedHistoryString) {
      try {
        const storedHistory: EvaluationHistoryItem[] = JSON.parse(storedHistoryString);
        setEvaluationHistory(storedHistory);
      } catch (error) {
        console.error("Failed to parse evaluation history from localStorage:", error);
        setEvaluationHistory([]); // Default to empty if parsing fails
      }
    }
  }, []);

  const handleDeleteHistory = () => {
    localStorage.removeItem('evaluationHistory');
    setEvaluationHistory([]);
    // Potentially show a toast message
  };

  // Update profileStatsCardsData based on history if needed, e.g., for "Completed Evaluations"
  const dynamicProfileStatsCardsData = profileStatsCardsData.map(stat => {
    if (stat.labelKey === "statEvals") {
      return { ...stat, value: evaluationHistory.length.toString() };
    }
    // Add calculation for 'statAvgScore' if desired
    return stat;
  });


  return (
    <div className="space-y-8">
      {/* Personal Profile Section */}
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
            <Button variant="outline" size="sm" className="bg-custom-yellow-100 text-custom-yellow-800 hover:bg-custom-yellow-100/80">
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

      {/* Learning Statistics Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl font-headline">{translate('profileStatsTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-4 text-lg font-headline">{translate('profileProgressBySub')}</h3>
          <div className="space-y-4 text-sm">
            {learningStatsData.map(stat => (
              <div key={stat.nameKey} className="flex items-center gap-4">
                <span className="w-28 shrink-0">{translate(stat.nameKey)}</span>
                <Progress value={stat.progress} className="w-full h-3 [&>div]:bg-green-500" indicatorClassName={stat.colorClass} />
                <span className="w-12 text-right">{stat.progress}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {dynamicProfileStatsCardsData.map(stat => ( // Use dynamicProfileStatsCardsData here
            <Card key={stat.labelKey} className={`${stat.colorClass} text-primary-foreground shadow-md`}>
                <CardContent className="p-4">
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm opacity-90">{translate(stat.labelKey)}</div>
                </CardContent>
            </Card>
          ))}
      </div>


      {/* Evaluation History Section */}
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
                  <TableHead>{translate('tableBook')}</TableHead>
                  <TableHead>{translate('tableTopic')}</TableHead>
                  <TableHead>{translate('tableGrade')}</TableHead>
                  <TableHead>{translate('tablePoints')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluationHistory.length > 0 ? (
                  evaluationHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.date}</TableCell>
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
                        <Button variant="link" size="sm" className="p-0 h-auto text-primary">{translate('tableReview')}</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {translate('historyNoData', { defaultValue: "No evaluation history yet."})}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
