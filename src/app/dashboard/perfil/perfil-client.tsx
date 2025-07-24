"use client";

import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCircle, BarChart3, History as HistoryIcon, Download, Trash2, Edit3, Award, Percent, Newspaper, Network, FileQuestion, Upload, Camera, Shield, Crown, GraduationCap } from 'lucide-react';
import type { UserProfile, SubjectProgress, EvaluationHistoryItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { userService, UserService } from '@/services/user.service';
import type { UserProfile as BackendUserProfile, Course, Subject } from '@/services/user.service';

// Mock Data - UserProfile actualizado para nueva estructura
const userProfileData: UserProfile = {
  name: "Felipe",
  roleKey: "profileRoleStudent",
  activeCourses: [], 
  subjects: [
    { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
    { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
    { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" }, 
    { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" }, 
  ],
  evaluationsCompleted: 0, // This will be updated by history length
};

// Template for learning stats structure with specific subject colors (now gradients)
const learningStatsTemplate: SubjectProgress[] = [
  { nameKey: "subjectMath", progress: 0, colorClass: "bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600" },
  { nameKey: "subjectScience", progress: 0, colorClass: "bg-gradient-to-r from-green-300 via-green-400 to-green-600" },
  { nameKey: "subjectHistory", progress: 0, colorClass: "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600" }, 
  { nameKey: "subjectLanguage", progress: 0, colorClass: "bg-gradient-to-r from-red-300 via-red-400 to-red-600" },
  { nameKey: "subjectPhysics", progress: 0, colorClass: "bg-gradient-to-r from-purple-300 via-purple-400 to-purple-600" },
  { nameKey: "subjectChemistry", progress: 0, colorClass: "bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600" },
  { nameKey: "subjectBiology", progress: 0, colorClass: "bg-gradient-to-r from-teal-300 via-teal-400 to-teal-600" },
  { nameKey: "subjectEnglish", progress: 0, colorClass: "bg-gradient-to-r from-indigo-300 via-indigo-400 to-indigo-600" },
];

// Template for profile stats cards
const profileStatsCardsTemplate = [
    { value: "0", labelKey: "statEvals", colorClass: "bg-gradient-to-r from-purple-500 to-purple-600", bgClass: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20", icon: Award }, 
    { value: "0%", labelKey: "statAvgScore", colorClass: "bg-gradient-to-r from-emerald-500 to-emerald-600", bgClass: "from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20", icon: Percent }, 
    { value: "0", labelKey: "statSummaries", colorClass: "bg-gradient-to-r from-blue-500 to-blue-600", bgClass: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20", icon: Newspaper },
    { value: "0", labelKey: "statMaps", colorClass: "bg-gradient-to-r from-amber-500 to-amber-600", bgClass: "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20", icon: Network },
    { value: "0", labelKey: "statQuizzes", colorClass: "bg-gradient-to-r from-cyan-500 to-cyan-600", bgClass: "from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20", icon: FileQuestion },
];

export default function PerfilClient() {
  const { translate, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dynamicLearningStats, setDynamicLearningStats] = useState<SubjectProgress[]>(learningStatsTemplate);
  const [dynamicProfileCards, setDynamicProfileCards] = useState(profileStatsCardsTemplate);
  
  // Crear perfil dinámico basado en el usuario autenticado
  const [dynamicUserProfileData, setDynamicUserProfileData] = useState<UserProfile>(userProfileData);

  // Estado para imagen de perfil
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Estados para edición de perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Función para renderizar el badge del rol (idéntico al UserRoleBadge)
  const renderRoleBadge = () => {
    if (!user) return null;

    const roleConfig = {
      admin: {
        labelKey: 'adminRole',
        variant: 'outline' as const,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 hover:text-red-800',
        icon: Crown,
        iconClassName: 'text-red-700'
      },
      teacher: {
        labelKey: 'teacherRole',
        variant: 'outline' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 hover:text-blue-800',
        icon: Shield,
        iconClassName: 'text-blue-700'
      },
      student: {
        labelKey: 'studentRole',
        variant: 'outline' as const,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800',
        icon: GraduationCap,
        iconClassName: 'text-green-700'
      }
    };

    const config = roleConfig[user.role];
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <Badge 
        variant={config.variant}
        className={`${config.className} text-xs font-medium px-2 py-1 inline-flex items-center gap-1.5`}
      >
        <IconComponent className={`w-3 h-3 flex-shrink-0 ${config.iconClassName}`} />
        {translate(config.labelKey)}
      </Badge>
    );
  };

  // Function to translate book titles based on current language
  const translateBookTitle = (bookTitle: string): string => {
    try {
      if (!bookTitle || typeof bookTitle !== 'string') {
        return bookTitle || '';
      }

      if (language === 'en') {
        // Map of Spanish book titles to English translations
        const bookTranslations: Record<string, string> = {
          'Ciencias Naturales': 'Natural Sciences',
          'Historia, Geografía y Ciencias Sociales': 'History, Geography and Social Sciences',
          'Lenguaje y Comunicación': 'Language and Communication',
          'Matemáticas': 'Mathematics',
          'Ciencias para la Ciudadanía': 'Science for Citizenship',
          'Biología': 'Biology',
          'Física': 'Physics',
          'Química': 'Chemistry',
          'Historia': 'History',
          'Inglés': 'English',
          'Educación Física': 'Physical Education',
          'Artes Visuales': 'Visual Arts',
          'Música': 'Music',
          'Tecnología': 'Technology',
          'Religión': 'Religion',
          'Orientación': 'Guidance'
        };

        // Try to find exact match first
        if (bookTranslations[bookTitle]) {
          return bookTranslations[bookTitle];
        }

        // For composite titles like "Ciencias Naturales 1ro Básico"
        for (const [spanish, english] of Object.entries(bookTranslations)) {
          if (bookTitle.includes(spanish)) {
            return bookTitle.replace(spanish, english);
          }
        }
      }
      
      return bookTitle; // Return original if no translation found or if in Spanish
    } catch (error) {
      console.error("Error translating book title:", error);
      return bookTitle || '';
    }
  };

  // Función auxiliar para obtener las estadísticas filtradas por curso
  const getFilteredLearningStats = () => {
    if (!user) return [];
    
    // Obtener datos actualizados del usuario desde localStorage
    let updatedUserData = user;
    try {
      const storedUsers = localStorage.getItem('smart-student-users');
      if (storedUsers) {
        const usersData = JSON.parse(storedUsers);
        const currentUserData = usersData.find((u: any) => u.username === user.username);
        if (currentUserData) {
          updatedUserData = {
            ...user,
            activeCourses: currentUserData.activeCourses || [],
            ...(currentUserData.activeCourseNames && { activeCourseNames: currentUserData.activeCourseNames })
          } as any;
        }
      }
    } catch (error) {
      console.error("Error loading updated user data:", error);
    }

    // Obtener el curso actual del usuario (priorizar nombres reales)
    const currentCourse = (updatedUserData as any).activeCourseNames && (updatedUserData as any).activeCourseNames.length > 0 
      ? (updatedUserData as any).activeCourseNames[0]
      : updatedUserData.activeCourses && updatedUserData.activeCourses.length > 0 
        ? updatedUserData.activeCourses[0] 
      : '';

    // Función para obtener asignaturas según el curso
    const getSubjectsForCourse = (course: string) => {
      // Asignaturas para cursos básicos (1ro a 8vo Básico)
      if (!course || course.includes('Básico')) {
        return [
          { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
          { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
          { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" }, 
          { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" }, 
        ];
      }
      
      // Asignaturas para cursos medios (1ro a 4to Medio)
      if (course.includes('Medio')) {
        return [
          { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
          { tag: "FIS", nameKey: "subjectPhysics", colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
          { tag: "QUI", nameKey: "subjectChemistry", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
          { tag: "BIO", nameKey: "subjectBiology", colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300" },
          { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" }, 
          { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
          { tag: "ING", nameKey: "subjectEnglish", colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300" },
        ];
      }
      
      // Si no se reconoce el tipo de curso, devolver asignaturas por defecto
      return [
        { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
        { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
        { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" }, 
        { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" }, 
      ];
    };

    // Obtener las asignaturas del curso actual del estudiante
    const userSubjects = getSubjectsForCourse(currentCourse);
    const userSubjectKeys = userSubjects.map(subject => subject.nameKey);

    // Filtrar el template para incluir solo las asignaturas del curso actual
    return learningStatsTemplate.filter(statTemplate => 
      userSubjectKeys.includes(statTemplate.nameKey)
    );
  };

  // ✨ FUNCIÓN PARA CONVERTIR IDS A NOMBRES DE CURSO ✨
  const convertCourseIdToName = (courseId: string): string => {
    if (!courseId) return courseId;
    
    // Si ya es un nombre legible (no contiene guiones ni números largos), devolverlo tal como está
    if (!courseId.includes('-') && !courseId.match(/\d{10,}/)) {
      return courseId;
    }
    
    console.log('🔄 [CONVERSIÓN] Convirtiendo ID:', courseId);
    
    // Mapeo de patrones comunes de IDs a nombres de curso
    const courseMapping: Record<string, string> = {
      // Patrones para identificar cursos básicos
      '1ro-basico': '1ro Básico',
      '2do-basico': '2do Básico', 
      '3ro-basico': '3ro Básico',
      '4to-basico': '4to Básico',
      '5to-basico': '5to Básico',
      '6to-basico': '6to Básico',
      '7mo-basico': '7mo Básico',
      '8vo-basico': '8vo Básico',
      // Patrones para identificar cursos medios
      '1ro-medio': '1ro Medio',
      '2do-medio': '2do Medio',
      '3ro-medio': '3ro Medio', 
      '4to-medio': '4to Medio',
    };

    // Buscar patrones en el ID
    const lowerCourseId = courseId.toLowerCase();
    for (const [pattern, name] of Object.entries(courseMapping)) {
      if (lowerCourseId.includes(pattern)) {
        console.log('✅ [CONVERSIÓN] Encontrado patrón:', pattern, '->', name);
        return name;
      }
    }

    // Si contiene números, intentar extraer el nivel
    const basicMatch = courseId.match(/(\d+).*b[aá]sico/i);
    if (basicMatch) {
      const num = parseInt(basicMatch[1]);
      const ordinals = ['', '1ro', '2do', '3ro', '4to', '5to', '6to', '7mo', '8vo'];
      const result = `${ordinals[num] || num + 'to'} Básico`;
      console.log('✅ [CONVERSIÓN] Extraído de número básico:', result);
      return result;
    }

    const medioMatch = courseId.match(/(\d+).*medio/i);
    if (medioMatch) {
      const num = parseInt(medioMatch[1]);
      const ordinals = ['', '1ro', '2do', '3ro', '4to'];
      const result = `${ordinals[num] || num + 'to'} Medio`;
      console.log('✅ [CONVERSIÓN] Extraído de número medio:', result);
      return result;
    }

    // Casos especiales para IDs largos como 'id-1753226643520-0g1a322hy'
    if (courseId.length > 15 && courseId.includes('-')) {
      const parts = courseId.split('-');
      const lastPart = parts[parts.length - 1];
      
      console.log('🔍 [CONVERSIÓN] Analizando ID largo. Última parte:', lastPart);
      
      // Intentar deducir de patrones en la última parte
      if (lastPart.includes('1') && lastPart.includes('a')) {
        console.log('✅ [CONVERSIÓN] Deducido como 1ro Básico por patrón 1a');
        return '1ro Básico';
      }
      if (lastPart.includes('2') && lastPart.includes('a')) {
        return '2do Básico';
      }
      if (lastPart.includes('3') && lastPart.includes('a')) {
        return '3ro Básico';
      }
      
      // Si no se puede deducir específicamente, usar un nombre genérico pero descriptivo
      console.log('⚠️ [CONVERSIÓN] No se pudo deducir nivel específico, usando genérico');
      return translate('profileCourseAssigned');
    }

    console.log('❌ [CONVERSIÓN] No se pudo convertir, manteniendo original');
    return courseId; // Devolver el original si no se puede convertir
  };

  // ✨ FUNCIÓN PARA OBTENER NOMBRES DE CURSOS POR ID ✨
  const getCourseNameById = (courseId: string): string => {
    try {
      const storedCourses = localStorage.getItem('smart-student-courses');
      if (!storedCourses) return courseId; // Devuelve el ID si no hay cursos

      const coursesData = JSON.parse(storedCourses);
      const course = coursesData.find((c: any) => c.id === courseId);

      return course ? course.name : courseId; // Devuelve el nombre si lo encuentra
    } catch {
      return courseId; // En caso de error, devuelve el ID
    }
  };

  // ✨ FUNCIÓN PARA CONTAR ESTUDIANTES POR CURSO - VERSIÓN MEJORADA ✨
  const getStudentCountForCourse = (courseName: string): number => {
    try {
      const storedUsers = localStorage.getItem('smart-student-users');
      const storedCourses = localStorage.getItem('smart-student-courses');
      if (!storedUsers || !storedCourses) return 0;

      const usersData = JSON.parse(storedUsers);
      const coursesData = JSON.parse(storedCourses);

      // 1. Busca el curso en la lista para obtener su ID
      const course = coursesData.find((c: any) => c.name === courseName);
      const courseId = course ? course.id : null;

      if (!courseId) {
        console.warn(`[Contador] No se encontró un ID para el curso "${courseName}". El conteo podría ser 0.`);
      }

      // 2. Filtra los estudiantes que coincidan por NOMBRE o por ID
      const studentCount = usersData.filter((user: any) => {
        if (user.role !== 'student' || !Array.isArray(user.activeCourses)) {
          return false;
        }
        // Un estudiante es contado si en su lista de cursos tiene
        // el NOMBRE del curso O el ID del curso.
        return user.activeCourses.includes(courseName) || (courseId && user.activeCourses.includes(courseId));
      }).length;

      console.log(`[Contador] Estudiantes encontrados para "${courseName}" (ID: ${courseId}): ${studentCount}`);
      return studentCount;

    } catch (error) {
      console.error(`Error al contar estudiantes para el curso ${courseName}:`, error);
      return 0;
    }
  };

  // Ensure this only runs on client-side
  useEffect(() => {
    setMounted(true);
    setLoading(false);
  }, []);

  // Initialize learning stats with filtered template when component mounts
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Set initial learning stats filtered by user's course
    const filteredTemplate = getFilteredLearningStats();
    if (filteredTemplate.length > 0) {
      setDynamicLearningStats(filteredTemplate);
    }
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted) return;
    
    try {
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
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }

  }, [mounted]);

  useEffect(() => {
    if (!mounted || evaluationHistory.length === 0 || !user) return;
    
    const subjectMappings: Record<string, { es: string[], en: string[] }> = {
      subjectScience: {
        es: ["Ciencias", "Ciencias Naturales", "Ciencias para la Ciudadanía"],
        en: ["Science", "Natural Sciences", "Science for Citizenship"]
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
      },
      subjectPhysics: {
        es: ["Física"],
        en: ["Physics"]
      },
      subjectChemistry: {
        es: ["Química"],
        en: ["Chemistry"]
      },
      subjectBiology: {
        es: ["Biología"],
        en: ["Biology"]
      },
      subjectEnglish: {
        es: ["Inglés"],
        en: ["English"]
      }
    };

    // Obtener el template filtrado según el curso del usuario
    const filteredTemplate = getFilteredLearningStats();

    const newLearningStats = filteredTemplate.map(statTemplate => {
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
    
    const newProfileCards = dynamicProfileCards.map(card => {
      if (card.labelKey === "statEvals") {
        return { ...card, value: evaluationHistory.length.toString() };
      }
      if (card.labelKey === "statAvgScore") {
        return { ...card, value: `${averageScorePercentage}%` };
      }
      return card; 
    });
    setDynamicProfileCards(newProfileCards);

  }, [evaluationHistory, language, translate, mounted, user]);

  // ✨ ACTUALIZAR PERFIL CON CONVERSIÓN DE IDS A NOMBRES - VERSIÓN DEFINITIVA ✨
  useEffect(() => {
    if (!user || !mounted) return;

    const loadProfileData = () => {
      try {
        console.log(`[Perfil] Cargando datos para: ${user.username}`);
        const storedUsers = localStorage.getItem('smart-student-users');
        
        // Si no hay datos en localStorage, usar datos por defecto del usuario actual
        if (!storedUsers) {
          console.warn("[Perfil] 'smart-student-users' no encontrado en localStorage. Usando datos por defecto.");
          
          // Configurar perfil básico con datos del usuario autenticado
          const defaultSubjects = [
            { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
            { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
            { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
            { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
          ];

          setDynamicUserProfileData({
            name: user.displayName || user.username,
            roleKey: user.role === 'teacher' ? 'profileRoleTeacher' : 'profileRoleStudent',
            activeCourses: user.activeCourses || ['Sin curso asignado'],
            subjects: defaultSubjects,
            evaluationsCompleted: evaluationHistory.length,
          });
          
          console.log("[Perfil] Perfil configurado con datos por defecto");
          return;
        }

        const usersData = JSON.parse(storedUsers);
        const fullUserData = usersData.find((u: any) => u.username === user.username);

        // Si no se encuentra el usuario específico, usar datos por defecto
        if (!fullUserData) {
          console.warn(`[Perfil] Usuario "${user.username}" no encontrado en localStorage. Usando datos por defecto.`);
          
          const defaultSubjects = [
            { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
            { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
            { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
            { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
          ];

          setDynamicUserProfileData({
            name: user.displayName || user.username,
            roleKey: user.role === 'teacher' ? 'profileRoleTeacher' : 'profileRoleStudent',
            activeCourses: user.activeCourses || ['Sin curso asignado'],
            subjects: defaultSubjects,
            evaluationsCompleted: evaluationHistory.length,
          });
          
          console.log("[Perfil] Perfil configurado con datos por defecto del usuario");
          return;
        }

        console.log("[Perfil] Datos completos del usuario encontrados:", fullUserData);

        // ✨ PASO CLAVE: Convertir IDs de cursos a Nombres de cursos ✨
        const courseIds = fullUserData.activeCourses || [];
        const activeCourseNames = courseIds.map((id: string) => getCourseNameById(id));
        
        console.log("[Perfil] IDs de curso encontrados:", courseIds);
        console.log("[Perfil] Nombres de curso convertidos:", activeCourseNames);

        // Mapear los nombres de los cursos a la estructura con conteo
        const activeCoursesWithCount = user.role === 'teacher' 
          ? activeCourseNames.map((name: string, index: number) => ({
              name: name,
              originalId: courseIds[index], // Mantener el ID original para referencia
              studentCount: getStudentCountForCourse(name)
            }))
          : activeCourseNames;

        console.log("[Perfil] Cursos con conteo de estudiantes:", activeCoursesWithCount);

        // ✨ FUNCIÓN CRÍTICA: Determinar asignaturas específicas del usuario ✨
        const getUserSpecificSubjects = () => {
          // Mapeo de nombres de asignaturas a objetos con tags y colores
          const subjectNameToObject = {
            'Matemáticas': { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
            'Ciencias Naturales': { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
            'Historia, Geografía y Ciencias Sociales': { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
            'Lenguaje y Comunicación': { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
            'Física': { tag: "FIS", nameKey: "subjectPhysics", colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
            'Química': { tag: "QUI", nameKey: "subjectChemistry", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
            'Biología': { tag: "BIO", nameKey: "subjectBiology", colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300" },
            'Inglés': { tag: "ING", nameKey: "subjectEnglish", colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300" },
          };

          let userSubjects = [];

          if (user.role === 'teacher') {
            // Para profesores: usar las asignaturas específicas que enseñan
            if (fullUserData.teachingSubjects && fullUserData.teachingSubjects.length > 0) {
              console.log("[Perfil] Usando asignaturas específicas del profesor:", fullUserData.teachingSubjects);
              userSubjects = fullUserData.teachingSubjects
                .map(subjectName => subjectNameToObject[subjectName])
                .filter(subject => subject !== undefined); // Filtrar asignaturas no reconocidas
            } else {
              console.warn("[Perfil] Profesor sin asignaturas específicas, usando asignaturas por defecto");
              // Fallback: usar asignaturas por defecto del primer curso
              const firstCourse = activeCourseNames.length > 0 ? activeCourseNames[0] : '';
              userSubjects = getSubjectsForCourse(firstCourse);
            }
          } else {
            // Para estudiantes: usar las asignaturas del curso asignado
            const studentCourse = activeCourseNames.length > 0 ? activeCourseNames[0] : '';
            console.log("[Perfil] Estudiante en curso:", studentCourse);
            userSubjects = getSubjectsForCourse(studentCourse);
          }

          console.log("[Perfil] Asignaturas específicas determinadas:", userSubjects);
          return userSubjects;
        };

        // Función para obtener asignaturas según el curso (fallback para estudiantes)
        const getSubjectsForCourse = (course: string) => {
          if (course.includes('Medio')) {
            return [
              { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
              { tag: "FIS", nameKey: "subjectPhysics", colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
              { tag: "QUI", nameKey: "subjectChemistry", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
              { tag: "BIO", nameKey: "subjectBiology", colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300" },
              { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
              { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
              { tag: "ING", nameKey: "subjectEnglish", colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300" },
            ];
          }
          return [ // Cursos básicos y por defecto
            { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
            { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
            { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
            { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
          ];
        };
        
        // ✨ USAR LAS ASIGNATURAS ESPECÍFICAS DEL USUARIO ✨
        const allSubjects = getUserSpecificSubjects();
        console.log("[Perfil] Asignaturas unificadas:", allSubjects);

        // Actualizar el estado con toda la información obtenida
        setDynamicUserProfileData({
          name: fullUserData.displayName || fullUserData.username,
          roleKey: fullUserData.role === 'teacher' ? 'profileRoleTeacher' : 'profileRoleStudent',
          activeCourses: activeCoursesWithCount,
          subjects: allSubjects,
          evaluationsCompleted: evaluationHistory.length,
        });
        console.log("[Perfil] ¡Estado del perfil actualizado correctamente!");

      } catch (error) {
        console.warn("[Perfil] Error al cargar datos del perfil, usando configuración por defecto:", error);
        
        // Configurar perfil con datos por defecto en caso de error
        const defaultSubjects = [
          { tag: "MAT", nameKey: "subjectMath", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
          { tag: "CNT", nameKey: "subjectScience", colorClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
          { tag: "HIS", nameKey: "subjectHistory", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
          { tag: "LEN", nameKey: "subjectLanguage", colorClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
        ];

        setDynamicUserProfileData({
          name: user?.displayName || user?.username || 'Usuario',
          roleKey: user?.role === 'teacher' ? 'profileRoleTeacher' : 'profileRoleStudent',
          activeCourses: user?.activeCourses || ['Sin curso asignado'],
          subjects: defaultSubjects,
          evaluationsCompleted: evaluationHistory.length,
        });
      }
    };

    loadProfileData();

  }, [user, mounted, evaluationHistory.length]);

  const handleDeleteHistory = () => {
    if (!mounted) return;
    
    try {
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

      // Reset learning stats with filtered template based on user's course
      const filteredTemplate = getFilteredLearningStats();
      setDynamicLearningStats(filteredTemplate);

      toast({
        title: translate('historyDeletedTitle'),
        description: translate('historyDeletedDesc'),
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting history:", error);
      toast({
        title: translate('profileError'),
        description: translate('profileDeleteHistoryError'),
        variant: "destructive"
      });
    }
  };

  const handleDownloadHistoryXlsx = async () => {
    if (!mounted) {
      toast({
        title: translate('profileError'),
        description: translate('profileLoadingError'),
        variant: "destructive"
      });
      return;
    }

    if (evaluationHistory.length === 0) {
        toast({
            title: translate('historyEmptyTitle'),
            description: translate('historyEmptyDesc'),
            variant: "default"
        });
        return;
    }

    try {
      // Dynamic import of XLSX to avoid SSR issues
      const XLSX = await import('xlsx');
      
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

      XLSX.writeFile(wb, "historial_evaluaciones_smart_student.xlsx");
      
      toast({
        title: translate('profileDownloadSuccess'),
        description: translate('profileDownloadSuccessDesc'),
        variant: "default"
      });
    } catch (error) {
      console.error('Error downloading XLSX:', error);
      toast({
        title: translate('profileDownloadError'),
        description: translate('profileDownloadErrorDesc'),
        variant: "destructive"
      });
    }
  };

  const handleRepasar = (item: EvaluationHistoryItem) => {
    router.push(`/dashboard/evaluacion?course=${encodeURIComponent(item.courseName)}&book=${encodeURIComponent(item.bookTitle)}&topic=${encodeURIComponent(item.topic)}`);
  };

  // Funciones para manejo de imagen de perfil
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: translate('profileError'),
        description: translate('profileImageError'),
        variant: "destructive"
      });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: translate('profileError'), 
        description: translate('profileImageSizeError'),
        variant: "destructive"
      });
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProfileImage(result);
      
      // Guardar en localStorage
      if (user?.username) {
        localStorage.setItem(`profile-image-${user.username}`, result);
      }
      
      setIsUploadingImage(false);
      toast({
        title: translate('profileImageUploaded'),
        description: translate('profileImageUploadedDesc'),
        variant: "default"
      });
    };

    reader.onerror = () => {
      setIsUploadingImage(false);
      toast({
        title: translate('profileError'),
        description: translate('profileImageUploadError'),
        variant: "destructive"
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (user?.username) {
      localStorage.removeItem(`profile-image-${user.username}`);
    }
    toast({
      title: translate('profileImageRemoved'),
      description: translate('profileImageRemovedDesc'),
      variant: "default"
    });
  };

  // Funciones para edición de perfil
  const handleStartEditing = () => {
    setEditingName(user?.displayName || user?.username || '');
    setEditingEmail(user?.email || '');
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    setIsEditingProfile(false);
    setEditingName('');
    setEditingEmail('');
  };

  const handleSaveProfile = async () => {
    if (!user?.username || !editingName.trim() || !editingEmail.trim()) {
      toast({
        title: translate('profileError'),
        description: translate('profileSaveError'),
        variant: "destructive"
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingEmail)) {
      toast({
        title: translate('profileError'),
        description: translate('profileEmailError'),
        variant: "destructive"
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      // Obtener usuarios actuales del localStorage
      const storedUsers = localStorage.getItem('smart-student-users');
      if (!storedUsers) {
        throw new Error('No se encontraron datos de usuarios');
      }

      const usersData = JSON.parse(storedUsers);
      const userIndex = usersData.findIndex((u: any) => u.username === user.username);
      
      if (userIndex === -1) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar los datos del usuario
      usersData[userIndex] = {
        ...usersData[userIndex],
        displayName: editingName.trim(),
        email: editingEmail.trim()
      };

      // Guardar de vuelta en localStorage
      localStorage.setItem('smart-student-users', JSON.stringify(usersData));

      // Actualizar el perfil dinámico inmediatamente
      setDynamicUserProfileData(prev => ({
        ...prev,
        name: editingName.trim()
      }));

      // Finalizar edición ANTES de hacer toast para que se vean los cambios
      setIsEditingProfile(false);
      setIsSavingProfile(false);

      toast({
        title: translate('profileSaveSuccess'),
        description: translate('profileSaveSuccessDesc'),
        variant: "default"
      });

      // Recargar los datos del perfil inmediatamente
      setTimeout(() => {
        // Forzar recarga completa del perfil
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error al guardar perfil:', error);
      setIsSavingProfile(false);
      toast({
        title: translate('profileError'),
        description: translate('profileSaveErrorDesc'),
        variant: "destructive"
      });
    }
  };

  // Cargar imagen desde localStorage al montar
  useEffect(() => {
    if (user?.username && mounted) {
      const savedImage = localStorage.getItem(`profile-image-${user.username}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  }, [user?.username, mounted]);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = evaluationHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(evaluationHistory.length / itemsPerPage);

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mt-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mt-4"></div>
        </div>
      </div>
    );
  }

  // Error boundary check
  if (!translate || !language) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-2">Error: Contexto de idioma no disponible</div>
          <div className="text-sm text-gray-500">Por favor, recarga la página</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ✨ SECCIÓN DE PERFIL PERSONAL MODERNA CON GRADIENTE NEGRO A AZUL ✨ */}
      <Card className="shadow-lg bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 dark:from-black dark:via-gray-900 dark:to-blue-900 text-gray-800 dark:text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <UserCircle className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{translate('profilePersonalTitle')}</h1>
              <p className="text-gray-600 dark:text-blue-200 text-sm">{translate('profilePersonalSub')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 📸 FOTO DE PERFIL - Columna izquierda - EXTRA GRANDE */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-4 pt-2">
              {/* Título de la foto de perfil */}
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                  {language === 'en' ? 'Profile Photo' : 'Foto de Perfil'}
                </h3>
              </div>
              
              <div 
                className="relative group cursor-pointer"
                onClick={() => !isUploadingImage && document.getElementById('profile-image-upload')?.click()}
              >
                <div className="relative w-56 h-56 rounded-full overflow-hidden ring-4 ring-blue-300 shadow-xl bg-gradient-to-br from-blue-400 to-purple-500">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Foto de perfil" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      <UserCircle className="w-32 h-32 text-white" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    {isUploadingImage ? (
                      <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-14 h-14 text-white" />
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 👤 DATOS PERSONALES - Columna central */}
            <div className="lg:col-span-4">
              <div className="bg-gray-200/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-300 dark:border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{translate('profilePersonalData')}</h3>
                  </div>
                  {!isEditingProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditing}
                      className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-all duration-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200 uppercase tracking-wider mb-2">
                      {translate('profileName')}
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full text-lg font-bold bg-white/50 dark:bg-white/20 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-blue-200 border border-gray-400 dark:border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 dark:focus:border-blue-100 transition-colors"
                        placeholder={translate('profileEnterName')}
                      />
                    ) : (
                      <div className="flex items-center justify-between bg-gray-100 dark:bg-blue-50/10 rounded-lg p-3 border border-gray-300 dark:border-blue-300/30">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-gray-800 dark:text-white font-medium">
                            {user?.displayName || user?.username || dynamicUserProfileData.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200 uppercase tracking-wider mb-2">
                      {translate('profileEmail')}
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        value={editingEmail}
                        onChange={(e) => setEditingEmail(e.target.value)}
                        className="w-full text-lg font-bold bg-white/50 dark:bg-white/20 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-blue-200 border border-gray-400 dark:border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 dark:focus:border-blue-100 transition-colors"
                        placeholder={translate('profileEmailPlaceholder')}
                      />
                    ) : (
                      <div className="flex items-center justify-between bg-gray-100 dark:bg-blue-50/10 rounded-lg p-3 border border-gray-300 dark:border-blue-300/30">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-gray-800 dark:text-white font-medium">
                            {user?.email || 'jorge@gmail.com'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200 uppercase tracking-wider mb-1">
                      {translate('profileSystemRole')}
                    </label>
                    {renderRoleBadge()}
                  </div>

                  {isEditingProfile && (
                    <div className="flex gap-3 pt-4 border-t border-gray-300 dark:border-white/20">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors"
                      >
                        {isSavingProfile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {translate('profileSaving')}
                          </>
                        ) : (
                          translate('profileSave')
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEditing}
                        disabled={isSavingProfile}
                        className="bg-transparent border-gray-400 dark:border-white/30 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                      >
                        {translate('profileCancel')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🎓 DATOS ACADÉMICOS - Columna derecha */}
            <div className="lg:col-span-5">
              <div className="bg-gray-200/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-gray-300 dark:border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{translate('profileAcademicData')}</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200 uppercase tracking-wider mb-2">
                      {translate('profileAssignedCourse')}
                    </label>
                    
                    {dynamicUserProfileData.activeCourses && Array.isArray(dynamicUserProfileData.activeCourses) && dynamicUserProfileData.activeCourses.length > 0 ? (
                      <div className="flex items-center justify-between bg-gray-100 dark:bg-blue-50/10 rounded-lg p-3 border border-gray-300 dark:border-blue-300/30">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-gray-800 dark:text-white font-medium">
                            {(() => {
                              const firstCourse = dynamicUserProfileData.activeCourses[0] as any;
                              if (typeof firstCourse === 'string') {
                                return firstCourse;
                              } else if (firstCourse && firstCourse.name) {
                                return firstCourse.name;
                              }
                              return translate('profileCourseNotDefined');
                            })()}
                          </span>
                        </div>
                        {user?.role === 'teacher' && (() => {
                          const firstCourse = dynamicUserProfileData.activeCourses[0] as any;
                          return firstCourse && firstCourse.studentCount !== undefined;
                        })() && (
                          <div className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            {(dynamicUserProfileData.activeCourses[0] as any)?.studentCount || 0}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-blue-200 italic">{translate('profileNoCourseAssigned')}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-blue-200 uppercase tracking-wider mb-2">
                      {translate('profileMySubjects')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dynamicUserProfileData.subjects.map((subject, index) => (
                        <span 
                          key={index} 
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold 
                                   hover:scale-105 transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg ${subject.colorClass}`}
                        >
                          <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                          {subject.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 🛠️ ACCIONES RÁPIDAS - Sección compacta debajo */}
              <div className="mt-4 bg-gray-200/30 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-300 dark:border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                  <h4 className="text-sm font-bold text-gray-600 dark:text-blue-200 uppercase tracking-wider">
                    {translate('profileQuickActions')}
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="xs"
                    className="flex-1 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 hover:text-white shadow-md hover:shadow-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:border-slate-500 dark:hover:text-white transition-all duration-300 text-xs px-2 py-1"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    {translate('profileChangePass')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="xs"
                    onClick={handleDownloadHistoryXlsx}
                    className="flex-1 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 hover:text-white shadow-md hover:shadow-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:border-slate-500 dark:hover:text-white transition-all duration-300 text-xs px-2 py-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {translate('profileDownloadHistory')}
                  </Button>
                </div>
              </div>
            </div>

          </div>

        </CardContent>
      </Card>

      {/* Profile Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {dynamicProfileCards.map((card, index) => (
          <Card key={index} className="shadow-lg bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 dark:from-black dark:via-gray-900 dark:to-blue-900 text-gray-800 dark:text-white border-0 relative overflow-hidden group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", card.bgClass)}></div>
            <CardContent className="p-6 relative z-10 text-center">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", card.colorClass, "shadow-md group-hover:shadow-lg transition-shadow")}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-primary group-hover:text-primary/80 transition-colors">
                  {card.value}
                </div>
              </div>
              <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {translate(card.labelKey)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Learning Progress */}
      <Card className="shadow-lg bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 dark:from-black dark:via-gray-900 dark:to-blue-900 text-gray-800 dark:text-white border-0">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            <CardTitle className="text-2xl font-headline text-gray-800 dark:text-white">{translate('learningProgressTitle')}</CardTitle>
          </div>
          <CardDescription className="text-gray-600 dark:text-blue-200">{translate('learningProgressSub')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dynamicLearningStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{translate(stat.nameKey)}</span>
                  <span className="text-sm text-muted-foreground">{stat.progress}%</span>
                </div>
                <div className="relative">
                  <Progress value={stat.progress} className="h-3" />
                  <div 
                    className={cn("absolute top-0 left-0 h-3 rounded-full transition-all duration-500", stat.colorClass)}
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evaluation History */}
      <Card className="shadow-lg bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 dark:from-black dark:via-gray-900 dark:to-blue-900 text-gray-800 dark:text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <HistoryIcon className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                <CardTitle className="text-2xl font-headline text-gray-800 dark:text-white">{translate('evaluationHistoryTitle')}</CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-blue-200">{translate('evaluationHistorySub')}</CardDescription>
            </div>
            {evaluationHistory.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteHistory}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {translate('historyDeleteButton')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {evaluationHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>{translate('noEvaluationsYet')}</p>
              <p className="text-sm">{translate('noEvaluationsSubtext')}</p>
            </div>
          ) : (
            <>
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
                      <TableHead>{translate('tableActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((item) => {
                      const gradePercentage = item.totalQuestions > 0 ? Math.round((item.score / item.totalQuestions) * 100) : 0;
                      const gradeColorClass = gradePercentage >= 70 ? 'text-green-600 dark:text-green-400' : gradePercentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.date}</TableCell>
                          <TableCell>{item.courseName}</TableCell>
                          <TableCell className="max-w-xs truncate" title={translateBookTitle(item.bookTitle)}>{translateBookTitle(item.bookTitle)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.topic}>{item.topic}</TableCell>
                          <TableCell className={cn("font-semibold", gradeColorClass)}>{gradePercentage}%</TableCell>
                          <TableCell>{item.score}/{item.totalQuestions}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRepasar(item)}
                            >
                              {translate('reviewButton')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    {translate('previousPage')}
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    {translate('pageInfo', { current: currentPage.toString(), total: totalPages.toString() })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {translate('nextPage')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
