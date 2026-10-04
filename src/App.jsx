import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Analytics } from '@vercel/analytics/react';
import { useFaujPrepData } from './hooks/useFaujPrepData';
import AdminContentManager from './components/AdminContentManager';
import AdminAnalyticsPanel from './components/AdminAnalyticsPanel';
import AdminNotificationsPanel from './components/AdminNotificationsPanel';
import NotificationCenter from './components/NotificationCenter';
import QuestionCard from './components/QuestionCard';
import { ACADEMIC_PORTION_MOCK_TEST_1 } from './data/academicPortionMockTest1';
import { ACADEMIC_PORTION_MOCK_TEST_2 } from './data/academicPortionMockTest2';
import { PMA_LONG_COURSE_159_MOCK_TEST_2 } from './data/pmaLongCourse159MockTest2';
import { MOST_REPEATED_PHYSICS_PRACTICE } from './data/mostRepeatedPhysicsMcqs';
import { evaluateQuestionAnswer, getCurrentAffairBySlug, getCurrentAffairsPage, getDashboardSummary, getISSBModuleBySlug, getMockTestQuestions, getMockTestReview, getPracticeQuestions, getStudyMaterialBySlug, getStudyMaterialsPage, getSubjectsForBranch, getTopics, saveMockTestAnswer, searchContent, signIn, signOut, startMockTest, submitMockTest, updateProfile } from './lib/queries';
import { approveMockTestPurchase, approvePaymentTransaction, createPlanCheckout, formatPKR, getAdminPaymentQueue, getCurrentUserSubscription, getMyMockTestPurchases, getMyPaymentTransactions, getPaidMockTestQuestions, getPaymentSettings, getPlanCatalog, rejectMockTestPurchase, rejectPaymentTransaction, submitManualPaymentProof, submitMockTestPaymentProof, upsertPaymentSettings } from './lib/subscriptions';
import { applySeoMetadata, getPageSeo } from './lib/seo';
import { isPrimaryAdmin, PRIMARY_ADMIN_EMAIL } from './lib/adminAccess';
import { ensureAnonymousSession } from './lib/supabase';
import { getMyUnreadNotificationCount } from './lib/notifications';
import { trackAnalyticsEvent, trackPageView } from './lib/analytics';
import { ANALYTICS_EVENTS } from './lib/analytics-events';
import {
  Shield,
  BookOpen,
  Target,
  Award,
  CheckCircle,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Lock,
  User,
  Mail,
  FileText,
  Compass,
  Zap,
  BarChart2,
  HelpCircle,
  Info,
  ExternalLink,
  Clock,
  Sliders,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Send,
  Layers,
  Sparkles,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  RefreshCw,
  SlidersHorizontal,
  Bookmark,
  Share2,
  ArrowUpRight
} from 'lucide-react';

const FaujPrepLogo = ({ className = "h-14 w-14", textClassName = "text-xl font-bold" }) => (
  <div className="flex items-center gap-2.5 cursor-pointer group">
    <div className={`relative shrink-0 ${className}`}>
      <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-500 opacity-30 blur-sm group-hover:opacity-75 transition duration-300"></div>
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-slate-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/50">
        <img
          src="/images/website%20logo.png"
          alt=""
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-[165%] w-auto max-w-none -translate-y-1/2"
        />
      </div>
    </div>
    <div className="flex flex-col">
      <span className={`${textClassName} tracking-tight font-serif text-slate-100 flex items-center gap-0.5`}>
        Fauj<span className="text-emerald-400 font-sans font-extrabold">Prep</span>
      </span>
      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono -mt-1">
        Forces Prep Platform
      </span>
    </div>
  </div>
);

const Breadcrumbs = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
    <ol className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden="true" className="text-slate-600">/</span>}
          {index === items.length - 1 ? (
            <span aria-current="page" className="text-slate-200">{item.label}</span>
          ) : (
            <a href={item.href} className="hover:text-emerald-400">{item.label}</a>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

const renderGuideInlineText = (text) => String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={index} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>
    : part
));

const renderStudyGuideContent = (content) => String(content || '').split(/\r?\n/).map((rawLine, index) => {
  const line = rawLine.trim();
  if (!line) return null;

  if (line.startsWith('SOURCE|')) {
    const [, url, label] = line.split('|');
    const validUrl = /^https:\/\/[A-Za-z0-9.-]+(?:\/[^\s]*)?$/.test(url || '');
    return validUrl ? (
      <p key={index} className="text-sm leading-6 text-slate-400">
        Reference: <a href={url} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-4">{label || url}</a>
      </p>
    ) : null;
  }

  if (line.startsWith('## ')) return <h2 key={index} className="pt-4 text-2xl font-bold leading-tight text-slate-100">{renderGuideInlineText(line.slice(3))}</h2>;
  if (line.startsWith('### ')) return <h3 key={index} className="pt-2 text-xl font-bold leading-tight text-slate-100">{renderGuideInlineText(line.slice(4))}</h3>;
  if (line.startsWith('IMPORTANT:') || line.startsWith('METHOD:') || line.startsWith('REMEMBER:')) {
    const [label, ...body] = line.split(':');
    return (
      <aside key={index} className="rounded-r-lg border-l-4 border-amber-400 bg-amber-400/10 px-4 py-3 text-base leading-7 text-amber-50">
        <strong className="mr-2 text-amber-300">{label}:</strong>{renderGuideInlineText(body.join(':').trim())}
      </aside>
    );
  }
  if (line.startsWith('- ')) {
    return <p key={index} className="flex gap-3 text-base leading-7 text-slate-200"><span aria-hidden="true" className="text-emerald-400">•</span><span>{renderGuideInlineText(line.slice(2))}</span></p>;
  }
  return <p key={index} className="text-base leading-8 text-slate-200">{renderGuideInlineText(line)}</p>;
});

const FORCE_CARD_BACKGROUNDS = {
  army: "linear-gradient(135deg, rgba(2, 6, 23, 0.28), rgba(2, 44, 50, 0.18)), url('/images/pakistan%20army%20section.png')",
  paf: "linear-gradient(135deg, rgba(2, 6, 23, 0.30), rgba(8, 47, 73, 0.18)), url('/images/pakistan%20air%20force.png')",
  navy: "linear-gradient(135deg, rgba(2, 6, 23, 0.30), rgba(12, 32, 64, 0.18)), url('/images/pakistan%20navy.png')",
  issb: "linear-gradient(135deg, rgba(30, 12, 3, 0.24), rgba(15, 23, 42, 0.18)), url('/images/issb%20section.png')",
};

const FORCES_DATA = {
  army: {
    id: 'army',
    name: 'Pakistan Army',
    shortName: 'Army',
    tagline: 'Lead with Honor and Commitment',
    badgeColor: 'from-emerald-900/80 to-emerald-950 border-emerald-500/30 text-emerald-400',
    accentColor: 'emerald',
    backgroundImage: FORCE_CARD_BACKGROUNDS.army,
    description: 'Prepare thoroughly for the PMA Long Course, Technical Cadet Course (TCC), Lady Cadet Course (LCC), and Direct Short Service Commission tests.',
    subjects: ['Intelligence Tests (Verbal & Non-Verbal)', 'Mathematics (Matrices, Trigonometry, Calculus)', 'English (Grammar, Vocabulary, Comprehension)', 'General Knowledge & Pakistan Affairs', 'Initial Test Physical & Academic Standards', 'Initial Interview Guidelines'],
    routes: ['PMA Long Course', 'Technical Cadet Course (TCC)', 'Lady Cadet Course (LCC)', 'Direct Short Service Commission'],
    requirementsNote: 'Official eligibility (age, height, qualification) should always be verified on the official Pakistan Army joining portal.',
  },
  paf: {
    id: 'paf',
    name: 'Pakistan Air Force',
    shortName: 'PAF',
    tagline: 'Aim High with Precision and Academic Mastery',
    badgeColor: 'from-sky-900/80 to-slate-950 border-sky-500/30 text-sky-400',
    accentColor: 'sky',
    backgroundImage: FORCE_CARD_BACKGROUNDS.paf,
    description: 'Structured preparation for GDP (General Duty Pilot), Aeronautical Engineering, Air Defence, Admin & Special Duties, and Information Technology branches.',
    subjects: ['Verbal & Non-Verbal Intelligence', 'Advanced Mathematics', 'Physics (Mechanics, Electricity, Optics)', 'English Language Proficiency', 'General Knowledge & Current Affairs', 'Initial Computer-Based Testing Routine'],
    routes: ['General Duty Pilot (GDP)', 'Aeronautical Engineering (CAE)', 'Air Defence Course', 'Admin & Special Duties', 'Logistics & IT Branch'],
    requirementsNote: 'Test patterns and computer-based test formats must be verified via official PAF Induction notifications.',
  },
  navy: {
    id: 'navy',
    name: 'Pakistan Navy',
    shortName: 'Navy',
    tagline: 'Command the Seas with Academic Rigor',
    badgeColor: 'from-blue-900/80 to-slate-950 border-blue-500/30 text-blue-400',
    accentColor: 'blue',
    backgroundImage: FORCE_CARD_BACKGROUNDS.navy,
    description: 'Comprehensive test preparation for PN Cadet Permanent Commission, Short Service Commission (SSC), Special Cadet Scheme, and Supply Branch.',
    subjects: ['Intelligence Reasoning (Verbal/Non-Verbal)', 'Mathematics & Analytical Skills', 'Physics & Basic Sciences', 'English & Essay Fundamentals', 'Pakistan Navy General Knowledge', 'Initial Medical & Physical Test Protocol'],
    routes: ['PN Cadet Permanent Commission', 'Short Service Commission (SSC)', 'Direct Cadet Entry', 'Supply & Executive Branches'],
    requirementsNote: 'Verify active induction batches and physical standards directly through Pakistan Navy recruitment centers.',
  },
  issb: {
    id: 'issb',
    name: 'ISSB',
    shortName: 'ISSB',
    subtitle: 'Inter Services Selection Board',
    tagline: 'Four Days of Selection Evaluation',
    badgeColor: 'from-amber-900/80 to-slate-950 border-amber-500/30 text-amber-400',
    accentColor: 'amber',
    backgroundImage: FORCE_CARD_BACKGROUNDS.issb,
    description: 'Specialized 4-day board evaluation preparation spanning psychological tests, group testing officer (GTO) indoor/outdoor tasks, and president interviews.',
    subjects: ['Intelligence Tests (Screening Day)', 'Word Association Test (WAT)', 'Sentence Completion Test (SCT)', 'Thematic Apperception / Story Writing', 'Group Discussions & Planning Exercises', 'GTO Outdoor Command Tasks', 'Interview & Personality Alignment'],
    routes: ['Army Recommendation Path', 'PAF Recommendation Path', 'Navy Recommendation Path'],
    requirementsNote: 'ISSB evaluates inherent officer qualities. FaujPrep provides practice structures, not guaranteed selection recipes.',
  }
};

const ISSB_MODULES = [
  { id: 'issb-intel', title: 'Intelligence Tests', desc: 'Screening day speed tests including verbal classification, analogies, series, and matrix non-verbal reasoning.', category: 'Screening Day' },
  { id: 'issb-psycho', title: 'Psychological Practice', desc: 'Overview of self-description, psychologist questionnaires, and psychological test discipline.', category: 'Psych Tests' },
  { id: 'issb-wat', title: 'Word Association (WAT)', desc: 'Practice 60 timed word association prompts designed to foster spontaneous positive responses.', category: 'Psych Tests' },
  { id: 'issb-sct', title: 'Sentence Completion (SCT)', desc: 'Practice incomplete sentence stems under strict time constraints in English and Urdu.', category: 'Psych Tests' },
  { id: 'issb-story', title: 'Story Writing', desc: 'Practice picture apperception tests and pointer story exercises under timed conditions.', category: 'Psych Tests' },
  { id: 'issb-discussion', title: 'Group Discussion', desc: 'Topic analysis frameworks and communication guidelines for indoors indoor group discussions.', category: 'GTO Tasks' },
  { id: 'issb-gto', title: 'GTO Preparation', desc: 'Understanding group planning exercises, progressive group tasks, half group tasks, and command tasks.', category: 'GTO Tasks' },
  { id: 'issb-interview', title: 'Interview Preparation', desc: 'Structured guidance on deputy president interview questions, personal dossier defense, and general knowledge.', category: 'Interview' },
];

const PRACTICE_BANK = [
  { id: 'p1', title: 'Verbal Intelligence Test - Set A', force: 'Pakistan Army', category: 'Intelligence', difficulty: 'Medium', questionsCount: 50, duration: '25 mins' },
  { id: 'p2', title: 'Non-Verbal Pattern Series', force: 'PAF', category: 'Non-Verbal', difficulty: 'Hard', questionsCount: 40, duration: '20 mins' },
  { id: 'p3', title: 'Physics Fundamentals - Mechanics', force: 'PAF', category: 'Physics', difficulty: 'Medium', questionsCount: 30, duration: '20 mins' },
  { id: 'p4', title: 'Mathematics Matrices & Trigonometry', force: 'Pakistan Army', category: 'Mathematics', difficulty: 'Hard', questionsCount: 30, duration: '25 mins' },
  { id: 'p5', title: 'English Grammar & Synonyms', force: 'Pakistan Navy', category: 'English', difficulty: 'Easy', questionsCount: 40, duration: '20 mins' },
  { id: 'p6', title: 'Pakistan Studies & General Knowledge', force: 'Pakistan Army', category: 'General Knowledge', difficulty: 'Easy', questionsCount: 50, duration: '20 mins' },
  { id: 'p7', title: 'Word Association Practice Set 1', force: 'ISSB', category: 'Verbal', difficulty: 'Medium', questionsCount: 60, duration: '15 mins' },
  { id: 'p8', title: 'Sentence Completion English Set A', force: 'ISSB', category: 'English', difficulty: 'Medium', questionsCount: 26, duration: '10 mins' },
  { id: 'p9', title: 'Navy Physics & Science Aptitude', force: 'Pakistan Navy', category: 'Physics', difficulty: 'Hard', questionsCount: 35, duration: '25 mins' },
];

const PRACTICE_FORCE_CATEGORIES = {
  'pak-army': 'Pakistan Army',
  paf: 'PAF',
  'pak-navy': 'Pakistan Navy',
  issb: 'ISSB',
};

const MOCK_TESTS_DATA = [
  { id: 'm-army', title: 'PMA Long Course Initial Academic & Intelligence Mock', force: 'Pakistan Army', duration: '90 Minutes', format: 'Computer-based Simulated Format', difficulty: 'Challenging' },
  { id: 'm-paf', title: 'PAF Officer Cadet Initial Aptitude & Physics Mock', force: 'Pakistan Air Force', duration: '100 Minutes', format: 'Timed Sectional Testing', difficulty: 'High Precision' },
  { id: 'm-navy', title: 'PN Cadet Initial Test Comprehensive Simulation', force: 'Pakistan Navy', duration: '90 Minutes', format: 'Sectional Timer Format', difficulty: 'Challenging' },
  { id: 'm-issb', title: 'ISSB Screening Day Intelligence Battery', force: 'ISSB', duration: '60 Minutes', format: 'Rapid Speed & Accuracy Test', difficulty: 'Very High Speed' },
];

const RESOURCES_DATA = [
  { id: 'r1', title: 'PMA Initial Academic Syllabus & Pattern Guide', force: 'Army', category: 'Syllabus', type: 'PDF Guide' },
  { id: 'r2', title: 'PAF GDP Physics Key Concepts & Formula Sheet', force: 'PAF', category: 'Formulae', type: 'Study Sheet' },
  { id: 'r3', title: 'Pakistan Navy Initial Test Model Question Paper', force: 'Navy', category: 'Sample Paper', type: 'Practice Guide' },
  { id: 'r4', title: 'ISSB Word Association Test 300 Practice Words Prompt Bank', force: 'ISSB', category: 'Psychological', type: 'Prompt List' },
  { id: 'r5', title: 'Non-Verbal Spatial Intelligence Diagram Matrix Guide', force: 'All', category: 'Intelligence', type: 'Visual Guide' },
  { id: 'r6', title: 'Initial Test Physical Standards & Preparation Routine', force: 'All', category: 'Physical', type: 'Fitness Guide' },
];

const FAQ_DATA = [
  {
    q: "What is FaujPrep?",
    a: "FaujPrep is an independent digital educational platform designed to help Pakistani candidates prepare systematically for entry tests into the Pakistan Army, Pakistan Air Force (PAF), Pakistan Navy, and the ISSB selection framework through structured practice exercises and subject-wise revision materials."
  },
  {
    q: "Which forces entry routes does FaujPrep cover?",
    a: "FaujPrep covers preparation frameworks for the PMA Long Course, Technical Cadet Course (TCC), Lady Cadet Course (LCC), PAF General Duty Pilot (GDP), Aeronautical Engineering, Air Defence, PN Cadet Commission, Short Service Commissions, and ISSB preliminary screening/psychological modules."
  },
  {
    q: "What is ISSB preparation on FaujPrep?",
    a: "ISSB preparation on FaujPrep provides candidate-focused practice formats for psychological tests (WAT, SCT, Picture Stories), intelligence screening practice, group discussion guidelines, GTO task overviews, and structured mock interview frameworks."
  },
  {
    q: "Can I practice test modules on mobile devices?",
    a: "Yes! FaujPrep is built with a fluid, mobile-first design system allowing seamless practice on smartphones, tablets, and desktop devices."
  },
  {
    q: "Will FaujPrep offer full timed mock tests?",
    a: "Yes. Phase 1 provides full architectural foundations and mock test specifications. Interactive timed mock test execution with automated scoring will launch in Phase 2 alongside backend integration."
  },
  {
    q: "Is FaujPrep affiliated with the Armed Forces of Pakistan?",
    a: "No. FaujPrep is a private, independent educational preparation resource. It is not affiliated with, endorsed by, or operated by the Ministry of Defence, Pakistan Army, PAF, Pakistan Navy, or ISSB."
  },
  {
    q: "When will premium features and AI features be launched?",
    a: "Premium subscription features, advanced AI-powered answer explanations, and personalized weak-area analytics will be introduced in Phase 2 after backend service integration."
  }
];

const DEFAULT_PAYMENT_SETTINGS = {
  payment_method: 'JAZZCASH_MANUAL',
  bank_name: 'NAYAPAY',
  account_title: 'MUHAMMAD MIQDAD HAIDER',
  account_number: '03052231414',
  mobile_number: '03052231414',
  instructions: 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
};

const PAID_MOCK_TEST_PRODUCTS = [
  ACADEMIC_PORTION_MOCK_TEST_2,
  PMA_LONG_COURSE_159_MOCK_TEST_2,
];

export default function App() {
  const { data: backendData, loading: backendLoading, error: backendError, configured: backendConfigured, session } = useFaujPrepData();
  const lastAnalyticsPage = useRef(null);
  const lastAnalyticsContent = useRef(null);
  const lastAnalyticsPageEvent = useRef(null);

  /* Route state */
  const [currentPage, setCurrentPage] = useState('home');
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [selectedForceId, setSelectedForceId] = useState(null);
  const [planCatalog, setPlanCatalog] = useState([]);
  const [checkoutPlan, setCheckoutPlan] = useState('pro');
  const [checkoutState, setCheckoutState] = useState({ loading: false, error: null, result: null });
  const [subscriptionState, setSubscriptionState] = useState({
    loading: false,
    error: null,
    summary: {
      subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
      transactions: [],
    },
  });
  const [billingState, setBillingState] = useState({
    loading: false,
    error: null,
    summary: {
      subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
      transactions: [],
    },
  });
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [paymentSettingsForm, setPaymentSettingsForm] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [paymentForm, setPaymentForm] = useState({
    senderName: '',
    senderPhone: '',
    paymentDate: '',
    paymentTime: '',
    notes: '',
    paymentScreenshot: null,
  });
  const [mockTestPurchaseState, setMockTestPurchaseState] = useState({ loading: false, requests: [], userId: null });
  const [mockTestPaymentForm, setMockTestPaymentForm] = useState({
    senderName: '',
    senderPhone: '',
    paymentDate: '',
    paymentTime: '',
    notes: '',
    paymentScreenshot: null,
  });
  const [mockTestPaymentState, setMockTestPaymentState] = useState({ loading: false, error: null, result: null });
  const [paidMockTestLoading, setPaidMockTestLoading] = useState(false);
  const [adminPaymentQueue, setAdminPaymentQueue] = useState([]);
  const [adminPaymentAction, setAdminPaymentAction] = useState({ loading: false, error: null });
  const [contentTopics, setContentTopics] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchContentType, setSearchContentType] = useState('All');
  const [searchBranchId, setSearchBranchId] = useState('All');
  const [searchSubjectId, setSearchSubjectId] = useState('All');
  const [searchTopicId, setSearchTopicId] = useState('All');
  const [searchDifficulty, setSearchDifficulty] = useState('All');
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchTopics, setSearchTopics] = useState([]);
  const [studyMaterialsFilters, setStudyMaterialsFilters] = useState({ branchId: 'All', subjectId: 'All', topicId: 'All', materialType: 'All', search: '' });
  const [studyMaterialsPageState, setStudyMaterialsPageState] = useState({ items: [], loading: false, error: null, page: 1, hasMore: false });
  const [studyMaterialTopics, setStudyMaterialTopics] = useState([]);
  const [currentAffairsFilters, setCurrentAffairsFilters] = useState({ category: 'All', search: '' });
  const [currentAffairsPageState, setCurrentAffairsPageState] = useState({ items: [], loading: false, error: null, page: 1, hasMore: false });
  const [studyMaterialDetailState, setStudyMaterialDetailState] = useState({ item: null, loading: false, error: null });
  const [currentAffairDetailState, setCurrentAffairDetailState] = useState({ item: null, loading: false, error: null });
  const [issbModuleDetailState, setIssbModuleDetailState] = useState({ item: null, loading: false, error: null });

  /* Navigation drawer state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Global Modal system */
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    description: '',
    actionText: 'Got it',
  });

  /* Toast Notification system */
  const [toasts, setToasts] = useState([]);

  /* Form states */
  const [loginForm, setLoginForm] = useState({ email: '', password: '', showPass: false });
  const [loginErrors, setLoginErrors] = useState({});

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactErrors, setContactErrors] = useState({});

  /* Practice Filters */
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceForceFilter, setPracticeForceFilter] = useState('All');
  const [practiceCategoryFilter, setPracticeCategoryFilter] = useState('All');
  const [practiceDifficultyFilter, setPracticeDifficultyFilter] = useState('All');

  /* Resources Filters */
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('All');

  /* FAQ Accordion state */
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  /* Profile Edit state */
  const [profileData, setProfileData] = useState({
    fullName: 'Candidate Alpha',
    email: 'candidate@faujprep.pk',
    preferredPath: 'PMA Long Course (Pakistan Army)',
    targetForce: 'Army',
    targetBranchId: '',
    targetExamId: '',
    experienceLevel: ''
  });
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [practiceSession, setPracticeSession] = useState({ mode: 'practice', questions: [], index: 0, selectedOption: '', result: null, score: 0, attemptId: null, expiresAt: null });
  const [practiceSessionLoading, setPracticeSessionLoading] = useState(false);
  const [mockSecondsLeft, setMockSecondsLeft] = useState(null);
  const [mockAnswers, setMockAnswers] = useState({});
  const [mockMarked, setMockMarked] = useState({});
  const [practiceBranchId, setPracticeBranchId] = useState('');
  const [practiceSubjectId, setPracticeSubjectId] = useState('');
  const [practiceTopicId, setPracticeTopicId] = useState('');
  const [practiceDifficulty, setPracticeDifficulty] = useState('');
  const [practiceQuestionCount, setPracticeQuestionCount] = useState(10);
  const [practiceSubjects, setPracticeSubjects] = useState([]);
  const [dashboardState, setDashboardState] = useState({ loading: false, error: null, summary: null });

  const practiceCatalog = [
    ...(backendConfigured
      ? backendData.mockTests.filter((test) => test.slug !== 'first-full-mock-test').map((test) => {
          const branch = backendData.branches.find((item) => item.id === test.branch_id);
          return {
            id: test.id,
            title: test.title,
            force: PRACTICE_FORCE_CATEGORIES[branch?.slug] || branch?.name || 'All',
            category: test.category || 'Mock Test',
            difficulty: test.difficulty || 'Medium',
            questionsCount: test.total_questions,
            duration: `${test.duration_minutes} mins`,
            mockTestSlug: test.slug,
          };
        })
      : PRACTICE_BANK),
    MOST_REPEATED_PHYSICS_PRACTICE,
  ];
  const resourceCatalog = backendConfigured
    ? backendData.studyMaterials.map((material) => ({
        id: material.id,
        title: material.title,
      slug: material.slug,
        force: 'Database',
        category: material.material_type || 'Guide',
        type: material.material_type || 'Study Material',
      }))
    : RESOURCES_DATA;
  const issbCatalog = backendConfigured
    ? backendData.issbModules.map((module) => ({
        id: module.id,
        title: module.title,
        desc: module.description || 'Preparation guidance from the FaujPrep database.',
        category: module.module_type || 'Preparation',
      }))
    : ISSB_MODULES;

  useEffect(() => {
    if (!session?.user) {
      setNotificationUnreadCount(0);
      return undefined;
    }
    let active = true;
    getMyUnreadNotificationCount()
      .then((count) => active && setNotificationUnreadCount(count))
      .catch(() => active && setNotificationUnreadCount(0));
    return () => { active = false; };
  }, [currentPage, session?.user?.id]);

  /* Helper functions */
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const openModal = (title, description, actionText = 'Understand') => {
    setModalState({ isOpen: true, title, description, actionText });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const refreshSubscriptionSummary = useCallback(async () => {
    if (!backendConfigured) {
      setSubscriptionState({
        loading: false,
        error: null,
        summary: {
          subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
          transactions: [],
        },
      });
      setBillingState({
        loading: false,
        error: null,
        summary: {
          subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
          transactions: [],
        },
      });
      return;
    }

    try {
      const summary = await getCurrentUserSubscription();
      setSubscriptionState({ loading: false, error: null, summary: summary || { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] } });
      setBillingState({ loading: false, error: null, summary: summary || { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] } });
    } catch (error) {
      const defaultSummary = { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
      setSubscriptionState({ loading: false, error: error.message || 'Unable to load plan details.', summary: defaultSummary });
      setBillingState({ loading: false, error: error.message || 'Unable to load billing details.', summary: defaultSummary });
    }
  }, [backendConfigured]);

  const refreshMockTestPurchases = useCallback(async () => {
    if (!backendConfigured) {
      setMockTestPurchaseState({ loading: false, requests: [], userId: null });
      return;
    }

    setMockTestPurchaseState((previous) => ({ ...previous, loading: true, userId: null }));
    try {
      const currentSession = await ensureAnonymousSession();
      const requests = await getMyMockTestPurchases();
      setMockTestPurchaseState({ loading: false, requests, userId: currentSession.user.id });
    } catch {
      setMockTestPurchaseState({ loading: false, requests: [], userId: null });
    }
  }, [backendConfigured]);

  useEffect(() => {
    if (!['mock-tests', 'mock-payment'].includes(currentPage)) return;
    refreshMockTestPurchases();
  }, [currentPage, refreshMockTestPurchases, session?.user?.id]);

  const routeFromPage = (page, value = null) => {
    const routeMap = {
      home: '/',
      army: '/army',
      paf: '/paf',
      navy: '/navy',
      search: '/search',
      practice: '/practice',
      mockTests: '/mock-tests',
      'mock-tests': '/mock-tests',
      'mock-detail': value ? `/mock-tests/${encodeURIComponent(value)}` : '/mock-tests',
      'mock-payment': value ? `/mock-tests/${encodeURIComponent(value)}/payment` : '/mock-tests',
      issb: '/issb',
      'issb-detail': value ? `/issb/${encodeURIComponent(value)}` : '/issb',
      resources: '/resources',
      'study-materials': '/study-materials',
      'study-material-detail': value ? `/study-materials/${encodeURIComponent(value)}` : '/study-materials',
      'current-affairs': '/current-affairs',
      'current-affairs-detail': value ? `/current-affairs/${encodeURIComponent(value)}` : '/current-affairs',
      dashboard: '/dashboard',
      billing: '/billing',
      checkout: '/checkout',
      'admin-login': '/admin/login',
      pricing: '/pricing',
      about: '/about',
      contact: '/contact',
      privacy: '/privacy',
      terms: '/terms',
      disclaimer: '/disclaimer',
      admin: '/admin',
      'admin-analytics': '/admin/analytics',
      'admin-notifications': '/admin/notifications',
      notifications: '/notifications',
      profile: '/account',
    };
    return routeMap[page] || null;
  };

  const navigateTo = (page, forceId = null) => {
    setCurrentPage(page);
    if (forceId) setSelectedForceId(forceId);
    setMobileMenuOpen(false);
    const route = routeFromPage(page, forceId);
    if (route) window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToNotificationAction = (actionUrl) => {
    let pathname;
    try {
      const destination = new URL(actionUrl, window.location.origin);
      if (destination.origin !== window.location.origin || !destination.pathname.startsWith('/') || destination.search || destination.hash) return;
      pathname = destination.pathname;
    } catch {
      return;
    }
    if (pathname.startsWith('/study-materials/')) return navigateTo('study-material-detail', decodeURIComponent(pathname.slice('/study-materials/'.length)));
    if (pathname.startsWith('/current-affairs/')) return navigateTo('current-affairs-detail', decodeURIComponent(pathname.slice('/current-affairs/'.length)));
    if (pathname.startsWith('/issb/')) return navigateTo('issb-detail', decodeURIComponent(pathname.slice('/issb/'.length)));
    const routes = {
      '/army': 'army', '/paf': 'paf', '/navy': 'navy', '/issb': 'issb',
      '/study-materials': 'study-materials', '/current-affairs': 'current-affairs',
      '/mock-tests': 'mock-tests', '/pricing': 'pricing', '/practice': 'practice',
      '/dashboard': 'dashboard', '/billing': 'billing',
    };
    if (routes[pathname]) navigateTo(routes[pathname]);
  };

  const loadStudyMaterialsPage = useCallback(async (page = 1, filters = studyMaterialsFilters) => {
    if (!backendConfigured) {
      setStudyMaterialsPageState({ items: [], loading: false, error: SUPABASE_SETUP_MESSAGE, page: 1, hasMore: false });
      return;
    }

    setStudyMaterialsPageState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await getStudyMaterialsPage({ ...filters, page, pageSize: 9 });
      setStudyMaterialsPageState((previous) => ({
        items: page === 1 ? response.items : [...previous.items, ...response.items],
        loading: false,
        error: null,
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setStudyMaterialsPageState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load study materials.' }));
    }
  }, [backendConfigured, studyMaterialsFilters]);

  const loadCurrentAffairsPage = useCallback(async (page = 1, filters = currentAffairsFilters) => {
    if (!backendConfigured) {
      setCurrentAffairsPageState({ items: [], loading: false, error: SUPABASE_SETUP_MESSAGE, page: 1, hasMore: false });
      return;
    }

    setCurrentAffairsPageState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await getCurrentAffairsPage({ ...filters, page, pageSize: 6 });
      setCurrentAffairsPageState((previous) => ({
        items: page === 1 ? response.items : [...previous.items, ...response.items],
        loading: false,
        error: null,
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setCurrentAffairsPageState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load current affairs.' }));
    }
  }, [backendConfigured, currentAffairsFilters]);

  const executeSearch = async (page = 1, append = false) => {
    if (!backendConfigured || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const response = await searchContent({ term: searchQuery, contentType: searchContentType, branchId: searchBranchId, subjectId: searchSubjectId, topicId: searchTopicId, difficulty: searchDifficulty, page });
      trackAnalyticsEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
        pagePath: '/search',
        properties: {
          result_count: response.results?.length || 0,
          content_type_filter: searchContentType,
          branch_filter: searchBranchId === 'All' ? 'All' : searchBranchId,
          subject_filter: searchSubjectId === 'All' ? 'All' : searchSubjectId,
        },
      });
      setSearchResults((previous) => append ? [...previous, ...response.results] : response.results);
      setSearchHasMore(response.hasMore);
      setSearchPage(page);
      window.history.replaceState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}&type=${encodeURIComponent(searchContentType)}&difficulty=${encodeURIComponent(searchDifficulty)}`);
    } catch (error) {
      addToast(error.message || 'Search is unavailable.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (event) => { event.preventDefault(); executeSearch(1, false); };

  useEffect(() => {
    const syncFromLocation = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      const normalizedPath = path.toLowerCase();
      const decodeSlug = (value) => {
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      };
      if (normalizedPath === '/army') { setCurrentPage('army'); setSelectedForceId(null); return; }
      if (normalizedPath === '/paf') { setCurrentPage('paf'); setSelectedForceId(null); return; }
      if (normalizedPath === '/navy') { setCurrentPage('navy'); setSelectedForceId(null); return; }
      if (normalizedPath === '/issb') { setCurrentPage('issb'); setSelectedForceId(null); return; }
      if (normalizedPath.startsWith('/issb/')) { setCurrentPage('issb-detail'); setSelectedForceId(decodeSlug(path.slice('/issb/'.length))); return; }
      if (normalizedPath === '/study-materials') { setCurrentPage('study-materials'); setSelectedForceId(null); return; }
      if (normalizedPath.startsWith('/study-materials/')) { setCurrentPage('study-material-detail'); setSelectedForceId(decodeSlug(path.slice('/study-materials/'.length))); return; }
      const mockPaymentPath = path.match(/^\/mock-tests\/([^/]+)\/payment$/i);
      if (mockPaymentPath) { setCurrentPage('mock-payment'); setSelectedForceId(decodeSlug(mockPaymentPath[1])); return; }
      if (normalizedPath.startsWith('/mock-tests/')) { setCurrentPage('mock-detail'); setSelectedForceId(decodeSlug(path.slice('/mock-tests/'.length))); return; }
      if (normalizedPath === '/current-affairs') { setCurrentPage('current-affairs'); setSelectedForceId(null); return; }
      if (normalizedPath.startsWith('/current-affairs/')) { setCurrentPage('current-affairs-detail'); setSelectedForceId(decodeSlug(path.slice('/current-affairs/'.length))); return; }
      const routePages = {
        '/': 'home',
        '/search': 'search',
        '/practice': 'practice',
        '/mock-tests': 'mock-tests',
        '/resources': 'resources',
        '/dashboard': 'dashboard',
        '/billing': 'billing',
        '/checkout': 'checkout',
        '/admin/login': 'admin-login',
        '/pricing': 'pricing',
        '/about': 'about',
        '/contact': 'contact',
        '/privacy': 'privacy',
        '/terms': 'terms',
        '/disclaimer': 'disclaimer',
        '/admin/analytics': 'admin-analytics',
        '/admin/notifications': 'admin-notifications',
        '/admin': 'admin',
        '/notifications': 'notifications',
        '/account': 'profile',
      };
      setCurrentPage(routePages[normalizedPath] || 'not-found');
      setSelectedForceId(null);
    };
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    if (!backendConfigured || window.location.pathname !== '/search') return undefined;
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    if (query.length < 2) return undefined;
    const type = params.get('type') || 'All';
    const difficulty = params.get('difficulty') || 'All';
    setCurrentPage('search');
    setSearchQuery(query);
    setSearchContentType(type);
    setSearchDifficulty(difficulty);
    let mounted = true;
    searchContent({ term: query, contentType: type, difficulty }).then((response) => { if (mounted) { setSearchResults(response.results); setSearchHasMore(response.hasMore); } }).catch((error) => mounted && addToast(error.message || 'Search is unavailable.', 'error'));
    return () => { mounted = false; };
  }, [backendConfigured, addToast]);

  useEffect(() => {
    if (!backendConfigured) {
      setPlanCatalog([]);
      return undefined;
    }

    let mounted = true;
    getPlanCatalog()
      .then((plans) => {
        if (mounted) setPlanCatalog(plans);
      })
      .catch(() => {
        if (mounted) setPlanCatalog([]);
      });

    return () => { mounted = false; };
  }, [backendConfigured]);

  useEffect(() => {
    let mounted = true;
    getPaymentSettings()
      .then((settings) => {
        if (!mounted) return;
        const nextSettings = { ...DEFAULT_PAYMENT_SETTINGS, ...(settings || {}) };
        setPaymentSettings(nextSettings);
        setPaymentSettingsForm(nextSettings);
      })
      .catch(() => {
        if (!mounted) return;
        setPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
        setPaymentSettingsForm(DEFAULT_PAYMENT_SETTINGS);
      });
    return () => { mounted = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user || !isPrimaryAdmin(session.user)) {
      setAdminPaymentQueue([]);
      return undefined;
    }

    let mounted = true;
    getAdminPaymentQueue()
      .then((items) => {
        if (mounted) setAdminPaymentQueue(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (mounted) setAdminPaymentQueue([]);
      });

    return () => { mounted = false; };
  }, [session?.user?.id, session?.user?.email, session?.user?.email_confirmed_at, session?.user?.confirmed_at]);

  useEffect(() => {
    if (!session?.user) {
      setSubscriptionState({
        loading: false,
        error: null,
        summary: {
          subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
          transactions: [],
        },
      });
      setBillingState({
        loading: false,
        error: null,
        summary: {
          subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 },
          transactions: [],
        },
      });
      return undefined;
    }

    let mounted = true;
    setSubscriptionState((previous) => ({ ...previous, loading: true, error: null }));
    setBillingState((previous) => ({ ...previous, loading: true, error: null }));
    getCurrentUserSubscription()
      .then((summary) => {
        if (!mounted) return;
        const normalizedSummary = summary || { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
        setSubscriptionState({ loading: false, error: null, summary: normalizedSummary });
        setBillingState({ loading: false, error: null, summary: normalizedSummary });
      })
      .catch((error) => {
        if (!mounted) return;
        const defaultSummary = { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
        setSubscriptionState({ loading: false, error: error.message || 'Unable to load subscription.', summary: defaultSummary });
        setBillingState({ loading: false, error: error.message || 'Unable to load billing details.', summary: defaultSummary });
      });

    return () => { mounted = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!backendConfigured || currentPage !== 'issb-detail' || !selectedForceId) {
      setIssbModuleDetailState({ item: null, loading: false, error: null });
      return undefined;
    }
    let mounted = true;
    setIssbModuleDetailState({ item: null, loading: true, error: null });
    getISSBModuleBySlug(selectedForceId)
      .then((item) => mounted && setIssbModuleDetailState({ item, loading: false, error: null }))
      .catch((error) => mounted && setIssbModuleDetailState({ item: null, loading: false, error: error.message || 'Unable to load this ISSB module.' }));
    return () => { mounted = false; };
  }, [backendConfigured, currentPage, selectedForceId]);

  useEffect(() => {
    if (!backendConfigured || currentPage !== 'study-materials') return undefined;
    loadStudyMaterialsPage(1, studyMaterialsFilters);
    return undefined;
  }, [backendConfigured, currentPage, loadStudyMaterialsPage, studyMaterialsFilters]);

  useEffect(() => {
    if (!backendConfigured || currentPage !== 'current-affairs') return undefined;
    loadCurrentAffairsPage(1, currentAffairsFilters);
    return undefined;
  }, [backendConfigured, currentPage, loadCurrentAffairsPage, currentAffairsFilters]);

  useEffect(() => {
    if (!backendConfigured || studyMaterialsFilters.subjectId === 'All') {
      setStudyMaterialTopics([]);
      return undefined;
    }
    let mounted = true;
    getTopics(studyMaterialsFilters.subjectId)
      .then((topics) => mounted && setStudyMaterialTopics(topics))
      .catch((error) => mounted && addToast(error.message || 'Unable to load study material topics.', 'error'));
    return () => { mounted = false; };
  }, [backendConfigured, addToast, studyMaterialsFilters.subjectId]);

  useEffect(() => {
    if (currentPage !== 'study-material-detail' || !selectedForceId) {
      setStudyMaterialDetailState({ item: null, loading: false, error: null });
      return undefined;
    }
    let mounted = true;
    setStudyMaterialDetailState({ item: null, loading: true, error: null });
    getStudyMaterialBySlug(selectedForceId)
      .then((item) => mounted && setStudyMaterialDetailState({ item, loading: false, error: null }))
      .catch((error) => mounted && setStudyMaterialDetailState({ item: null, loading: false, error: error.message || 'Unable to load this study material.' }));
    return () => { mounted = false; };
  }, [currentPage, selectedForceId]);

  useEffect(() => {
    if (currentPage !== 'current-affairs-detail' || !selectedForceId) {
      setCurrentAffairDetailState({ item: null, loading: false, error: null });
      return undefined;
    }
    let mounted = true;
    setCurrentAffairDetailState({ item: null, loading: true, error: null });
    getCurrentAffairBySlug(selectedForceId)
      .then((item) => mounted && setCurrentAffairDetailState({ item, loading: false, error: null }))
      .catch((error) => mounted && setCurrentAffairDetailState({ item: null, loading: false, error: error.message || 'Unable to load this current-affairs item.' }));
    return () => { mounted = false; };
  }, [currentPage, selectedForceId]);

  /* Close mobile menu on escape key */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.getElementById('mobile-navigation-close')?.focus();

    const trapFocus = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = [...document.querySelectorAll('#mobile-navigation button:not(:disabled), #mobile-navigation a[href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapFocus);
      document.getElementById('mobile-navigation-toggle')?.focus();
    };
  }, [mobileMenuOpen]);

  /* Filter logic for practice */
  const filteredPractice = useMemo(() => {
    return practiceCatalog.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(practiceSearch.toLowerCase()) || item.category.toLowerCase().includes(practiceSearch.toLowerCase());
      const matchForce = practiceForceFilter === 'All' || item.force === practiceForceFilter;
      const matchCategory = practiceCategoryFilter === 'All' || item.category === practiceCategoryFilter;
      const matchDifficulty = practiceDifficultyFilter === 'All' || item.difficulty === practiceDifficultyFilter;
      return matchSearch && matchForce && matchCategory && matchDifficulty;
    });
  }, [practiceCatalog, practiceSearch, practiceForceFilter, practiceCategoryFilter, practiceDifficultyFilter]);

  /* Filter logic for resources */
  const filteredResources = useMemo(() => {
    return resourceCatalog.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(resourceSearch.toLowerCase()) || item.category.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchCategory = resourceCategoryFilter === 'All' || item.category === resourceCategoryFilter || item.force === resourceCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [resourceCatalog, resourceSearch, resourceCategoryFilter]);

  const activeSubscription = subscriptionState.summary?.subscription || { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 };
  const activePlanSlug = activeSubscription.plan_slug || 'free';
  const accessLevel = ['pro', 'premium'].includes(activePlanSlug) ? activePlanSlug : 'free';
  const canAccessPremiumResources = ['pro', 'premium'].includes(activePlanSlug);
  const selectedPlan = useMemo(() => {
    if (!planCatalog.length) {
      return { slug: 'free', name: 'Free', price_pkr: 0 };
    }
    return planCatalog.find((plan) => plan.slug === checkoutPlan) || planCatalog[0];
  }, [checkoutPlan, planCatalog]);

  /* Form Submission Handlers */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!loginForm.email) errors.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(loginForm.email)) errors.email = 'Please enter a valid email address';
    else if (loginForm.email.trim().toLowerCase() !== PRIMARY_ADMIN_EMAIL) errors.email = `Admin access is restricted to ${PRIMARY_ADMIN_EMAIL}`;
    if (!loginForm.password) errors.password = 'Password is required';
    else if (loginForm.password.length < 8) errors.password = 'Password must be at least 8 characters';

    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      if (!backendConfigured) {
        addToast(backendError || 'Supabase is not configured.', 'error');
        return;
      }
      try {
        const { user } = await signIn(loginForm.email, loginForm.password);
        if (!isPrimaryAdmin(user)) {
          await signOut();
          throw new Error('Only the confirmed primary administrator can sign in here.');
        }
        trackAnalyticsEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, { pagePath: '/admin/login' });
        addToast('Admin signed in successfully.', 'success');
        navigateTo('admin');
      } catch (error) {
        addToast(error.message || 'Unable to sign in.', 'error');
      }
    }
  };

  const handleCheckoutSubmit = async (event) => {
    event.preventDefault();

    if (!selectedPlan || !selectedPlan.slug) {
      setCheckoutState({ loading: false, error: 'Choose a valid plan before checkout.', result: null });
      return;
    }

    try {
      if (!session?.user) await ensureAnonymousSession();
    } catch (error) {
      setCheckoutState({ loading: false, error: error.message || 'Unable to start visitor checkout.', result: null });
      return;
    }

    if (selectedPlan.slug === 'free') {
      setCheckoutState({ loading: true, error: null, result: null });
      try {
        const response = await createPlanCheckout(selectedPlan.slug);
        setCheckoutState({ loading: false, error: null, result: response });
        addToast('Free plan activated. You now have free access.', 'success');
        await refreshSubscriptionSummary();
        navigateTo('billing');
      } catch (error) {
        setCheckoutState({ loading: false, error: error.message || 'Unable to activate the free plan.', result: null });
        addToast(error.message || 'Unable to activate the free plan.', 'error');
      }
      return;
    }

    setCheckoutState({ loading: true, error: null, result: null });
    try {
      const response = await createPlanCheckout(selectedPlan.slug);
      if (selectedPlan.slug !== 'free') {
        trackAnalyticsEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
          pagePath: '/checkout',
          properties: { plan_slug: selectedPlan.slug },
        });
      }
      setCheckoutState({ loading: false, error: null, result: response });
      addToast('Payment details are ready. Please transfer the exact amount through JazzCash and submit your proof below.', 'info');
      setPaymentForm((previous) => ({ ...previous, paymentDate: new Date().toISOString().slice(0, 10) }));
    } catch (error) {
      setCheckoutState({ loading: false, error: error.message || 'Unable to prepare manual payment checkout.', result: null });
      addToast(error.message || 'Unable to prepare the payment request.', 'error');
    }
  };

  const handlePaymentSubmission = async (event) => {
    event.preventDefault();

    if (!selectedPlan || !selectedPlan.slug || selectedPlan.slug === 'free') {
      addToast('Please choose a paid plan to submit payment proof.', 'error');
      return;
    }

    const senderName = paymentForm.senderName.trim();
    const senderPhone = paymentForm.senderPhone.trim();
    const paymentDate = paymentForm.paymentDate;
    const paymentScreenshot = paymentForm.paymentScreenshot;

    if (!senderName || !senderPhone || !paymentDate || !paymentScreenshot) {
      setCheckoutState({ loading: false, error: 'Sender name, phone number, payment date, and screenshot image are required.', result: null });
      return;
    }

    setCheckoutState({ loading: true, error: null, result: null });

    try {
      const visitor = session?.user || (await ensureAnonymousSession()).user;
      const response = await submitManualPaymentProof({
        planSlug: selectedPlan.slug,
        senderName,
        senderPhone,
        paymentDate,
        paymentTime: paymentForm.paymentTime || null,
        notes: paymentForm.notes || null,
        paymentScreenshot,
        userId: visitor.id,
      });

      setCheckoutState({ loading: false, error: null, result: response });
      setPaymentForm({ senderName: '', senderPhone: '', paymentDate: '', paymentTime: '', notes: '', paymentScreenshot: null });
      addToast(response?.message || 'Payment submitted successfully. Your payment is pending verification.', 'success');
      await refreshSubscriptionSummary();
      navigateTo('billing');
    } catch (error) {
      setCheckoutState({ loading: false, error: error.message || 'Unable to submit payment proof.', result: null });
      addToast(error.message || 'Unable to submit payment proof.', 'error');
    }
  };

  const handleMockTestPaymentSubmission = async (event) => {
    event.preventDefault();
    const product = PAID_MOCK_TEST_PRODUCTS.find((item) => item.id === selectedForceId);
    if (!product) {
      setMockTestPaymentState({ loading: false, error: 'This mock test is not available for purchase.', result: null });
      return;
    }

    const senderName = mockTestPaymentForm.senderName.trim();
    const senderPhone = mockTestPaymentForm.senderPhone.trim();
    if (!senderName || !senderPhone || !mockTestPaymentForm.paymentDate || !mockTestPaymentForm.paymentScreenshot) {
      setMockTestPaymentState({ loading: false, error: 'Sender name, phone number, payment date, and screenshot are required.', result: null });
      return;
    }

    setMockTestPaymentState({ loading: true, error: null, result: null });
    try {
      const user = session?.user || (await ensureAnonymousSession()).user;
      const response = await submitMockTestPaymentProof({
        testSlug: product.id,
        senderName,
        senderPhone,
        paymentDate: mockTestPaymentForm.paymentDate,
        paymentTime: mockTestPaymentForm.paymentTime || null,
        notes: mockTestPaymentForm.notes,
        paymentScreenshot: mockTestPaymentForm.paymentScreenshot,
        userId: user.id,
      });
      setMockTestPaymentState({ loading: false, error: null, result: response });
      setMockTestPaymentForm({ senderName: '', senderPhone: '', paymentDate: '', paymentTime: '', notes: '', paymentScreenshot: null });
      await refreshMockTestPurchases();
      addToast(response?.message || 'Payment proof submitted for admin review.', 'success');
    } catch (error) {
      setMockTestPaymentState({ loading: false, error: error.message || 'Unable to submit mock-test payment proof.', result: null });
    }
  };

  const startPaidMockTest = async (product) => {
    if (!product) return;
    setPaidMockTestLoading(true);
    try {
      const currentSession = await ensureAnonymousSession();
      const requests = await getMyMockTestPurchases();
      setMockTestPurchaseState({ loading: false, requests, userId: currentSession.user.id });
      const hasApprovedPurchase = requests.some((request) => request.test_slug === product.id && request.status === 'APPROVED');
      if (!hasApprovedPurchase) {
        navigateTo('mock-payment', product.id);
        return;
      }

      const questions = await getPaidMockTestQuestions(product.id);
      if (!questions.length) throw new Error('Questions are not available yet. Please contact support.');
      await startPracticeSession({
        title: product.title,
        questions,
        questionsCount: product.questionsCount,
        duration: product.duration,
        difficulty: product.difficulty,
        preserveQuestionOrder: true,
      });
    } catch (error) {
      addToast(error.message || 'Unable to load this mock test.', 'error');
    } finally {
      setPaidMockTestLoading(false);
    }
  };

  const handleAdminPaymentAction = async (paymentId, action, adminNotes = '', purchaseType = 'PLAN') => {
    if (!paymentId) return;
    setAdminPaymentAction({ loading: true, error: null });
    try {
      const isMockTestPurchase = purchaseType === 'MOCK_TEST';
      const response = action === 'approve'
        ? isMockTestPurchase
          ? await approveMockTestPurchase(paymentId, adminNotes)
          : await approvePaymentTransaction(paymentId, adminNotes)
        : isMockTestPurchase
          ? await rejectMockTestPurchase(paymentId, adminNotes)
          : await rejectPaymentTransaction(paymentId, adminNotes);
      setAdminPaymentAction({ loading: false, error: null });
      addToast(
        isMockTestPurchase
          ? response?.status === 'APPROVED' ? 'Mock-test access approved permanently.' : 'Mock-test payment rejected.'
          : response?.status === 'APPROVED' ? 'Payment approved and subscription activated.' : 'Payment rejected and no premium access was granted.',
        response?.status === 'APPROVED' ? 'success' : 'info'
      );
      const queue = await getAdminPaymentQueue();
      setAdminPaymentQueue(Array.isArray(queue) ? queue : []);
      await refreshSubscriptionSummary();
    } catch (error) {
      setAdminPaymentAction({ loading: false, error: error.message || 'Unable to update payment status.' });
      addToast(error.message || 'Unable to update payment status.', 'error');
    }
  };

  const handlePaymentSettingsSave = async (event) => {
    event.preventDefault();
    setAdminPaymentAction({ loading: true, error: null });
    try {
      const updated = await upsertPaymentSettings(paymentSettingsForm);
      const nextSettings = { ...DEFAULT_PAYMENT_SETTINGS, ...(updated || {}), ...(paymentSettingsForm || {}) };
      setPaymentSettings(nextSettings);
      setPaymentSettingsForm(nextSettings);
      addToast('Payment settings saved successfully.', 'success');
      setAdminPaymentAction({ loading: false, error: null });
    } catch (error) {
      setAdminPaymentAction({ loading: false, error: error.message || 'Unable to save payment settings.' });
      addToast(error.message || 'Unable to save payment settings.', 'error');
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!contactForm.name.trim()) errors.name = 'Name is required';
    if (!contactForm.email) errors.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(contactForm.email)) errors.email = 'Please enter a valid email address';
    if (!contactForm.subject.trim()) errors.subject = 'Subject is required';
    if (!contactForm.message.trim()) errors.message = 'Message content is required';

    setContactErrors(errors);

    if (Object.keys(errors).length === 0) {
      addToast('Contact message received! Dispatch endpoint connects in Phase 2.', 'success');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      openModal('Message Received', 'Thank you for contacting FaujPrep. Live email delivery will be enabled in Phase 2.');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const user = session?.user || (await ensureAnonymousSession()).user;
      await updateProfile(user.id, profileData);
      setProfileSuccessMsg('Profile settings saved to Supabase.');
      addToast('Profile updated', 'success');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (error) {
      addToast(error.message || 'Unable to update profile.', 'error');
    }
  };

  const startPracticeSession = async (item) => {
    const customQuestions = item.questions || item.customQuestions || [];
    if (customQuestions.length > 0) {
      const randomizedQuestions = item.preserveQuestionOrder
        ? [...customQuestions]
        : [...customQuestions].sort(() => Math.random() - 0.5);
      setPracticeSession({
        mode: 'practice',
        questions: randomizedQuestions,
        index: 0,
        selectedOption: '',
        result: null,
        score: 0,
        answers: [],
        attemptId: null,
        expiresAt: null,
        finalResult: null,
        questionStartedAt: Date.now(),
        subjectId: item.subjectId,
        topicId: item.topicId,
        difficulty: item.difficulty,
      });
      navigateTo('question-practice');
      return;
    }

    if (!backendConfigured) {
      addToast(backendError || 'Configure Supabase to load practice questions.', 'error');
      return;
    }
    setPracticeSessionLoading(true);
    try {
      const questions = await getPracticeQuestions({ subjectId: item.subjectId, topicId: item.topicId, difficulty: item.difficultyFilter, limit: Math.min(item.questionsCount || 20, 30) });
      if (!questions.length) {
        addToast('No questions are available for this practice set yet.', 'info');
        return;
      }
      trackAnalyticsEvent(ANALYTICS_EVENTS.QUESTION_PRACTICE_STARTED, {
        pagePath: window.location.pathname,
        entityType: item.topicId ? 'topic' : item.subjectId ? 'subject' : null,
        entityId: item.topicId || item.subjectId,
        properties: { difficulty: item.difficultyFilter, question_count: questions.length },
      });
      const randomizedQuestions = [...questions].sort(() => Math.random() - 0.5);
      setPracticeSession({ mode: 'practice', questions: randomizedQuestions, index: 0, selectedOption: '', result: null, score: 0, answers: [], attemptId: null, expiresAt: null, finalResult: null, questionStartedAt: Date.now(), subjectId: item.subjectId, topicId: item.topicId, difficulty: item.difficultyFilter });
      navigateTo('question-practice');
    } catch (error) {
      addToast(error.message || 'Unable to load practice questions.', 'error');
    } finally {
      setPracticeSessionLoading(false);
    }
  };

  const startConfiguredPractice = () => startPracticeSession({
    subjectId: practiceSubjectId || undefined,
    topicId: practiceTopicId || undefined,
    difficultyFilter: practiceDifficulty || undefined,
    questionsCount: practiceQuestionCount,
  });

  const startMockSession = async (mock) => {
    setPracticeSessionLoading(true);
    try {
      if (!session?.user) await ensureAnonymousSession();
      const attempt = await startMockTest(mock.id);
      const questions = await getMockTestQuestions(mock.id);
      if (!questions.length) {
        addToast('This mock test has no questions yet.', 'info');
        return;
      }
      const isPmaPaper = mock.slug?.startsWith('pma-');
      trackAnalyticsEvent(isPmaPaper ? ANALYTICS_EVENTS.PMA_PAPER_STARTED : ANALYTICS_EVENTS.MOCK_TEST_STARTED, {
        pagePath: window.location.pathname,
        entityType: 'mock_test',
        entityId: mock.id,
        properties: {
          difficulty: mock.difficulty,
          duration_minutes: mock.duration_minutes,
          question_count: questions.length,
          ...(isPmaPaper ? { paper_category: mock.category } : {}),
        },
      });
      setPracticeSession({
        mode: 'mock',
        questions,
        index: 0,
        selectedOption: '',
        result: null,
        score: 0,
        attemptId: attempt.attempt_id,
        mockTestId: mock.id,
        paperCategory: mock.category,
        expiresAt: Date.now() + (attempt.duration_minutes * 60 * 1000),
        questionStartedAt: Date.now(),
      });
      setMockAnswers({});
      setMockMarked({});
      setMockSecondsLeft(Math.max(0, Math.ceil(attempt.duration_minutes * 60)));
      navigateTo('question-practice');
    } catch (error) {
      addToast(error.message || 'Unable to start mock test.', 'error');
    } finally {
      setPracticeSessionLoading(false);
    }
  };

  const submitPracticeAnswer = async () => {
    const question = practiceSession.questions[practiceSession.index];
    if (!question || !practiceSession.selectedOption) return;
    let result;
    if (practiceSession.mode === 'mock') {
      try {
        await saveMockTestAnswer(practiceSession.attemptId, question.question_id || question.id, practiceSession.selectedOption);
        result = { submitted: true, explanation: null };
      } catch (error) {
        addToast(error.message || 'Unable to save mock-test answer.', 'error');
        return;
      }
    } else if (question.correct_option || question.answer || question.explanation) {
      const isCorrect = practiceSession.selectedOption === question.correct_option;
      result = {
        is_correct: isCorrect,
        correct_option: question.correct_option || question.answer,
        explanation: question.explanation || 'No explanation is available for this question yet.',
      };
    } else {
      try {
        result = await evaluateQuestionAnswer(question.id, practiceSession.selectedOption, Math.round((Date.now() - (practiceSession.questionStartedAt || Date.now())) / 1000));
      } catch (error) {
        addToast(error.message || 'Unable to submit answer.', 'error');
        return;
      }
    }
      setPracticeSession((previous) => ({
      ...previous,
      result,
      score: previous.score + (result.is_correct ? 1 : 0),
      answers: [...(previous.answers || []).filter((_, answerIndex) => answerIndex !== previous.index), { questionId: question.id, selectedOption: previous.selectedOption, result }],
    }));
  };

  const nextPracticeQuestion = () => {
    if (practiceSession.mode === 'mock' && practiceSession.index + 1 >= practiceSession.questions.length) {
      completeMockTest();
      return;
    }
    if (practiceSession.mode === 'practice' && practiceSession.index + 1 >= practiceSession.questions.length) {
      trackAnalyticsEvent(ANALYTICS_EVENTS.QUESTION_PRACTICE_COMPLETED, {
        pagePath: window.location.pathname,
        entityType: practiceSession.topicId ? 'topic' : practiceSession.subjectId ? 'subject' : null,
        entityId: practiceSession.topicId || practiceSession.subjectId,
        properties: { difficulty: practiceSession.difficulty, question_count: practiceSession.questions.length },
      });
    }
    setPracticeSession((previous) => ({
      ...previous,
      index: previous.index + 1,
      selectedOption: '',
      result: null,
      questionStartedAt: Date.now(),
    }));
  };

  const completeMockTest = async () => {
    if (practiceSession.mode !== 'mock' || !practiceSession.attemptId) return;
    try {
      const currentQuestion = practiceSession.questions[practiceSession.index];
      if (currentQuestion && mockAnswers[currentQuestion.question_id || currentQuestion.id]) {
        await saveMockTestAnswer(practiceSession.attemptId, currentQuestion.question_id || currentQuestion.id, mockAnswers[currentQuestion.question_id || currentQuestion.id], Math.round((Date.now() - (practiceSession.questionStartedAt || Date.now())) / 1000));
      }
      const result = await submitMockTest(practiceSession.attemptId, null);
      const isPmaPaper = practiceSession.mockTestId && backendData.mockTests.find((test) => test.id === practiceSession.mockTestId)?.slug?.startsWith('pma-');
      trackAnalyticsEvent(isPmaPaper ? ANALYTICS_EVENTS.PMA_PAPER_COMPLETED : ANALYTICS_EVENTS.MOCK_TEST_COMPLETED, {
        pagePath: window.location.pathname,
        entityType: 'mock_test',
        entityId: practiceSession.mockTestId,
        properties: {
          question_count: practiceSession.questions.length,
          ...(isPmaPaper ? { paper_category: practiceSession.paperCategory, completion_status: 'COMPLETED' } : {}),
        },
      });
      let mockReview = [];
      try { mockReview = await getMockTestReview(practiceSession.attemptId); } catch (reviewError) { addToast(reviewError.message || 'Result review is unavailable.', 'error'); }
      setPracticeSession((previous) => ({ ...previous, index: previous.questions.length, finalResult: result, mockReview }));
      setMockSecondsLeft(null);
      navigateTo('mock-result', practiceSession.attemptId);
    } catch (error) {
      addToast(error.message || 'Unable to submit mock test.', 'error');
    }
  };

  const saveAndMoveMockQuestion = async (nextIndex) => {
    const currentQuestion = practiceSession.questions[practiceSession.index];
    const currentAnswer = mockAnswers[currentQuestion?.question_id || currentQuestion?.id];
    try {
      if (currentQuestion && currentAnswer) await saveMockTestAnswer(practiceSession.attemptId, currentQuestion.question_id || currentQuestion.id, currentAnswer, Math.round((Date.now() - (practiceSession.questionStartedAt || Date.now())) / 1000));
      setPracticeSession((previous) => ({ ...previous, index: nextIndex, selectedOption: '', result: null, questionStartedAt: Date.now() }));
    } catch (error) {
      addToast(error.message || 'Unable to save this answer.', 'error');
    }
  };

  useEffect(() => {
    if (practiceSession.mode !== 'mock' || !practiceSession.expiresAt || currentPage !== 'question-practice') return undefined;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((practiceSession.expiresAt - Date.now()) / 1000));
      setMockSecondsLeft(seconds);
      if (seconds === 0) completeMockTest();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [practiceSession.mode, practiceSession.expiresAt, currentPage]);

  useEffect(() => {
    if (!['dashboard', 'admin', 'admin-analytics'].includes(currentPage) || !session?.user || !backendConfigured) return undefined;
    let mounted = true;
    setDashboardState({ loading: true, error: null, summary: null });
    getDashboardSummary()
      .then((summary) => {
        if (!mounted) return;
        setDashboardState({ loading: false, error: null, summary });
        setProfileData((previous) => ({ ...previous, fullName: summary.profile?.full_name || previous.fullName, targetBranchId: summary.profile?.target_branch_id || '', targetExamId: summary.profile?.target_exam_id || '', experienceLevel: summary.profile?.experience_level || '' }));
      })
      .catch((error) => mounted && setDashboardState({ loading: false, error: error.message, summary: null }));
    return () => { mounted = false; };
  }, [currentPage, session, backendConfigured]);

  useEffect(() => {
    const subjectId = currentPage === 'practice' ? practiceSubjectId : selectedForceId;
    if (!['subject', 'practice'].includes(currentPage) || !subjectId || !backendConfigured) return undefined;
    let mounted = true;
    setContentLoading(true);
    getTopics(subjectId)
      .then((topics) => mounted && setContentTopics(topics))
      .catch((error) => mounted && addToast(error.message || 'Unable to load subject topics.', 'error'))
      .finally(() => mounted && setContentLoading(false));
    return () => { mounted = false; };
  }, [currentPage, selectedForceId, practiceSubjectId, backendConfigured, addToast]);

  useEffect(() => {
    if (!backendConfigured) return undefined;
    if (!practiceBranchId) {
      setPracticeSubjects(backendData.subjects);
      return undefined;
    }
    let mounted = true;
    getSubjectsForBranch(practiceBranchId).then((subjects) => mounted && setPracticeSubjects(subjects)).catch((error) => mounted && addToast(error.message || 'Unable to load branch subjects.', 'error'));
    return () => { mounted = false; };
  }, [practiceBranchId, backendConfigured, backendData.subjects, addToast]);

  useEffect(() => {
    if (!backendConfigured || searchSubjectId === 'All') { setSearchTopics([]); return undefined; }
    let mounted = true;
    getTopics(searchSubjectId).then((topics) => mounted && setSearchTopics(topics)).catch((error) => mounted && addToast(error.message || 'Unable to load search topics.', 'error'));
    return () => { mounted = false; };
  }, [searchSubjectId, backendConfigured, addToast]);

  useEffect(() => {
    const pathname = window.location.pathname;
    const metadata = getPageSeo({
      currentPage,
      selectedForceId,
      pathname,
      search: window.location.search,
      backendData,
      studyMaterial: studyMaterialDetailState.item,
      currentAffair: currentAffairDetailState.item,
      issbModule: issbModuleDetailState.item || backendData.issbModules.find((item) => item.slug === selectedForceId),
      mockTest: backendData.mockTests.find((item) => item.slug === selectedForceId),
    });
    applySeoMetadata(metadata);

    const pageViewPages = new Set([
      'home', 'army', 'paf', 'navy', 'issb', 'issb-detail', 'exam', 'subject',
      'mock-tests', 'mock-detail', 'practice', 'resources', 'study-materials',
      'study-material-detail', 'current-affairs', 'current-affairs-detail',
      'pricing', 'about', 'contact', 'privacy', 'terms', 'disclaimer',
    ]);
    const pageKey = `${currentPage}:${pathname}`;
    if (pageViewPages.has(currentPage) && lastAnalyticsPage.current !== pageKey) {
      trackPageView({ pagePath: pathname });
      lastAnalyticsPage.current = pageKey;
    }
    let contentEvent = null;
    let content = null;
    if (['army', 'paf', 'navy'].includes(currentPage)) {
      content = backendData.branches.find((item) => item.slug === ({ army: 'pak-army', paf: 'paf', navy: 'pak-navy' }[currentPage]));
      if (content) contentEvent = ANALYTICS_EVENTS.BRANCH_VIEWED;
    } else if (currentPage === 'exam') {
      content = backendData.exams.find((item) => item.slug === selectedForceId);
      if (content) contentEvent = ANALYTICS_EVENTS.EXAM_VIEWED;
    } else if (currentPage === 'subject') {
      content = backendData.subjects.find((item) => item.slug === selectedForceId);
      if (content) contentEvent = ANALYTICS_EVENTS.SUBJECT_VIEWED;
    } else if (currentPage === 'mock-detail') {
      content = backendData.mockTests.find((item) => item.slug === selectedForceId);
      if (content) contentEvent = content.slug?.startsWith('pma-') ? ANALYTICS_EVENTS.PMA_PAPER_VIEW : ANALYTICS_EVENTS.MOCK_TEST_VIEWED;
    } else if (currentPage === 'study-material-detail') {
      content = studyMaterialDetailState.item;
      if (content && !content.is_premium) contentEvent = ANALYTICS_EVENTS.STUDY_MATERIAL_VIEWED;
    } else if (currentPage === 'current-affairs-detail') {
      content = currentAffairDetailState.item;
      if (content) contentEvent = ANALYTICS_EVENTS.CURRENT_AFFAIRS_VIEWED;
    } else if (currentPage === 'issb-detail') {
      content = issbModuleDetailState.item || backendData.issbModules.find((item) => item.slug === selectedForceId);
      if (content) contentEvent = ANALYTICS_EVENTS.ISSB_MODULE_VIEWED;
    }
    if (contentEvent && content?.id) {
      const contentKey = `${contentEvent}:${content.id}:${pathname}`;
      if (lastAnalyticsContent.current !== contentKey) {
        const entityType = {
          BRANCH_VIEWED: 'branch',
          EXAM_VIEWED: 'exam',
          SUBJECT_VIEWED: 'subject',
          MOCK_TEST_VIEWED: 'mock_test',
          PMA_PAPER_VIEW: 'mock_test',
          STUDY_MATERIAL_VIEWED: 'study_material',
          CURRENT_AFFAIRS_VIEWED: 'current_affair',
          ISSB_MODULE_VIEWED: 'issb_module',
        }[contentEvent];
        trackAnalyticsEvent(contentEvent, {
          pagePath: pathname,
          entityType,
          entityId: content.id,
          properties: [ANALYTICS_EVENTS.MOCK_TEST_VIEWED, ANALYTICS_EVENTS.PMA_PAPER_VIEW].includes(contentEvent)
            ? {
                difficulty: content.difficulty,
                duration_minutes: content.duration_minutes,
                question_count: content.total_questions,
                ...(contentEvent === ANALYTICS_EVENTS.PMA_PAPER_VIEW ? { paper_category: content.category } : {}),
              }
            : {},
          dedupeKey: contentKey,
        });
        lastAnalyticsContent.current = contentKey;
      }
    }
    if (currentPage === 'pricing') {
      const pricingKey = `pricing:${pathname}`;
      if (lastAnalyticsPageEvent.current !== pricingKey) {
        trackAnalyticsEvent(ANALYTICS_EVENTS.PRICING_VIEWED, { pagePath: pathname, dedupeKey: pricingKey });
        lastAnalyticsPageEvent.current = pricingKey;
      }
    }
  }, [
    backendData,
    currentAffairDetailState.item,
    currentPage,
    issbModuleDetailState.item,
    selectedForceId,
    studyMaterialDetailState.item,
  ]);

  const renderNotificationButton = () => (
    <button
      type="button"
      onClick={() => navigateTo('notifications')}
      aria-label={notificationUnreadCount > 0 ? `Notifications, ${notificationUnreadCount} unread` : 'Notifications'}
      title="Notifications"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
    >
      <Bell className="h-5 w-5" />
      {notificationUnreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
    </button>
  );

  const renderMobileNavLink = (page, label, activePages = [page]) => (
    <button
      type="button"
      onClick={() => navigateTo(page)}
      aria-current={activePages.includes(currentPage) ? 'page' : undefined}
      className={`mobile-nav-link ${activePages.includes(currentPage) ? 'mobile-nav-link-active' : ''}`}
    >
      {label}
    </button>
  );

  const renderNavbar = () => (
    <>
      <header className="site-navigation-header sticky top-0 z-40 w-full border-b border-emerald-500/15 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between px-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigateTo('home')} aria-label="FaujPrep home" className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
          <FaujPrepLogo />
        </button>

        {/* Desktop Nav */}
        <nav aria-label="Primary navigation" className="hidden xl:flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-semibold text-slate-300">
          <button
            onClick={() => navigateTo('home')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'home' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Home
          </button>

          <div className="relative group">
            <button
              onClick={() => navigateTo('forces')}
              aria-haspopup="true"
              className={`primary-nav-link flex items-center gap-1 px-2.5 py-2 rounded-lg transition ${['forces', 'army', 'paf', 'navy', 'issb'].includes(currentPage) ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
            >
              Forces <ChevronDown className="w-3.5 h-3.5 opacity-70 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="force-nav-menu invisible pointer-events-none absolute left-0 top-full z-50 mt-2 w-60 translate-y-1 rounded-xl border border-slate-700/80 bg-slate-900/98 p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <button onClick={() => navigateTo('army')} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-emerald-300">
                <span>Pakistan Army</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">PMA</span>
              </button>
              <button onClick={() => navigateTo('paf')} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-sky-300">
                <span>Pakistan Air Force</span>
                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.5 rounded">PAF</span>
              </button>
              <button onClick={() => navigateTo('navy')} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-blue-300">
                <span>Pakistan Navy</span>
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">Navy</span>
              </button>
              <div className="my-1 border-t border-slate-800"></div>
              <button onClick={() => navigateTo('issb')} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-amber-300">
                <span>ISSB Preparation</span>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-bold">Special</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => navigateTo('practice')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'practice' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Practice Tests
          </button>
          <button
            onClick={() => navigateTo('mock-tests')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'mock-tests' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Full Mock Tests
          </button>
          <button
            onClick={() => navigateTo('resources')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'resources' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Resources
          </button>
          <button
            onClick={() => navigateTo('study-materials')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'study-materials' || currentPage === 'study-material-detail' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Study Materials
          </button>
          <button
            onClick={() => navigateTo('pricing')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'pricing' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Pricing
          </button>
          <button
            onClick={() => navigateTo('billing')}
            className={`primary-nav-link px-2.5 py-2 rounded-lg transition ${currentPage === 'billing' ? 'text-emerald-300 bg-emerald-950/45 border border-emerald-500/25' : 'hover:text-white hover:bg-slate-900'}`}
          >
            Billing
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden xl:flex shrink-0 items-center gap-2">
          {session?.user && !session.user.is_anonymous && renderNotificationButton()}
          {isPrimaryAdmin(session?.user) ? <><button onClick={() => navigateTo('admin')} className="text-sm font-medium text-amber-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-900 transition">Admin Workspace</button><button onClick={async () => { await signOut(); addToast('Admin signed out.', 'success'); }} className="text-sm font-medium text-rose-200 hover:text-white px-3 py-1.5 rounded-md hover:bg-rose-950/60 transition">Sign Out</button></> : <button onClick={() => navigateTo('admin-login')} className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-900 transition">Admin Login</button>}
        </div>

        {/* Mobile Hamburger */}
        <div className="xl:hidden flex items-center gap-2">
          {session?.user && !session.user.is_anonymous && renderNotificationButton()}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="mobile-navigation-toggle"
            type="button"
            aria-controls="mobile-navigation"
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      </header>
      {mobileMenuOpen && createPortal(
        <div className="xl:hidden mobile-nav-overlay fixed inset-0 z-[60]">
          <button type="button" tabIndex={-1} aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-backdrop absolute inset-0 h-full w-full bg-slate-950/75 backdrop-blur-sm" />
          <div id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Site navigation" className="mobile-nav-panel absolute inset-y-0 right-0 flex w-[88vw] max-w-sm flex-col border-l border-emerald-500/20 bg-slate-900 p-4 shadow-2xl sm:p-6" style={{ height: '100dvh', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
              <FaujPrepLogo />
              <button type="button" id="mobile-navigation-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="mobile-nav-list min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-5">
              <section className="mobile-nav-section">
                <h2 className="mobile-nav-section-label">Main</h2>
                {renderMobileNavLink('home', 'Home')}
                {renderMobileNavLink('search', 'Search')}
                {session?.user && !session.user.is_anonymous && <button type="button" onClick={() => navigateTo('notifications')} aria-current={currentPage === 'notifications' ? 'page' : undefined} className={`mobile-nav-link flex items-center justify-between ${currentPage === 'notifications' ? 'mobile-nav-link-active' : ''}`}><span>Notifications</span>{notificationUnreadCount > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount} unread</span>}</button>}
              </section>

              <section className="mobile-nav-section">
                <h2 className="mobile-nav-section-label">Forces</h2>
                {renderMobileNavLink('army', 'Pakistan Army')}
                {renderMobileNavLink('paf', 'Pakistan Air Force')}
                {renderMobileNavLink('navy', 'Pakistan Navy')}
                {renderMobileNavLink('issb', 'ISSB Preparation')}
              </section>

              <section className="mobile-nav-section">
                <h2 className="mobile-nav-section-label">Preparation</h2>
                {renderMobileNavLink('practice', 'Practice Tests')}
                {renderMobileNavLink('mock-tests', 'Full Mock Tests', ['mock-tests', 'mock-detail'])}
                {renderMobileNavLink('resources', 'Resources')}
                {renderMobileNavLink('study-materials', 'Study Materials', ['study-materials', 'study-material-detail'])}
                {renderMobileNavLink('current-affairs', 'Current Affairs', ['current-affairs', 'current-affairs-detail'])}
              </section>

              <section className="mobile-nav-section">
                <h2 className="mobile-nav-section-label">Account</h2>
                {renderMobileNavLink('pricing', 'Pricing')}
                {session && renderMobileNavLink('billing', 'Billing')}
                {session && renderMobileNavLink('dashboard', 'Dashboard')}
                {session && renderMobileNavLink('profile', 'Profile')}
              </section>

              <section className="mobile-nav-section">
                <h2 className="mobile-nav-section-label">About</h2>
                {renderMobileNavLink('about', 'About FaujPrep')}
                {renderMobileNavLink('contact', 'Contact')}
              </section>
            </nav>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-800 pt-4">
              {isPrimaryAdmin(session?.user) ? <button onClick={async () => { await signOut(); setMobileMenuOpen(false); addToast('Admin signed out.', 'success'); }} className="min-h-11 w-full rounded-lg border border-rose-500/30 bg-rose-950/50 py-2.5 text-sm font-semibold text-rose-200">Sign Out</button> : <button onClick={() => { navigateTo('admin-login'); setMobileMenuOpen(false); }} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-200">Admin Login</button>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  const renderFooter = () => (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Column 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <FaujPrepLogo />
            <p className="text-sm font-medium text-emerald-400 font-serif italic">
              "Prepare Smarter. Serve with Purpose."
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Structured preparation platform for candidates aspiring to join the Pakistan Army, Pakistan Air Force, Pakistan Navy, and clear the ISSB selection process.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                Phase 1 Frontend Foundation
              </span>
            </div>
          </div>

          {/* Column 2: Preparation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">Preparation Paths</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigateTo('army')} className="hover:text-emerald-400 transition">Pakistan Army</button></li>
              <li><button onClick={() => navigateTo('paf')} className="hover:text-sky-400 transition">Pakistan Air Force</button></li>
              <li><button onClick={() => navigateTo('navy')} className="hover:text-blue-400 transition">Pakistan Navy</button></li>
              <li><button onClick={() => navigateTo('issb')} className="hover:text-amber-400 transition">ISSB Preparation</button></li>
            </ul>
          </div>

          {/* Column 3: Platform Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigateTo('practice')} className="hover:text-emerald-400 transition">Practice Tests</button></li>
              <li><button onClick={() => navigateTo('mock-tests')} className="hover:text-emerald-400 transition">Full Mock Tests</button></li>
              <li><button onClick={() => navigateTo('resources')} className="hover:text-emerald-400 transition">Guides & Papers</button></li>
              <li><button onClick={() => navigateTo('study-materials')} className="hover:text-emerald-400 transition">Study Materials</button></li>
              <li><button onClick={() => navigateTo('current-affairs')} className="hover:text-emerald-400 transition">Current Affairs</button></li>
              <li><button onClick={() => navigateTo('pricing')} className="hover:text-emerald-400 transition">Pricing Plans</button></li>
            </ul>
          </div>

          {/* Column 4: Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">Legal & Support</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigateTo('contact')} className="hover:text-emerald-400 transition">Contact Us</button></li>
              <li><button onClick={() => navigateTo('about')} className="hover:text-emerald-400 transition">About FaujPrep</button></li>
              <li><button onClick={() => navigateTo('privacy')} className="hover:text-emerald-400 transition">Privacy Policy</button></li>
              <li><button onClick={() => navigateTo('terms')} className="hover:text-emerald-400 transition">Terms of Service</button></li>
              <li><button onClick={() => navigateTo('disclaimer')} className="hover:text-emerald-400 transition">Official Disclaimer</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 pb-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl"
            style={{
              backgroundImage: "linear-gradient(90deg, rgba(2, 6, 23, 0.30), rgba(2, 6, 23, 0.50)), url('/images/hero%20section.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              minHeight: '220px',
            }}
          >
            <div className="flex items-center justify-center min-h-[220px] px-6 py-8 text-center">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-950/35 px-5 py-4 shadow-lg backdrop-blur-[2px]">
                <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-emerald-300">FaujPrep</p>
                <p className="mt-2 text-lg sm:text-2xl font-bold text-slate-100">Prepare for the Forces. Build Your Future.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Non-affiliation Disclaimer & Copyright */}
        <div className="pt-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-300">Mandatory Platform Notice:</strong> FaujPrep is an independent educational test preparation platform and is not affiliated with, endorsed by, or operated by the Pakistan Army, Pakistan Air Force, Pakistan Navy, or ISSB unless explicitly stated. Official recruitment schedules, eligibility criteria, and induction procedures must always be verified directly through official military recruitment portals and regional induction centers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 pt-2">
            <p>© {new Date().getFullYear()} FaujPrep. All rights reserved. Built for disciplined candidate preparation.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <button onClick={() => navigateTo('privacy')} className="hover:underline">Privacy</button>
              <button onClick={() => navigateTo('terms')} className="hover:underline">Terms</button>
              <button onClick={() => navigateTo('disclaimer')} className="hover:underline">Disclaimer</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );

  const renderModal = () => {
    if (!modalState.isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Shield className="w-5 h-5" />
              <h3 className="font-semibold text-slate-100 text-base">{modalState.title}</h3>
            </div>
            <button onClick={closeModal} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{modalState.description}</p>
          <div className="pt-2 flex justify-end">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-lg shadow transition"
            >
              {modalState.actionText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderToasts = () => (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium shadow-2xl transition animate-slide-up ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );

  const renderBackendStatus = () => {
    if (backendLoading) {
      return <div className="border-b border-emerald-500/20 bg-emerald-950/40 px-4 py-2 text-center text-xs text-emerald-200">Loading live FaujPrep content...</div>;
    }
    if (!backendConfigured) {
      return <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-200">Database setup required: add Supabase environment variables before using live content and authentication.</div>;
    }
    if (backendError) {
      return <div className="border-b border-rose-500/30 bg-rose-950/40 px-4 py-2 text-center text-xs text-rose-200">Unable to load live content: {backendError}</div>;
    }
    return null;
  };

  const renderHomePage = () => (
    <div className="space-y-20 pb-16">
      
      {/* Hero Section */}
      <section
        className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-800/60"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(1, 6, 18, 0.88) 0%, rgba(2, 11, 24, 0.78) 38%, rgba(2, 11, 24, 0.62) 100%), url('/images/pakistan%20army%20section.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pakistan's Military Test Preparation Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.15]">
                Prepare for the Forces. <br />
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                  Build Your Future.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
                Prepare for Pakistan Army, Air Force, Navy and ISSB with structured practice, realistic tests and focused preparation designed for serious candidates.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => navigateTo('practice')}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-base shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition hover:scale-[1.02]"
                >
                  Start Preparing <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateTo('practice')}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-base transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5 text-emerald-400" /> Explore Tests
                </button>
              </div>

              {/* Secondary Trust Pillars */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Subject Syllabus</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Timed Practice</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>ISSB Prep Modules</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Graphic */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Visual Card Frame */}
                <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm">FaujPrep System</h3>
                        <p className="text-[11px] text-slate-400">Targeted Preparation Modules</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Structured
                    </span>
                  </div>

                  {/* Interactive Force Tags */}
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => navigateTo('army')} className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 hover:border-emerald-400 cursor-pointer transition group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">Pakistan Army</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-[10px] text-slate-400">PMA & Technical Cadet</span>
                    </div>

                    <div onClick={() => navigateTo('paf')} className="p-3 rounded-xl bg-slate-900 border border-sky-500/30 hover:border-sky-400 cursor-pointer transition group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400">Air Force</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-[10px] text-slate-400">GDP & Engineering</span>
                    </div>

                    <div onClick={() => navigateTo('navy')} className="p-3 rounded-xl bg-slate-900 border border-blue-500/30 hover:border-blue-400 cursor-pointer transition group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400">Pakistan Navy</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-[10px] text-slate-400">PN Cadet & SSC</span>
                    </div>

                    <div onClick={() => navigateTo('issb')} className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-400 cursor-pointer transition group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-400">ISSB Board</span>
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      </div>
                      <span className="text-[10px] text-slate-400">4-Day Selection Prep</span>
                    </div>
                  </div>

                  {/* Sample Module Graphic Item */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Practice Module</span>
                      <span className="text-[10px] font-mono text-emerald-400">Interactive</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Intelligence Test Practice: Verbal reasoning analogies, spatial matrix completion, and mathematical word problems.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Forces Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Choose Your Preparation Path
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Focused preparation structures tailored for Pakistan's major military entry routes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Army Card */}
          <div
            className="group rounded-2xl border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-8 space-y-6 transition-all duration-300 shadow-xl flex flex-col justify-between bg-slate-950/80 overflow-hidden relative"
            style={{
              backgroundImage: FORCES_DATA.army.backgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-slate-950/10" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
                  PMA & TCC
                </span>
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition">
                {FORCES_DATA.army.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {FORCES_DATA.army.description}
              </p>
              <div className="space-y-2 pt-2" aria-hidden="true">
                <div className="h-0 opacity-0" />
              </div>
            </div>
            <button
              onClick={() => navigateTo('army')}
              className="relative z-10 w-full py-3 rounded-xl bg-slate-900/80 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              Explore Army Prep <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* PAF Card */}
          <div
            className="group rounded-2xl border border-slate-800 hover:border-sky-500/50 p-6 sm:p-8 space-y-6 transition-all duration-300 shadow-xl flex flex-col justify-between bg-slate-950/80 overflow-hidden relative"
            style={{
              backgroundImage: FORCES_DATA.paf.backgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-slate-950/10" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-sky-950 border border-sky-800 text-sky-400 font-bold">
                  GDP & CAE
                </span>
                <Zap className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 group-hover:text-sky-400 transition">
                {FORCES_DATA.paf.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {FORCES_DATA.paf.description}
              </p>
              <div className="space-y-2 pt-2" aria-hidden="true">
                <div className="h-0 opacity-0" />
              </div>
            </div>
            <button
              onClick={() => navigateTo('paf')}
              className="relative z-10 w-full py-3 rounded-xl bg-slate-900/80 hover:bg-sky-500 hover:text-slate-950 text-sky-400 border border-sky-500/30 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              Explore PAF Prep <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Navy Card */}
          <div
            className="group rounded-2xl border border-slate-800 hover:border-blue-500/50 p-6 sm:p-8 space-y-6 transition-all duration-300 shadow-xl flex flex-col justify-between bg-slate-950/80 overflow-hidden relative"
            style={{
              backgroundImage: FORCES_DATA.navy.backgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-slate-950/10" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-blue-950 border border-blue-800 text-blue-400 font-bold">
                  PN Cadet & SSC
                </span>
                <Compass className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 group-hover:text-blue-400 transition">
                {FORCES_DATA.navy.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {FORCES_DATA.navy.description}
              </p>
              <div className="space-y-2 pt-2" aria-hidden="true">
                <div className="h-0 opacity-0" />
              </div>
            </div>
            <button
              onClick={() => navigateTo('navy')}
              className="relative z-10 w-full py-3 rounded-xl bg-slate-900/80 hover:bg-blue-500 hover:text-slate-950 text-blue-400 border border-blue-500/30 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              Explore Navy Prep <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ISSB Prominent Card */}
          <div
            className="group rounded-2xl border border-amber-500/40 hover:border-amber-400 p-6 sm:p-8 space-y-6 transition-all duration-300 shadow-xl flex flex-col justify-between relative overflow-hidden bg-slate-950/80"
            style={{
              backgroundImage: FORCES_DATA.issb.backgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-slate-950/10" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Specialized Board Prep
                </span>
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100 group-hover:text-amber-300 transition">
                  {FORCES_DATA.issb.name}
                </h3>
                <p className="text-xs text-amber-400 font-mono">{FORCES_DATA.issb.subtitle}</p>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {FORCES_DATA.issb.description}
              </p>
              <div className="space-y-2 pt-2" aria-hidden="true">
                <div className="h-0 opacity-0" />
              </div>
            </div>
            <button
              onClick={() => navigateTo('issb')}
              className="relative z-10 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50"
            >
              Explore ISSB Prep <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ISSB Feature Section */}
      <section
        className="relative overflow-hidden border-y border-slate-800/80 py-20"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.82)), url('/images/issb%20centre.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-400 text-xs font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> Essential Officer Selection
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">
              Master Your ISSB Preparation
            </h2>
            <p className="text-sm text-slate-200 max-w-xl mx-auto">
              Build familiarity with the major psychological, group testing, and interview dimensions of the ISSB board evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {issbCatalog.map((mod) => (
              <div
                key={mod.id}
                className="p-5 rounded-xl bg-slate-900/70 border border-slate-700/70 hover:border-amber-500/40 transition flex flex-col justify-between space-y-4 backdrop-blur-[2px]"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">{mod.category}</span>
                  <h3 className="font-bold text-slate-100 text-base">{mod.title}</h3>
                  <p className="text-xs text-slate-200 leading-relaxed">{mod.desc}</p>
                </div>
                <button
                  onClick={() => openModal(`Practice: ${mod.title}`, `Interactive exercise execution for "${mod.title}" will be activated in Phase 2 alongside automated timer and performance tracking.`)}
                  className="w-full py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/50 hover:bg-amber-950/70 border border-amber-800/50 rounded-lg transition"
                >
                  Practice Module
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Timeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-100">How FaujPrep Works</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            A disciplined four-step methodology designed to maximize candidate readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            { step: '01', title: 'Choose Your Path', desc: 'Select Army, PAF, Navy, or ISSB to access tailored subject modules.' },
            { step: '02', title: 'Practice Exercises', desc: 'Work through intelligence, physics, math, and English question banks.' },
            { step: '03', title: 'Track Performance', desc: 'Review topic-wise accuracy and section timing in your personal dashboard.' },
            { step: '04', title: 'Target Weak Areas', desc: 'Reinforce challenging topics with focused practice tests.' }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative">
              <span className="text-3xl font-extrabold font-mono text-emerald-400">{item.step}</span>
              <h3 className="font-bold text-slate-100 text-lg">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative min-h-[320px] sm:min-h-[360px] overflow-hidden rounded-[28px] border border-emerald-500/40 px-7 py-9 sm:px-12 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl"
          style={{
            backgroundImage: "linear-gradient(90deg, rgba(2, 6, 23, 0.72) 0%, rgba(2, 8, 16, 0.48) 48%, rgba(2, 8, 16, 0.12) 100%), url('/images/Simple%20&%20Accessible%20Preparation%20Plans.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 54%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="relative z-10 max-w-2xl space-y-3 text-center md:text-left">
            <span className="text-xs font-mono uppercase text-emerald-400 tracking-[0.2em]">Transparent Preparation</span>
            <h2 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold text-slate-100 leading-tight">Simple & Accessible Preparation Plans</h2>
            <p className="text-sm sm:text-lg text-slate-200 max-w-3xl">
              Start with free practice questions or upgrade to unlock comprehensive test banks and ISSB preparation tools.
            </p>
          </div>
          <button
            onClick={() => navigateTo('pricing')}
            className="relative z-10 shrink-0 mt-2 md:mt-0 whitespace-nowrap px-5 py-3.5 sm:px-6 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-emerald-950/30 transition"
          >
            View Preparation Plans
          </button>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-100">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-400">Everything you need to know about FaujPrep platform capabilities.</p>
        </div>

        <div className="space-y-3">
          {FAQ_DATA.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                className="w-full text-left p-4 sm:p-5 font-semibold text-slate-200 text-sm sm:text-base flex items-center justify-between gap-4 hover:text-emerald-400 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative min-h-[340px] sm:min-h-[380px] overflow-hidden rounded-3xl border border-slate-700/80 px-6 py-10 sm:px-12 sm:py-12 flex flex-col justify-center text-center space-y-6 shadow-xl"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(2, 6, 23, 0.58) 0%, rgba(2, 6, 23, 0.38) 42%, rgba(2, 6, 23, 0.72) 100%), url('/images/Start%20Preparing%20Today.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 56%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">Start Preparing Today</h2>
          <p className="text-sm text-slate-200 max-w-xl mx-auto">
            Build your preparation discipline step by step with focused practice questions and structured syllabus guides.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigateTo('practice')}
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              Start Free Practice
            </button>
            <button
              onClick={() => navigateTo('issb')}
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm border border-amber-500/30 transition"
            >
              Explore ISSB Prep
            </button>
          </div>
        </div>
      </section>

    </div>
  );

  const renderForcePage = (forceKey) => {
    const configuredBranchSlug = { army: 'pak-army', paf: 'paf', navy: 'pak-navy', issb: 'issb' }[forceKey];
    const databaseBranch = backendConfigured
      ? backendData.branches.find((branch) => branch.slug === configuredBranchSlug)
      : null;
    const force = databaseBranch
      ? { ...FORCES_DATA[forceKey], name: databaseBranch.name, description: databaseBranch.description || databaseBranch.short_description }
      : FORCES_DATA[forceKey];
    if (!force) return null;
    const hasSyllabusBackground = forceKey === 'army' || forceKey === 'navy';

    const forceHeroBackgrounds = {
      army: {
        backgroundImage: "linear-gradient(105deg, rgba(2, 8, 23, 0.42) 0%, rgba(2, 8, 23, 0.3) 58%, rgba(2, 8, 23, 0.12) 100%), url('/images/pakistan%20army%20preparation.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
      navy: {
        backgroundImage: "linear-gradient(105deg, rgba(2, 8, 23, 0.36) 0%, rgba(2, 8, 23, 0.24) 58%, rgba(2, 8, 23, 0.08) 100%), url('/images/pakistan%20navy%20preparation.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Force Hero Header */}
        <div
          className={`relative overflow-hidden p-8 sm:p-12 rounded-3xl bg-gradient-to-br ${force.badgeColor} border ${forceKey === 'paf' ? 'border-cyan-500/40' : forceKey === 'army' ? 'border-emerald-500/40' : forceKey === 'navy' ? 'border-blue-500/40' : ''} space-y-6`}
          style={forceKey === 'paf' ? {
            backgroundImage: "linear-gradient(105deg, rgba(2, 8, 23, 0.66) 0%, rgba(2, 8, 23, 0.48) 58%, rgba(2, 8, 23, 0.24) 100%), url('/images/pakistan%20air%20force%20preparations.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          } : forceHeroBackgrounds[forceKey]}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest font-bold bg-slate-950/80 px-3 py-1 rounded-md border border-slate-800">
              {force.subtitle || force.name}
            </span>
            <Shield className="w-8 h-8 opacity-80" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100">{force.name} Preparation</h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">{force.tagline}</p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl border-t border-slate-800/80 pt-4">
            {force.description}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => navigateTo('practice')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-950 font-bold text-xs hover:bg-white transition flex items-center gap-2"
            >
              Start Practice Tests <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateTo('mock-tests')}
              className="px-5 py-2.5 rounded-xl bg-slate-950/80 text-slate-200 border border-slate-800 font-semibold text-xs hover:bg-slate-900 transition"
            >
              View Mock Tests
            </button>
          </div>
        </div>

        <div
          className={`space-y-6 ${hasSyllabusBackground ? 'relative overflow-hidden rounded-3xl border border-slate-600/40 p-4 sm:p-6' : forceKey === 'paf' ? 'relative overflow-hidden rounded-3xl border border-cyan-500/30 p-4 sm:p-6' : ''}`}
          style={hasSyllabusBackground ? {
            backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.22), rgba(2, 6, 23, 0.34)), url('/images/Syllabus%20&%20Subject%20Structure.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 55%',
            backgroundRepeat: 'no-repeat',
          } : forceKey === 'paf' ? {
            backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.28)), url('/images/Paf%20Syllabus%20&%20Subject%20Structure.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 55%',
            backgroundRepeat: 'no-repeat',
          } : undefined}
        >
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" /> Syllabus & Subject Structure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {force.subjects.map((sub, idx) => (
              <div key={idx} className={`p-5 rounded-2xl ${forceKey === 'paf' || hasSyllabusBackground ? 'bg-slate-950/65 border border-slate-600/70' : 'bg-slate-900 border border-slate-800'} space-y-3`}>
                <span className="text-xs font-mono text-emerald-400">Subject 0{idx + 1}</span>
                <h3 className="font-bold text-slate-200 text-base">{sub}</h3>
                <p className="text-xs text-slate-400">Practice questions aligned with standard initial test topics.</p>
                <button
                  onClick={() => navigateTo('practice')}
                  className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Start Practice <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Routes & Eligibility Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-200 text-lg">Supported Induction Routes</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {force.routes.map((route, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{route}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Official Recruitment Note</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {force.requirementsNote}
            </p>
            <div className="pt-2 text-[11px] text-slate-400 italic">
              Verification statement: FaujPrep provides candidate educational practice and does not issue official recruitment schedules.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExamPage = () => {
    const exam = backendData.exams.find((item) => item.slug === selectedForceId);
    if (!exam) return render404Page();
    const branch = backendData.branches.find((item) => item.id === exam.branch_id);
    const tests = backendData.mockTests.filter((test) => test.exam_id === exam.id);
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <button onClick={() => navigateTo(branch?.slug === 'issb' ? 'issb' : branch?.slug === 'paf' ? 'paf' : branch?.slug === 'pak-navy' ? 'navy' : 'army')} className="text-xs text-emerald-400 hover:underline">Back to {branch?.name || 'preparation'}</button>
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4"><span className="text-xs font-mono uppercase text-emerald-400">{exam.exam_type || 'Preparation'}</span><h1 className="text-3xl font-extrabold text-slate-100">{exam.name}</h1><p className="text-sm text-slate-300">{exam.description || exam.short_description}</p><div className="flex gap-5 text-xs font-mono text-slate-400"><span>{exam.duration_minutes ? `${exam.duration_minutes} minutes` : 'Self-paced'}</span><span>{exam.total_questions ? `${exam.total_questions} questions` : 'Structured practice'}</span></div></div>
        <section className="space-y-4"><h2 className="text-2xl font-bold text-slate-100">Available mock tests</h2>{tests.length ? <div className="grid gap-4">{tests.map((test) => <button key={test.id} onClick={() => startMockSession(test)} className="text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition"><h3 className="font-bold text-slate-100">{test.title}</h3><p className="text-xs text-slate-400 mt-2">{test.duration_minutes} minutes · {test.total_questions} questions · {test.difficulty || 'Practice'}</p></button>)}</div> : <p className="p-6 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No mock tests are available for this exam yet.</p>}</section>
      </div>
    );
  };

  const renderSubjectPage = () => {
    const subject = backendData.subjects.find((item) => item.slug === selectedForceId);
    if (!subject) return render404Page();
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"><span className="text-xs font-mono uppercase text-emerald-400">Database subject</span><h1 className="text-3xl font-extrabold text-slate-100">{subject.name}</h1><p className="text-sm text-slate-400">{subject.description || 'Structured practice content from the FaujPrep database.'}</p><button onClick={() => startPracticeSession({ subjectId: subject.id, questionsCount: 20 })} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Start Subject Practice</button></div>
        <section className="space-y-4"><h2 className="text-2xl font-bold text-slate-100">Topics</h2>{contentLoading ? <p className="text-sm text-slate-400">Loading topics...</p> : contentTopics.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{contentTopics.map((topic) => <div key={topic.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800"><h3 className="font-bold text-slate-100">{topic.name}</h3><p className="text-xs text-slate-400 mt-2">{topic.description || 'Practice topic from the database.'}</p></div>)}</div> : <p className="p-6 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No topics are available for this subject yet.</p>}</section>
      </div>
    );
  };

  const renderStudyMaterialsPage = () => {
    const { items, loading, error, hasMore, page } = studyMaterialsPageState;
    const hasActiveFilters = studyMaterialsFilters.branchId !== 'All' || studyMaterialsFilters.subjectId !== 'All' || studyMaterialsFilters.topicId !== 'All' || studyMaterialsFilters.materialType !== 'All' || studyMaterialsFilters.search.trim().length > 0;

    const clearFilters = () => setStudyMaterialsFilters({ branchId: 'All', subjectId: 'All', topicId: 'All', materialType: 'All', search: '' });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-100">Study Materials</h1>
          <p className="text-sm text-slate-400 max-w-2xl">Browse database-backed preparation notes, guides, PDF resources, and study references for Army, PAF, Navy, and ISSB preparation.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input
              type="text"
              value={studyMaterialsFilters.search}
              onChange={(event) => setStudyMaterialsFilters((previous) => ({ ...previous, search: event.target.value }))}
              placeholder="Search materials..."
              aria-label="Search study materials"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <select value={studyMaterialsFilters.branchId} onChange={(event) => setStudyMaterialsFilters((previous) => ({ ...previous, branchId: event.target.value, topicId: 'All' }))} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="All">All branches</option>
              {backendData.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={studyMaterialsFilters.subjectId} onChange={(event) => setStudyMaterialsFilters((previous) => ({ ...previous, subjectId: event.target.value, topicId: 'All' }))} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="All">All subjects</option>
              {backendData.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select value={studyMaterialsFilters.topicId} onChange={(event) => setStudyMaterialsFilters((previous) => ({ ...previous, topicId: event.target.value }))} disabled={studyMaterialsFilters.subjectId === 'All'} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50">
              <option value="All">All topics</option>
              {studyMaterialTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
            <select value={studyMaterialsFilters.materialType} onChange={(event) => setStudyMaterialsFilters((previous) => ({ ...previous, materialType: event.target.value }))} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="All">All types</option>
              {[...new Set((backendData.studyMaterials || []).map((item) => item.material_type).filter(Boolean))].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">Clear Filters</button>
            </div>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="h-4 w-20 rounded bg-slate-800" />
                <div className="h-6 w-full rounded bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-800" />
                <div className="h-4 w-4/5 rounded bg-slate-800" />
                <div className="h-10 w-full rounded-xl bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Unable to load study materials.</h2>
            <p className="text-sm text-slate-300">{error}</p>
            <button type="button" onClick={() => loadStudyMaterialsPage(1, studyMaterialsFilters)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Try Again</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="p-12 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">No study materials found.</h2>
            <p className="text-sm text-slate-400">{hasActiveFilters ? 'Try clearing some filters.' : 'No published study materials are available in the database yet.'}</p>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Clear Filters</button>}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((material) => {
              const subject = material.subjects?.name || (backendData.subjects.find((item) => item.id === material.subject_id)?.name || 'General');
              const topic = material.topics?.name || 'General topic';
              const branch = material.military_branches?.name || (backendData.branches.find((item) => item.id === material.branch_id)?.name || 'General');
              return (
                <article key={material.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] bg-slate-800 border border-slate-700 text-emerald-400 px-2 py-1 rounded font-mono uppercase">{material.material_type || 'Guide'}</span>
                      {material.is_premium ? <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500/30 px-2 py-1 rounded">Premium</span> : <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded">Free</span>}
                    </div>

                    {material.cover_image_url ? (
                      <img src={material.cover_image_url} alt={material.title} loading="lazy" decoding="async" className="h-40 w-full object-cover rounded-xl border border-slate-800" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="h-40 w-full rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-slate-500 font-semibold text-sm">Study Resource</div>
                    )}

                    <div className="space-y-3">
                      <h2 className="text-xl font-bold text-slate-100 leading-tight">{material.title}</h2>
                      <p className="text-base text-slate-400 line-clamp-3">{material.description || 'No summary is available for this study material yet.'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
                      {subject && <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{subject}</span>}
                      {topic && <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{topic}</span>}
                      {branch && <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{branch}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {material.is_premium && !canAccessPremiumResources ? (
                      <button type="button" onClick={() => navigateTo('pricing')} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">Upgrade to Unlock</button>
                    ) : (
                      <button type="button" onClick={() => navigateTo('study-material-detail', material.slug)} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">View Details</button>
                    )}
                    {material.pdf_url && canAccessPremiumResources ? (
                      <a href={material.pdf_url} target="_blank" rel="noreferrer" className="flex-1 text-center px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 font-bold text-xs">Open Resource</a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && hasMore && (
          <div className="flex justify-center">
            <button type="button" onClick={() => loadStudyMaterialsPage(page + 1, studyMaterialsFilters)} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-xs">Load More</button>
          </div>
        )}
      </div>
    );
  };

  const renderStudyMaterialDetailPage = () => {
    const { item, loading, error } = studyMaterialDetailState;

    if (loading) {
      return <div className="max-w-4xl mx-auto px-4 py-20"><div className="animate-pulse rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-4"><div className="h-6 w-28 rounded bg-slate-800" /><div className="h-10 w-2/3 rounded bg-slate-800" /><div className="h-4 w-full rounded bg-slate-800" /><div className="h-4 w-5/6 rounded bg-slate-800" /><div className="h-52 w-full rounded-2xl bg-slate-800" /></div></div>;
    }

    if (error) {
      return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Unable to load study material.</h1><p className="text-sm text-slate-400">{error}</p><button onClick={() => navigateTo('study-materials')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Back to Study Materials</button></div>;
    }

    if (!item) return render404Page();

    if (item.is_premium && !canAccessPremiumResources) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-3xl font-extrabold text-slate-100">Premium study material</h1>
          <p className="text-sm text-slate-400">This resource is available on FaujPrep Pro or Premium. Upgrade to unlock it.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigateTo('pricing')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">View Plans</button>
            <button onClick={() => navigateTo('study-materials')} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">Back to Library</button>
          </div>
        </div>
      );
    }

    const subject = item.subjects?.name || (backendData.subjects.find((entry) => entry.id === item.subject_id)?.name || 'General');
    const topic = item.topics?.name || 'General topic';
    const branch = item.military_branches?.name || (backendData.branches.find((entry) => entry.id === item.branch_id)?.name || 'General');

    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Study Materials', href: '/study-materials' }, { label: item.title }]} />

        <article className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          {item.cover_image_url ? <img src={item.cover_image_url} alt={item.title} className="h-64 w-full object-cover rounded-2xl border border-slate-800" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
            {item.material_type && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{item.material_type}</span>}
            {subject && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{subject}</span>}
            {topic && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{topic}</span>}
            {branch && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{branch}</span>}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{item.title}</h1>
            <p className="text-base leading-7 text-slate-300">{item.description || 'No summary is available for this resource yet.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-400 uppercase font-mono">Subject</span><strong className="text-slate-100">{subject}</strong></div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-400 uppercase font-mono">Topic</span><strong className="text-slate-100">{topic}</strong></div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-400 uppercase font-mono">Branch</span><strong className="text-slate-100">{branch}</strong></div>
          </div>

          {item.pdf_url ? (
            <div className="flex gap-3 flex-wrap">
              <a href={item.pdf_url} target="_blank" rel="noreferrer" className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Open Resource</a>
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
            <h2 className="text-xl font-bold text-slate-100 mb-3">Resource Details</h2>
            <div className="space-y-4">{renderStudyGuideContent(item.content || item.description || 'No detailed content is available for this resource yet.')}</div>
          </div>
        </article>
      </div>
    );
  };

  const renderCurrentAffairsPage = () => {
    const { items, loading, error, hasMore, page } = currentAffairsPageState;
    const hasActiveFilters = currentAffairsFilters.category !== 'All' || currentAffairsFilters.search.trim().length > 0;
    const currentAffairsTopics = [
      'AI & Cyber Security',
      'Climate & Water Security',
      'Regional Security & Connectivity',
      'Energy & Energy Security',
      'Space & Defence Technology',
    ];
    const availableCategories = [...new Set([
      ...currentAffairsTopics,
      ...(backendData.currentAffairs || []).map((item) => item.category).filter(Boolean),
    ])];

    const clearFilters = () => setCurrentAffairsFilters({ category: 'All', search: '' });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-100">Current Affairs</h1>
          <p className="text-sm text-slate-400 max-w-2xl">Stay aligned with current public and strategic issues relevant to Pakistan military, defence, and general awareness preparation.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              value={currentAffairsFilters.search}
              onChange={(event) => setCurrentAffairsFilters((previous) => ({ ...previous, search: event.target.value }))}
              placeholder="Search current affairs..."
              aria-label="Search current affairs"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <nav aria-label="Current affairs topics" className="flex gap-2 overflow-x-auto pb-1">
              {['All', ...availableCategories].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCurrentAffairsFilters((previous) => ({ ...previous, category }))}
                  aria-pressed={currentAffairsFilters.category === category}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${currentAffairsFilters.category === category ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300'}`}
                >
                  {category === 'All' ? 'All topics' : category}
                </button>
              ))}
            </nav>
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">Clear Filters</button>
            </div>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="h-5 w-24 rounded bg-slate-800" />
                <div className="h-7 w-full rounded bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-800" />
                <div className="h-4 w-4/5 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Unable to load current affairs.</h2>
            <p className="text-sm text-slate-300">{error}</p>
            <button type="button" onClick={() => loadCurrentAffairsPage(1, currentAffairsFilters)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Try Again</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="p-12 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">No current affairs found.</h2>
            <p className="text-sm text-slate-400">{hasActiveFilters ? 'Try clearing some filters.' : 'No published current-affairs records are available in the database yet.'}</p>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Clear Filters</button>}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.map((item) => (
              <article key={item.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  {item.image_url ? <img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="h-48 w-full object-cover rounded-xl border border-slate-800" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="h-48 w-full rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-slate-500 font-semibold text-sm">Current Affairs</div>}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase font-mono bg-slate-800 border border-slate-700 text-emerald-400 px-2 py-1 rounded">{item.category || 'General'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.published_at ? new Date(item.published_at).toLocaleDateString('en-PK') : 'Date unavailable'}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 leading-tight">{item.title}</h2>
                    <p className="text-sm text-slate-400">{item.summary || 'No summary available for this item yet.'}</p>
                  </div>
                  {item.source_name ? <p className="text-[11px] text-slate-500">Reference: {item.source_name}</p> : null}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => navigateTo('current-affairs-detail', item.slug)} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Read More</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && hasMore && (
          <div className="flex justify-center">
            <button type="button" onClick={() => loadCurrentAffairsPage(page + 1, currentAffairsFilters)} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-xs">Load More</button>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentAffairsDetailPage = () => {
    const { item, loading, error } = currentAffairDetailState;

    if (loading) {
      return <div className="max-w-4xl mx-auto px-4 py-20"><div className="animate-pulse rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-4"><div className="h-6 w-28 rounded bg-slate-800" /><div className="h-10 w-2/3 rounded bg-slate-800" /><div className="h-4 w-full rounded bg-slate-800" /><div className="h-4 w-5/6 rounded bg-slate-800" /><div className="h-52 w-full rounded-2xl bg-slate-800" /></div></div>;
    }

    if (error) {
      return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Unable to load current affairs item.</h1><p className="text-sm text-slate-400">{error}</p><button onClick={() => navigateTo('current-affairs')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Back to Current Affairs</button></div>;
    }

    if (!item) return render404Page();

    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Current Affairs', href: '/current-affairs' }, { label: item.title }]} />

        <article className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          {item.image_url ? <img src={item.image_url} alt={item.title} className="h-64 w-full object-cover rounded-2xl border border-slate-800" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
            {item.category && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{item.category}</span>}
            {item.published_at && <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded">{new Date(item.published_at).toLocaleDateString('en-PK')}</span>}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{item.title}</h1>
            <p className="text-sm text-slate-300">{item.summary}</p>
          </div>

          {item.source_name ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300">
              <span className="text-slate-400 uppercase font-mono text-[10px] block mb-2">Reference</span>
              {item.source_name ? <span className="block">{item.source_name}</span> : null}
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
            <h2 className="text-xl font-bold text-slate-100 mb-3">Full Coverage</h2>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.content || item.summary}</div>
          </div>
        </article>
      </div>
    );
  };

  const renderISSBHubPage = () => {
    const issbBranch = backendConfigured ? backendData.branches.find((branch) => branch.slug === 'issb') : null;
    const issbModules = backendConfigured ? [...backendData.issbModules].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) : [];
    const issbMaterials = backendConfigured ? backendData.studyMaterials.filter((material) => {
      if (material.branch_id === issbBranch?.id) return true;
      const subject = backendData.subjects.find((entry) => entry.id === material.subject_id);
      return Boolean(subject && /issb|psychological|interview|gto|personality/i.test(subject.name || ''));
    }) : [];
    const issbMockTests = backendConfigured ? backendData.mockTests.filter((test) => test.branch_id === issbBranch?.id) : [];
    const relevantCurrentAffairs = backendConfigured ? backendData.currentAffairs.slice(0, 4) : [];
    const relevantPracticeSubjects = backendConfigured ? backendData.subjects.filter((subject) => /issb|psychological|interview|gto|personality|intelligence/i.test(subject.name || '')) : [];
    const openISSBPractice = () => {
      if (!backendConfigured) {
        navigateTo('practice');
        return;
      }
      const defaultSubjectId = relevantPracticeSubjects[0]?.id || '';
      setPracticeBranchId(issbBranch?.id || '');
      setPracticeSubjectId(defaultSubjectId);
      setPracticeTopicId('');
      navigateTo('practice');
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section
          className="relative min-h-[360px] sm:min-h-[460px] overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 p-8 sm:p-10 space-y-6 flex flex-col justify-center"
          style={{
            backgroundImage: "linear-gradient(105deg, rgba(2, 6, 23, 0.58) 0%, rgba(2, 6, 23, 0.38) 58%, rgba(2, 6, 23, 0.16) 100%), url('/images/issb%20preparation.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-amber-300 tracking-[0.2em]">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            ISSB Preparation Hub
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100">Build a disciplined ISSB preparation routine.</h1>
            <p className="max-w-3xl text-sm sm:text-base text-slate-300 leading-relaxed">
              This hub is powered by the live FaujPrep database and links directly to the existing ISSB modules, practice engine, mock tests, study materials, and current-affairs content already stored in Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigateTo('practice')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Start ISSB Practice</button>
            <button onClick={openISSBPractice} className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-sm">Target ISSB Subjects</button>
          </div>
        </section>

        <section
          className="relative overflow-hidden rounded-3xl border border-amber-500/25 p-4 sm:p-6 space-y-5"
          style={{
            backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.24), rgba(2, 6, 23, 0.34)), url('/images/Syllabus%20&%20Subject%20Structure.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 55%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-100">ISSB Preparation Modules</h2>
            <span className="text-[10px] uppercase font-mono text-amber-300">{issbModules.length} live modules</span>
          </div>
          {backendConfigured && issbModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {issbModules.map((module) => (
                <article key={module.id} className="p-6 rounded-2xl bg-slate-950/65 border border-slate-600/70 hover:border-amber-500/40 transition-all space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono uppercase text-amber-300 bg-amber-950/30 border border-amber-500/20 px-2 py-1 rounded">{module.module_type || 'Preparation'}</span>
                    <span className="text-[10px] text-slate-500">#{module.display_order || 1}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-100">{module.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{module.description || 'No description is available for this module yet.'}</p>
                  </div>
                  <button onClick={() => navigateTo('issb-detail', module.slug)} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs">Open Module</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/65 border border-dashed border-slate-600/70 text-center text-sm text-slate-300">
              No ISSB modules are available yet.
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">ISSB Study Materials</h2>
              <button onClick={() => navigateTo('study-materials')} className="text-xs text-emerald-400 hover:underline">Browse all</button>
            </div>
            {backendConfigured && issbMaterials.length > 0 ? (
              <div className="space-y-4">
                {issbMaterials.slice(0, 4).map((material) => (
                  <button key={material.id} onClick={() => navigateTo('study-material-detail', material.slug)} className="w-full text-left p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">{material.material_type || 'Guide'}</span>
                      <span className="text-[10px] text-slate-500">{material.is_premium ? 'Premium' : 'Free'}</span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-200">{material.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{material.description || 'Live study material from the database.'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No ISSB study materials are available yet.</p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">Current Affairs for ISSB Awareness</h2>
              <button onClick={() => navigateTo('current-affairs')} className="text-xs text-emerald-400 hover:underline">Browse all</button>
            </div>
            {backendConfigured && relevantCurrentAffairs.length > 0 ? (
              <div className="space-y-4">
                {relevantCurrentAffairs.map((item) => (
                  <button key={item.id} onClick={() => navigateTo('current-affairs-detail', item.slug)} className="w-full text-left p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">{item.category || 'General'}</span>
                      <span className="text-[10px] text-slate-500">{item.published_at ? new Date(item.published_at).toLocaleDateString('en-PK') : 'Updated'}</span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-200">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.summary || 'Live awareness brief from the database.'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No current-affairs content is available yet.</p>
            )}
          </div>
        </section>

        <div
          className="relative overflow-hidden rounded-3xl border border-slate-700/50 p-4 sm:p-6 space-y-8 sm:space-y-10"
          style={{
            backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.24), rgba(2, 6, 23, 0.38)), url('/images/issb%20practice%20mock%20tests.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-600/60 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">ISSB Practice</h2>
              <button onClick={() => navigateTo('practice')} className="text-xs text-emerald-400 hover:underline">Open practice bank</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Use the live question bank to practice ISSB-related verbal reasoning, psychological preparation, intelligence, interview, and general-awareness concepts.</p>
              <button onClick={openISSBPractice} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Practice ISSB Questions</button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-600/60 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">ISSB Mock Tests</h2>
              <button onClick={() => navigateTo('mock-tests')} className="text-xs text-emerald-400 hover:underline">View all tests</button>
            </div>
            {backendConfigured && issbMockTests.length > 0 ? (
              <div className="space-y-3">
                {issbMockTests.map((mock) => (
                  <button key={mock.id} onClick={() => navigateTo('mock-detail', mock.slug)} className="w-full text-left p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition">
                    <p className="font-semibold text-slate-200">{mock.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{mock.total_questions} questions · {mock.duration_minutes} minutes · {mock.difficulty || 'Practice'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No ISSB mock tests are available yet.</p>
            )}
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-slate-950/70 border border-slate-600/60 space-y-4">
          <h2 className="text-xl font-bold text-slate-100">ISSB Preparation Progress</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <p>Your practice and mock-test activity is saved in this browser session.</p>
            <button onClick={() => navigateTo('dashboard')} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm">Open Progress Dashboard</button>
          </div>
        </section>
        </div>
      </div>
    );
  };

  const renderISSBModulePage = () => {
    const item = issbModuleDetailState.item || (backendConfigured ? backendData.issbModules.find((module) => module.slug === selectedForceId) : null);
    const loading = issbModuleDetailState.loading;
    const error = issbModuleDetailState.error;

    if (!backendConfigured) {
      return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Live ISSB content is unavailable.</h1><p className="text-sm text-slate-400">Configure Supabase to load the ISSB module data.</p><button onClick={() => navigateTo('issb')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Back to ISSB Hub</button></div>;
    }

    if (!selectedForceId) return render404Page();
    if (loading) {
      return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Loading ISSB module...</h1><p className="text-sm text-slate-400">Fetching the latest module details from the database.</p></div>;
    }
    if (error) {
      return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Unable to load this module.</h1><p className="text-sm text-slate-400">{error}</p><button onClick={() => navigateTo('issb')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Back to ISSB Hub</button></div>;
    }
    if (!item) return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4"><h1 className="text-3xl font-extrabold text-slate-100">Module not found.</h1><p className="text-sm text-slate-400">The requested ISSB module could not be found or is not published.</p><button onClick={() => navigateTo('issb')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Back to ISSB Hub</button></div>;

    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'ISSB', href: '/issb' }, { label: item.title }]} />
        <article className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
            {item.module_type && <span className="bg-slate-950 border border-slate-700 px-2 py-1 rounded">{item.module_type}</span>}
            <span className="bg-slate-950 border border-slate-700 px-2 py-1 rounded">Module #{item.display_order || 1}</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{item.title}</h1>
            <p className="text-sm text-slate-300 leading-relaxed">{item.description || 'No description is available for this module yet.'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => navigateTo('practice')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Practice This Area</button>
            <button onClick={() => navigateTo('study-materials')} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm">Browse Related Materials</button>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
            <h2 className="text-xl font-bold text-slate-100 mb-3">Module content</h2>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.content || item.description || 'No detailed content has been published for this ISSB module yet.'}</div>
          </div>
        </article>
      </div>
    );
  };

  const renderSearchPage = () => {
    const groupedResults = searchResults.reduce((groups, result) => ({ ...groups, [result.type]: [...(groups[result.type] || []), result] }), {});
    const navigateResult = (result) => {
      if (result.type === 'Exam') return navigateTo('exam', result.slug);
      if (result.type === 'Subject') return navigateTo('subject', result.slug);
      if (result.type === 'Branch') return navigateTo(({ 'pak-army': 'army', paf: 'paf', 'pak-navy': 'navy', issb: 'issb' }[result.slug] || 'home'), result.slug);
      if (result.type === 'Mock Test') return navigateTo('mock-detail', result.slug);
      if (result.type === 'Study Material') return navigateTo('study-material-detail', result.slug);
      if (result.type === 'Current Affairs') return navigateTo('current-affairs-detail', result.slug);
      if (result.type === 'ISSB') return navigateTo('issb-detail', result.slug);
      if (result.type === 'Topic') {
        trackAnalyticsEvent(ANALYTICS_EVENTS.TOPIC_VIEWED, {
          pagePath: '/search',
          entityType: 'topic',
          entityId: result.id,
          dedupeKey: `topic:${result.id}`,
        });
        return navigateTo('subject', result.subject_slug);
      }
      return navigateTo('resources');
    };
    return <div className="max-w-6xl mx-auto px-4 py-10 space-y-8"><div className="space-y-2"><h1 className="text-3xl font-extrabold text-slate-100">Search FaujPrep</h1><p className="text-sm text-slate-400">Find live branches, exams, subjects, topics, mock tests, materials, current affairs, and ISSB modules.</p></div><form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3"><label htmlFor="global-search" className="sr-only">Search FaujPrep content</label><input id="global-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchQuery(''); }} placeholder="Search live content..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" /><button type="submit" className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">{searchLoading ? 'Searching...' : 'Search'}</button>{searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Clear</button>}</form><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"><select value={searchContentType} onChange={(event) => setSearchContentType(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option>All</option><option>Branch</option><option>Exam</option><option>Subject</option><option>Topic</option><option>Mock Test</option><option>Study Material</option><option>Current Affairs</option><option>ISSB</option></select><select value={searchBranchId} onChange={(event) => setSearchBranchId(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="All">All branches</option>{backendData.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select value={searchSubjectId} onChange={(event) => { setSearchSubjectId(event.target.value); setSearchTopicId('All'); }} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="All">All subjects</option>{backendData.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select value={searchTopicId} onChange={(event) => setSearchTopicId(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="All">All topics</option>{searchTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><select value={searchDifficulty} onChange={(event) => setSearchDifficulty(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="All">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></div><div className="space-y-8">{Object.entries(groupedResults).map(([type, results]) => <section key={type} className="space-y-3"><h2 className="text-xl font-bold text-slate-100">{type}</h2><div className="grid gap-3">{results.map((result) => <button key={`${result.type}-${result.id}`} onClick={() => navigateResult(result)} className="text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition"><span className="text-[10px] font-mono uppercase text-emerald-400">{result.type}</span><h3 className="font-bold text-slate-100 mt-1">{result.title}</h3><p className="text-xs text-slate-400 mt-1">{result.short_description || result.description || result.summary || ''}</p></button>)}</div></section>)}{!searchLoading && searchQuery.length >= 2 && !searchResults.length && <div className="p-10 text-center rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No results found. Try a different search term or remove a filter.</div>}{searchHasMore && <button onClick={() => executeSearch(searchPage + 1, true)} className="mx-auto block px-5 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load More</button>}</div></div>;
  };

  const renderPracticePage = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="relative isolate flex min-h-[230px] items-center overflow-hidden rounded-xl border border-slate-800 sm:min-h-[290px]">
        <img
          src="/images/practice%20tests.png"
          alt="Candidate preparing for a military entrance test"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[68%_center] sm:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/25" />
        <div className="max-w-2xl space-y-3 p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold text-slate-100 sm:text-4xl">Practice Test Center</h1>
          <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
            Search and filter targeted question sets across forces, subject categories, and difficulty levels.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Live Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search test titles..."
              value={practiceSearch}
              onChange={(e) => setPracticeSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <fieldset className="md:col-span-4 space-y-2">
            <legend className="text-xs font-semibold text-slate-300">Force</legend>
            <div role="group" aria-label="Filter practice tests by force" className="flex flex-wrap gap-2">
              {[
                ['All', 'All Forces'],
                ['Pakistan Army', 'Pakistan Army'],
                ['PAF', 'PAF'],
                ['Pakistan Navy', 'Pakistan Navy'],
                ['ISSB', 'ISSB'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={practiceForceFilter === value}
                  onClick={() => setPracticeForceFilter(value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${practiceForceFilter === value ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Category Filter */}
          <div>
            <select
              value={practiceCategoryFilter}
              onChange={(e) => setPracticeCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Subject Categories</option>
              <option value="Intelligence">Intelligence</option>
              <option value="Non-Verbal">Non-Verbal</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="English">English</option>
              <option value="General Knowledge">General Knowledge</option>
              <option value="Verbal">Verbal Reasoning</option>
              <option value="Verbal Intelligence">Verbal Intelligence</option>
              <option value="Non-Verbal Intelligence">Non-Verbal Intelligence</option>
              <option value="Analogy">Analogy</option>
              <option value="Mathematical Series">Mathematical Series</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={practiceDifficultyFilter}
              onChange={(e) => setPracticeDifficultyFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

        </div>
      </div>

      {/* Test List Grid */}
      <div className="relative isolate overflow-hidden">
        <img
          src="/images/practice%20test.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/55" />
        <div className="relative grid grid-cols-1 gap-6 p-3 md:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {filteredPractice.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-6 backdrop-blur-sm transition hover:border-emerald-500/40"
            >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-emerald-400">
                  Army Navy PAF
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  item.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-400' :
                  item.difficulty === 'Medium' ? 'bg-amber-950 text-amber-400' :
                  'bg-rose-950 text-rose-400'
                }`}>
                  {item.difficulty}
                </span>
              </div>
              <h3 className="font-bold text-slate-100 text-base leading-snug">{item.title}</h3>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                <span>{item.questionsCount} Questions</span>
                <span>•</span>
                <span>{item.duration}</span>
              </div>
            </div>

              <button
                onClick={() => item.mockTestSlug ? navigateTo('mock-detail', item.mockTestSlug) : startPracticeSession(item)}
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition"
            >
              {practiceSessionLoading ? 'Loading Questions...' : 'Start Practice Session'}
            </button>
            </div>
          ))}
          {filteredPractice.length === 0 && (
            <div className="col-span-full space-y-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-12 text-center text-slate-400 backdrop-blur-sm">
              <p className="font-semibold text-slate-200">No practice tests matched your current filter criteria.</p>
              <p className="text-xs">Try clearing your search query or selecting "All" in the filters above.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-5">
        <div><h2 className="text-xl font-bold text-slate-100">Build a practice session</h2><p className="text-xs text-slate-400 mt-1">Choose live database filters before loading questions.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={practiceBranchId} onChange={(event) => setPracticeBranchId(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="">All branches</option>{backendData.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <select value={practiceSubjectId} onChange={(event) => { setPracticeSubjectId(event.target.value); setPracticeTopicId(''); }} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="">All subjects</option>{practiceSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          <select value={practiceTopicId} onChange={(event) => setPracticeTopicId(event.target.value)} disabled={!practiceSubjectId || contentLoading} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 disabled:opacity-50"><option value="">All topics</option>{contentTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select>
          <select value={practiceDifficulty} onChange={(event) => setPracticeDifficulty(event.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
          <select value={practiceQuestionCount} onChange={(event) => setPracticeQuestionCount(Number(event.target.value))} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option><option value="30">30 questions</option></select>
        </div>
        <button onClick={startConfiguredPractice} disabled={!backendConfigured || practiceSessionLoading} className="px-5 py-3 rounded-xl bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs">{practiceSessionLoading ? 'Loading questions...' : 'Start Practice'}</button>
      </div>
    </div>
  );

  const renderQuestionPracticePage = () => {
    const question = practiceSession.questions[practiceSession.index];
    const isFinished = !question;
    if (isFinished) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
          <Award className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-3xl font-extrabold text-slate-100">Practice Session Complete</h1>
          <div className="grid grid-cols-3 gap-3 text-center"><div className="p-3 rounded-xl bg-slate-900 border border-slate-800"><span className="block text-xl font-bold text-slate-100">{practiceSession.questions.length}</span><span className="text-[10px] text-slate-500">Questions</span></div><div className="p-3 rounded-xl bg-slate-900 border border-slate-800"><span className="block text-xl font-bold text-emerald-400">{practiceSession.mode === 'mock' && practiceSession.finalResult ? practiceSession.finalResult.score : practiceSession.score}</span><span className="text-[10px] text-slate-500">Correct</span></div><div className="p-3 rounded-xl bg-slate-900 border border-slate-800"><span className="block text-xl font-bold text-slate-100">{practiceSession.questions.length ? Math.round(((practiceSession.mode === 'mock' && practiceSession.finalResult ? practiceSession.finalResult.score : practiceSession.score) / practiceSession.questions.length) * 100) : 0}%</span><span className="text-[10px] text-slate-500">Score</span></div></div>
          <div className="flex justify-center gap-3"><button onClick={() => navigateTo('practice')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Practice Again</button><button onClick={() => navigateTo('home')} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">Back Home</button></div>
          {practiceSession.mode === 'practice' && practiceSession.answers?.length > 0 && <div className="text-left space-y-3 pt-6"><h2 className="text-xl font-bold text-slate-100">Review Answers</h2>{practiceSession.answers.map((answer, reviewIndex) => { const reviewQuestion = practiceSession.questions.find((item) => item.id === answer.questionId); return <div key={answer.questionId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"><p className="text-sm text-slate-200">{reviewIndex + 1}. {reviewQuestion?.question_text}</p><p className="text-xs text-slate-400">Your answer: <span className="text-slate-200">{answer.selectedOption}</span> · Correct answer: <span className="text-emerald-400">{answer.result.correct_option}</span></p><p className="text-xs text-slate-400">{answer.result.explanation || 'No explanation is available for this question yet.'}</p></div>; })}</div>}
          {practiceSession.mode === 'mock' && practiceSession.mockReview?.length > 0 && <div className="text-left space-y-3 pt-6"><h2 className="text-xl font-bold text-slate-100">Review Answers</h2>{practiceSession.mockReview.map((answer) => <div key={answer.question_id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"><p className="text-sm text-slate-200">{answer.question_number}. {answer.question_text}</p><p className="text-xs text-slate-400">Your answer: <span className={answer.is_correct ? 'text-emerald-400' : 'text-rose-300'}>{answer.selected_option || 'Unanswered'}</span> · Correct answer: <span className="text-emerald-400">{answer.correct_option}</span></p><p className="text-xs text-slate-400">{answer.explanation || 'No explanation is available for this question yet.'}</p></div>)}</div>}
        </div>
      );
    }
    const questionKey = question.question_id || question.id;
    const selectedOption = practiceSession.mode === 'mock' ? (mockAnswers[questionKey] || '') : practiceSession.selectedOption;

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Question {practiceSession.index + 1} of {practiceSession.questions.length}</span>
          <span>{practiceSession.mode === 'mock' ? `Time ${Math.floor((mockSecondsLeft || 0) / 60)}:${String((mockSecondsLeft || 0) % 60).padStart(2, '0')}` : `Score ${practiceSession.score}`}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${((practiceSession.index + 1) / practiceSession.questions.length) * 100}%` }} /></div>
        {practiceSession.mode === 'mock' && <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">{practiceSession.questions.map((item, questionIndex) => { const key = item.question_id || item.id; return <button key={key} onClick={() => saveAndMoveMockQuestion(questionIndex)} className={`h-8 rounded-lg border text-[10px] font-mono ${questionIndex === practiceSession.index ? 'border-emerald-400 text-emerald-300' : mockMarked[key] ? 'border-amber-400 text-amber-300' : mockAnswers[key] ? 'border-slate-500 text-slate-300' : 'border-slate-800 text-slate-500'}`}>{questionIndex + 1}</button>; })}</div>}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <QuestionCard question={question} selectedOption={selectedOption} submitted={practiceSession.mode === 'mock' ? false : Boolean(practiceSession.result)} onSelect={(option) => practiceSession.mode === 'mock' ? setMockAnswers((previous) => ({ ...previous, [questionKey]: option })) : setPracticeSession((previous) => ({ ...previous, selectedOption: option }))} />
          {practiceSession.result && (
            <div className={`p-4 rounded-xl border ${practiceSession.result.is_correct ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200' : 'border-rose-500/40 bg-rose-950/40 text-rose-200'}`}>
              <p className="font-semibold">{practiceSession.result.is_correct ? 'Correct answer' : 'Answer submitted'}</p>
              {practiceSession.result.correct_option && <p className="mt-1 text-xs text-slate-300">Correct answer: {practiceSession.result.correct_option}</p>}
              {practiceSession.result.explanation && <p className="mt-2 text-xs leading-relaxed text-slate-300">{practiceSession.result.explanation}</p>}
              {!practiceSession.result.explanation && <p className="mt-2 text-xs text-slate-400">No explanation is available for this question yet.</p>}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigateTo('practice')} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Exit</button>
            {practiceSession.mode === 'mock' && <button onClick={() => setMockMarked((previous) => ({ ...previous, [questionKey]: !previous[questionKey] }))} className="px-4 py-2.5 rounded-xl bg-amber-950/50 text-amber-200 text-xs font-semibold">{mockMarked[questionKey] ? 'Unmark Review' : 'Mark for Review'}</button>}
            {practiceSession.index > 0 && <button onClick={() => practiceSession.mode === 'mock' ? saveAndMoveMockQuestion(practiceSession.index - 1) : (() => { const previous = practiceSession.answers?.[practiceSession.index - 1]; setPracticeSession((state) => ({ ...state, index: state.index - 1, selectedOption: previous?.selectedOption || '', result: previous?.result || null, questionStartedAt: Date.now() })); })()} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Previous</button>}
            {practiceSession.mode === 'mock' ? (
              <>{practiceSession.index < practiceSession.questions.length - 1 ? <button onClick={() => saveAndMoveMockQuestion(practiceSession.index + 1)} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Next</button> : <button onClick={() => { if (window.confirm('Submit this mock test now?')) completeMockTest(); }} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Submit Test</button>}</>
            ) : !practiceSession.result ? (
              <button disabled={!practiceSession.selectedOption} onClick={submitPracticeAnswer} className="px-5 py-2.5 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs">Submit Answer</button>
            ) : (
              <button onClick={nextPracticeQuestion} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Next Question</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMockTestDetailPage = () => {
    if (backendLoading) return <div className="max-w-3xl mx-auto px-4 py-20"><div className="animate-pulse rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-4"><div className="h-5 w-28 rounded bg-slate-800" /><div className="h-9 w-2/3 rounded bg-slate-800" /><div className="h-4 w-full rounded bg-slate-800" /><div className="h-24 w-full rounded-xl bg-slate-800" /></div></div>;
    const mock = backendData.mockTests.find((item) => item.slug === selectedForceId);
    if (!mock) return render404Page();
    const branch = backendData.branches.find((item) => item.id === mock.branch_id);
    const exam = backendData.exams.find((item) => item.id === mock.exam_id);
    if (mock.is_premium && !canAccessPremiumResources) return <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5"><Lock className="w-10 h-10 text-amber-400 mx-auto" /><h1 className="text-2xl font-extrabold text-slate-100">Premium Test</h1><p className="text-sm text-slate-400">This mock test is locked behind Pro or Premium access. Upgrade to unlock it.</p><div className="flex justify-center gap-3"><button onClick={() => navigateTo('pricing')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">View Plans</button><button onClick={() => navigateTo('mock-tests')} className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">Back to Mock Tests</button></div></div>;
    return <div className="max-w-3xl mx-auto px-4 py-10 space-y-8"><button onClick={() => navigateTo('mock-tests')} className="text-xs text-emerald-400 hover:underline">Back to Mock Tests</button><div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5"><span className="text-xs font-mono uppercase text-emerald-400">{branch?.name || 'FaujPrep'} · {exam?.name || 'Preparation'}</span><h1 className="text-3xl font-extrabold text-slate-100">{mock.title}</h1><p className="text-sm text-slate-400">{mock.description || 'A timed preparation test loaded from Supabase.'}</p><div className="grid grid-cols-3 gap-3 text-center text-xs font-mono"><div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><strong className="block text-slate-100">{mock.total_questions}</strong>Questions</div><div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><strong className="block text-slate-100">{mock.duration_minutes}</strong>Minutes</div><div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><strong className="block text-slate-100">{mock.difficulty || 'Practice'}</strong>Difficulty</div></div><div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-slate-300 space-y-2"><p>Answers can be changed before submission.</p><p>Correctness and explanations are hidden until the test is submitted.</p><p>The test submits automatically when the timer reaches zero.</p></div><button onClick={() => startMockSession(mock)} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Start Test</button></div></div>;
  };

  const renderMockTestPaymentPage = () => {
    const product = PAID_MOCK_TEST_PRODUCTS.find((item) => item.id === selectedForceId);
    if (!product) return render404Page();
    const purchaseStateMatchesUser = Boolean(session?.user?.id && mockTestPurchaseState.userId === session.user.id);
    const latestRequest = purchaseStateMatchesUser ? mockTestPurchaseState.requests.find((request) => request.test_slug === product.id) : null;
    const hasAccess = latestRequest?.status === 'APPROVED';
    const paymentBlocked = !backendConfigured || mockTestPaymentState.loading || latestRequest?.status === 'PENDING';

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <button type="button" onClick={() => navigateTo('mock-tests')} className="text-xs text-emerald-400 hover:underline">Back to Mock Tests</button>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase text-emerald-400">One-time payment · Permanent access after approval</p>
            <h1 className="text-3xl font-extrabold text-slate-100">How to Pay</h1>
            <p className="text-sm text-slate-400">{product.title}</p>
            <p className="text-2xl font-bold text-emerald-300">{formatPKR(product.pricePkr)}</p>
          </div>

          {hasAccess ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-3">
              <p className="font-semibold text-emerald-200">This test is already unlocked on your account.</p>
              <button type="button" onClick={() => startPaidMockTest(product)} disabled={paidMockTestLoading} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">
                {paidMockTestLoading ? 'Loading test...' : 'Start Test'}
              </button>
            </div>
          ) : latestRequest?.status === 'PENDING' ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-5 space-y-2">
              <h2 className="text-lg font-bold text-amber-200">Payment Pending Review</h2>
              <p className="text-sm text-amber-100/80">Your proof was submitted. Access will unlock permanently after admin approval.</p>
            </div>
          ) : (
            <>
              {latestRequest?.status === 'REJECTED' && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200 space-y-1">
                  <p className="font-semibold">Previous payment was rejected.</p>
                  {latestRequest.admin_notes && <p>{latestRequest.admin_notes}</p>}
                  <p>You can submit a new payment proof below.</p>
                </div>
              )}

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Payment method</p>
                <p className="text-3xl font-extrabold text-emerald-300">Choose NayaPay</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase text-slate-400">Account title</p>
                    <p className="mt-1 break-words text-base font-bold text-slate-100">{paymentSettings.account_title || 'FaujPrep'}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase text-slate-400">Account number</p>
                    <p className="mt-1 text-base font-bold text-slate-100">{paymentSettings.account_number || '0000000000000'}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-emerald-100/90">Transfer exactly {formatPKR(product.pricePkr)} to this NayaPay account, then submit your payment details and screenshot for admin verification.</p>
              </div>

              <form onSubmit={handleMockTestPaymentSubmission} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-slate-300">Sender name
                    <input value={mockTestPaymentForm.senderName} onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, senderName: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" autoComplete="name" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-300">Sender phone
                    <input type="tel" value={mockTestPaymentForm.senderPhone} onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, senderPhone: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" autoComplete="tel" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-300">Payment date
                    <input type="date" value={mockTestPaymentForm.paymentDate} onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, paymentDate: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-300">Payment time (optional)
                    <input type="time" value={mockTestPaymentForm.paymentTime} onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, paymentTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-300 sm:col-span-2">Payment screenshot (JPG, PNG, or WebP; max 5 MB)
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, paymentScreenshot: event.target.files?.[0] || null }))} required className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-300 sm:col-span-2">Notes (optional)
                    <textarea value={mockTestPaymentForm.notes} onChange={(event) => setMockTestPaymentForm((previous) => ({ ...previous, notes: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
                  </label>
                </div>
                {!backendConfigured && <p className="text-sm text-rose-300">Online verification is unavailable because Supabase is not configured.</p>}
                {mockTestPaymentState.error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{mockTestPaymentState.error}</p>}
                {mockTestPaymentState.result && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-200">{mockTestPaymentState.result.message}</p>}
                <button type="submit" disabled={paymentBlocked} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
                  {mockTestPaymentState.loading ? 'Submitting payment proof...' : 'Submit Payment Proof'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    );
  };

  const renderMockTestsPage = () => {
    const fullMockTest = backendData.mockTests.find((test) => test.slug === 'first-full-mock-test');
    const localMockTest = ACADEMIC_PORTION_MOCK_TEST_1;
    const localMockTest2 = ACADEMIC_PORTION_MOCK_TEST_2;
    const pmaMockTest2 = PMA_LONG_COURSE_159_MOCK_TEST_2;
    const purchaseStateMatchesUser = Boolean(session?.user?.id && mockTestPurchaseState.userId === session.user.id);
    const getPurchaseRequest = (product) => purchaseStateMatchesUser ? mockTestPurchaseState.requests.find((request) => request.test_slug === product.id) : null;
    const renderPaidTestAction = (product) => {
      const request = getPurchaseRequest(product);
      if (request?.status === 'APPROVED') {
        return <button onClick={() => startPaidMockTest(product)} disabled={paidMockTestLoading} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{paidMockTestLoading ? 'Loading test...' : 'Start Test'}</button>;
      }
      if (request?.status === 'PENDING') {
        return <button disabled className="w-full rounded-xl border border-amber-500/30 bg-amber-950/40 py-3 text-sm font-bold text-amber-200">Payment Pending Admin Approval</button>;
      }
      if (mockTestPurchaseState.loading) {
        return <button disabled className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-400">Checking Access...</button>;
      }
      return <button onClick={() => navigateTo('mock-payment', product.id)} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">{request?.status === 'REJECTED' ? `Resubmit Payment · ${formatPKR(product.pricePkr)}` : `How to Pay · ${formatPKR(product.pricePkr)}`}</button>;
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-100">Full Mock Tests</h1>
          <p className="text-sm text-slate-400 max-w-xl">Full-length timed tests for complete exam practice.</p>
        </div>
        {!backendConfigured && <div className="p-8 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-sm text-amber-200">Configure Supabase to load full mock tests.</div>}
        {backendConfigured && backendLoading && <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-400">Loading full mock tests...</div>}

        <article className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-mono uppercase text-emerald-400">Pakistan Army</span>
            <span className="text-xs font-mono text-slate-400">PMA Long Course · Free</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">Academic Portion Mock Test 1</h2>
            <p className="text-sm leading-6 text-slate-400">Complete PMA Long Course Academic Practice Set 2: English, Mathematics, Islamiyat, Pakistan Studies, and Physics, with answers and explanations from the source.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{localMockTest.questions.length}</strong>Questions</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">60 mins</strong>Duration</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">5</strong>Sections</div>
          </div>
          <button onClick={() => startPracticeSession({
            title: localMockTest.title,
            questions: localMockTest.questions,
            questionsCount: localMockTest.questions.length,
            duration: localMockTest.duration,
            difficulty: localMockTest.difficulty,
            preserveQuestionOrder: true,
          })} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">Start Academic Portion Mock Test 1</button>
        </article>

        <article className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-mono uppercase text-emerald-400">Pakistan Army</span>
            <span className="text-xs font-mono text-slate-400">PMA Long Course · PKR {localMockTest2.pricePkr}</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">{localMockTest2.title}</h2>
            <p className="text-sm leading-6 text-slate-400">A complete PMA academic paper across English, Mathematics, Islamiyat, Pakistan Studies, and Physics. Questions include clear topic headings, and answers include detailed explanations and solution tips.</p>
          </div>
            <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono text-slate-300 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{localMockTest2.questionsCount}</strong>Questions</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">80 mins</strong>Duration</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">5</strong>Sections</div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{formatPKR(localMockTest2.pricePkr)}</strong>One-time</div>
          </div>
          {renderPaidTestAction(localMockTest2)}
        </article>

        <article className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-mono uppercase text-emerald-400">Pakistan Army</span>
            <span className="text-xs font-mono text-slate-400">PMA Long Course · PKR {pmaMockTest2.pricePkr}</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">{pmaMockTest2.title}</h2>
            <p className="text-sm leading-6 text-slate-400">A complete 220-question PMA initial-test simulation covering verbal and non-verbal intelligence, Mathematics, Pakistan Studies, Physics, English, General Knowledge, and Islamic Studies. Includes the source figures and detailed answer explanations.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono text-slate-300 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{pmaMockTest2.questionsCount}</strong>Questions</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">160 mins</strong>Duration</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">8</strong>Sections</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{formatPKR(pmaMockTest2.pricePkr)}</strong>One-time</div>
          </div>
          {renderPaidTestAction(pmaMockTest2)}
        </article>

        {backendConfigured && !backendLoading && fullMockTest && (
          <article className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-mono uppercase text-emerald-400">Pakistan Army</span>
              <span className="text-xs font-mono text-slate-400">PMA Long Course · Free</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-100">{fullMockTest.title}</h2>
              <p className="text-sm leading-6 text-slate-400">{fullMockTest.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{fullMockTest.total_questions}</strong>Questions</div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">{fullMockTest.duration_minutes}</strong>Minutes</div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="block text-base text-slate-100">5</strong>Sections</div>
            </div>
            <button onClick={() => navigateTo('mock-detail', fullMockTest.slug)} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">View Test Details</button>
          </article>
        )}
        {backendConfigured && !backendLoading && !fullMockTest && <p className="max-w-3xl rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">The full mock test has not been added to the database yet.</p>}
      </div>
    );
  };

  const renderResourcesPage = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-100">Preparation Resources Library</h1>
        <p className="text-sm text-slate-400 max-w-xl">
          Downloadable syllabus outlines, key formula sheets, word association prompt banks, and preparation guides.
        </p>
      </div>

      {/* Resource Search Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search guides, formula sheets..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={resourceCategoryFilter}
          onChange={(e) => setResourceCategoryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Categories</option>
          <option value="Army">Pakistan Army</option>
          <option value="PAF">Pakistan Air Force</option>
          <option value="Navy">Pakistan Navy</option>
          <option value="ISSB">ISSB</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((res) => (
          <div key={res.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">{res.type}</span>
                <span>{res.force}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-base">{res.title}</h3>
            </div>
            <button
              onClick={() => res.slug ? navigateTo('study-material-detail', res.slug) : navigateTo('study-materials')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-emerald-400" /> Read Resource Guide
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPricingPage = () => {
    const plans = planCatalog.length ? planCatalog : [
      { slug: 'free', name: 'Free', description: 'Basic preparation access with premium resources protected.', price_pkr: 0, billing_interval: 'ONE_TIME' },
      { slug: 'pro', name: 'Pro', description: 'Expanded access for serious preparation and premium resources.', price_pkr: 1999, billing_interval: 'ONE_TIME' },
      { slug: 'premium', name: 'Premium', description: 'Full premium access including all protected study and practice content.', price_pkr: 4999, billing_interval: 'ONE_TIME' },
    ];

    const comparisonRows = [
      ['Basic question practice', true, true, true],
      ['Unlimited/full practice access', false, true, true],
      ['Premium questions', false, true, true],
      ['Free mock tests', true, true, true],
      ['Premium mock tests', false, true, true],
      ['Free study materials', true, true, true],
      ['Premium study materials', false, true, true],
      ['Free current affairs', true, true, true],
      ['Premium current affairs', false, true, true],
      ['Basic ISSB resources', true, true, true],
      ['Premium ISSB resources', false, true, true],
    ];

    const planTone = {
      free: 'bg-slate-950/75 border border-slate-700/80',
      pro: 'bg-slate-950/75 border border-emerald-500/40 shadow-2xl shadow-emerald-950/30',
      premium: 'bg-slate-950/75 border border-amber-500/40 shadow-2xl shadow-amber-950/20',
    };

    return (
      <div className="w-full pb-10">
        <section
          className="relative w-full py-10"
          style={{
            backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.18), rgba(2, 6, 23, 0.36)), url('/images/pricing.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">Choose Your Preparation Plan</h1>
          <p className="text-sm text-slate-400">FaujPrep pricing is in PKR and JazzCash is the primary payment method for all paid access.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.slug === 'pro';
            const isPremium = plan.slug === 'premium';
            return (
              <div key={plan.slug} className={`p-7 rounded-3xl flex flex-col justify-between gap-6 ${planTone[plan.slug] || planTone.free}`}>
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border ${plan.slug === 'free' ? 'text-slate-300 border-slate-700 bg-slate-950' : plan.slug === 'pro' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-amber-300 border-amber-500/30 bg-amber-950/20'}`}>
                      {plan.name}
                    </span>
                    {isPopular && <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-1 rounded-full">Popular</span>}
                    {isPremium && <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded-full">Best Value</span>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-extrabold text-slate-100">{plan.slug === 'free' ? 'PKR 0' : formatPKR(plan.price_pkr)}</h2>
                    </div>
                    <p className="text-xs text-slate-400">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                    {plan.slug === 'free' && (
                      <>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Basic question practice</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Selected free mock tests</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Free study materials</li>
                        <li className="flex items-center gap-2.5"><X className="w-4 h-4 text-slate-500" /> Premium resources remain protected</li>
                      </>
                    )}
                    {plan.slug === 'pro' && (
                      <>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Everything in Free</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Full question practice access</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Premium mock tests and materials</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400" /> Premium current affairs and ISSB resources</li>
                      </>
                    )}
                    {plan.slug === 'premium' && (
                      <>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400" /> Everything in Pro</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400" /> Complete premium question bank</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400" /> All premium mock tests and study resources</li>
                        <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400" /> Highest premium access available</li>
                      </>
                    )}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (plan.slug === 'free') {
                      setCheckoutPlan('free');
                      navigateTo('checkout');
                      return;
                    }
                    setCheckoutPlan(plan.slug);
                    navigateTo('checkout');
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition ${plan.slug === 'free' ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : plan.slug === 'pro' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950' : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'}`}
                >
                  {plan.slug === 'free' ? 'Start Free' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="overflow-x-auto rounded-3xl bg-slate-950/75 border border-slate-700/80">
          <table className="min-w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-200">Feature</th>
                <th className="px-4 py-3 font-bold text-slate-200">Free</th>
                <th className="px-4 py-3 font-bold text-slate-200">Pro</th>
                <th className="px-4 py-3 font-bold text-slate-200">Premium</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([label, free, pro, premium]) => (
                <tr key={label} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-200">{label}</td>
                  <td className="px-4 py-3">{free ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-500" />}</td>
                  <td className="px-4 py-3">{pro ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-500" />}</td>
                  <td className="px-4 py-3">{premium ? <Check className="w-4 h-4 text-amber-400" /> : <X className="w-4 h-4 text-slate-500" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    );
  };

  const renderCheckoutPage = () => {
    const plan = selectedPlan || { slug: 'free', name: 'Free', price_pkr: 0 };

    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <button type="button" onClick={() => navigateTo('pricing')} className="text-xs text-emerald-400 hover:underline">Back to Pricing</button>
          <h1 className="text-3xl font-extrabold text-slate-100">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-mono text-emerald-400">Selected plan</p>
              <h2 className="text-3xl font-extrabold text-slate-100">{plan.name}</h2>
              <div className="text-2xl font-bold text-emerald-400">{plan.price_pkr === 0 ? 'PKR 0' : formatPKR(plan.price_pkr)}</div>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-100">Includes</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {plan.slug === 'free' && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Basic question practice</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Selected free mock tests</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Free study materials</li>
                  </>
                )}
                {plan.slug === 'pro' && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Full question practice access</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Premium mock tests</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Premium current affairs and ISSB resources</li>
                  </>
                )}
                {plan.slug === 'premium' && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Everything in Pro</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> All premium question banks</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Complete premium study and mock material</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Payment method</h3>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 border border-emerald-500/30 p-4">
                <div>
                  <p className="font-semibold text-slate-200">JazzCash</p>
                  <p className="text-[11px] text-slate-400">Manual payment verification for Pakistani users</p>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-emerald-800">Secure</span>
              </div>
            </div>
          </div>

          <aside className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 h-fit">
            <h3 className="text-sm font-bold text-slate-100">Order summary</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>Plan</span><span>{plan.name}</span></div>
              <div className="flex items-center justify-between"><span>Price</span><span>{plan.price_pkr === 0 ? 'PKR 0' : formatPKR(plan.price_pkr)}</span></div>
              <div className="flex items-center justify-between"><span>Payment method</span><span>JazzCash</span></div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-base font-bold text-slate-100">
              <span>Total</span>
              <span>{plan.price_pkr === 0 ? 'PKR 0' : formatPKR(plan.price_pkr)}</span>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] text-amber-200">
              Premium access is activated only after verified payment. A pending JazzCash payment does not unlock premium content.
            </div>

            {checkoutState.error && <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-[11px] text-rose-200">{checkoutState.error}</div>}

            <form onSubmit={handleCheckoutSubmit}>
              <button type="submit" disabled={checkoutState.loading} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-60">
                {checkoutState.loading ? 'Preparing checkout...' : plan.price_pkr === 0 ? 'Activate Free Access' : 'Continue to JazzCash'}
              </button>
            </form>
          </aside>
        </div>

        {plan.slug !== 'free' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-mono text-amber-400">Manual JazzCash verification</p>
              <h3 className="text-2xl font-extrabold text-slate-100">Submit payment proof</h3>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-200 space-y-2">
              <p className="font-semibold">Payment details</p>
              <p>Account Title: {paymentSettings.account_title || 'FaujPrep'}</p>
              <p>Account Number: {paymentSettings.account_number || '0000000000000'}</p>
              <p>JazzCash Mobile: {paymentSettings.mobile_number || '+92 300 0000000'}</p>
              <p className="text-emerald-100/90">{paymentSettings.instructions || 'Send the exact amount and then submit your payment proof below for verification.'}</p>
            </div>

            <form onSubmit={handlePaymentSubmission} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Sender name</label>
                  <input value={paymentForm.senderName} onChange={(e) => setPaymentForm((previous) => ({ ...previous, senderName: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" placeholder="Muhammad Ali" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Sender phone</label>
                  <input value={paymentForm.senderPhone} onChange={(e) => setPaymentForm((previous) => ({ ...previous, senderPhone: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" placeholder="03xx xxxxxxx" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Payment date</label>
                  <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((previous) => ({ ...previous, paymentDate: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Payment time (optional)</label>
                  <input type="time" value={paymentForm.paymentTime} onChange={(e) => setPaymentForm((previous) => ({ ...previous, paymentTime: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Payment screenshot</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPaymentForm((previous) => ({ ...previous, paymentScreenshot: e.target.files?.[0] || null }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Notes (optional)</label>
                  <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((previous) => ({ ...previous, notes: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100 min-h-[88px]" placeholder="Anything the admin should know about the payment." />
                </div>
              </div>

              {checkoutState.error && <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-[11px] text-rose-200">{checkoutState.error}</div>}

              <button type="submit" disabled={checkoutState.loading} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-60">
                {checkoutState.loading ? 'Submitting proof...' : 'Submit payment proof'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderBillingPage = () => {
    const summary = billingState.summary || { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
    const subscription = summary.subscription || { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 };
    const transactions = Array.isArray(summary.transactions) ? summary.transactions : [];

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-100">Billing & Subscription</h1>
          <p className="text-sm text-slate-400">Your plan status and payment history are read directly from the database-backed subscription records.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-emerald-400">Current plan</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded">{subscription.status || 'ACTIVE'}</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-100">{subscription.plan_name || 'Free'}</h2>
              <p className="text-xl font-bold text-emerald-400">{subscription.price_pkr ? formatPKR(subscription.price_pkr) : 'PKR 0'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-500 uppercase font-mono">Provider</span><strong>{subscription.provider || 'SYSTEM'}</strong></div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-500 uppercase font-mono">Started</span><strong>{subscription.started_at ? new Date(subscription.started_at).toLocaleDateString('en-PK') : '—'}</strong></div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-500 uppercase font-mono">Expires</span><strong>{subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString('en-PK') : 'No expiry'}</strong></div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><span className="block text-slate-500 uppercase font-mono">Plan</span><strong>{subscription.plan_slug || 'free'}</strong></div>
            </div>
            <button onClick={() => navigateTo('pricing')} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Upgrade or Change Plan</button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Payment history</h2>
            {transactions.length ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-200">{transaction.plan_name || transaction.plan_slug || 'Plan'}</span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded ${transaction.status === 'APPROVED' || transaction.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : transaction.status === 'PENDING' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                        {transaction.status || 'PENDING'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <span>Amount: {formatPKR(transaction.amount_pkr || 0)}</span>
                      <span>Method: {transaction.payment_method || 'JazzCash'}</span>
                      <span>Created: {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('en-PK') : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-sm text-slate-400">No payment history is available yet for this account.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLoginPage = () => (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-100">Administrator Login</h1>
          <p className="text-xs text-slate-400">Only the confirmed primary administrator account can access payment approvals.</p>
      </div>

      <form onSubmit={handleLoginSubmit} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <input
            type="email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            placeholder="admin@gmail.com"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          {loginErrors.email && <p className="text-[11px] text-rose-400 font-medium">{loginErrors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Password</label>
          <div className="relative">
            <input
              type={loginForm.showPass ? "text" : "password"}
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setLoginForm({ ...loginForm, showPass: !loginForm.showPass })}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
            >
              {loginForm.showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {loginErrors.password && <p className="text-[11px] text-rose-400 font-medium">{loginErrors.password}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg"
        >
          Admin Login
        </button>
      </form>
    </div>
  );

  const renderDashboardPage = () => {
    const summary = dashboardState.summary;
    const stats = summary?.stats || {};
    const completedAttempts = summary?.recentMock || [];
    const recentPractice = summary?.recentPractice || [];
    const subjectPerformance = summary?.subjectPerformance || [];
    const topicPerformance = summary?.topicPerformance || [];
    const targetBranch = backendData.branches.find((branch) => branch.id === summary?.profile?.target_branch_id);
    const targetExam = backendData.exams.find((exam) => exam.id === summary?.profile?.target_exam_id);
    const metrics = [
      { label: 'Questions Attempted', value: stats.questions_attempted ?? 0, note: 'Saved practice answers' },
      { label: 'Correct Answers', value: stats.correct_answers ?? 0, note: 'Trusted database result' },
      { label: 'Accuracy', value: `${stats.accuracy ?? 0}%`, note: 'Answered questions only' },
      { label: 'Tests Completed', value: stats.tests_completed ?? 0, note: 'Completed mock tests' },
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-100">Welcome {summary?.profile?.full_name || (session?.user?.is_anonymous ? 'Candidate' : session?.user?.email || 'Candidate')}</h1>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">Live Account</span>
            </div>
            <p className="text-xs text-slate-400">Target: {targetBranch?.name || 'Not configured'} · Exam: {targetExam?.name || 'Not configured'}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigateTo('profile')} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition">Edit Candidate Profile</button>
            <button onClick={() => navigateTo('billing')} className="px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold border border-emerald-500/20 transition">Billing</button>
            {isPrimaryAdmin(session.user) && <button onClick={() => navigateTo('admin')} className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-semibold border border-amber-500/30 transition">Admin</button>}
            {isPrimaryAdmin(session?.user) && <button onClick={async () => { await signOut(); addToast('Admin signed out.', 'success'); }} className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-500/30 transition">Sign Out</button>}
          </div>
        </div>

        {dashboardState.loading && <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-400">Loading your activity...</div>}
        {dashboardState.error && <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-sm text-rose-200">Unable to load dashboard data: {dashboardState.error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-mono uppercase">{metric.label}</span>
              <div className="text-2xl font-extrabold text-slate-200">{metric.value}</div>
              <p className="text-[11px] text-slate-500">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <BarChart2 className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-base">{stats.questions_attempted || stats.tests_completed ? 'Your latest activity is recorded' : 'No attempts yet'}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{stats.questions_attempted || stats.tests_completed ? 'Continue practicing to build a useful performance history.' : "You haven't completed any practice yet."}</p>
          <button onClick={() => navigateTo('practice')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition">Explore Practice Question Bank</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><section className="space-y-4"><h2 className="text-xl font-bold text-slate-100">Subject performance</h2>{subjectPerformance.length ? subjectPerformance.map((item) => <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800"><div className="flex justify-between text-sm"><span className="text-slate-200">{item.name}</span><span className="text-emerald-400">{item.accuracy || 0}%</span></div><p className="text-xs text-slate-500 mt-1">{item.attempted} attempted · {item.correct} correct</p><div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.accuracy || 0}%` }} /></div></div>) : <p className="p-6 rounded-xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No subject activity yet.</p>}</section><section className="space-y-4"><h2 className="text-xl font-bold text-slate-100">Topic performance</h2>{topicPerformance.length ? topicPerformance.map((item) => <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800"><div className="flex justify-between text-sm"><span className="text-slate-200">{item.name}</span><span className="text-emerald-400">{item.accuracy || 0}%</span></div><p className="text-xs text-slate-500 mt-1">{item.subject_name || 'Subject'} · {item.attempted} attempts</p></div>) : <p className="p-6 rounded-xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No topic activity yet.</p>}</section></div>
        <section className="space-y-4"><h2 className="text-xl font-bold text-slate-100">Recent practice</h2>{recentPractice.length ? <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900 border border-slate-800">{recentPractice.map((item) => <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs"><div><p className="font-semibold text-slate-200">{item.subject_name || 'Practice'}{item.topic_name ? ` · ${item.topic_name}` : ''}</p><p className="text-slate-500">{new Date(item.created_at).toLocaleDateString()} · {item.is_correct ? 'Correct' : 'Incorrect'}</p></div><span className={item.is_correct ? 'text-emerald-400' : 'text-rose-300'}>{item.is_correct ? 'Correct' : 'Review'}</span></div>)}</div> : <p className="p-6 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No practice activity yet.</p>}</section>
        <section className="space-y-4"><h2 className="text-xl font-bold text-slate-100">Recent mock-test attempts</h2>{completedAttempts.length ? <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900 border border-slate-800">{completedAttempts.slice(0, 10).map((attempt) => <div key={attempt.id} className="p-4 flex items-center justify-between gap-4 text-xs"><div><p className="font-semibold text-slate-200">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'Completed attempt'}</p><p className="text-slate-500">{attempt.correct_answers || 0} correct · {attempt.incorrect_answers || 0} incorrect · {attempt.unanswered || 0} unanswered</p></div><span className="font-mono text-emerald-400">{attempt.score ?? 0}/{attempt.total_questions ?? 0}</span></div>)}</div> : <p className="p-6 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-sm text-slate-400">No attempts yet</p>}</section>
      </div>
    );
  };

  const renderAdminPage = () => {
    const isAdmin = isPrimaryAdmin(session?.user);
    if (!isAdmin) {
      return <div className="max-w-md mx-auto px-4 py-20 text-center space-y-5"><Lock className="w-10 h-10 text-amber-400 mx-auto" /><h1 className="text-2xl font-extrabold text-slate-100">Administrator sign-in required</h1><p className="text-sm text-slate-400">Payment approvals are restricted to the confirmed primary administrator.</p><button onClick={() => navigateTo('admin-login')} className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Admin Login</button></div>;
    }
    if (currentPage === 'admin-notifications') return <AdminNotificationsPanel />;
    if (currentPage === 'admin-analytics') {
      return <AdminAnalyticsPanel />;
    }
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase text-emerald-400">Administrator workspace</span>
            <h1 className="text-3xl font-extrabold text-slate-100">Content Administration</h1>
            <p className="text-sm text-slate-400 mt-2">Manage the live database content behind FaujPrep through protected Supabase operations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigateTo('admin-notifications')} className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-semibold">Notifications</button>
            <button onClick={() => navigateTo('admin-analytics')} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold">Analytics</button>
            <button onClick={() => navigateTo('dashboard')} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Dashboard</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">Payment approval queue</h2>
              <span className="text-[10px] uppercase font-mono text-amber-400">{adminPaymentQueue.length} submissions</span>
            </div>

            {adminPaymentQueue.length ? (
              <div className="space-y-4">
                {adminPaymentQueue.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-200">{payment.purchase_type === 'MOCK_TEST' ? payment.test_title : payment.plan_name || payment.plan_slug || 'Plan'}</p>
                        <p className="text-[11px] text-slate-400">{payment.user_email || payment.user_id}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-1 rounded ${payment.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : payment.status === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                        {payment.status || 'PENDING'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <span>Amount: {formatPKR(payment.amount_pkr || 0)}</span>
                      <span>Method: {payment.purchase_type === 'MOCK_TEST' ? 'NayaPay' : payment.payment_method || 'JAZZCASH_MANUAL'}</span>
                      <span>Sender: {payment.sender_name || '—'}</span>
                    </div>
                    {payment.screenshotUrl && (
                      <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-emerald-400 hover:underline">Open screenshot</a>
                    )}
                    {payment.notes && <p className="text-[11px] text-slate-300">Notes: {payment.notes}</p>}
                    {(payment.status === 'PENDING' || payment.status === 'CREATED') && (
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => handleAdminPaymentAction(payment.id, 'approve', 'Payment verified by admin.', payment.purchase_type)} disabled={adminPaymentAction.loading} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold disabled:opacity-60">Approve</button>
                        <button type="button" onClick={() => handleAdminPaymentAction(payment.id, 'reject', 'Payment rejected by admin.', payment.purchase_type)} disabled={adminPaymentAction.loading} className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-[11px] font-bold disabled:opacity-60">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400">No payment submissions are waiting for verification.</div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <h2 className="text-xl font-bold text-slate-100">Payment settings</h2>
            <form onSubmit={handlePaymentSettingsSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Bank / payment title</label>
                <input value={paymentSettingsForm.bank_name || ''} onChange={(e) => setPaymentSettingsForm((previous) => ({ ...previous, bank_name: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Account title</label>
                <input value={paymentSettingsForm.account_title || ''} onChange={(e) => setPaymentSettingsForm((previous) => ({ ...previous, account_title: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Account number</label>
                <input value={paymentSettingsForm.account_number || ''} onChange={(e) => setPaymentSettingsForm((previous) => ({ ...previous, account_number: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">JazzCash mobile</label>
                <input value={paymentSettingsForm.mobile_number || ''} onChange={(e) => setPaymentSettingsForm((previous) => ({ ...previous, mobile_number: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Payment instructions</label>
                <textarea value={paymentSettingsForm.instructions || ''} onChange={(e) => setPaymentSettingsForm((previous) => ({ ...previous, instructions: e.target.value }))} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100 min-h-[96px]" />
              </div>
              {adminPaymentAction.error && <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-[11px] text-rose-200">{adminPaymentAction.error}</div>}
              <button type="submit" disabled={adminPaymentAction.loading} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-60">
                {adminPaymentAction.loading ? 'Saving payment details...' : 'Save payment settings'}
              </button>
            </form>
          </div>
        </div>

        <AdminContentManager
          branches={backendData.branches}
          exams={backendData.exams}
          subjects={backendData.subjects}
          addToast={addToast}
        />
      </div>
    );
  };

  const renderProfilePage = () => (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100">Candidate Profile</h1>
        <p className="text-xs text-slate-400">Manage your target entry preferences and personal details</p>
      </div>

      <form onSubmit={handleProfileSave} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        {profileSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-xs text-emerald-300">
            {profileSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Full Name</label>
            <input
              type="text"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Target Preparation Pathway</label>
          <input
            type="text"
            value={profileData.preferredPath}
            onChange={(e) => setProfileData({ ...profileData, preferredPath: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={profileData.targetBranchId} onChange={(e) => setProfileData({ ...profileData, targetBranchId: e.target.value, targetExamId: '' })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100"><option value="">Target branch</option>{backendData.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <select value={profileData.targetExamId} onChange={(e) => setProfileData({ ...profileData, targetExamId: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100"><option value="">Target exam</option>{backendData.exams.filter((exam) => !profileData.targetBranchId || exam.branch_id === profileData.targetBranchId).map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select>
          <select value={profileData.experienceLevel} onChange={(e) => setProfileData({ ...profileData, experienceLevel: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100"><option value="">Experience level</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Save Profile Settings
          </button>
        </div>
      </form>
    </div>
  );

  const renderContactPage = () => (
    <div
      className="relative w-full py-10"
      style={{
        backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.32)), url('/images/contact%20faujprep.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
    <div className="max-w-3xl mx-auto px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100">Contact FaujPrep Support</h1>
        <p className="text-xs text-slate-400">Have questions about preparation modules or platform access?</p>
      </div>

      <form onSubmit={handleContactSubmit} className="p-6 sm:p-8 rounded-3xl bg-slate-950/75 border border-slate-700/80 space-y-5 shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Your Name</label>
            <input
              type="text"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              placeholder="Full Name"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            {contactErrors.name && <p className="text-[11px] text-rose-400">{contactErrors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              placeholder="candidate@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            {contactErrors.email && <p className="text-[11px] text-rose-400">{contactErrors.email}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Subject</label>
          <input
            type="text"
            value={contactForm.subject}
            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
            placeholder="Question regarding PMA test bank / technical issue"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          {contactErrors.subject && <p className="text-[11px] text-rose-400">{contactErrors.subject}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Message</label>
          <textarea
            rows="4"
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            placeholder="Type your message here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          ></textarea>
          {contactErrors.message && <p className="text-[11px] text-rose-400">{contactErrors.message}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Submit Inquiry
        </button>
      </form>
    </div>
    </div>
  );

  const renderLegalPage = (title, type) => (
    <div
      className={type === 'about' ? 'relative w-full py-10 space-y-6' : 'max-w-4xl mx-auto px-4 py-10 space-y-6'}
      style={type === 'about' ? {
        backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.34)), url('/images/about%20faujprep.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      } : undefined}
    >
      <div className={`${type === 'about' ? 'max-w-4xl mx-auto px-4' : ''} space-y-2 border-b border-slate-800 pb-4`}>
        <h1 className="text-3xl font-extrabold text-slate-100">{title}</h1>
        <p className="text-xs text-slate-400">Last updated: September 2026 • FaujPrep Platform Policies</p>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl ${type === 'about' ? 'max-w-4xl mx-auto bg-slate-950/75 border-slate-700/80' : 'bg-slate-900 border-slate-800'} border space-y-6 text-xs text-slate-300 leading-relaxed`}>
        {type === 'disclaimer' && (
          <>
            <h3 className="font-bold text-slate-100 text-sm">Official Non-Affiliation Disclaimer</h3>
            <p>
              FaujPrep is a private, independent educational preparation website designed to help candidates revise intelligence, academic, and psychological topics relevant to Pakistan armed forces induction tests.
            </p>
            <p>
              FaujPrep is NOT affiliated with, authorized by, endorsed by, or in any way officially connected with the Ministry of Defence, Pakistan Army, Pakistan Air Force, Pakistan Navy, or the Inter Services Selection Board (ISSB).
            </p>
            <p>
              All trademarks, military titles, course names (e.g. PMA, GDP, TCC, PN Cadet, ISSB), and official insignia referenced on this platform remain the property of their respective official governing bodies.
            </p>
          </>
        )}

        {type === 'privacy' && (
          <>
            <h3 className="font-bold text-slate-100 text-sm">Privacy Policy Notice</h3>
            <p>
              FaujPrep respects candidate privacy. Account information submitted during registration is used solely for organizing candidate test practice data and personal profile preferences.
            </p>
            <p>
              We do not sell candidate data to third-party marketing brokers. In Phase 2, backend services powered by Supabase will employ encrypted authentication protocols.
            </p>
          </>
        )}

        {type === 'terms' && (
          <>
            <h3 className="font-bold text-slate-100 text-sm">Terms of Service</h3>
            <p>
              By accessing FaujPrep materials, candidates agree to use question banks and practice sheets for personal educational preparation only.
            </p>
            <p>
              FaujPrep provides preparation practice tools but makes no explicit or implicit guarantee of selection, commission, or passing official recruitment boards.
            </p>
          </>
        )}

        {type === 'about' && (
          <>
            <h3 className="font-bold text-slate-100 text-sm">About FaujPrep</h3>
            <p>
              FaujPrep was conceived to standardize entry-test and ISSB preparation for candidates across Pakistan by combining structured subject syllabus breakdowns with modern practice tools.
            </p>
            <p>
              Whether you are preparing for PMA Long Course initial tests, PAF GDP pilot entry, Navy cadet commission, or ISSB psychological tests, FaujPrep provides structured preparation paths.
            </p>
          </>
        )}
      </div>
    </div>
  );

  const render404Page = () => (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 w-16 h-16 mx-auto flex items-center justify-center text-amber-400">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-100 font-mono">404</h1>
        <h2 className="text-xl font-bold text-slate-200">Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested preparation route does not exist or may have moved.
        </p>
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => navigateTo('home')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
        >
          Return Home
        </button>
        <button
          onClick={() => navigateTo('practice')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
        >
          Explore Practice
        </button>
      </div>
      <nav aria-label="Preparation pages" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <a href="/army" className="hover:text-emerald-400">Army</a>
        <a href="/paf" className="hover:text-emerald-400">PAF</a>
        <a href="/navy" className="hover:text-emerald-400">Navy</a>
        <a href="/issb" className="hover:text-emerald-400">ISSB</a>
      </nav>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return renderHomePage();
      case 'army':
        return renderForcePage('army');
      case 'paf':
        return renderForcePage('paf');
      case 'navy':
        return renderForcePage('navy');
      case 'issb':
        return renderISSBHubPage();
      case 'issb-detail':
        return renderISSBModulePage();
      case 'exam':
        return renderExamPage();
      case 'subject':
        return renderSubjectPage();
      case 'search':
        return renderSearchPage();
      case 'forces':
        return renderHomePage();
      case 'practice':
        return renderPracticePage();
      case 'question-practice':
        return renderQuestionPracticePage();
      case 'mock-tests':
        return renderMockTestsPage();
      case 'mock-payment':
        return renderMockTestPaymentPage();
      case 'mock-detail':
        return renderMockTestDetailPage();
      case 'mock-result':
        return renderQuestionPracticePage();
      case 'resources':
        return renderResourcesPage();
      case 'study-materials':
        return renderStudyMaterialsPage();
      case 'study-material-detail':
        return renderStudyMaterialDetailPage();
      case 'current-affairs':
        return renderCurrentAffairsPage();
      case 'current-affairs-detail':
        return renderCurrentAffairsDetailPage();
      case 'pricing':
        return renderPricingPage();
      case 'checkout':
        return renderCheckoutPage();
      case 'billing':
        return renderBillingPage();
      case 'admin-login':
        return renderLoginPage();
      case 'dashboard':
        return renderDashboardPage();
      case 'admin':
        return renderAdminPage();
      case 'admin-analytics':
        return renderAdminPage();
      case 'admin-notifications':
        return renderAdminPage();
      case 'notifications':
        return session?.user
          ? <NotificationCenter onNavigate={navigateToNotificationAction} onUnreadCountChange={setNotificationUnreadCount} />
          : null;
      case 'profile':
        return renderProfilePage();
      case 'contact':
        return renderContactPage();
      case 'about':
        return renderLegalPage('About FaujPrep', 'about');
      case 'privacy':
        return renderLegalPage('Privacy Policy', 'privacy');
      case 'terms':
        return renderLegalPage('Terms of Service', 'terms');
      case 'disclaimer':
        return renderLegalPage('Official Disclaimer', 'disclaimer');
      default:
        return render404Page();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between">
      <div>
        {renderNavbar()}
        {renderBackendStatus()}
        <main className="animate-fade-in">
          {renderCurrentPage()}
        </main>
      </div>
      {renderFooter()}
      {renderModal()}
      {renderToasts()}
      <Analytics />
    </div>
  );
}