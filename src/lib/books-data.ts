// Datos de libros con URLs de Google Drive
export const booksData = {
  // 8vo Básico
  '8vo-basico': [
    {
      id: '8vo-ciencias-naturales',
      title: 'Ciencias Naturales',
      description: 'Libro de Ciencias Naturales para 8vo Básico',
      pdfUrl: 'https://drive.google.com/uc?export=download&id=1_drYy_6TjtXl8VmBBRTsnM5ADMzvS11m',
      grade: '8vo Básico',
      pages: 200
    },
    {
      id: '8vo-historia',
      title: 'Historia',
      description: 'Libro de Historia para 8vo Básico',
      pdfUrl: 'https://drive.google.com/uc?export=download&id=1FuKs6_0Iuz8yuGFyjXHS9oA-X-NDyZfW',
      grade: '8vo Básico',
      pages: 180
    },
    {
      id: '8vo-matematicas',
      title: 'Matemáticas',
      description: 'Libro de Matemáticas para 8vo Básico',
      pdfUrl: 'https://drive.google.com/uc?export=download&id=1S2oYGorFChDQKLMN7pqRmkM-T9XlSnkY',
      grade: '8vo Básico',
      pages: 160
    },
    {
      id: '8vo-lenguaje',
      title: 'Lenguaje',
      description: 'Libro de Lenguaje para 8vo Básico',
      pdfUrl: 'https://drive.google.com/uc?export=download&id=19RrKNCsioCUrdvv2z67jjD9LFHfZ5eqO',
      grade: '8vo Básico',
      pages: 150
    }
  ],

  // Placeholder para otros cursos (puedes agregar más libros aquí)
  '1ro-medio': [],
  '2do-basico': [],
  '3ro-basico': [],
  '4to-basico': [],
  '5to-basico': [],
  '6to-basico': [],
  '7mo-basico': []
};

export type Course = keyof typeof booksData;
export type Book = typeof booksData[Course][0];
