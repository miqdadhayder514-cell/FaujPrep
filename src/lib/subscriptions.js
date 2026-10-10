import { isSupabaseConfigured, supabase } from './supabase';

export const PLAN_VALUES = {
  free: { id: 'free', slug: 'free', name: 'Free', price_pkr: 0 },
  pro: { id: 'pro', slug: 'pro', name: 'Pro', price_pkr: 1999 },
  premium: { id: 'premium', slug: 'premium', name: 'Premium', price_pkr: 4999 },
};

export function formatPKR(amount) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}

export const DEFAULT_PLAN_CATALOG = [
  {
    id: 'free-plan',
    slug: 'free',
    name: 'Free',
    description: 'Basic preparation access for independent candidates getting started.',
    price_pkr: 0,
    billing_interval: 'ONE_TIME',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'pro-plan',
    slug: 'pro',
    name: 'Pro',
    description: 'Expanded question practice and premium preparation access.',
    price_pkr: 1999,
    billing_interval: 'ONE_TIME',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'premium-plan',
    slug: 'premium',
    name: 'Premium',
    description: 'Maximum access to premium resources and preparation content.',
    price_pkr: 4999,
    billing_interval: 'ONE_TIME',
    is_active: true,
    display_order: 3,
  },
];

export async function getPlanCatalog() {
  if (!isSupabaseConfigured) {
    return DEFAULT_PLAN_CATALOG;
  }

  const { data, error } = await supabase
    .from('plans')
    .select('id, name, slug, description, price_pkr, billing_interval, is_active, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) && data.length ? data : DEFAULT_PLAN_CATALOG;
}

export async function getCurrentUserSubscription() {
  if (!isSupabaseConfigured) {
    return { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
  }

  const { data, error } = await supabase.rpc('get_user_billing_summary');
  if (error) throw error;
  return data || { subscription: { plan_slug: 'free', plan_name: 'Free', status: 'ACTIVE', price_pkr: 0 }, transactions: [] };
}

export async function createPlanCheckout(planSlug) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const { data, error } = await supabase.rpc('create_plan_checkout', { p_plan_slug: planSlug });
  if (error) throw error;
  return data;
}

export async function confirmPaymentTransaction(transactionId, providerReference) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const { data, error } = await supabase.rpc('confirm_payment_transaction', {
    p_transaction_id: transactionId,
    p_provider_reference: providerReference || null,
  });
  if (error) throw error;
  return data;
}

export async function getPaymentSettings() {
  if (!isSupabaseConfigured) {
    return {
      payment_method: 'JAZZCASH_MANUAL',
      bank_name: 'NAYAPAY',
      account_title: 'MUHAMMAD MIQDAD HAIDER',
      account_number: '03052231414',
      mobile_number: '03052231414',
      instructions: 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
    };
  }

  const { data, error } = await supabase.rpc('get_active_payment_settings');
  if (error) throw error;
  return data || {
    payment_method: 'JAZZCASH_MANUAL',
    bank_name: 'NAYAPAY',
    account_title: 'MUHAMMAD MIQDAD HAIDER',
    account_number: '03052231414',
    mobile_number: '03052231414',
    instructions: 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
  };
}

async function uploadPaymentScreenshot(userId, paymentScreenshot) {
  const screenshotExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const screenshotExtension = screenshotExtensions[paymentScreenshot?.type];
  if (!screenshotExtension || paymentScreenshot.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
  }

  const screenshotPath = `${userId}/${crypto.randomUUID()}.${screenshotExtension}`;
  const { error } = await supabase.storage.from('payment-screenshots').upload(screenshotPath, paymentScreenshot, {
    cacheControl: '3600',
    contentType: paymentScreenshot.type,
    upsert: false,
  });
  if (error) throw error;
  return screenshotPath;
}

export async function submitManualPaymentProof(payload) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const screenshotPath = await uploadPaymentScreenshot(payload.userId, payload.paymentScreenshot);

  const { data, error } = await supabase.rpc('submit_manual_payment_proof', {
    p_plan_slug: payload.planSlug,
    p_sender_name: payload.senderName,
    p_sender_phone: payload.senderPhone,
    p_transaction_reference: null,
    p_payment_date: payload.paymentDate,
    p_payment_time: payload.paymentTime || null,
    p_payment_screenshot_url: screenshotPath,
    p_notes: payload.notes || null,
  });

  if (error) {
    await supabase.storage.from('payment-screenshots').remove([screenshotPath]);
    throw error;
  }
  return data;
}

export async function submitMockTestPaymentProof(payload) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const screenshotPath = await uploadPaymentScreenshot(payload.userId, payload.paymentScreenshot);
  const { data, error } = await supabase.rpc('submit_mock_test_payment_proof', {
    p_test_slug: payload.testSlug,
    p_sender_name: payload.senderName,
    p_sender_phone: payload.senderPhone,
    p_payment_date: payload.paymentDate,
    p_payment_time: payload.paymentTime || null,
    p_payment_screenshot_url: screenshotPath,
    p_notes: payload.notes || null,
  });
  if (error) {
    await supabase.storage.from('payment-screenshots').remove([screenshotPath]);
    throw error;
  }
  return data;
}

export async function submitPaidNotePaymentProof(payload) {
  if (!isSupabaseConfigured) {
    throw new Error('Paid note downloads require a configured account.');
  }

  const screenshotPath = await uploadPaymentScreenshot(payload.userId, payload.paymentScreenshot);
  const { data, error } = await supabase.rpc('submit_paid_note_payment_proof', {
    p_note_slug: payload.noteSlug,
    p_sender_name: payload.senderName,
    p_sender_phone: payload.senderPhone,
    p_payment_date: payload.paymentDate,
    p_payment_time: payload.paymentTime || null,
    p_payment_screenshot_url: screenshotPath,
    p_notes: payload.notes || null,
  });
  if (error) {
    await supabase.storage.from('payment-screenshots').remove([screenshotPath]);
    throw error;
  }
  return data;
}

export async function getPaidNoteDownloadUrl(noteSlug, downloadPath) {
  if (!isSupabaseConfigured) {
    throw new Error('Paid note downloads require a configured account.');
  }

  const allowedPaths = {
    'pma-academic-notes': 'pma-academic-notes.pdf',
    'pma-academic-tests-notes': 'pma-academic-tests-notes.pdf',
    'pma-non-verbal-intelligence-notes': 'pma-non-verbal-intelligence-notes.pdf',
    'pma-verbal-intelligence-notes': 'pma-verbal-intelligence-notes.pdf',
  };
  if (allowedPaths[noteSlug] !== downloadPath) {
    throw new Error('This paid note download is not available.');
  }

  const { data, error } = await supabase.storage
    .from('paid-notes')
    .createSignedUrl(downloadPath, 300, { download: true });
  if (error) throw error;
  return data.signedUrl;
}

export async function getMyMockTestPurchases() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_my_mock_test_purchases');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getPaidMockTestQuestions(testSlug) {
  if (!isSupabaseConfigured) throw new Error('Paid mock-test access requires a configured account.');
  const { data, error } = await supabase.rpc('get_paid_mock_test_questions', { p_test_slug: testSlug });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getMyPaymentTransactions() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_my_payment_transactions');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAdminPaymentQueue() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const [planQueue, mockTestQueue, noteQueue] = await Promise.all([
    supabase.rpc('get_admin_payment_queue'),
    supabase.rpc('get_admin_mock_test_purchase_queue'),
    supabase.rpc('get_admin_paid_note_purchase_queue'),
  ]);
  if (planQueue.error) throw planQueue.error;
  if (mockTestQueue.error) throw mockTestQueue.error;
  if (noteQueue.error) throw noteQueue.error;
  const noteSlugs = new Set([
    'pma-academic-notes',
    'pma-academic-tests-notes',
    'pma-non-verbal-intelligence-notes',
    'pma-verbal-intelligence-notes',
  ]);
  const payments = [
    ...(Array.isArray(planQueue.data) ? planQueue.data : []).map((payment) => ({ ...payment, purchase_type: 'PLAN' })),
    ...(Array.isArray(mockTestQueue.data) ? mockTestQueue.data : []).filter((payment) => !noteSlugs.has(payment.test_slug)),
    ...(Array.isArray(noteQueue.data) ? noteQueue.data : []),
  ];
  return Promise.all(payments.map(async (payment) => {
    const screenshotPath = payment.payment_screenshot_url;
    if (!screenshotPath) return { ...payment, screenshotUrl: null };
    if (/^https?:\/\//i.test(screenshotPath)) return { ...payment, screenshotUrl: screenshotPath };

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('payment-screenshots')
      .createSignedUrl(screenshotPath, 3600);
    return { ...payment, screenshotUrl: signedUrlError ? null : signedUrlData?.signedUrl || null };
  }));
}

export async function approveMockTestPurchase(purchaseId, adminNotes = '') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }
  const { data, error } = await supabase.rpc('admin_approve_mock_test_purchase', {
    p_purchase_id: purchaseId,
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

export async function rejectMockTestPurchase(purchaseId, adminNotes = '') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }
  const { data, error } = await supabase.rpc('admin_reject_mock_test_purchase', {
    p_purchase_id: purchaseId,
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

export async function approvePaymentTransaction(paymentId, adminNotes = '') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const { data, error } = await supabase.rpc('admin_approve_payment', {
    p_payment_id: paymentId,
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

export async function rejectPaymentTransaction(paymentId, adminNotes = '') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const { data, error } = await supabase.rpc('admin_reject_payment', {
    p_payment_id: paymentId,
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

export async function upsertPaymentSettings(settings) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const { data, error } = await supabase.rpc('upsert_payment_settings', {
    p_payment_method: settings.payment_method || 'JAZZCASH_MANUAL',
    p_bank_name: settings.bank_name || 'NAYAPAY',
    p_account_title: settings.account_title || 'MUHAMMAD MIQDAD HAIDER',
    p_account_number: settings.account_number || '03052231414',
    p_mobile_number: settings.mobile_number || '03052231414',
    p_instructions: settings.instructions || 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
  });

  if (error) throw error;
  return data;
}
