#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import FormData from 'form-data';
import 'dotenv/config';

// NOUVEAU: Import pour similarité textuelle simple (sans lib externe, implémentation basique)
function cosineSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set([...words1, ...words2]);
  let dotProduct = 0, norm1 = 0, norm2 = 0;
  uniqueWords.forEach(word => {
    const freq1 = words1.filter(w => w === word).length;
    const freq2 = words2.filter(w => w === word).length;
    dotProduct += freq1 * freq2;
    norm1 += freq1 * freq1;
    norm2 += freq2 * freq2;
  });
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
}

// Configuración de variables de entorno
const MOODLE_API_URL = process.env.MOODLE_API_URL;
const MOODLE_API_TOKEN = process.env.MOODLE_API_TOKEN;
const MOODLE_COURSE_ID = process.env.MOODLE_COURSE_ID;

// Verificar que las variables de entorno estén definidas
if (!MOODLE_API_URL) {
  throw new Error('MOODLE_API_URL environment variable is required');
}
if (!MOODLE_API_TOKEN) {
  throw new Error('MOODLE_API_TOKEN environment variable is required');
}

// ============= INTERFACES =============
interface Student {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Assignment {
  id: number;
  name: string;
  duedate: number;
  allowsubmissionsfromdate: number;
  grade: number;
  timemodified: number;
  cutoffdate: number;
}

interface Quiz {
  id: number;
  name: string;
  timeopen: number;
  timeclose: number;
  grade: number;
  timemodified: number;
}

interface Submission {
  id: number;
  userid: number;
  status: string;
  timemodified: number;
  gradingstatus: string;
  gradefordisplay?: string;
}

interface SubmissionContent {
  assignment: number;
  userid: number;
  status: string;
  submissiontext?: string;
  plugins?: Array<{
    type: string;
    content?: string;
    files?: Array<{
      filename: string;
      fileurl: string;
      filesize: number;
      filetype: string;
    }>;
  }>;
  timemodified: number;
}

interface QuizGradeResponse {
  hasgrade: boolean;
  grade?: string;
}

interface CourseModule {
  id: number;
  name: string;
  modname: string;
  modplural: string;
  url?: string;
  description?: string;
  visible: number;
  uservisible: boolean;
  availabilityinfo?: string;
  contents?: Array<{
    type: string;
    filename: string;
    filepath: string;
    filesize: number;
    fileurl: string;
    timecreated: number;
    timemodified: number;
    mimetype: string;
  }>;
}

interface CourseSection {
  id: number;
  name: string;
  visible: number;
  summary: string;
  summaryformat: number;
  section: number;
  modules: CourseModule[];
}

interface FileInfo {
  contextid: number;
  component: string;
  filearea: string;
  itemid: number;
  filepath: string;
  filename: string;
  filesize: number;
  fileurl: string;
  timemodified: number;
  mimetype: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  parent: number;
  coursecount: number;
  visible: number;
  depth: number;
  path: string;
}

interface Course {
  id: number;
  fullname: string;
  shortname: string;
  categoryid: number;
  categoryname: string;
  summary: string;
  startdate: number;
  enddate: number;
  visible: number;
  format: string;
}

// NOUVEAU: Interfaces pour extensions
interface ForumPost {
  id: number;
  subject: string;
  message: string;
  userid: number;
  timecreated: number;
}

interface UserActivity {
  userid: number;
  action: string;
  timecreated: number;
  ip: string;
}

interface Completion {
  userid: number;
  completionstate: number; // 0: not started, 1: in progress, 2: completed
  timemodified: number;
}

interface QuizAttempt {
  id: number;
  quiz: number;
  userid: number;
  state: string;
  sumgrades: number;
  timefinish: number;
}

interface AutoCorrectionCriteria {
  referenceText: string; // Sujet de référence
  rubric: Array<{ criteria: string; maxPoints: number }>; // Barème
}

interface AutoCorrectionResult {
  studentId: number;
  similarityScore: number;
  autoGrade: number;
  feedback: string;
  matchesCriteria: Array<{ criteria: string; score: number; feedback: string }>;
}

class MoodleMcpServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'moodle-mcp-server',
        version: '0.4.0',
      },
      {
        capabilities: { tools: {}, },
      }
    );
    this.axiosInstance = axios.create({
      baseURL: MOODLE_API_URL,
      params: {
        wstoken: MOODLE_API_TOKEN,
        moodlewsrestformat: 'json',
      },
    });
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ========== NOUVEAUX OUTILS - CATÉGORIES ET COURS ==========
        {
          name: 'get_categories',
          description: 'Liste toutes les catégories de cours disponibles (ex: Licence 1, Master 2, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              parentId: { type: 'number', description: 'ID de la catégorie parente. Si non spécifié, liste toutes les catégories' },
            },
            required: [],
          },
        },
        {
          name: 'get_courses_in_category',
          description: 'Liste tous les cours dans une catégorie spécifique',
          inputSchema: {
            type: 'object',
            properties: {
              categoryId: { type: 'number', description: 'ID de la catégorie' },
            },
            required: ['categoryId'],
          },
        },
        {
          name: 'get_all_courses',
          description: 'Liste tous les cours auxquels l\'utilisateur a accès',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_course_details',
          description: 'Obtient les détails complets d\'un cours spécifique',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours' },
            },
            required: ['courseId'],
          },
        },
        // ========== OUTILS EXISTANTS (avec support multi-cours) ==========
        {
          name: 'get_students',
          description: 'Obtiene la lista de estudiantes inscritos en un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
            },
            required: [],
          },
        },
        {
          name: 'get_assignments',
          description: 'Obtiene la lista de tareas asignadas en un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
            },
            required: [],
          },
        },
        {
          name: 'get_quizzes',
          description: 'Obtiene la lista de quizzes en un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
            },
            required: [],
          },
        },
        {
          name: 'get_submissions',
          description: 'Obtiene las entregas de tareas en un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              studentId: { type: 'number', description: 'ID opcional del estudiante' },
              assignmentId: { type: 'number', description: 'ID opcional de la tarea' },
            },
            required: [],
          },
        },
        {
          name: 'provide_feedback',
          description: 'Proporciona feedback sobre una tarea entregada por un estudiante',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: { type: 'number', description: 'ID del estudiante' },
              assignmentId: { type: 'number', description: 'ID de la tarea' },
              grade: { type: 'number', description: 'Calificación numérica a asignar' },
              feedback: { type: 'string', description: 'Texto del feedback a proporcionar' },
            },
            required: ['studentId', 'assignmentId', 'feedback'],
          },
        },
        {
          name: 'get_submission_content',
          description: 'Obtiene el contenido detallado de una entrega específica',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: { type: 'number', description: 'ID del estudiante' },
              assignmentId: { type: 'number', description: 'ID de la tarea' },
            },
            required: ['studentId', 'assignmentId'],
          },
        },
        {
          name: 'get_quiz_grade',
          description: 'Obtiene la calificación de un estudiante en un quiz específico',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: { type: 'number', description: 'ID del estudiante' },
              quizId: { type: 'number', description: 'ID del quiz' },
            },
            required: ['studentId', 'quizId'],
          },
        },
        // ========== OUTILS DE GESTION DU CONTENU (avec support multi-cours) ==========
        {
          name: 'get_course_contents',
          description: 'Obtiene el contenido completo de un curso: secciones, módulos, recursos',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              includeContents: { type: 'boolean', description: 'Si es true, incluye el contenido detallado de cada módulo', default: true },
            },
            required: [],
          },
        },
        {
          name: 'get_course_modules',
          description: 'Lista todos los módulos (actividades y recursos) de un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              moduleType: { type: 'string', description: 'Tipo de módulo a filtrar: assign, quiz, resource, folder, page, etc.' },
            },
            required: [],
          },
        },
        {
          name: 'get_course_files',
          description: 'Lista todos los archivos y recursos de un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              fileType: { type: 'string', description: 'Tipo de archivo a filtrar: pdf, doc, docx, ppt, pptx, etc.' },
              sectionId: { type: 'number', description: 'ID de la sección para filtrar archivos' },
            },
            required: [],
          },
        },
        {
          name: 'download_file',
          description: 'Descarga un archivo específico usando su URL de Moodle',
          inputSchema: {
            type: 'object',
            properties: {
              fileUrl: { type: 'string', description: 'URL del archivo obtenida de get_course_files' },
              saveAs: { type: 'string', description: 'Nombre con el que guardar el archivo (opcional)' },
            },
            required: ['fileUrl'],
          },
        },
        {
          name: 'get_module_details',
          description: 'Obtiene información detallada de un módulo específico',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              moduleId: { type: 'number', description: 'ID del módulo (coursemodule ID)' },
            },
            required: ['moduleId'],
          },
        },
        {
          name: 'get_section_contents',
          description: 'Obtiene el contenido de una sección específica de un curso',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              sectionNumber: { type: 'number', description: 'Número de la sección (0, 1, 2, etc.)' },
            },
            required: ['sectionNumber'],
          },
        },
        {
          name: 'get_all_submissions_with_files',
          description: 'Obtiene todas las entregas de un devoir con archivos para corrección automática',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              assignmentId: { type: 'number', description: 'ID del devoir/assignment' },
            },
            required: ['assignmentId'],
          },
        },
        {
          name: 'batch_provide_feedback',
          description: 'Proporciona feedback y calificaciones a múltiples estudiantes',
          inputSchema: {
            type: 'object',
            properties: {
              feedbacks: {
                type: 'array',
                description: 'Array de objetos con studentId, assignmentId, grade y feedback',
                items: {
                  type: 'object',
                  properties: {
                    studentId: { type: 'number' },
                    assignmentId: { type: 'number' },
                    grade: { type: 'number' },
                    feedback: { type: 'string' },
                  },
                },
              },
            },
            required: ['feedbacks'],
          },
        },
        {
          name: 'generate_grades_report',
          description: 'Genera un informe de calificaciones de un curso o devoir',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              assignmentId: { type: 'number', description: 'ID del devoir. Si no se especifica, genera reporte de todo el curso' },
              format: { type: 'string', description: 'Formato del reporte: json, csv, o markdown', enum: ['json', 'csv', 'markdown'], default: 'json' },
            },
            required: [],
          },
        },
        {
          name: 'search_files',
          description: 'Busca archivos en un curso por nombre o extensión',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID del curso. Si no se especifica, usa el curso configurado por defecto' },
              searchTerm: { type: 'string', description: 'Término de búsqueda (nombre de archivo o palabra clave)' },
              fileExtension: { type: 'string', description: 'Extensión de archivo para filtrar: pdf, docx, pptx, etc.' },
            },
            required: [],
          },
        },
        // NOUVEAU: Tools pour ajout de fichiers
        {
          name: 'upload_file_to_course',
          description: 'Ajoute un fichier à un cours ou une section spécifique (e.g., ressource ou devoir)',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours' },
              sectionNumber: { type: 'number', description: 'Numéro de section (optionnel)' },
              fileName: { type: 'string', description: 'Nom du fichier' },
              fileBase64: { type: 'string', description: 'Contenu du fichier en base64' },
              fileType: { type: 'string', description: 'Type MIME (e.g., application/pdf)' },
              moduleType: { type: 'string', description: 'Type de module: resource, assign, etc. (défaut: resource)', enum: ['resource', 'assign'] },
            },
            required: ['courseId', 'fileName', 'fileBase64', 'fileType'],
          },
        },
        // NOUVEAU: Amélioration pour récupération des copies (examens/quizzes)
        {
          name: 'get_quiz_attempts',
          description: 'Récupère toutes les tentatives d\'un quiz pour un étudiant ou un cours',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours (optionnel)' },
              quizId: { type: 'number', description: 'ID du quiz' },
              studentId: { type: 'number', description: 'ID de l\'étudiant (optionnel)' },
            },
            required: ['quizId'],
          },
        },
        // NOUVEAU: Pour rapports de projets (basé sur assign)
        {
          name: 'get_project_reports',
          description: 'Récupère les rapports de projets (soumissions d\'un assign spécifique)',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours (optionnel)' },
              assignmentId: { type: 'number', description: 'ID du devoir/projet' },
            },
            required: ['assignmentId'],
          },
        },
        // NOUVEAU: Correction automatique
        {
          name: 'auto_correct_submissions',
          description: 'Corrige automatiquement les soumissions d\'un devoir en fonction d\'un sujet de référence et barème',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours (optionnel)' },
              assignmentId: { type: 'number', description: 'ID du devoir' },
              referenceText: { type: 'string', description: 'Texte de référence (sujet du prof)' },
              rubric: {
                type: 'array',
                description: 'Barème: critères avec max points',
                items: {
                  type: 'object',
                  properties: { criteria: { type: 'string' }, maxPoints: { type: 'number' } },
                },
              },
            },
            required: ['assignmentId', 'referenceText', 'rubric'],
          },
        },
        {
          name: 'apply_auto_grades',
          description: 'Applique les notes automatiques à un ensemble de soumissions',
          inputSchema: {
            type: 'object',
            properties: {
              corrections: {
                type: 'array',
                description: 'Array de résultats de correction {studentId, assignmentId, grade, feedback}',
                items: {
                  type: 'object',
                  properties: {
                    studentId: { type: 'number' },
                    assignmentId: { type: 'number' },
                    grade: { type: 'number' },
                    feedback: { type: 'string' },
                  },
                },
              },
            },
            required: ['corrections'],
          },
        },
        // NOUVEAU: Extension de grades report avec stats avancées
        {
          name: 'generate_advanced_grades_report',
          description: 'Génère un rapport de notes avancé avec stats, graphiques JSON et export',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number', description: 'ID du cours (optionnel)' },
              assignmentId: { type: 'number', description: 'ID du devoir (optionnel)' },
              format: { type: 'string', enum: ['json', 'csv', 'markdown', 'chartjs'], default: 'json' },
            },
            required: [],
          },
        },
        // NOUVEAU: Gestion utilisateurs
        {
          name: 'create_user',
          description: 'Crée un nouvel utilisateur (étudiant ou prof)',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              firstname: { type: 'string' },
              lastname: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string', enum: ['student', 'teacher'], default: 'student' },
            },
            required: ['username', 'firstname', 'lastname', 'email'],
          },
        },
        {
          name: 'send_message_to_user',
          description: 'Envoie un message instantané à un utilisateur',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'number' },
              message: { type: 'string' },
            },
            required: ['userId', 'message'],
          },
        },
        // NOUVEAU: Forums
        {
          name: 'get_forum_posts',
          description: 'Récupère les posts d\'un forum dans un cours',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number' },
              forumId: { type: 'number', description: 'ID du forum (optionnel, liste tous sinon)' },
            },
            required: ['courseId'],
          },
        },
        {
          name: 'post_to_forum',
          description: 'Publie un post dans un forum',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number' },
              forumId: { type: 'number' },
              subject: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['courseId', 'forumId', 'subject', 'message'],
          },
        },
        // NOUVEAU: Inscriptions
        {
          name: 'enroll_user_to_course',
          description: 'Inscrit un utilisateur à un cours',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'number' },
              courseId: { type: 'number' },
              role: { type: 'string', default: 'student' },
            },
            required: ['userId', 'courseId'],
          },
        },
        // NOUVEAU: Suivi d'achèvement
        {
          name: 'get_course_completion',
          description: 'Récupère l\'état d\'achèvement d\'un cours pour les étudiants',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number' },
            },
            required: ['courseId'],
          },
        },
        // NOUVEAU: Logs d'activité
        {
          name: 'get_user_activity_report',
          description: 'Récupère les logs d\'activité d\'un utilisateur dans un cours',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number' },
              userId: { type: 'number' },
            },
            required: ['courseId', 'userId'],
          },
        },
        // NOUVEAU: Événements calendrier
        {
          name: 'get_calendar_events',
          description: 'Récupère les événements du calendrier pour un cours',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'number' },
            },
            required: ['courseId'],
          },
        },
        // NOUVEAU: Recherche globale
        {
          name: 'global_search',
          description: 'Recherche globale dans Moodle (cours, users, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[Tool] Executing tool: ${request.params.name}`);
      try {
        switch (request.params.name) {
          // Nouveaux outils - Catégories et Cours
          case 'get_categories':
            return await this.getCategories(request.params.arguments);
          case 'get_courses_in_category':
            return await this.getCoursesInCategory(request.params.arguments);
          case 'get_all_courses':
            return await this.getAllCourses();
          case 'get_course_details':
            return await this.getCourseDetails(request.params.arguments);
          // Outils existants
          case 'get_students':
            return await this.getStudents(request.params.arguments);
          case 'get_assignments':
            return await this.getAssignments(request.params.arguments);
          case 'get_quizzes':
            return await this.getQuizzes(request.params.arguments);
          case 'get_submissions':
            return await this.getSubmissions(request.params.arguments);
          case 'provide_feedback':
            return await this.provideFeedback(request.params.arguments);
          case 'get_submission_content':
            return await this.getSubmissionContent(request.params.arguments);
          case 'get_quiz_grade':
            return await this.getQuizGrade(request.params.arguments);
          // Nouveaux outils - Gestion du contenu
          case 'get_course_contents':
            return await this.getCourseContents(request.params.arguments);
          case 'get_course_modules':
            return await this.getCourseModules(request.params.arguments);
          case 'get_course_files':
            return await this.getCourseFiles(request.params.arguments);
          case 'download_file':
            return await this.downloadFile(request.params.arguments);
          case 'get_module_details':
            return await this.getModuleDetails(request.params.arguments);
          case 'get_section_contents':
            return await this.getSectionContents(request.params.arguments);
          case 'get_all_submissions_with_files':
            return await this.getAllSubmissionsWithFiles(request.params.arguments);
          case 'batch_provide_feedback':
            return await this.batchProvideFeedback(request.params.arguments);
          case 'generate_grades_report':
            return await this.generateGradesReport(request.params.arguments);
          case 'search_files':
            return await this.searchFiles(request.params.arguments);
          // NOUVEAU: Switch pour nouveaux tools
          case 'upload_file_to_course':
            return await this.uploadFileToCourse(request.params.arguments);
          case 'get_quiz_attempts':
            return await this.getQuizAttempts(request.params.arguments);
          case 'get_project_reports':
            return await this.getProjectReports(request.params.arguments);
          case 'auto_correct_submissions':
            return await this.autoCorrectSubmissions(request.params.arguments);
          case 'apply_auto_grades':
            return await this.applyAutoGrades(request.params.arguments);
          case 'generate_advanced_grades_report':
            return await this.generateAdvancedGradesReport(request.params.arguments);
          case 'create_user':
            return await this.createUser(request.params.arguments);
          case 'send_message_to_user':
            return await this.sendMessageToUser(request.params.arguments);
          case 'get_forum_posts':
            return await this.getForumPosts(request.params.arguments);
          case 'post_to_forum':
            return await this.postToForum(request.params.arguments);
          case 'enroll_user_to_course':
            return await this.enrollUserToCourse(request.params.arguments);
          case 'get_course_completion':
            return await this.getCourseCompletion(request.params.arguments);
          case 'get_user_activity_report':
            return await this.getUserActivityReport(request.params.arguments);
          case 'get_calendar_events':
            return await this.getCalendarEvents(request.params.arguments);
          case 'global_search':
            return await this.globalSearch(request.params.arguments);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error('[Error]', error);
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `Moodle API error: ${error.response?.data?.message || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  // Fonction helper pour obtenir le courseId (depuis args ou défaut)
  private getCourseId(args?: any): string {
    const courseId = args?.courseId || MOODLE_COURSE_ID;
    if (!courseId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Course ID is required. Either provide courseId parameter or set MOODLE_COURSE_ID environment variable'
      );
    }
    return courseId;
  }

  // ============= NOUVELLES MÉTHODES - CATÉGORIES ET COURS =============
  private async getCategories(args: any) {
    console.error('[API] Requesting categories');
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_categories',
        },
      });
      let categories = response.data;
      // Filtrer par catégorie parente si spécifié
      if (args?.parentId !== undefined) {
        categories = categories.filter((cat: any) => cat.parent === args.parentId);
      }
      const formattedCategories = categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parent: cat.parent,
        coursecount: cat.coursecount,
        visible: cat.visible,
        depth: cat.depth,
        path: cat.path,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalCategories: formattedCategories.length,
                categories: formattedCategories,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener categorías: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCoursesInCategory(args: any) {
    if (!args.categoryId) {
      throw new McpError(ErrorCode.InvalidParams, 'Category ID is required');
    }
    console.error(`[API] Requesting courses in category ${args.categoryId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_courses_by_field',
          field: 'category',
          value: args.categoryId,
        },
      });
      const courses = response.data.courses || [];
      const formattedCourses = courses.map((course: any) => ({
        id: course.id,
        fullname: course.fullname,
        shortname: course.shortname,
        categoryid: course.categoryid,
        summary: course.summary,
        startdate: course.startdate ? new Date(course.startdate * 1000).toISOString() : null,
        enddate: course.enddate ? new Date(course.enddate * 1000).toISOString() : null,
        visible: course.visible,
        format: course.format,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                categoryId: args.categoryId,
                totalCourses: formattedCourses.length,
                courses: formattedCourses,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener cursos de la categoría: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getAllCourses() {
    console.error('[API] Requesting all accessible courses');
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_enrol_get_users_courses',
          userid: 0, // 0 = current user
        },
      });
      const courses = response.data || [];
      // Enrichir avec les informations de catégorie
      const categoriesResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_categories',
        },
      });
      const categoriesMap = new Map();
      categoriesResponse.data.forEach((cat: any) => {
        categoriesMap.set(cat.id, cat.name);
      });
      const formattedCourses = courses.map((course: any) => ({
        id: course.id,
        fullname: course.fullname,
        shortname: course.shortname,
        categoryid: course.category,
        categoryname: categoriesMap.get(course.category) || 'Unknown',
        summary: course.summary,
        startdate: course.startdate ? new Date(course.startdate * 1000).toISOString() : null,
        enddate: course.enddate ? new Date(course.enddate * 1000).toISOString() : null,
        visible: course.visible,
        format: course.format,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalCourses: formattedCourses.length,
                courses: formattedCourses,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener todos los cursos: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCourseDetails(args: any) {
    if (!args.courseId) {
      throw new McpError(ErrorCode.InvalidParams, 'Course ID is required');
    }
    console.error(`[API] Requesting details for course ${args.courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_courses_by_field',
          field: 'id',
          value: args.courseId,
        },
      });
      const courses = response.data.courses || [];
      if (courses.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Course with ID ${args.courseId} not found`,
            },
          ],
          isError: true,
        };
      }
      const course = courses[0];
      const courseDetails = {
        id: course.id,
        fullname: course.fullname,
        shortname: course.shortname,
        categoryid: course.categoryid,
        summary: course.summary,
        startdate: course.startdate ? new Date(course.startdate * 1000).toISOString() : null,
        enddate: course.enddate ? new Date(course.enddate * 1000).toISOString() : null,
        visible: course.visible,
        format: course.format,
        showgrades: course.showgrades,
        lang: course.lang,
        enablecompletion: course.enablecompletion,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(courseDetails, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener detalles del curso: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  // ============= MÉTHODES EXISTANTES (avec support multi-cours) =============
  private async getStudents(args?: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting enrolled users for course ${courseId}`);
    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'core_enrol_get_enrolled_users',
        courseid: courseId,
      },
    });
    const students = response.data
      .filter((user: any) => user.roles.some((role: any) => role.shortname === 'student'))
      .map((student: any) => ({
        id: student.id,
        username: student.username,
        firstname: student.firstname,
        lastname: student.lastname,
        email: student.email,
      }));
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              courseId: courseId,
              totalStudents: students.length,
              students: students,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAssignments(args?: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting assignments for course ${courseId}`);
    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_get_assignments',
        courseids: [courseId],
      },
    });
    const assignments = response.data.courses[0]?.assignments || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              courseId: courseId,
              totalAssignments: assignments.length,
              assignments: assignments,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getQuizzes(args?: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting quizzes for course ${courseId}`);
    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_quiz_get_quizzes_by_courses',
        courseids: [courseId],
      },
    });
    const quizzes = response.data.quizzes || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              courseId: courseId,
              totalQuizzes: quizzes.length,
              quizzes: quizzes,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getSubmissions(args: any) {
    const courseId = this.getCourseId(args);
    const studentId = args?.studentId;
    const assignmentId = args?.assignmentId;
    console.error(`[API] Requesting submissions for course ${courseId}`);
    const assignmentsResponse = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_get_assignments',
        courseids: [courseId],
      },
    });
    const assignments = assignmentsResponse.data.courses[0]?.assignments || [];
    const targetAssignments = assignmentId ? assignments.filter((a: any) => a.id === assignmentId) : assignments;
    if (targetAssignments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No se encontraron tareas para el criterio especificado.',
          },
        ],
      };
    }
    const submissionsPromises = targetAssignments.map(async (assignment: any) => {
      const submissionsResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_assign_get_submissions',
          assignmentids: [assignment.id],
        },
      });
      const submissions = submissionsResponse.data.assignments[0]?.submissions || [];
      const gradesResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_assign_get_grades',
          assignmentids: [assignment.id],
        },
      });
      const grades = gradesResponse.data.assignments[0]?.grades || [];
      const targetSubmissions = studentId ? submissions.filter((s: any) => s.userid === studentId) : submissions;
      const processedSubmissions = targetSubmissions.map((submission: any) => {
        const studentGrade = grades.find((g: any) => g.userid === submission.userid);
        return {
          userid: submission.userid,
          status: submission.status,
          timemodified: new Date(submission.timemodified * 1000).toISOString(),
          grade: studentGrade ? studentGrade.grade : 'No calificado',
        };
      });
      return {
        assignment: assignment.name,
        assignmentId: assignment.id,
        submissions: processedSubmissions.length > 0 ? processedSubmissions : 'No hay entregas',
      };
    });
    const results = await Promise.all(submissionsPromises);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              courseId: courseId,
              results: results,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async provideFeedback(args: any) {
    if (!args.studentId || !args.assignmentId || !args.feedback) {
      throw new McpError(ErrorCode.InvalidParams, 'Student ID, Assignment ID, and feedback are required');
    }
    console.error(`[API] Providing feedback for student ${args.studentId} on assignment ${args.assignmentId}`);
    await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_save_grade',
        assignmentid: args.assignmentId,
        userid: args.studentId,
        grade: args.grade || 0,
        attemptnumber: -1,
        addattempt: 0,
        workflowstate: 'released',
        applytoall: 0,
        plugindata: {
          assignfeedbackcomments_editor: {
            text: args.feedback,
            format: 1,
          },
        },
      },
    });
    return {
      content: [
        {
          type: 'text',
          text: `Feedback proporcionado correctamente para el estudiante ${args.studentId} en la tarea ${args.assignmentId}.`,
        },
      ],
    };
  }

  private async getSubmissionContent(args: any) {
    if (!args.studentId || !args.assignmentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Student ID and Assignment ID are required');
    }
    console.error(`[API] Requesting submission content for student ${args.studentId} on assignment ${args.assignmentId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_assign_get_submission_status',
          assignid: args.assignmentId,
          userid: args.studentId,
        },
      });
      const submissionData = response.data.submission || {};
      const plugins = response.data.lastattempt?.submission?.plugins || [];
      let submissionText = '';
      const files = [];
      for (const plugin of plugins) {
        if (plugin.type === 'onlinetext') {
          const textField = plugin.editorfields?.find((field: any) => field.name === 'onlinetext');
          if (textField) {
            submissionText = textField.text || '';
          }
        }
        if (plugin.type === 'file') {
          const filesList = plugin.fileareas?.find((area: any) => area.area === 'submission_files');
          if (filesList && filesList.files) {
            for (const file of filesList.files) {
              files.push({
                filename: file.filename,
                fileurl: file.fileurl,
                filesize: file.filesize,
                filetype: file.mimetype,
              });
            }
          }
        }
      }
      const submissionContent = {
        assignment: args.assignmentId,
        userid: args.studentId,
        status: submissionData.status || 'unknown',
        submissiontext: submissionText,
        plugins: [
          {
            type: 'onlinetext',
            content: submissionText,
          },
          {
            type: 'file',
            files: files,
          },
        ],
        timemodified: submissionData.timemodified || 0,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(submissionContent, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener el contenido de la entrega: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getQuizGrade(args: any) {
    if (!args.studentId || !args.quizId) {
      throw new McpError(ErrorCode.InvalidParams, 'Student ID and Quiz ID are required');
    }
    console.error(`[API] Requesting quiz grade for student ${args.studentId} on quiz ${args.quizId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_quiz_get_user_best_grade',
          quizid: args.quizId,
          userid: args.studentId,
        },
      });
      const result = {
        quizId: args.quizId,
        studentId: args.studentId,
        hasGrade: response.data.hasgrade,
        grade: response.data.hasgrade ? response.data.grade : 'No calificado',
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener la calificación del quiz: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  // ============= NOUVELLES MÉTHODES - GESTION DU CONTENU (avec support multi-cours) =============
  private async getCourseContents(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting course contents for course ${courseId}`);
    const includeContents = args?.includeContents !== false;
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      const sections: CourseSection[] = response.data.map((section: any) => ({
        id: section.id,
        name: section.name,
        visible: section.visible,
        summary: section.summary,
        summaryformat: section.summaryformat,
        section: section.section,
        modules: section.modules.map((module: any) => ({
          id: module.id,
          name: module.name,
          modname: module.modname,
          modplural: module.modplural,
          url: module.url,
          description: module.description,
          visible: module.visible,
          uservisible: module.uservisible,
          availabilityinfo: module.availabilityinfo,
          contents: includeContents ? module.contents : undefined,
        })),
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                totalSections: sections.length,
                sections: sections,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener contenidos del curso: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCourseModules(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting course modules for course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      let allModules: any[] = [];
      response.data.forEach((section: any) => {
        section.modules.forEach((module: any) => {
          allModules.push({
            id: module.id,
            name: module.name,
            modname: module.modname,
            modplural: module.modplural,
            url: module.url,
            description: module.description,
            visible: module.visible,
            section: section.name,
            sectionNumber: section.section,
            contents: module.contents,
          });
        });
      });
      // Filtrer par type de module si spécifié
      if (args?.moduleType) {
        allModules = allModules.filter((module) => module.modname === args.moduleType);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                totalModules: allModules.length,
                modules: allModules,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener módulos del curso: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCourseFiles(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting course files for course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      let allFiles: any[] = [];
      response.data.forEach((section: any) => {
        // Filtrer par section si spécifié
        if (args?.sectionId && section.id !== args.sectionId) {
          return;
        }
        section.modules.forEach((module: any) => {
          if (module.contents && module.contents.length > 0) {
            module.contents.forEach((content: any) => {
              if (content.type === 'file') {
                const fileExtension = content.filename.split('.').pop()?.toLowerCase();
                // Filtrer par type de fichier si spécifié
                if (args?.fileType && fileExtension !== args.fileType.toLowerCase()) {
                  return;
                }
                allFiles.push({
                  filename: content.filename,
                  filepath: content.filepath,
                  filesize: content.filesize,
                  fileurl: content.fileurl,
                  timemodified: new Date(content.timemodified * 1000).toISOString(),
                  mimetype: content.mimetype,
                  extension: fileExtension,
                  module: module.name,
                  moduletype: module.modname,
                  section: section.name,
                  sectionNumber: section.section,
                });
              }
            });
          }
        });
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                totalFiles: allFiles.length,
                files: allFiles,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener archivos del curso: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async downloadFile(args: any) {
    if (!args.fileUrl) {
      throw new McpError(ErrorCode.InvalidParams, 'File URL is required');
    }
    console.error(`[API] Downloading file from ${args.fileUrl}`);
    try {
      let downloadUrl = args.fileUrl;
      if (!downloadUrl.includes('token=')) {
        const separator = downloadUrl.includes('?') ? '&' : '?';
        downloadUrl = `${downloadUrl}${separator}token=${MOODLE_API_TOKEN}`;
      }
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
      });
      const base64Data = Buffer.from(response.data).toString('base64');
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const filename = args.saveAs || args.fileUrl.split('/').pop() || 'downloaded_file';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                filename: filename,
                contentType: contentType,
                size: response.data.length,
                base64Data: base64Data,
                message: 'Fichier téléchargé avec succès. Les données sont encodées en base64.',
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al descargar archivo: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getModuleDetails(args: any) {
    const courseId = this.getCourseId(args);
    if (!args.moduleId) {
      throw new McpError(ErrorCode.InvalidParams, 'Module ID is required');
    }
    console.error(`[API] Requesting details for module ${args.moduleId} in course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      let moduleDetails = null;
      for (const section of response.data) {
        const module = section.modules.find((m: any) => m.id === args.moduleId);
        if (module) {
          moduleDetails = {
            ...module,
            sectionName: section.name,
            sectionNumber: section.section,
          };
          break;
        }
      }
      if (!moduleDetails) {
        return {
          content: [
            {
              type: 'text',
              text: `Module con ID ${args.moduleId} no encontrado en curso ${courseId}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                module: moduleDetails,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener detalles del módulo: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getSectionContents(args: any) {
    const courseId = this.getCourseId(args);
    if (args.sectionNumber === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Section number is required');
    }
    console.error(`[API] Requesting contents for section ${args.sectionNumber} in course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      const section = response.data.find((s: any) => s.section === args.sectionNumber);
      if (!section) {
        return {
          content: [
            {
              type: 'text',
              text: `Sección ${args.sectionNumber} no encontrada en curso ${courseId}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                section: section,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener contenido de la sección: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getAllSubmissionsWithFiles(args: any) {
    const courseId = this.getCourseId(args);
    if (!args.assignmentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Assignment ID is required');
    }
    console.error(`[API] Requesting all submissions with files for assignment ${args.assignmentId} in course ${courseId}`);
    try {
      const studentsResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_enrol_get_enrolled_users',
          courseid: courseId,
        },
      });
      const students = studentsResponse.data.filter((user: any) => user.roles.some((role: any) => role.shortname === 'student'));
      const submissionsPromises = students.map(async (student: any) => {
        try {
          const submissionResponse = await this.axiosInstance.get('', {
            params: {
              wsfunction: 'mod_assign_get_submission_status',
              assignid: args.assignmentId,
              userid: student.id,
            },
          });
          const submissionData = submissionResponse.data.submission || {};
          const plugins = submissionResponse.data.lastattempt?.submission?.plugins || [];
          let submissionText = '';
          const files = [];
          for (const plugin of plugins) {
            if (plugin.type === 'onlinetext') {
              const textField = plugin.editorfields?.find((field: any) => field.name === 'onlinetext');
              if (textField) {
                submissionText = textField.text || '';
              }
            }
            if (plugin.type === 'file') {
              const filesList = plugin.fileareas?.find((area: any) => area.area === 'submission_files');
              if (filesList && filesList.files) {
                for (const file of filesList.files) {
                  files.push({
                    filename: file.filename,
                    fileurl: file.fileurl,
                    filesize: file.filesize,
                    filetype: file.mimetype,
                  });
                }
              }
            }
          }
          return {
            studentId: student.id,
            studentName: `${student.firstname} ${student.lastname}`,
            studentEmail: student.email,
            status: submissionData.status || 'no submission',
            submissionText: submissionText,
            files: files,
            timemodified: submissionData.timemodified ? new Date(submissionData.timemodified * 1000).toISOString() : null,
          };
        } catch (error) {
          console.error(`Error getting submission for student ${student.id}:`, error);
          return {
            studentId: student.id,
            studentName: `${student.firstname} ${student.lastname}`,
            studentEmail: student.email,
            status: 'error',
            error: 'Could not retrieve submission',
          };
        }
      });
      const submissions = await Promise.all(submissionsPromises);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                assignmentId: args.assignmentId,
                totalStudents: students.length,
                submissions: submissions,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener entregas: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async batchProvideFeedback(args: any) {
    if (!args.feedbacks || !Array.isArray(args.feedbacks)) {
      throw new McpError(ErrorCode.InvalidParams, 'Feedbacks array is required');
    }
    console.error(`[API] Providing batch feedback for ${args.feedbacks.length} students`);
    const results = [];
    for (const feedback of args.feedbacks) {
      try {
        await this.axiosInstance.get('', {
          params: {
            wsfunction: 'mod_assign_save_grade',
            assignmentid: feedback.assignmentId,
            userid: feedback.studentId,
            grade: feedback.grade || 0,
            attemptnumber: -1,
            addattempt: 0,
            workflowstate: 'released',
            applytoall: 0,
            plugindata: {
              assignfeedbackcomments_editor: {
                text: feedback.feedback,
                format: 1,
              },
            },
          },
        });
        results.push({
          studentId: feedback.studentId,
          assignmentId: feedback.assignmentId,
          status: 'success',
          message: 'Feedback proporcionado correctamente',
        });
      } catch (error) {
        console.error(`Error providing feedback for student ${feedback.studentId}:`, error);
        results.push({
          studentId: feedback.studentId,
          assignmentId: feedback.assignmentId,
          status: 'error',
          message: axios.isAxiosError(error)
            ? error.response?.data?.message || (error as Error).message
            : 'Unknown error',
        });
      }
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total: args.feedbacks.length,
              successful: results.filter((r) => r.status === 'success').length,
              failed: results.filter((r) => r.status === 'error').length,
              results: results,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async generateGradesReport(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Generating grades report for course ${courseId}`);
    try {
      const studentsResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_enrol_get_enrolled_users',
          courseid: courseId,
        },
      });
      const students = studentsResponse.data.filter((user: any) =>
        user.roles.some((role: any) => role.shortname === 'student')
      );
      let report: any = {
        courseId: courseId,
        generatedAt: new Date().toISOString(),
        totalStudents: students.length,
        students: [],
      };
      if (args.assignmentId) {
        const gradesResponse = await this.axiosInstance.get('', {
          params: {
            wsfunction: 'mod_assign_get_grades',
            assignmentids: [args.assignmentId],
          },
        });
        const grades = gradesResponse.data.assignments[0]?.grades || [];
        report.assignmentId = args.assignmentId;
        report.students = students.map((student: any) => {
          const studentGrade = grades.find((g: any) => g.userid === student.id);
          return {
            id: student.id,
            name: `${student.firstname} ${student.lastname}`,
            email: student.email,
            grade: studentGrade ? studentGrade.grade : 'No calificado',
            attemptnumber: studentGrade ? studentGrade.attemptnumber : 0,
            timemodified: studentGrade ? new Date(studentGrade.timemodified * 1000).toISOString() : null,
          };
        });
        const numericGrades = report.students
          .map((s: any) => parseFloat(s.grade))
          .filter((g: number) => !isNaN(g));
        if (numericGrades.length > 0) {
          report.statistics = {
            average: (numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length).toFixed(2),
            max: Math.max(...numericGrades),
            min: Math.min(...numericGrades),
            gradedStudents: numericGrades.length,
            ungradedStudents: students.length - numericGrades.length,
          };
        }
      } else {
        const assignmentsResponse = await this.axiosInstance.get('', {
          params: {
            wsfunction: 'mod_assign_get_assignments',
            courseids: [courseId],
          },
        });
        const assignments = assignmentsResponse.data.courses[0]?.assignments || [];
        report.totalAssignments = assignments.length;
        report.assignments = [];
        for (const assignment of assignments) {
          const gradesResponse = await this.axiosInstance.get('', {
            params: {
              wsfunction: 'mod_assign_get_grades',
              assignmentids: [assignment.id],
            },
          });
          const grades = gradesResponse.data.assignments[0]?.grades || [];
          const numericGrades = grades
            .map((g: any) => parseFloat(g.grade))
            .filter((g: number) => !isNaN(g));
          report.assignments.push({
            id: assignment.id,
            name: assignment.name,
            duedate: assignment.duedate ? new Date(assignment.duedate * 1000).toISOString() : null,
            submissions: grades.length,
            averageGrade: numericGrades.length > 0
              ? (numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length).toFixed(2)
              : 'N/A',
          });
        }
      }
      const format = args.format || 'json';
      if (format === 'csv') {
        let csv = 'ID,Nom,Email,Note\n';
        report.students.forEach((s: any) => {
          csv += `${s.id},"${s.name}",${s.email},${s.grade}\n`;
        });
        return {
          content: [
            {
              type: 'text',
              text: csv,
            },
          ],
        };
      } else if (format === 'markdown') {
        let md = `# Rapport de notes\n\n`;
        md += `- Cours ID: ${report.courseId}\n`;
        md += `- Généré le: ${report.generatedAt}\n`;
        md += `- Total étudiants: ${report.totalStudents}\n\n`;
        if (report.statistics) {
          md += `## Statistiques\n\n`;
          md += `- Moyenne: ${report.statistics.average}\n`;
          md += `- Maximum: ${report.statistics.max}\n`;
          md += `- Minimum: ${report.statistics.min}\n`;
          md += `- Étudiants notés: ${report.statistics.gradedStudents}\n`;
          md += `- Étudiants non notés: ${report.statistics.ungradedStudents}\n\n`;
        }
        md += `## Étudiants\n\n`;
        md += `| ID | Nom | Email | Note |\n`;
        md += `|----|-----|-------|------|\n`;
        report.students.forEach((s: any) => {
          md += `| ${s.id} | ${s.name} | ${s.email} | ${s.grade} |\n`;
        });
        return {
          content: [
            {
              type: 'text',
              text: md,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al generar reporte: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async searchFiles(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Searching files in course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_course_get_contents',
          courseid: courseId,
        },
      });
      let matchingFiles: any[] = [];
      response.data.forEach((section: any) => {
        section.modules.forEach((module: any) => {
          if (module.contents && module.contents.length > 0) {
            module.contents.forEach((content: any) => {
              if (content.type === 'file') {
                const fileExtension = content.filename.split('.').pop()?.toLowerCase();
                let matches = true;
                if (args.searchTerm) {
                  const searchLower = args.searchTerm.toLowerCase();
                  matches =
                    content.filename.toLowerCase().includes(searchLower) || module.name.toLowerCase().includes(searchLower);
                }
                if (args.fileExtension && matches) {
                  matches = fileExtension === args.fileExtension.toLowerCase();
                }
                if (matches) {
                  matchingFiles.push({
                    filename: content.filename,
                    filepath: content.filepath,
                    filesize: content.filesize,
                    fileurl: content.fileurl,
                    timemodified: new Date(content.timemodified * 1000).toISOString(),
                    mimetype: content.mimetype,
                    extension: fileExtension,
                    module: module.name,
                    moduletype: module.modname,
                    section: section.name,
                  });
                }
              }
            });
          }
        });
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                courseId: courseId,
                searchTerm: args.searchTerm || 'N/A',
                fileExtension: args.fileExtension || 'N/A',
                totalResults: matchingFiles.length,
                files: matchingFiles,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al buscar archivos: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  // NOUVEAU: Méthodes pour nouveaux tools (avec fixes)
  private async uploadFileToCourse(args: any) {
    const courseId = args.courseId || MOODLE_COURSE_ID;
    if (!courseId) throw new McpError(ErrorCode.InvalidParams, 'Course ID required');
    const sectionNumber = args.sectionNumber || 0;
    const moduleType = args.moduleType || 'resource';
    console.error(`[API] Uploading file to course ${courseId}, section ${sectionNumber}`);
    const fileBuffer = Buffer.from(args.fileBase64, 'base64');
    try {
      // FIX: Utilise FormData pour multipart/form-data correct
      const form = new FormData();
      form.append('wsfunction', 'core_files_upload');
      form.append('filepath', '/');
      form.append('filearea', 'draft');
      form.append('itemid', '0'); // String pour FormData
      form.append('filename', args.fileName);
      form.append('file', fileBuffer, {
        filename: args.fileName,
        contentType: args.fileType,
      });
      const uploadResponse = await this.axiosInstance.post('', form, {
        headers: form.getHeaders(),
      });
      // Puis attacher à un module si moduleType
      if (moduleType === 'assign') {
        // Logique pour attacher à un assign (via mod_assign_update_submission ou similaire)
        // À implémenter selon besoins spécifiques
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                fileId: uploadResponse.data.fileid,
                url: uploadResponse.data.url,
                message: 'Fichier uploadé avec succès',
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      throw new McpError(ErrorCode.InternalError, `Upload failed: ${(error as Error).message}`);
    }
  }

  private async getQuizAttempts(args: any) {
    const quizId = args.quizId;
    const studentId = args.studentId;
    const courseId = args.courseId || MOODLE_COURSE_ID;
    console.error(`[API] Getting quiz attempts for quiz ${quizId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_quiz_get_user_attempts',
          quizid: quizId,
          userid: studentId || 0, // 0 pour tous
        },
      });
      const attempts: QuizAttempt[] = response.data.attempts || [];
      const formatted = attempts.map(a => ({
        id: a.id,
        quiz: a.quiz,
        userid: a.userid,
        state: a.state,
        sumgrades: a.sumgrades,
        timefinish: a.timefinish ? new Date(a.timefinish * 1000).toISOString() : null,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { courseId, quizId, totalAttempts: formatted.length, attempts: formatted },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [{ type: 'text', text: `Error: ${error.response?.data?.message || (error as Error).message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getProjectReports(args: any) {
    // Réutilise get_all_submissions_with_files mais filtre pour "rapports" (e.g., via noms de fichiers)
    // FIX: Appel correct du nom de méthode
    const allSubs = await this.getAllSubmissionsWithFiles({ ...args });
    // Filtre simple pour "reports" (ajuste selon besoins)
    const submissions = JSON.parse(allSubs.content[0].text).submissions.filter((sub: any) =>
      sub.files.some((f: any) => f.filename.toLowerCase().includes('report') || sub.submissionText?.includes('rapport'))
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ...JSON.parse(allSubs.content[0].text), submissions }, null, 2),
        },
      ],
    };
  }

  private async autoCorrectSubmissions(args: any) {
    const assignmentId = args.assignmentId;
    const referenceText = args.referenceText;
    const rubric = args.rubric;
    console.error(`[API] Auto-correcting submissions for assignment ${assignmentId}`);
    try {
      // Récupère toutes les soumissions
      // FIX: Appel correct
      const subsResponse = await this.getAllSubmissionsWithFiles({ assignmentId });
      const submissions = JSON.parse(subsResponse.content[0].text).submissions;
      const results: AutoCorrectionResult[] = [];
      for (const sub of submissions) {
        let text = sub.submissionText || '';
        // Si fichiers, suppose texte extrait (à étendre avec OCR si PDF, mais simple ici)
        const score = cosineSimilarity(text, referenceText);
        // Applique barème : score global pondéré
        let autoGrade = 0;
        const matches: Array<{ criteria: string; score: number; feedback: string }> = [];
        // FIX: Type pour crit
        rubric.forEach((crit: { criteria: string; maxPoints: number }) => {
          const critScore = score * crit.maxPoints; // Simplifié ; utilise keywords matching pour plus de précision
          autoGrade += critScore;
          matches.push({
            criteria: crit.criteria,
            score: critScore,
            feedback: score > 0.7 ? 'Bon alignement' : 'Améliorer',
          });
        });
        results.push({
          studentId: sub.studentId,
          similarityScore: score,
          autoGrade: Math.min(autoGrade, 20), // Assume /20
          feedback: `Score de similarité: ${(score * 100).toFixed(1)}%`,
          matchesCriteria: matches,
        });
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ assignmentId, totalSubmissions: results.length, corrections: results }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      throw new McpError(ErrorCode.InternalError, `Auto-correction failed: ${(error as Error).message}`);
    }
  }

  private async applyAutoGrades(args: any) {
    const corrections = args.corrections;
    console.error(`[API] Applying auto grades for ${corrections.length} submissions`);
    const results = [];
    for (const corr of corrections) {
      try {
        // FIX: Appel correct
        await this.provideFeedback({
          studentId: corr.studentId,
          assignmentId: corr.assignmentId,
          grade: corr.grade,
          feedback: corr.feedback,
        });
        results.push({ studentId: corr.studentId, status: 'success' });
      } catch (error) {
        results.push({ studentId: corr.studentId, status: 'error', message: (error as Error).message });
      }
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ total: corrections.length, results }, null, 2),
        },
      ],
    };
  }

  private async generateAdvancedGradesReport(args: any) {
    // Extension de ton generateGradesReport existant
    // FIX: Appel correct
    const baseReport = await this.generateGradesReport(args);
    const courseId = args.courseId || MOODLE_COURSE_ID;
    const report = JSON.parse(baseReport.content[0].text);
    // Ajoute stats avancées et chart JSON si format 'chartjs'
    if (args.format === 'chartjs') {
      // Exemple de config Chart.js pour grades (basé sur tes données)
      const gradesData = report.students
        .map((s: any) => parseFloat(s.grade) || 0)
        .filter((g: number) => !isNaN(g)); // FIX: Type number pour g
      const chartConfig = {
        type: 'bar',
        data: {
          labels: report.students.map((s: any) => s.name.substring(0, 10)), // Noms courts
          datasets: [{ label: 'Notes', data: gradesData, backgroundColor: 'rgba(75,192,192,0.2)' }],
        },
        options: { scales: { y: { beginAtZero: true } } },
      };
      return {
        content: [
          { type: 'text', text: JSON.stringify({ report, chart: chartConfig }, null, 2) },
        ],
      };
    }
    return baseReport; // Autres formats inchangés
  }

  private async createUser(args: any) {
    console.error(`[API] Creating user ${args.username}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_user_create_users',
          users: [{ username: args.username, firstname: args.firstname, lastname: args.lastname, email: args.email }],
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, userId: response.data[0].id }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [{ type: 'text', text: `Error: ${error.response?.data?.message || (error as Error).message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async sendMessageToUser(args: any) {
    console.error(`[API] Sending message to user ${args.userId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_message_send_instant_messages',
          messages: [{ to_user_id: args.userId, message: args.message }],
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, messageId: response.data.messages[0].id }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      throw new McpError(ErrorCode.InternalError, `Send failed: ${(error as Error).message}`);
    }
  }

  private async getForumPosts(args: any) {
    const courseId = args.courseId;
    const forumId = args.forumId;
    console.error(`[API] Getting forum posts for course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_forum_get_discussion_posts',
          discussionid: forumId || 0, // Si 0, liste forums d'abord
        },
      });
      const posts: ForumPost[] = response.data.posts || [];
      const formatted = posts.map(p => ({
        id: p.id,
        subject: p.subject,
        message: p.message,
        userid: p.userid,
        timecreated: new Date(p.timecreated * 1000).toISOString(),
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ courseId, totalPosts: formatted.length, posts: formatted }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [{ type: 'text', text: `Error: ${error.response?.data?.message || (error as Error).message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async postToForum(args: any) {
    console.error(`[API] Posting to forum ${args.forumId}`);
    // Implémentation basique via mod_forum_add_discussion_post (adapte les params)
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_forum_add_discussion_post',
          forumid: args.forumId,
          subject: args.subject,
          message: args.message,
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, postId: response.data.postid }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error posting to forum: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async enrollUserToCourse(args: any) {
    console.error(`[API] Enrolling user ${args.userId} to course ${args.courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'enrol_manual_enrol_users',
          enrolments: [{ userid: args.userId, courseid: args.courseId, roleid: 5 }], // 5 = student
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, enrolmentId: response.data[0].id }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error enrolling user: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCourseCompletion(args: any) {
    const courseId = args.courseId;
    console.error(`[API] Getting course completion for course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'completion_get_course_completion_status',
          courseid: courseId,
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ courseId, completions: response.data || [] }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting completion: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getUserActivityReport(args: any) {
    const courseId = args.courseId;
    const userId = args.userId;
    console.error(`[API] Getting activity report for user ${userId} in course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'report_log_live_get_logs_user_course',
          userid: userId,
          courseid: courseId,
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ courseId, userId, activities: response.data.logs || [] }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting activity: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async getCalendarEvents(args: any) {
    const courseId = args.courseId;
    console.error(`[API] Getting calendar events for course ${courseId}`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_calendar_get_calendar_events',
          courseid: courseId,
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ courseId, events: response.data.events || [] }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting events: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async globalSearch(args: any) {
    const query = args.query;
    console.error(`[API] Global search for "${query}"`);
    try {
      const response = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'core_search_perform_search',
          query: query,
        },
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ query, results: response.data || [] }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('[Error]', error);
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching: ${error.response?.data?.message || (error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Moodle MCP server running on stdio (version étendue)');
  }
}

const server = new MoodleMcpServer();
server.run().catch(console.error);
