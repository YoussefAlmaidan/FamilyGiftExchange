// Multi-User Secret Santa Application with Firebase

// Global State
let currentSession = null;
let currentRole = null; // 'organizer' or 'participant'
let currentUserName = null;
let participantsData = {};
let restrictionsData = {};
let assignmentsData = {};
let adminLanguage = localStorage.getItem('adminLanguage') || 'ar';

// ============================================
// TRANSLATIONS (Admin Panel Only)
// ============================================

const translations = {
    ar: {
        // Login
        adminLogin: 'دخول المدير',
        enterPassword: 'أدخل كلمة المرور للوصول إلى لوحة التحكم',
        password: 'كلمة المرور',
        login: 'دخول',
        setupPassword: 'لم يتم إعداد كلمة مرور بعد. أنشئ كلمة مرور جديدة:',
        newPassword: 'كلمة المرور الجديدة',
        confirmPassword: 'تأكيد كلمة المرور',
        createPassword: 'إنشاء كلمة المرور',
        // Dashboard
        adminDashboard: 'لوحة المدير',
        logout: 'تسجيل خروج',
        manageSessions: 'إدارة جلسات سحب الأسماء',
        createNewSession: '+ إنشاء جلسة جديدة',
        previousSessions: 'الجلسات السابقة',
        loading: 'جاري التحميل...',
        noSessions: 'لا توجد جلسات سابقة. أنشئ جلسة جديدة للبدء.',
        open: 'فتح',
        delete: 'حذف',
        participant: 'مشارك',
        setup: 'في الإعداد',
        drawing: 'جاري السحب',
        completed: 'مكتمل',
        // Create Session
        createNewSessionTitle: 'إنشاء جلسة جديدة',
        sessionNamePlaceholder: 'اسم الجلسة (مثال: عائلة 2026)',
        yourName: 'اسمك',
        create: 'إنشاء',
        cancel: 'إلغاء',
        // Organizer View
        controlPanel: 'لوحة التحكم',
        allSessions: '← كل الجلسات',
        shareLink: 'رابط المشاركة:',
        copy: 'نسخ',
        closeRegistration: 'إغلاق التسجيل',
        openRegistration: 'فتح التسجيل',
        registrationOpen: 'التسجيل مفتوح',
        registrationClosed: 'التسجيل مغلق',
        participants: 'المشاركون',
        addManually: 'أضف مشارك يدوياً',
        add: 'إضافة',
        restrictionsOptional: 'القيود (اختياري)',
        restrictionsHelp: 'حدد من لا يمكن أن يسحب بعضهم بعضاً',
        startDraw: 'بدء السحب',
        reset: 'إعادة تعيين',
        viewResults: 'عرض النتائج',
        showAllResults: 'عرض جميع النتائج',
        hideResults: 'إخفاء النتائج',
        reveal: 'كشف',
        hide: 'إخفاء',
        dangerZone: 'منطقة الخطر',
        deleteSession: 'حذف الجلسة',
        drewCount: '{drawn} من {total} سحبوا',
        cannotDraw: '{name} لا يمكنه سحب:',
        include: 'تضمين',
        exclude: 'استبعاد',
        // Change Password
        changePassword: 'تغيير كلمة المرور',
        currentPassword: 'كلمة المرور الحالية',
        changePasswordBtn: 'تغيير كلمة المرور',
        // Lang toggle
        langToggle: 'English'
    },
    en: {
        // Login
        adminLogin: 'Admin Login',
        enterPassword: 'Enter password to access control panel',
        password: 'Password',
        login: 'Login',
        setupPassword: 'No password set. Create a new password:',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        createPassword: 'Create Password',
        // Dashboard
        adminDashboard: 'Admin Dashboard',
        logout: 'Logout',
        manageSessions: 'Manage gift exchange sessions',
        createNewSession: '+ Create New Session',
        previousSessions: 'Previous Sessions',
        loading: 'Loading...',
        noSessions: 'No previous sessions. Create a new one to start.',
        open: 'Open',
        delete: 'Delete',
        participant: 'participant',
        setup: 'Setup',
        drawing: 'Drawing',
        completed: 'Completed',
        // Create Session
        createNewSessionTitle: 'Create New Session',
        sessionNamePlaceholder: 'Session name (e.g., Family 2026)',
        yourName: 'Your name',
        create: 'Create',
        cancel: 'Cancel',
        // Organizer View
        controlPanel: 'Control Panel',
        allSessions: '← All Sessions',
        shareLink: 'Share link:',
        copy: 'Copy',
        closeRegistration: 'Close Registration',
        openRegistration: 'Open Registration',
        registrationOpen: 'Registration open',
        registrationClosed: 'Registration closed',
        participants: 'Participants',
        addManually: 'Add participant manually',
        add: 'Add',
        restrictionsOptional: 'Restrictions (optional)',
        restrictionsHelp: 'Set who cannot draw each other',
        startDraw: 'Start Draw',
        reset: 'Reset',
        viewResults: 'View Results',
        showAllResults: 'Show All Results',
        hideResults: 'Hide Results',
        reveal: 'Reveal',
        hide: 'Hide',
        dangerZone: 'Danger Zone',
        deleteSession: 'Delete Session',
        drewCount: '{drawn} of {total} drew',
        cannotDraw: '{name} cannot draw:',
        include: 'Include',
        exclude: 'Exclude',
        // Change Password
        changePassword: 'Change Password',
        currentPassword: 'Current password',
        changePasswordBtn: 'Change Password',
        // Lang toggle
        langToggle: 'العربية'
    }
};

function toggleAdminLanguage() {
    adminLanguage = adminLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('adminLanguage', adminLanguage);
    applyAdminTranslations();

    // Re-render dynamic content based on current view
    if (currentRole === 'organizer' && currentSession) {
        updateOrganizerParticipantsList();
        updateRestrictionsInterface();
        updateOrganizerProgress();
        loadIndividualAssignments();
        // Re-apply registration UI
        db.ref('sessions/' + currentSession + '/registrationClosed').once('value').then(snapshot => {
            updateRegistrationUI(snapshot.val() || false);
        });
    }

    // Re-render admin dashboard if visible
    const dashboardSection = document.getElementById('adminDashboardSection');
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        loadAdminSessions();
    }
}

function applyAdminTranslations() {
    const t = translations[adminLanguage];

    // Update language toggle buttons
    const langBtns = ['langToggleBtn', 'langToggleBtnDash', 'langToggleBtnOrg'];
    langBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.textContent = t.langToggle;
    });

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });

    // Update document direction for admin sections only
    const adminSections = ['adminLoginSection', 'adminDashboardSection', 'createSessionSection', 'organizerSection'];
    adminSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.direction = adminLanguage === 'ar' ? 'rtl' : 'ltr';
            section.style.textAlign = adminLanguage === 'ar' ? 'right' : 'left';
        }
    });
}

function t(key, replacements = {}) {
    let text = translations[adminLanguage][key] || key;
    Object.keys(replacements).forEach(k => {
        text = text.replace(`{${k}}`, replacements[k]);
    });
    return text;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function createConfetti() {
    const colors = ['#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }

    setTimeout(() => {
        container.remove();
    }, 3500);
}

function generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function generateAdminKey() {
    return Math.random().toString(36).substring(2, 17);
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        session: params.get('session'),
        role: params.get('role'),
        key: params.get('key')
    };
}

// Get the base URL for the app (works with GitHub Pages subdirectory)
function getBaseUrl() {
    // Get the current path and ensure it points to index.html
    let path = window.location.pathname;

    // If path ends with a specific file, use that directory
    if (path.endsWith('.html')) {
        path = path.substring(0, path.lastIndexOf('/') + 1);
    }

    // Ensure path ends with /
    if (!path.endsWith('/')) {
        path += '/';
    }

    return `${window.location.origin}${path}`;
}

function hideAllSections() {
    document.getElementById('landingSection').style.display = 'none';
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('createSessionSection').style.display = 'none';
    document.getElementById('organizerSection').style.display = 'none';
    document.getElementById('participantSection').style.display = 'none';
}

// Simple hash function for password (not cryptographically secure, but sufficient for this use case)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function showCreateSession() {
    hideAllSections();
    document.getElementById('createSessionSection').style.display = 'block';
}

function backToLanding() {
    hideAllSections();
    document.getElementById('landingSection').style.display = 'block';
}

async function createSession() {
    const sessionName = document.getElementById('sessionName').value.trim();
    const organizerName = document.getElementById('organizerName').value.trim();

    if (!sessionName || !organizerName) {
        showNotification('الرجاء ملء جميع الحقول');
        return;
    }

    const sessionId = generateSessionId();
    const adminKey = generateAdminKey();

    try {
        await db.ref('sessions/' + sessionId).set({
            name: sessionName,
            status: 'setup',
            createdBy: organizerName,
            createdAt: Date.now(),
            adminKey: adminKey,
            participants: {},
            assignments: {},
            restrictions: {}
        });

        // Save to localStorage
        localStorage.setItem('currentSession', sessionId);
        localStorage.setItem('currentRole', 'organizer');
        localStorage.setItem('adminKey', adminKey);

        // Save to admin sessions list
        saveAdminSession(sessionId, adminKey, sessionName);

        // Update URL
        const organizerUrl = `${getBaseUrl()}?session=${sessionId}&role=organizer&key=${adminKey}`;
        window.history.pushState({}, '', organizerUrl);

        currentSession = sessionId;
        currentRole = 'organizer';
        currentUserName = organizerName;

        // Clear form inputs
        document.getElementById('sessionName').value = '';
        document.getElementById('organizerName').value = '';

        initializeOrganizerView();
        showNotification('تم إنشاء الجلسة بنجاح!');
    } catch (error) {
        console.error('Error creating session:', error);
        showNotification('حدث خطأ في إنشاء الجلسة');
    }
}

async function joinSession(sessionId, userName) {
    if (!userName) {
        showNotification('الرجاء إدخال اسمك');
        return;
    }

    try {
        // Check if session exists
        const sessionSnapshot = await db.ref('sessions/' + sessionId).once('value');
        if (!sessionSnapshot.exists()) {
            showNotification('الجلسة غير موجودة');
            return;
        }

        const sessionData = sessionSnapshot.val();

        // Check for existing participant with same name (session recovery)
        const participants = sessionData.participants || {};
        const existingParticipant = Object.entries(participants)
            .find(([id, data]) => data.name === userName);

        if (existingParticipant) {
            // RECOVERY: Restore existing participant session
            const [participantId, participantData] = existingParticipant;

            localStorage.setItem('currentSession', sessionId);
            localStorage.setItem('currentRole', 'participant');
            localStorage.setItem('currentUserName', userName);
            localStorage.setItem('participantId', participantId);

            currentSession = sessionId;
            currentRole = 'participant';
            currentUserName = userName;

            initializeParticipantView();
            showNotification('مرحباً بعودتك!');
            return;
        }

        // Check if registration is closed (only for new participants)
        if (sessionData.registrationClosed) {
            showNotification('التسجيل مغلق. لا يمكن الانضمام حالياً');
            return;
        }

        // Add new participant
        const participantId = 'participant_' + Date.now();
        await db.ref('sessions/' + sessionId + '/participants/' + participantId).set({
            name: userName,
            hasDrawn: false,
            isExcluded: false,
            joinedAt: Date.now()
        });

        // Save to localStorage
        localStorage.setItem('currentSession', sessionId);
        localStorage.setItem('currentRole', 'participant');
        localStorage.setItem('currentUserName', userName);
        localStorage.setItem('participantId', participantId);

        currentSession = sessionId;
        currentRole = 'participant';
        currentUserName = userName;

        initializeParticipantView();
        showNotification('تم الانضمام بنجاح!');
    } catch (error) {
        console.error('Error joining session:', error);
        showNotification('حدث خطأ في الانضمام');
    }
}

function joinFromLanding() {
    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const params = getUrlParams();

    if (!firstName || !middleName) {
        showNotification('يرجى إدخال الاسم الأول واسم الأب');
        return;
    }

    if (!params.session) {
        showNotification('رابط الجلسة غير صحيح');
        return;
    }

    const fullName = `${firstName} ${middleName}`;
    joinSession(params.session, fullName);
}

// ============================================
// ORGANIZER VIEW
// ============================================

function initializeOrganizerView() {
    hideAllSections();
    document.getElementById('organizerSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = '<span class="role-badge organizer"></span> منظم';

    // Apply translations for admin panel
    applyAdminTranslations();

    // Load session data
    loadOrganizerData();

    // Setup Firebase listeners
    listenToParticipants();
}

async function loadOrganizerData() {
    try {
        const snapshot = await db.ref('sessions/' + currentSession).once('value');
        const sessionData = snapshot.val();

        if (!sessionData) return;

        document.getElementById('sessionTitle').textContent = sessionData.name;

        // Generate and display participant link
        const participantUrl = `${getBaseUrl()}?session=${currentSession}`;
        document.getElementById('sessionLink').value = participantUrl;

        // Update registration status UI
        updateRegistrationUI(sessionData.registrationClosed || false);

        // Show view results section if draw has started
        if (sessionData.status === 'drawing' || sessionData.status === 'completed') {
            document.getElementById('viewResultsSection').style.display = 'block';
            loadIndividualAssignments();
        }
    } catch (error) {
        console.error('Error loading organizer data:', error);
    }
}

function listenToParticipants() {
    db.ref('sessions/' + currentSession + '/participants').on('value', (snapshot) => {
        participantsData = snapshot.val() || {};
        updateOrganizerParticipantsList();
        updateRestrictionsInterface();
        updateOrganizerProgress();
    });

    // Listen to session status for showing view results section
    db.ref('sessions/' + currentSession + '/status').on('value', (snapshot) => {
        const status = snapshot.val();
        if (status === 'drawing' || status === 'completed') {
            document.getElementById('viewResultsSection').style.display = 'block';
        } else {
            document.getElementById('viewResultsSection').style.display = 'none';
        }
    });

    // Listen to assignments for real-time sync
    db.ref('sessions/' + currentSession + '/assignments').on('value', (snapshot) => {
        assignmentsData = snapshot.val() || {};
        // Only refresh individual view if visible and not showing all results
        const viewResultsSection = document.getElementById('viewResultsSection');
        const allAssignmentsContainer = document.getElementById('allAssignmentsContainer');
        if (viewResultsSection.style.display !== 'none' &&
            allAssignmentsContainer.style.display === 'none') {
            loadIndividualAssignments();
        }
    });
}

function updateOrganizerParticipantsList() {
    const list = document.getElementById('organizerParticipantsList');
    const count = document.getElementById('participantCount');

    list.innerHTML = '';
    const participants = Object.entries(participantsData);
    count.textContent = participants.length;

    if (participants.length === 0) {
        const emptyMsg = adminLanguage === 'en'
            ? 'No participants yet. Share the link with your family!'
            : 'لا يوجد مشاركون حتى الآن. شارك الرابط مع عائلتك!';
        list.innerHTML = `<div class="empty-message">${emptyMsg}</div>`;
        return;
    }

    participants.forEach(([id, data]) => {
        const li = document.createElement('li');

        let statusClass = 'joined';

        if (data.isExcluded) {
            statusClass = 'excluded';
        } else if (data.hasDrawn) {
            statusClass = 'drawn';
        }

        li.innerHTML = `
            <span class="participant-info">
                <span class="status-badge ${statusClass}"></span>
                <span class="participant-name">${data.name}</span>
            </span>
            <div class="participant-actions">
                <button class="toggle-exclude-btn ${data.isExcluded ? 'excluded' : ''}"
                        onclick="toggleExclusion('${id}')">
                    ${data.isExcluded ? t('include') : t('exclude')}
                </button>
                <button class="remove-btn" onclick="removeParticipant('${id}')">${t('delete')}</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function updateRestrictionsInterface() {
    const container = document.getElementById('restrictionsContainer');
    container.innerHTML = '';

    const participants = Object.entries(participantsData);

    if (participants.length < 2) {
        const helpText = adminLanguage === 'en'
            ? 'Add participants first to set restrictions'
            : 'أضف مشاركين أولاً لتعيين القيود';
        container.innerHTML = `<p class="help-text">${helpText}</p>`;
        return;
    }

    participants.forEach(([id, data]) => {
        if (data.isExcluded) return; // Don't show restrictions for excluded participants

        const restrictionBox = document.createElement('div');
        restrictionBox.className = 'restriction-box';

        const participantNames = participants
            .filter(([otherId]) => otherId !== id && !participantsData[otherId].isExcluded)
            .map(([, otherData]) => otherData.name);

        const currentRestrictions = restrictionsData[data.name] || [];

        let checkboxes = participantNames.map(name => {
            const checked = currentRestrictions.includes(name) ? 'checked' : '';
            return `
                <label class="restriction-checkbox">
                    <input type="checkbox" value="${name}" ${checked}
                           onchange="updateRestrictions('${data.name}')">
                    <span>${name}</span>
                </label>
            `;
        }).join('');

        const noOptionsText = adminLanguage === 'en' ? 'No options' : 'لا توجد خيارات';
        restrictionBox.innerHTML = `
            <div class="restriction-header">${t('cannotDraw', { name: data.name })}</div>
            <div class="restriction-options" id="restrictions-${data.name}">
                ${checkboxes || `<span class="no-options">${noOptionsText}</span>`}
            </div>
        `;

        container.appendChild(restrictionBox);
    });
}

async function toggleExclusion(participantId) {
    try {
        const snapshot = await db.ref('sessions/' + currentSession + '/participants/' + participantId).once('value');
        const participant = snapshot.val();

        await db.ref('sessions/' + currentSession + '/participants/' + participantId + '/isExcluded')
            .set(!participant.isExcluded);

        showNotification(participant.isExcluded ? 'تم التضمين' : 'تم الاستبعاد');
    } catch (error) {
        console.error('Error toggling exclusion:', error);
    }
}

async function removeParticipant(participantId) {
    if (!confirm('هل أنت متأكد من حذف هذا المشارك؟')) return;

    try {
        await db.ref('sessions/' + currentSession + '/participants/' + participantId).remove();
        showNotification('تم الحذف');
    } catch (error) {
        console.error('Error removing participant:', error);
    }
}

function updateRestrictions(participantName) {
    const container = document.getElementById(`restrictions-${participantName}`);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const restrictions = Array.from(checkboxes).map(cb => cb.value);

    restrictionsData[participantName] = restrictions;

    // Save to Firebase
    db.ref('sessions/' + currentSession + '/restrictions/' + participantName).set(restrictions);
}

function updateOrganizerProgress() {
    const participants = Object.values(participantsData);
    const includedParticipants = participants.filter(p => !p.isExcluded);
    const drawnCount = includedParticipants.filter(p => p.hasDrawn).length;
    const total = includedParticipants.length;

    document.getElementById('organizerProgressText').textContent = t('drewCount', { drawn: drawnCount, total: total });
    const percentage = total > 0 ? (drawnCount / total) * 100 : 0;
    document.getElementById('organizerProgressFill').style.width = percentage + '%';
}

// ============================================
// DRAW ALGORITHM
// ============================================

async function startDrawAsOrganizer() {
    const button = document.getElementById('startDrawBtn');
    button.classList.add('loading');

    try {
        // Get included participants
        const participants = Object.entries(participantsData)
            .filter(([_, data]) => !data.isExcluded)
            .map(([_, data]) => data.name);

        if (participants.length < 3) {
            showNotification('يجب أن يكون هناك 3 مشاركين على الأقل (غير مستبعدين)');
            button.classList.remove('loading');
            return;
        }

        // Load restrictions from Firebase
        const restrictionsSnapshot = await db.ref('sessions/' + currentSession + '/restrictions').once('value');
        const restrictions = restrictionsSnapshot.val() || {};

        // Generate assignments
        const assignments = generateValidAssignments(participants, restrictions);

        if (!assignments) {
            showNotification('لا يمكن إجراء السحب. القيود متضاربة جداً. قلل من القيود وحاول مرة أخرى.');
            button.classList.remove('loading');
            return;
        }

        // Save assignments to Firebase
        await db.ref('sessions/' + currentSession + '/assignments').set(assignments);
        await db.ref('sessions/' + currentSession + '/status').set('drawing');

        showNotification('تم بدء السحب! يمكن للمشاركين السحب الآن');
        button.textContent = 'تم بدء السحب';
        button.disabled = true;
    } catch (error) {
        console.error('Error starting draw:', error);
        showNotification('حدث خطأ في بدء السحب');
    }

    button.classList.remove('loading');
}

function generateValidAssignments(participants, restrictions) {
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const assignments = {};
        const available = [...participants];
        let success = true;

        for (const giver of participants) {
            // Get valid receivers (not self, not in restrictions, still available)
            const giverRestrictions = restrictions[giver] || [];
            const validReceivers = available.filter(receiver =>
                receiver !== giver && !giverRestrictions.includes(receiver)
            );

            if (validReceivers.length === 0) {
                success = false;
                break;
            }

            // Pick random valid receiver
            const receiver = validReceivers[Math.floor(Math.random() * validReceivers.length)];
            assignments[giver] = receiver;

            // Remove receiver from available pool
            const index = available.indexOf(receiver);
            available.splice(index, 1);
        }

        if (success) {
            return assignments;
        }
    }

    return null; // Failed to generate valid assignments
}

async function resetSession() {
    if (!confirm('هل أنت متأكد من إعادة تعيين الجلسة؟ سيتم حذف جميع السحوبات.')) {
        return;
    }

    try {
        // Reset all participants' hasDrawn status
        const updates = {};
        Object.keys(participantsData).forEach(id => {
            updates[`participants/${id}/hasDrawn`] = false;
        });

        // Reset status and clear assignments
        updates['status'] = 'setup';
        updates['assignments'] = {};

        await db.ref('sessions/' + currentSession).update(updates);

        document.getElementById('startDrawBtn').disabled = false;
        document.getElementById('startDrawBtn').textContent = 'بدء السحب';

        showNotification('تم إعادة التعيين بنجاح');
    } catch (error) {
        console.error('Error resetting session:', error);
    }
}

// ============================================
// PARTICIPANT VIEW
// ============================================

function initializeParticipantView() {
    hideAllSections();
    document.getElementById('participantSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = '<span class="role-badge participant"></span> مشارك';
    document.getElementById('participantNameLabel').textContent = currentUserName;

    // Setup Firebase listeners
    listenToSessionStatus();
}

function listenToSessionStatus() {
    db.ref('sessions/' + currentSession).on('value', (snapshot) => {
        const sessionData = snapshot.val();
        if (!sessionData) return;

        const participantId = localStorage.getItem('participantId');
        const participantData = sessionData.participants[participantId];

        if (!participantData) return;

        // Update UI based on state
        updateParticipantState(sessionData.status, participantData);

        // Update participants browser list
        updateWaitingParticipantsList(sessionData.participants, participantId);
    });
}

function updateWaitingParticipantsList(participants, currentParticipantId) {
    const list = document.getElementById('waitingParticipantsList');
    if (!list) return;

    list.innerHTML = '';

    const otherParticipants = Object.entries(participants || {})
        .filter(([id, _]) => id !== currentParticipantId);

    if (otherParticipants.length === 0) {
        list.innerHTML = '<li class="empty-item">لا يوجد مشاركون آخرون حتى الآن</li>';
        return;
    }

    otherParticipants.forEach(([id, data]) => {
        const li = document.createElement('li');
        li.className = 'waiting-participant-item';

        let statusClass = 'active';
        if (data.isExcluded) {
            statusClass = 'excluded';
        } else if (data.hasDrawn) {
            statusClass = 'drawn';
        }

        li.innerHTML = `
            <span class="participant-icon ${statusClass}"></span>
            <span class="participant-name">${data.name}</span>
        `;
        list.appendChild(li);
    });
}

function updateParticipantState(sessionStatus, participantData) {
    const waitingState = document.getElementById('waitingState');
    const excludedState = document.getElementById('excludedState');
    const readyState = document.getElementById('readyState');
    const resultState = document.getElementById('resultState');

    // Hide all states
    waitingState.style.display = 'none';
    excludedState.style.display = 'none';
    readyState.style.display = 'none';
    resultState.style.display = 'none';

    if (participantData.hasDrawn) {
        // Already drawn - show result
        resultState.style.display = 'block';
        displayParticipantResult();
    } else if (participantData.isExcluded) {
        // Excluded
        excludedState.style.display = 'block';
    } else if (sessionStatus === 'drawing') {
        // Ready to draw
        readyState.style.display = 'block';
    } else {
        // Waiting for organizer
        waitingState.style.display = 'block';
    }
}

async function drawAsParticipant() {
    try {
        const participantId = localStorage.getItem('participantId');

        // Get assignment
        const assignmentSnapshot = await db.ref('sessions/' + currentSession + '/assignments/' + currentUserName).once('value');
        const assignedName = assignmentSnapshot.val();

        if (!assignedName) {
            showNotification('حدث خطأ. حاول مرة أخرى');
            return;
        }

        // Mark as drawn
        await db.ref('sessions/' + currentSession + '/participants/' + participantId + '/hasDrawn').set(true);

        // Display result with animation
        const resultDisplay = document.getElementById('participantResultDisplay');
        resultDisplay.innerHTML = '<div style="padding: 3rem; color: var(--text-light);">جاري الكشف...</div>';

        setTimeout(() => {
            resultDisplay.innerHTML = `
                <div class="your-name">${currentUserName}</div>
                <div class="arrow">⇩</div>
                <div class="assigned-name">${assignedName}</div>
            `;
            createConfetti();
        }, 800);

        // Hide ready state, show result state
        document.getElementById('readyState').style.display = 'none';
        document.getElementById('resultState').style.display = 'block';
    } catch (error) {
        console.error('Error drawing:', error);
        showNotification('حدث خطأ في السحب');
    }
}

async function displayParticipantResult() {
    try {
        const assignmentSnapshot = await db.ref('sessions/' + currentSession + '/assignments/' + currentUserName).once('value');
        const assignedName = assignmentSnapshot.val();

        if (assignedName) {
            document.getElementById('participantResultDisplay').innerHTML = `
                <div class="your-name">${currentUserName}</div>
                <div class="arrow">⇩</div>
                <div class="assigned-name">${assignedName}</div>
            `;
        }
    } catch (error) {
        console.error('Error displaying result:', error);
    }
}

function copyResult() {
    const resultDisplay = document.getElementById('participantResultDisplay');
    const yourName = resultDisplay.querySelector('.your-name')?.textContent;
    const assignedName = resultDisplay.querySelector('.assigned-name')?.textContent;

    if (!yourName || !assignedName) return;

    const text = `${yourName} ← ${assignedName}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('تم نسخ النتيجة ✓');
        }).catch(() => {
            fallbackCopyText(text);
        });
    } else {
        fallbackCopyText(text);
    }
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showNotification('تم نسخ النتيجة ✓');
    } catch (err) {
        showNotification('تعذر نسخ النتيجة');
    }

    document.body.removeChild(textarea);
}

// ============================================
// ADMIN CONTROLS
// ============================================

// Toggle registration open/closed
async function toggleRegistration() {
    try {
        const snapshot = await db.ref('sessions/' + currentSession + '/registrationClosed').once('value');
        const isClosed = snapshot.val() || false;

        await db.ref('sessions/' + currentSession + '/registrationClosed').set(!isClosed);

        updateRegistrationUI(!isClosed);
        showNotification(isClosed ? 'تم فتح التسجيل' : 'تم إغلاق التسجيل');
    } catch (error) {
        console.error('Error toggling registration:', error);
        showNotification('حدث خطأ');
    }
}

function updateRegistrationUI(isClosed) {
    const btn = document.getElementById('registrationToggleBtn');
    const status = document.getElementById('registrationStatus');

    if (isClosed) {
        btn.textContent = t('openRegistration');
        btn.classList.add('closed');
        status.textContent = t('registrationClosed');
        status.classList.add('closed');
    } else {
        btn.textContent = t('closeRegistration');
        btn.classList.remove('closed');
        status.textContent = t('registrationOpen');
        status.classList.remove('closed');
    }
}

// Add participant manually
async function addParticipantManually() {
    const nameInput = document.getElementById('manualParticipantName');
    const name = nameInput.value.trim();

    if (!name) {
        showNotification('الرجاء إدخال اسم');
        return;
    }

    // Check for duplicate names
    const existingNames = Object.values(participantsData).map(p => p.name);
    if (existingNames.includes(name)) {
        showNotification('هذا الاسم موجود بالفعل');
        return;
    }

    try {
        const participantId = 'participant_' + Date.now();
        await db.ref('sessions/' + currentSession + '/participants/' + participantId).set({
            name: name,
            hasDrawn: false,
            isExcluded: false,
            addedManually: true,
            joinedAt: Date.now()
        });

        nameInput.value = '';
        showNotification('تمت إضافة ' + name);
    } catch (error) {
        console.error('Error adding participant:', error);
        showNotification('حدث خطأ في الإضافة');
    }
}

// Show all assignments (with confirmation)
function showAllAssignments() {
    const confirmMsg = adminLanguage === 'en'
        ? 'Are you sure? All results will be displayed.'
        : 'هل أنت متأكد؟ سيتم عرض جميع النتائج';
    if (!confirm(confirmMsg)) {
        return;
    }

    displayAllAssignments();
}

async function displayAllAssignments() {
    const container = document.getElementById('assignmentsList');
    const loadingMsg = adminLanguage === 'en' ? 'Loading...' : 'جاري التحميل...';
    container.innerHTML = `<div class="empty-message">${loadingMsg}</div>`;

    // Show container immediately with loading state
    document.getElementById('allAssignmentsContainer').style.display = 'block';
    document.getElementById('showResultsBtn').style.display = 'none';
    document.getElementById('individualAssignmentsContainer').style.display = 'none';

    try {
        // Use global data or fetch fresh
        const assignments = Object.keys(assignmentsData).length > 0
            ? assignmentsData
            : (await db.ref('sessions/' + currentSession + '/assignments').once('value')).val();

        if (!assignments || Object.keys(assignments).length === 0) {
            const noResultsMsg = adminLanguage === 'en' ? 'No results yet' : 'لا توجد نتائج بعد';
            showNotification(noResultsMsg);
            hideAllAssignments();
            return;
        }

        container.innerHTML = '';

        Object.entries(assignments).forEach(([giver, receiver]) => {
            const item = document.createElement('div');
            item.className = 'assignment-item';
            item.innerHTML = `
                <span class="giver-name">${giver}</span>
                <span class="assignment-arrow">→</span>
                <span class="receiver-name">${receiver}</span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error displaying assignments:', error);
        const errorMsg = adminLanguage === 'en' ? 'Error loading results' : 'حدث خطأ في عرض النتائج';
        showNotification(errorMsg);
        hideAllAssignments();
    }
}

function hideAllAssignments() {
    document.getElementById('allAssignmentsContainer').style.display = 'none';
    document.getElementById('showResultsBtn').style.display = 'inline-block';
    document.getElementById('individualAssignmentsContainer').style.display = 'block';
    loadIndividualAssignments();
}

// Individual assignment reveal for admin
async function loadIndividualAssignments() {
    try {
        // Use global assignmentsData (updated by Firebase listener) or fetch if empty
        if (Object.keys(assignmentsData).length === 0) {
            const snapshot = await db.ref('sessions/' + currentSession + '/assignments').once('value');
            assignmentsData = snapshot.val() || {};
        }

        if (Object.keys(assignmentsData).length === 0) {
            return;
        }

        const container = document.getElementById('individualAssignmentsContainer');

        // Save revealed states before clearing
        const revealedGivers = new Set();
        container.querySelectorAll('.individual-assignment-item.revealed').forEach(item => {
            revealedGivers.add(item.dataset.giver);
        });

        container.innerHTML = '';

        Object.entries(assignmentsData).forEach(([giver, receiver], index) => {
            const item = document.createElement('div');
            item.className = 'individual-assignment-item';
            item.id = `individual-assignment-${index}`;
            item.dataset.giver = giver;

            // Check if this was previously revealed
            if (revealedGivers.has(giver)) {
                item.classList.add('revealed');
                item.innerHTML = `
                    <div class="individual-giver">${giver}</div>
                    <div class="individual-arrow">→</div>
                    <div class="individual-receiver">${receiver}</div>
                    <button onclick="hideIndividualAssignment(this)" class="vintage-button small secondary">
                        ${t('hide')}
                    </button>
                `;
            } else {
                item.innerHTML = `
                    <div class="individual-giver">${giver}</div>
                    <div class="individual-hidden">
                        <button onclick="revealIndividualAssignment(this)" class="vintage-button small">
                            ${t('reveal')}
                        </button>
                    </div>
                `;
            }
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading individual assignments:', error);
    }
}

function revealIndividualAssignment(button) {
    const item = button.closest('.individual-assignment-item');
    const giver = item.dataset.giver;
    const receiver = assignmentsData[giver];

    if (!receiver) {
        showNotification(adminLanguage === 'en' ? 'Assignment not found' : 'لم يتم العثور على النتيجة');
        return;
    }

    const confirmMsg = adminLanguage === 'en' ? `Reveal ${giver}'s result?` : `هل تريد كشف نتيجة ${giver}؟`;
    if (!confirm(confirmMsg)) {
        return;
    }

    item.innerHTML = `
        <div class="individual-giver">${giver}</div>
        <div class="individual-arrow">→</div>
        <div class="individual-receiver">${receiver}</div>
        <button onclick="hideIndividualAssignment(this)" class="vintage-button small secondary">
            ${t('hide')}
        </button>
    `;
    item.classList.add('revealed');
}

function hideIndividualAssignment(button) {
    const item = button.closest('.individual-assignment-item');
    const giver = item.dataset.giver;

    item.innerHTML = `
        <div class="individual-giver">${giver}</div>
        <div class="individual-hidden">
            <button onclick="revealIndividualAssignment(this)" class="vintage-button small">
                ${t('reveal')}
            </button>
        </div>
    `;
    item.classList.remove('revealed');
}

// Delete session
async function deleteSession() {
    const sessionSnapshot = await db.ref('sessions/' + currentSession + '/name').once('value');
    const sessionName = sessionSnapshot.val() || 'هذه الجلسة';

    if (!confirm(`هل أنت متأكد من حذف "${sessionName}"؟\n\nسيتم حذف جميع البيانات نهائياً ولا يمكن التراجع.`)) {
        return;
    }

    // Double confirmation for safety
    if (!confirm('تأكيد نهائي: سيتم حذف الجلسة وجميع بياناتها. متابعة؟')) {
        return;
    }

    try {
        await db.ref('sessions/' + currentSession).remove();

        // Clear localStorage
        localStorage.removeItem('currentSession');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('adminKey');
        localStorage.removeItem('currentUserName');
        localStorage.removeItem('participantId');

        showNotification('تم حذف الجلسة');

        // Redirect to landing/admin page
        setTimeout(() => {
            window.location.href = getBaseUrl() + '?role=admin';
        }, 1000);
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification('حدث خطأ في حذف الجلسة');
    }
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

let isAdminAuthenticated = false;

// Check if admin password is set up
async function checkAdminSetup() {
    try {
        const snapshot = await db.ref('admin/passwordHash').once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking admin setup:', error);
        return false;
    }
}

// Show admin login page
async function showAdminLogin() {
    hideAllSections();
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = '';

    // Apply translations
    applyAdminTranslations();

    // Check if password is already set up
    const isSetup = await checkAdminSetup();
    if (!isSetup) {
        document.getElementById('adminSetupPrompt').style.display = 'block';
    } else {
        document.getElementById('adminSetupPrompt').style.display = 'none';
    }

    // Check if already authenticated in this session
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        isAdminAuthenticated = true;
        showAdminDashboard();
    }
}

// Setup initial admin password
async function setupAdminPassword() {
    const password = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('confirmAdminPassword').value;

    if (!password || password.length < 4) {
        showNotification('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('كلمات المرور غير متطابقة');
        return;
    }

    try {
        const passwordHash = await hashPassword(password);
        await db.ref('admin/passwordHash').set(passwordHash);

        showNotification('تم إنشاء كلمة المرور بنجاح!');

        // Auto-login after setup
        isAdminAuthenticated = true;
        sessionStorage.setItem('adminAuthenticated', 'true');
        showAdminDashboard();
    } catch (error) {
        console.error('Error setting up password:', error);
        showNotification('حدث خطأ في إنشاء كلمة المرور');
    }
}

// Admin login
async function adminLogin() {
    const password = document.getElementById('adminPassword').value;

    if (!password) {
        showNotification('الرجاء إدخال كلمة المرور');
        return;
    }

    try {
        const passwordHash = await hashPassword(password);
        const snapshot = await db.ref('admin/passwordHash').once('value');
        const storedHash = snapshot.val();

        if (passwordHash === storedHash) {
            isAdminAuthenticated = true;
            sessionStorage.setItem('adminAuthenticated', 'true');
            document.getElementById('adminPassword').value = '';
            showAdminDashboard();
        } else {
            showNotification('كلمة المرور غير صحيحة');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showNotification('حدث خطأ في تسجيل الدخول');
    }
}

// Admin logout
function adminLogout() {
    isAdminAuthenticated = false;
    sessionStorage.removeItem('adminAuthenticated');
    showAdminLogin();
    showNotification('تم تسجيل الخروج');
}

// Change admin password
async function changeAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordChange').value;
    const confirmPassword = document.getElementById('confirmPasswordChange').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        const msg = adminLanguage === 'en' ? 'Please fill in all fields' : 'الرجاء ملء جميع الحقول';
        showNotification(msg);
        return;
    }

    if (newPassword.length < 4) {
        const msg = adminLanguage === 'en' ? 'Password must be at least 4 characters' : 'كلمة المرور يجب أن تكون 4 أحرف على الأقل';
        showNotification(msg);
        return;
    }

    if (newPassword !== confirmPassword) {
        const msg = adminLanguage === 'en' ? 'New passwords do not match' : 'كلمات المرور الجديدة غير متطابقة';
        showNotification(msg);
        return;
    }

    try {
        // Verify current password
        const currentHash = await hashPassword(currentPassword);
        const snapshot = await db.ref('admin/passwordHash').once('value');
        const storedHash = snapshot.val();

        if (currentHash !== storedHash) {
            const msg = adminLanguage === 'en' ? 'Current password is incorrect' : 'كلمة المرور الحالية غير صحيحة';
            showNotification(msg);
            return;
        }

        // Set new password
        const newHash = await hashPassword(newPassword);
        await db.ref('admin/passwordHash').set(newHash);

        // Clear form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPasswordChange').value = '';
        document.getElementById('confirmPasswordChange').value = '';

        const msg = adminLanguage === 'en' ? 'Password changed successfully!' : 'تم تغيير كلمة المرور بنجاح!';
        showNotification(msg);
    } catch (error) {
        console.error('Error changing password:', error);
        const msg = adminLanguage === 'en' ? 'Error changing password' : 'حدث خطأ في تغيير كلمة المرور';
        showNotification(msg);
    }
}

// ============================================
// ADMIN DASHBOARD
// ============================================

// Save admin session to Firebase (synced across devices)
async function saveAdminSession(sessionId, adminKey, sessionName) {
    try {
        await db.ref('admin/sessions/' + sessionId).set({
            id: sessionId,
            key: adminKey,
            name: sessionName,
            createdAt: Date.now()
        });
    } catch (error) {
        console.error('Error saving admin session:', error);
    }
}

// Remove admin session from Firebase
async function removeAdminSession(sessionId) {
    try {
        await db.ref('admin/sessions/' + sessionId).remove();
    } catch (error) {
        console.error('Error removing admin session:', error);
    }
}

// Show admin dashboard
function showAdminDashboard() {
    if (!isAdminAuthenticated) {
        showAdminLogin();
        return;
    }

    hideAllSections();
    document.getElementById('adminDashboardSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = '<span class="role-badge admin"></span> مدير';

    // Apply translations
    applyAdminTranslations();

    // Update URL
    window.history.pushState({}, '', getBaseUrl() + '?role=admin');

    loadAdminSessions();
}

// Load and display admin sessions from Firebase
async function loadAdminSessions() {
    const container = document.getElementById('sessionsListContainer');
    container.innerHTML = `<div class="empty-message">${t('loading')}</div>`;

    try {
        // Get admin sessions from Firebase
        const adminSessionsSnapshot = await db.ref('admin/sessions').once('value');
        const adminSessions = adminSessionsSnapshot.val() || {};

        const sessionIds = Object.keys(adminSessions);

        if (sessionIds.length === 0) {
            container.innerHTML = `<div class="empty-message">${t('noSessions')}</div>`;
            return;
        }

        // Verify sessions still exist and get updated info
        const validSessions = [];

        for (const sessionId of sessionIds) {
            const session = adminSessions[sessionId];
            try {
                const snapshot = await db.ref('sessions/' + sessionId).once('value');
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    // Verify admin key matches
                    if (data.adminKey === session.key) {
                        const participantCount = data.participants ? Object.keys(data.participants).length : 0;
                        validSessions.push({
                            ...session,
                            name: data.name,
                            status: data.status,
                            participantCount: participantCount,
                            createdAt: data.createdAt
                        });
                    }
                } else {
                    // Session no longer exists, remove from admin list
                    await db.ref('admin/sessions/' + sessionId).remove();
                }
            } catch (error) {
                console.error('Error loading session:', sessionId, error);
            }
        }

        if (validSessions.length === 0) {
            container.innerHTML = `<div class="empty-message">${t('noSessions')}</div>`;
            return;
        }

        // Sort by creation date (newest first)
        validSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Render sessions
        container.innerHTML = '';
        validSessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';

            let statusText = t('setup');
            let statusClass = 'setup';
            if (session.status === 'drawing') {
                statusText = t('drawing');
                statusClass = 'drawing';
            } else if (session.status === 'completed') {
                statusText = t('completed');
                statusClass = 'completed';
            }

            item.innerHTML = `
                <div class="session-item-info">
                    <div class="session-item-name">${session.name}</div>
                    <div class="session-item-meta">
                        <span class="session-status-badge ${statusClass}">${statusText}</span>
                        <span class="participant-count">${session.participantCount} ${t('participant')}</span>
                    </div>
                </div>
                <div class="session-item-actions">
                    <button onclick="openSession('${session.id}', '${session.key}')" class="vintage-button primary">
                        ${t('open')}
                    </button>
                    <button onclick="deleteSessionFromDashboard('${session.id}', '${session.name}')" class="vintage-button danger">
                        ${t('delete')}
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading admin sessions:', error);
        const errorText = adminLanguage === 'en' ? 'Error loading sessions' : 'حدث خطأ في تحميل الجلسات';
        container.innerHTML = `<div class="empty-message">${errorText}</div>`;
    }
}

// Open a session from the dashboard
function openSession(sessionId, adminKey) {
    currentSession = sessionId;
    currentRole = 'organizer';

    // Save to localStorage
    localStorage.setItem('currentSession', sessionId);
    localStorage.setItem('currentRole', 'organizer');
    localStorage.setItem('adminKey', adminKey);

    // Update URL
    const organizerUrl = `${getBaseUrl()}?session=${sessionId}&role=organizer&key=${adminKey}`;
    window.history.pushState({}, '', organizerUrl);

    // Load organizer name
    db.ref('sessions/' + sessionId + '/createdBy').once('value').then(snapshot => {
        currentUserName = snapshot.val();
        initializeOrganizerView();
    });
}

// Delete session from dashboard
async function deleteSessionFromDashboard(sessionId, sessionName) {
    if (!confirm(`هل أنت متأكد من حذف "${sessionName}"؟\n\nسيتم حذف جميع البيانات نهائياً.`)) {
        return;
    }

    try {
        await db.ref('sessions/' + sessionId).remove();
        removeAdminSession(sessionId);
        showNotification('تم حذف الجلسة');
        loadAdminSessions(); // Refresh the list
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification('حدث خطأ في حذف الجلسة');
    }
}

// Back to admin dashboard
function backToAdminDashboard() {
    // Detach any Firebase listeners
    if (currentSession) {
        db.ref('sessions/' + currentSession + '/participants').off();
        db.ref('sessions/' + currentSession + '/status').off();
        db.ref('sessions/' + currentSession).off();
    }

    currentSession = null;
    currentRole = null;

    showAdminDashboard();
}

// ============================================
// LINK SHARING
// ============================================

function copySessionLink() {
    const linkInput = document.getElementById('sessionLink');
    linkInput.select();
    document.execCommand('copy');
    showNotification('تم نسخ الرابط!');
}

function shareWhatsApp() {
    const link = document.getElementById('sessionLink').value;
    const text = encodeURIComponent(`انضم إلى سحب الأسماء: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareTelegram() {
    const link = document.getElementById('sessionLink').value;
    const text = encodeURIComponent(`انضم إلى سحب الأسماء: ${link}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const params = getUrlParams();
    const savedSession = localStorage.getItem('currentSession');
    const savedRole = localStorage.getItem('currentRole');

    // Check for admin creation mode (admin=true in URL)
    const isAdminCreate = params.role === 'admin';

    // Check URL parameters first
    if (params.session) {
        currentSession = params.session;

        if (params.role === 'organizer' && params.key) {
            // Verify organizer
            db.ref('sessions/' + params.session + '/adminKey').once('value').then(snapshot => {
                if (snapshot.val() === params.key) {
                    currentRole = 'organizer';
                    db.ref('sessions/' + params.session + '/createdBy').once('value').then(nameSnapshot => {
                        currentUserName = nameSnapshot.val();
                        initializeOrganizerView();
                    });
                } else {
                    showNotification('رابط منظم غير صالح');
                    backToLanding();
                }
            });
        } else {
            // Check if participant already joined this session
            const savedParticipantSession = localStorage.getItem('currentSession');
            const savedParticipantId = localStorage.getItem('participantId');
            const savedUserName = localStorage.getItem('currentUserName');

            if (savedParticipantSession === params.session && savedParticipantId && savedUserName) {
                // Verify participant still exists in Firebase
                db.ref('sessions/' + params.session + '/participants/' + savedParticipantId).once('value').then(snapshot => {
                    if (snapshot.exists() && snapshot.val().name === savedUserName) {
                        // Participant already joined - restore their session
                        currentRole = 'participant';
                        currentUserName = savedUserName;
                        initializeParticipantView();
                    } else {
                        // Participant data doesn't match - clear and show join screen
                        localStorage.removeItem('currentSession');
                        localStorage.removeItem('currentRole');
                        localStorage.removeItem('currentUserName');
                        localStorage.removeItem('participantId');
                        hideAllSections();
                        document.getElementById('landingSection').style.display = 'block';
                    }
                });
            } else {
                // New participant needs to enter name
                hideAllSections();
                document.getElementById('landingSection').style.display = 'block';
            }
        }
    } else if (isAdminCreate) {
        // Admin wants to access dashboard - show login first
        showAdminLogin();
    } else if (savedSession && savedRole) {
        // Restore from localStorage
        currentSession = savedSession;
        currentRole = savedRole;
        currentUserName = localStorage.getItem('currentUserName');

        if (currentRole === 'organizer') {
            const adminKey = localStorage.getItem('adminKey');
            const organizerUrl = `${getBaseUrl()}?session=${currentSession}&role=organizer&key=${adminKey}`;
            window.history.pushState({}, '', organizerUrl);
            initializeOrganizerView();
        } else {
            // Verify participant still exists in Firebase before restoring
            const savedParticipantId = localStorage.getItem('participantId');
            db.ref('sessions/' + savedSession + '/participants/' + savedParticipantId).once('value').then(snapshot => {
                if (snapshot.exists() && snapshot.val().name === currentUserName) {
                    const participantUrl = `${getBaseUrl()}?session=${currentSession}`;
                    window.history.pushState({}, '', participantUrl);
                    initializeParticipantView();
                } else {
                    // Session or participant no longer exists - clear localStorage
                    localStorage.removeItem('currentSession');
                    localStorage.removeItem('currentRole');
                    localStorage.removeItem('currentUserName');
                    localStorage.removeItem('participantId');
                    hideAllSections();
                    document.getElementById('landingSection').style.display = 'block';
                }
            });
        }
    } else {
        // Show landing page (participant join only)
        hideAllSections();
        document.getElementById('landingSection').style.display = 'block';
    }
});
