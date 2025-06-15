
"use client";

import { useLanguage } from '@/contexts/language-context';
import { Home as HomeIcon, Library, Newspaper, Network, FileQuestion, ClipboardList } from 'lucide-react';
import Logo from '@/components/shared/logo';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const featureCards = [
  {
    titleKey: 'cardBooksTitle',
    descKey: 'cardBooksDesc',
    btnKey: 'cardBooksBtn',
    targetPage: '/dashboard/libros',
    icon: Library,
    colorClass: 'green',
  },
  {
    titleKey: 'cardSummaryTitle',
    descKey: 'cardSummaryDesc',
    btnKey: 'cardSummaryBtn',
    targetPage: '/dashboard/resumen',
    icon: Newspaper,
    colorClass: 'blue',
  },
  {
    titleKey: 'cardMapTitle',
    descKey: 'cardMapDesc',
    btnKey: 'cardMapBtn',
    targetPage: '/dashboard/mapa-mental',
    icon: Network,
    colorClass: 'yellow',
  },
  {
    titleKey: 'cardQuizTitle',
    descKey: 'cardQuizDesc',
    btnKey: 'cardQuizBtn',
    targetPage: '/dashboard/cuestionario',
    icon: FileQuestion,
    colorClass: 'cyan',
  },
  {
    titleKey: 'cardEvalTitle',
    descKey: 'cardEvalDesc',
    btnKey: 'cardEvalBtn',
    targetPage: '/dashboard/evaluacion',
    icon: ClipboardList,
    colorClass: 'purple',
  },
];

export default function DashboardHomePage() {
  const { translate } = useLanguage();

  const getButtonColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'home-card-button-green';
      case 'blue': return 'home-card-button-blue';
      case 'yellow': return 'home-card-button-yellow';
      case 'cyan': return 'home-card-button-cyan';
      case 'purple': return 'home-card-button-purple';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };
  
  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-500 dark:text-green-400';
      case 'blue': return 'text-blue-500 dark:text-blue-400';
      case 'yellow': return 'text-yellow-500 dark:text-yellow-400';
      case 'cyan': return 'text-cyan-500 dark:text-cyan-400';
      case 'purple': return 'text-purple-500 dark:text-purple-400';
      default: return 'text-muted-foreground';
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <HomeIcon className="w-7 h-7 sm:w-8 sm:h-8 text-foreground" />
        <h2 className="text-2xl sm:text-3xl font-semibold font-headline text-foreground">
          {translate('welcomeMessage')}
        </h2>
        <Logo className="w-7 h-7 sm:w-8 sm:h-8 text-foreground" />
      </div>
      <p className="text-md text-muted-foreground">
        {translate('welcomeSubMessage')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {featureCards.map((card) => (
          <Card key={card.titleKey} className="flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center">
              <card.icon className={`w-10 h-10 mb-3 ${getIconColorClass(card.colorClass)}`} />
              <CardTitle className="text-lg font-semibold font-headline">{translate(card.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <CardDescription className="text-sm mb-4 flex-grow">
                {translate(card.descKey)}
              </CardDescription>
              <Button asChild className={`home-card-button ${getButtonColorClass(card.colorClass)}`}>
                <Link href={card.targetPage}>{translate(card.btnKey)}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

    
