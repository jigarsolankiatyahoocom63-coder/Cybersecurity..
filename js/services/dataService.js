import { createWebsiteVisit } from '../entities/WebsiteVisit.js';
import { createModuleActivity } from '../entities/ModuleActivity.js';
import { createQuizAttempt } from '../entities/QuizAttempt.js';
import { createCampaignPulse } from '../entities/CampaignPulse.js';
import { getAnonymousId, mapToAwarenessCategory } from '../utils/helpers.js';

const STORAGE_KEYS = {
  users: 'cybersafe-users',
  quizAttempts: 'cybersafe-quiz-attempts',
  visits: 'cybersafe-visits',
  modules: 'cybersafe-module-activities',
  settings: 'cybersafe-settings',
  auth: 'cybersafe-auth-user',
};

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAttempt(attempt) {
  const totalQuestions = Number(attempt.totalQuestions ?? attempt.total_questions ?? 0) || 0;
  const score = Number(attempt.score ?? 0) || 0;
  const percentage = Number(attempt.percentage ?? (totalQuestions ? (score / totalQuestions) * 100 : 0) ?? 0) || 0;
  const awarenessCategory = attempt.awarenessCategory || attempt.awareness_category || mapToAwarenessCategory(Math.round(percentage));
  const attemptedAt = attempt.attemptedAt || attempt.attempted_at || attempt.createdAt || new Date().toISOString();
  return createQuizAttempt({
    attemptId: attempt.id || attempt.attempt_id || attempt.attemptId,
    userId: attempt.userId ?? attempt.user_id ?? null,
    anonymousSessionId: attempt.anonymousSessionId ?? attempt.anonymous_session_id ?? null,
    score,
    totalQuestions,
    percentage,
    answers: Array.isArray(attempt.answers) ? attempt.answers : [],
    mode: attempt.mode || 'standard',
    attemptedAt,
  });
}

function summarizeStatistics(attempts, visits, moduleActivities) {
  const awarenessDistribution = {
    'Highly Aware': 0,
    'Moderately Aware': 0,
    'Needs Improvement': 0,
    'Beginner Awareness': 0,
  };
  const validScores = attempts
    .map((item) => Number(item.percentage ?? 0))
    .filter((value) => Number.isFinite(value));
  const averageScore = validScores.length
    ? Math.round(validScores.reduce((sum, value) => sum + value, 0) / validScores.length)
    : 0;

  attempts.forEach((item) => {
    const percentage = Number(item.percentage ?? 0) || 0;
    if (percentage >= 80) awarenessDistribution['Highly Aware'] += 1;
    else if (percentage >= 60) awarenessDistribution['Moderately Aware'] += 1;
    else if (percentage >= 40) awarenessDistribution['Needs Improvement'] += 1;
    else awarenessDistribution['Beginner Awareness'] += 1;
  });

  const moduleCounts = {};
  moduleActivities.forEach((item) => {
    const key = item.moduleId || item.module_id || 'unknown';
    moduleCounts[key] = (moduleCounts[key] || 0) + 1;
  });

  return {
    totalAttempts: attempts.length,
    averageScore,
    awarenessDistribution,
    totalVisits: visits.length,
    totalModuleActivities: moduleActivities.length,
    moduleCounts,
  };
}

function ensureSeedSettings() {
  const settings = readStorage(STORAGE_KEYS.settings, { demoDataSeeded: false });
  if (!settings.demoDataSeeded) {
    seedDemoData();
    settings.demoDataSeeded = true;
    writeStorage(STORAGE_KEYS.settings, settings);
  }
}

export function seedDemoData() {
  const users = readStorage(STORAGE_KEYS.users, []);
  const quizAttempts = readStorage(STORAGE_KEYS.quizAttempts, []);
  const visits = readStorage(STORAGE_KEYS.visits, []);
  const modules = readStorage(STORAGE_KEYS.modules, []);

  if (quizAttempts.length > 0 || visits.length > 0 || modules.length > 0) {
    return { quizAttempts, visits, modules };
  }

  const demoAttemptSet = [
    createQuizAttempt({ userId: 'guest-demo-1', score: 5, totalQuestions: 8, answers: [], mode: 'pre' }),
    createQuizAttempt({ userId: 'guest-demo-2', score: 7, totalQuestions: 8, answers: [], mode: 'post' }),
    createQuizAttempt({ userId: 'guest-demo-3', score: 6, totalQuestions: 8, answers: [], mode: 'standard' }),
    createQuizAttempt({ userId: 'guest-demo-4', score: 8, totalQuestions: 8, answers: [], mode: 'post' }),
    createQuizAttempt({ userId: 'guest-demo-5', score: 4, totalQuestions: 8, answers: [], mode: 'pre' }),
  ];

  const demoVisits = [
    createWebsiteVisit({ userId: 'guest-demo-1', page: '/' }),
    createWebsiteVisit({ userId: 'guest-demo-1', page: 'pages/password-strength-checker.html' }),
    createWebsiteVisit({ userId: 'guest-demo-2', page: 'pages/cybersecurity-quiz.html' }),
    createWebsiteVisit({ userId: 'guest-demo-3', page: 'pages/phishing-and-social-engineering.html' }),
    createWebsiteVisit({ userId: 'guest-demo-4', page: 'pages/statistics.html' }),
    createWebsiteVisit({ userId: 'guest-demo-5', page: 'pages/campaign.html' }),
  ];

  const demoModuleActivities = [
    createModuleActivity({ userId: 'guest-demo-1', moduleId: 'creating-strong-passwords', action: 'viewed' }),
    createModuleActivity({ userId: 'guest-demo-2', moduleId: 'cybersecurity-quiz', action: 'completed' }),
    createModuleActivity({ userId: 'guest-demo-3', moduleId: 'phishing-social-engineering', action: 'viewed' }),
    createModuleActivity({ userId: 'guest-demo-4', moduleId: 'data-protection-checklist', action: 'completed' }),
    createModuleActivity({ userId: 'guest-demo-5', moduleId: 'campaign-resources', action: 'viewed' }),
  ];

  writeStorage(STORAGE_KEYS.quizAttempts, demoAttemptSet);
  writeStorage(STORAGE_KEYS.visits, demoVisits);
  writeStorage(STORAGE_KEYS.modules, demoModuleActivities);
  if (!users.length) {
    writeStorage(STORAGE_KEYS.users, []);
  }

  return { quizAttempts: demoAttemptSet, visits: demoVisits, modules: demoModuleActivities };
}

export const dataService = {
  init() {
    ensureSeedSettings();
    return true;
  },

  getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
  },

  saveUsers(users) {
    writeStorage(STORAGE_KEYS.users, users);
  },

  getQuizAttempts() {
    const storedAttempts = readStorage(STORAGE_KEYS.quizAttempts, []);
    return storedAttempts.map((attempt) => normalizeAttempt(attempt));
  },

  saveQuizAttempts(attempts) {
    const normalizedAttempts = Array.isArray(attempts) ? attempts.map((attempt) => normalizeAttempt(attempt)) : [];
    writeStorage(STORAGE_KEYS.quizAttempts, normalizedAttempts);
    return normalizedAttempts;
  },

  addQuizAttempt(attempt) {
    const normalizedAttempt = normalizeAttempt(attempt);
    const attempts = this.getQuizAttempts();
    attempts.push(normalizedAttempt);
    this.saveQuizAttempts(attempts);
    window.dispatchEvent(new CustomEvent('cybersafe:stats-refresh', { detail: { attempt: normalizedAttempt } }));
    return normalizedAttempt;
  },

  getVisits() {
    return readStorage(STORAGE_KEYS.visits, []);
  },

  saveVisits(visits) {
    writeStorage(STORAGE_KEYS.visits, visits);
  },

  addVisit(userId, page) {
    const visit = createWebsiteVisit({ userId: userId || getAnonymousId(), page });
    const visits = this.getVisits();
    visits.push(visit);
    writeStorage(STORAGE_KEYS.visits, visits);
    return visit;
  },

  getModuleActivities() {
    return readStorage(STORAGE_KEYS.modules, []);
  },

  saveModuleActivities(activities) {
    writeStorage(STORAGE_KEYS.modules, activities);
  },

  addModuleActivity(userId, moduleId, action = 'viewed') {
    const activity = createModuleActivity({ userId: userId || getAnonymousId(), moduleId, action });
    const activities = this.getModuleActivities();
    activities.push(activity);
    writeStorage(STORAGE_KEYS.modules, activities);
    return activity;
  },

  getAnonymousId() {
    let id = localStorage.getItem('cybersafe-anonymous-id');
    if (!id) {
      id = `${Date.now()}-guest`;
      localStorage.setItem('cybersafe-anonymous-id', id);
    }
    return id;
  },

  getCurrentUserId() {
    return localStorage.getItem('cybersafe-current-user-id') || this.getAnonymousId();
  },

  isSignedIn() {
    return Boolean(localStorage.getItem('cybersafe-current-user-id'));
  },

  setCurrentUser(userId) {
    localStorage.setItem('cybersafe-current-user-id', userId);
  },

  clearCurrentUser() {
    localStorage.removeItem('cybersafe-current-user-id');
  },

  getChecklistProgress(key) {
    return readStorage(`cybersafe-checklist-${key}`, []);
  },

  saveChecklistProgress(key, values) {
    writeStorage(`cybersafe-checklist-${key}`, values);
  },

  getPublicStats() {
    return summarizeStatistics(
      this.getQuizAttempts(),
      this.getVisits(),
      this.getModuleActivities()
    );
  },

  getPersonalStats() {
    if (!this.isSignedIn()) {
      throw new Error('Personal statistics are available only while signed in.');
    }

    const userId = this.getCurrentUserId();
    const belongsToCurrentUser = (entry) => (entry.userId ?? entry.user_id) === userId;
    return summarizeStatistics(
      this.getQuizAttempts().filter(belongsToCurrentUser),
      this.getVisits().filter(belongsToCurrentUser),
      this.getModuleActivities().filter(belongsToCurrentUser)
    );
  },

  getPersonalVisits() {
    if (!this.isSignedIn()) {
      throw new Error('Personal visits are available only while signed in.');
    }

    const userId = this.getCurrentUserId();
    return this.getVisits().filter((entry) => (entry.userId ?? entry.user_id) === userId);
  },

  getAggregatedStats() {
    return this.getPublicStats();
  },

  buildCampaignPulse() {
    const stats = this.getPublicStats();
    return createCampaignPulse({
      quizAttempts: stats.totalAttempts,
      averageScore: stats.averageScore,
      awareness: stats.awarenessDistribution,
      visits: stats.totalVisits,
      modulesViewed: stats.totalModuleActivities,
    });
  },

  getFeedbackEntries() {
    return readStorage('cybersafe-anonymous-feedback', []);
  },

  saveFeedbackEntries(entries) {
    writeStorage('cybersafe-anonymous-feedback', entries);
  },

  addFeedbackEntry(entry) {
    const feedback = this.getFeedbackEntries();
    feedback.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...entry,
      createdAt: new Date().toISOString(),
    });
    this.saveFeedbackEntries(feedback);
    return feedback[feedback.length - 1];
  },

  exportAnonymisedJson() {
    const signedIn = this.isSignedIn();
    const userId = this.getCurrentUserId();
    const attempts = this.getQuizAttempts().filter((entry) => !signedIn || entry.userId === userId);
    const visits = this.getVisits().filter((entry) => !signedIn || (entry.userId ?? entry.user_id) === userId);
    const activities = this.getModuleActivities().filter((entry) => !signedIn || (entry.userId ?? entry.user_id) === userId);
    const payload = {
      exportedAt: new Date().toISOString(),
      statistics: signedIn ? this.getPersonalStats() : this.getPublicStats(),
      quizAttempts: attempts.map(({ id, userId: attemptUserId, anonymousSessionId, score, totalQuestions, percentage, awarenessCategory, mode, attemptedAt }) => ({
        attemptId: id,
        userId: attemptUserId ? 'anonymous-user' : 'anonymous',
        anonymousSessionId: anonymousSessionId || 'anonymous-session',
        score,
        totalQuestions,
        percentage,
        awarenessCategory,
        mode,
        attemptedAt,
      })),
      visits: visits.map(({ id, userId: visitUserId, page, createdAt }) => ({ visitId: id, userId: visitUserId ? 'anonymous-user' : 'anonymous', page, createdAt })),
      moduleActivities: activities.map(({ id, userId: activityUserId, moduleId, action, createdAt }) => ({ activityId: id, userId: activityUserId ? 'anonymous-user' : 'anonymous', moduleId, action, createdAt })),
      feedback: signedIn ? [] : this.getFeedbackEntries().map(({ id, sentiment, topic, comment, createdAt }) => ({ feedbackId: id, sentiment, topic, comment, createdAt })),
    };
    return JSON.stringify(payload, null, 2);
  },

  exportAnonymisedCsv() {
    const stats = this.isSignedIn() ? this.getPersonalStats() : this.getPublicStats();
    const rows = [
      {
        type: 'quizAttempt',
        value: stats.totalAttempts,
      },
      {
        type: 'averageScore',
        value: stats.averageScore,
      },
      {
        type: 'highlyAware',
        value: stats.awarenessDistribution['Highly Aware'],
      },
      {
        type: 'moderatelyAware',
        value: stats.awarenessDistribution['Moderately Aware'],
      },
      {
        type: 'needsImprovement',
        value: stats.awarenessDistribution['Needs Improvement'],
      },
      {
        type: 'beginnerAwareness',
        value: stats.awarenessDistribution['Beginner Awareness'],
      },
    ];
    return rows.map((row) => `${row.type},${row.value}`).join('\n');
  },

  importAndMergeData(rawText) {
    try {
      const parsed = JSON.parse(rawText);
      const newAttempts = Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [];
      const newVisits = Array.isArray(parsed.visits) ? parsed.visits : [];
      const newActivities = Array.isArray(parsed.moduleActivities) ? parsed.moduleActivities : [];

      const normalizedAttempts = newAttempts.map((item) => normalizeAttempt({
        id: item.attemptId || item.id,
        userId: item.userId || null,
        anonymousSessionId: item.anonymousSessionId || null,
        score: item.score,
        totalQuestions: item.totalQuestions,
        percentage: item.percentage,
        awarenessCategory: item.awarenessCategory,
        mode: item.mode,
        attemptedAt: item.attemptedAt,
        answers: item.answers || [],
      }));

      const allAttempts = [...this.getQuizAttempts(), ...normalizedAttempts];
      const allVisits = [...this.getVisits(), ...newVisits];
      const allActivities = [...this.getModuleActivities(), ...newActivities];

      this.saveQuizAttempts(allAttempts);
      this.saveVisits(allVisits);
      this.saveModuleActivities(allActivities);
      return { attempts: allAttempts.length, visits: allVisits.length, activities: allActivities.length };
    } catch (error) {
      throw new Error('Import failed. Please provide a valid JSON export.');
    }
  },
};

export function ensureDemoSeed() {
  const settings = readStorage(STORAGE_KEYS.settings, { demoDataSeeded: false });
  if (!settings.demoDataSeeded) {
    seedDemoData();
    settings.demoDataSeeded = true;
    writeStorage(STORAGE_KEYS.settings, settings);
  }
  return true;
}
