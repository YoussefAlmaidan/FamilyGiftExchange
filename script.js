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
// TRANSLATIONS - Loaded from texts.json
// ============================================

let translations = null;

// Load translations from external JSON file
async function loadTranslations() {
    try {
        const response = await fetch('texts.json', { cache: 'no-cache' });
        translations = await response.json();
        return true;
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to empty object if load fails
        translations = { ar: {}, en: {} };
        return false;
    }
}

// Get nested value from object using dot notation (e.g., "admin.login")
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

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
        // Re-apply registration UI and countdown
        db.ref('sessions/' + currentSession).once('value').then(snapshot => {
            const sessionData = snapshot.val();
            if (sessionData) {
                updateRegistrationUI(sessionData.registrationClosed || false);
                updateCountdownDisplay(
                    sessionData.eventDate,
                    'countdownDisplay',
                    'countdownDays',
                    'countdownLabel'
                );
            }
        });
    }

    // Re-render admin dashboard if visible
    const dashboardSection = document.getElementById('adminDashboardSection');
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        loadAdminSessions();
    }
}

function applyAdminTranslations() {
    if (!translations) return;

    const langData = translations[adminLanguage];
    if (!langData) return;

    // Update language toggle buttons
    const langToggleText = getNestedValue(langData, 'admin.langToggle');
    const langBtns = ['langToggleBtn', 'langToggleBtnDash', 'langToggleBtnOrg'];
    langBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn && langToggleText) btn.textContent = langToggleText;
    });

    // Update all elements with data-i18n attribute (supports nested keys like "admin.login")
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = getNestedValue(langData, key);
        if (value) {
            el.textContent = value;
        }
    });

    // Update placeholders (supports nested keys)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const value = getNestedValue(langData, key);
        if (value) {
            el.placeholder = value;
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

// Translation helper function - supports nested keys like "admin.login" and replacements like {name}
function t(key, replacements = {}) {
    if (!translations) return key;

    let text = getNestedValue(translations[adminLanguage], key);
    if (!text) return key;

    Object.keys(replacements).forEach(k => {
        text = text.replace(`{${k}}`, replacements[k]);
    });
    return text;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Countdown Timer Functions
function calculateDaysRemaining(eventDate) {
    if (!eventDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const diffTime = event - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function updateCountdownDisplay(eventDate, displayId, daysId, labelId) {
    const display = document.getElementById(displayId);
    const setDateBtn = document.getElementById('setDateBtn');

    if (!eventDate || !display) {
        if (display) display.style.display = 'none';
        // Show "Set Date" button if no date and we're in organizer view
        if (setDateBtn && displayId === 'countdownDisplay') {
            setDateBtn.style.display = 'inline-block';
        }
        return;
    }

    // Hide "Set Date" button since we have a date
    if (setDateBtn && displayId === 'countdownDisplay') {
        setDateBtn.style.display = 'none';
    }

    const days = calculateDaysRemaining(eventDate);
    const daysElement = document.getElementById(daysId);
    const labelElement = document.getElementById(labelId);

    if (!daysElement || !labelElement) return;

    if (days < 0) {
        daysElement.textContent = '0';
        labelElement.textContent = t('countdown.eventPassed');
    } else if (days === 0) {
        daysElement.textContent = t('countdown.today');
        daysElement.style.fontSize = '2rem';
        labelElement.textContent = '';
    } else if (days === 1) {
        daysElement.textContent = '1';
        labelElement.textContent = t('countdown.dayRemaining');
    } else {
        daysElement.textContent = days;
        daysElement.style.fontSize = '';
        labelElement.textContent = t('countdown.daysRemaining');
    }
    display.style.display = 'flex';
}

function updateParticipantCountdown(eventDate) {
    const display = document.getElementById('participantCountdown');
    if (!eventDate || !display) {
        if (display) display.style.display = 'none';
        return;
    }

    const days = calculateDaysRemaining(eventDate);
    const daysElement = document.getElementById('participantCountdownDays');
    const labelElement = document.getElementById('participantCountdownLabel');

    if (!daysElement || !labelElement) return;

    if (days < 0) {
        daysElement.textContent = '0';
        labelElement.textContent = t('countdown.eventPassed');
    } else if (days === 0) {
        daysElement.textContent = t('countdown.today');
        daysElement.style.fontSize = '2rem';
        labelElement.textContent = '';
    } else if (days === 1) {
        daysElement.textContent = '1';
        labelElement.textContent = t('countdown.dayRemaining');
    } else {
        daysElement.textContent = days;
        daysElement.style.fontSize = '';
        labelElement.textContent = t('countdown.daysRemaining');
    }
    display.style.display = 'flex';
}

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
    const eventDate = document.getElementById('eventDate').value; // Optional

    if (!sessionName || !organizerName) {
        showNotification(t('notifications.fillAllFields'));
        return;
    }

    const sessionId = generateSessionId();
    const adminKey = generateAdminKey();

    const sessionData = {
        name: sessionName,
        status: 'setup',
        createdBy: organizerName,
        createdAt: Date.now(),
        adminKey: adminKey,
        participants: {},
        assignments: {},
        restrictions: {}
    };

    // Only add eventDate if provided
    if (eventDate) {
        sessionData.eventDate = eventDate;
    }

    try {
        await db.ref('sessions/' + sessionId).set(sessionData);

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
        showNotification(t('notifications.sessionCreated'));
    } catch (error) {
        console.error('Error creating session:', error);
        showNotification(t('notifications.errorCreatingSession'));
    }
}

async function joinSession(sessionId, userName) {
    if (!userName) {
        showNotification(t('notifications.enterName'));
        return;
    }

    try {
        // Check if session exists
        const sessionSnapshot = await db.ref('sessions/' + sessionId).once('value');
        if (!sessionSnapshot.exists()) {
            showNotification(t('notifications.sessionNotFound'));
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
            showNotification(t('notifications.welcomeBack'));
            return;
        }

        // Check if registration is closed (only for new participants)
        if (sessionData.registrationClosed) {
            showNotification(t('notifications.registrationClosed'));
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
        showNotification(t('notifications.joinedSuccessfully'));
    } catch (error) {
        console.error('Error joining session:', error);
        showNotification(t('notifications.errorJoining'));
    }
}

function joinFromLanding() {
    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const params = getUrlParams();

    if (!firstName || !middleName) {
        showNotification(t('notifications.enterFirstAndMiddleName'));
        return;
    }

    if (!params.session) {
        showNotification(t('notifications.invalidSessionLink'));
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
    document.getElementById('roleIndicator').innerHTML = `<span class="role-badge organizer"></span> ${t('header.roleOrganizer')}`;

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

        // Update countdown display
        updateCountdownDisplay(
            sessionData.eventDate,
            'countdownDisplay',
            'countdownDays',
            'countdownLabel'
        );

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
        list.innerHTML = `<div class="empty-message">${t('organizer.noParticipantsYet')}</div>`;
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
                    ${data.isExcluded ? t('organizer.include') : t('organizer.exclude')}
                </button>
                <button class="remove-btn" onclick="removeParticipant('${id}')">${t('admin.delete')}</button>
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
        container.innerHTML = `<p class="help-text">${t('organizer.addParticipantsFirst')}</p>`;
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

        restrictionBox.innerHTML = `
            <div class="restriction-header">${t('organizer.cannotDraw', { name: data.name })}</div>
            <div class="restriction-options" id="restrictions-${data.name}">
                ${checkboxes || `<span class="no-options">${t('organizer.noOptions')}</span>`}
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

        showNotification(participant.isExcluded ? t('notifications.included') : t('notifications.excluded'));
    } catch (error) {
        console.error('Error toggling exclusion:', error);
    }
}

async function removeParticipant(participantId) {
    if (!confirm(t('confirmations.deleteParticipant'))) return;

    try {
        await db.ref('sessions/' + currentSession + '/participants/' + participantId).remove();
        showNotification(t('notifications.deleted'));
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

    document.getElementById('organizerProgressText').textContent = t('organizer.drewCount', { drawn: drawnCount, total: total });
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
            showNotification(t('notifications.needMinimum3'));
            button.classList.remove('loading');
            return;
        }

        // Load restrictions from Firebase
        const restrictionsSnapshot = await db.ref('sessions/' + currentSession + '/restrictions').once('value');
        const restrictions = restrictionsSnapshot.val() || {};

        // Generate assignments
        const assignments = generateValidAssignments(participants, restrictions);

        if (!assignments) {
            showNotification(t('notifications.cannotDraw'));
            button.classList.remove('loading');
            return;
        }

        // Save assignments to Firebase
        await db.ref('sessions/' + currentSession + '/assignments').set(assignments);
        await db.ref('sessions/' + currentSession + '/status').set('drawing');

        showNotification(t('notifications.drawStarted'));
        button.textContent = t('organizer.drawStarted');
        button.disabled = true;
    } catch (error) {
        console.error('Error starting draw:', error);
        showNotification(t('notifications.errorStartingDraw'));
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
    if (!confirm(t('confirmations.resetSession'))) {
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
        document.getElementById('startDrawBtn').textContent = t('organizer.startDraw');

        showNotification(t('notifications.resetSuccessful'));
    } catch (error) {
        console.error('Error resetting session:', error);
    }
}

async function editEventDate() {
    // Create a simple date picker dialog
    const currentDate = await db.ref('sessions/' + currentSession + '/eventDate').once('value');
    const existingDate = currentDate.val() || '';

    const newDate = prompt(t('countdown.enterDate'), existingDate);

    if (newDate === null) return; // Cancelled

    // Validate date format if not empty
    if (newDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        showNotification(t('notifications.invalidDateFormat'));
        return;
    }

    try {
        if (newDate) {
            await db.ref('sessions/' + currentSession + '/eventDate').set(newDate);
        } else {
            await db.ref('sessions/' + currentSession + '/eventDate').remove();
        }

        // Update the countdown display
        updateCountdownDisplay(
            newDate || null,
            'countdownDisplay',
            'countdownDays',
            'countdownLabel'
        );

        showNotification(t('notifications.eventDateUpdated'));
    } catch (error) {
        console.error('Error updating event date:', error);
        showNotification(t('notifications.errorUpdatingDate'));
    }
}

// ============================================
// PARTICIPANT VIEW
// ============================================

function initializeParticipantView() {
    hideAllSections();
    document.getElementById('participantSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = `<span class="role-badge participant"></span> ${t('header.roleParticipant')}`;
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

        // Update countdown display for participant
        updateParticipantCountdown(sessionData.eventDate);

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
        list.innerHTML = `<li class="empty-item">${t('participant.noOtherParticipants')}</li>`;
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
            showNotification(t('notifications.errorOccurred'));
            return;
        }

        // Mark as drawn
        await db.ref('sessions/' + currentSession + '/participants/' + participantId + '/hasDrawn').set(true);

        // Display result with animation
        const resultDisplay = document.getElementById('participantResultDisplay');
        resultDisplay.innerHTML = `<div style="padding: 3rem; color: var(--text-light);">${t('participant.revealing')}</div>`;

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
        showNotification(t('notifications.errorDrawing'));
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
            showNotification(t('notifications.resultCopied'));
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
        showNotification(t('notifications.resultCopied'));
    } catch (err) {
        showNotification(t('notifications.copyFailed'));
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
        showNotification(isClosed ? t('notifications.registrationOpened') : t('notifications.registrationClosedMsg'));
    } catch (error) {
        console.error('Error toggling registration:', error);
        showNotification(t('notifications.error'));
    }
}

function updateRegistrationUI(isClosed) {
    const btn = document.getElementById('registrationToggleBtn');
    const status = document.getElementById('registrationStatus');

    if (isClosed) {
        btn.textContent = t('organizer.openRegistration');
        btn.classList.add('closed');
        status.textContent = t('organizer.registrationClosed');
        status.classList.add('closed');
    } else {
        btn.textContent = t('organizer.closeRegistration');
        btn.classList.remove('closed');
        status.textContent = t('organizer.registrationOpen');
        status.classList.remove('closed');
    }
}

// Add participant manually
async function addParticipantManually() {
    const nameInput = document.getElementById('manualParticipantName');
    const name = nameInput.value.trim();

    if (!name) {
        showNotification(t('notifications.enterNamePlease'));
        return;
    }

    // Check for duplicate names
    const existingNames = Object.values(participantsData).map(p => p.name);
    if (existingNames.includes(name)) {
        showNotification(t('notifications.nameAlreadyExists'));
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
        showNotification(t('notifications.addedName', { name }));
    } catch (error) {
        console.error('Error adding participant:', error);
        showNotification(t('notifications.errorAdding'));
    }
}

// Show all assignments (with confirmation)
function showAllAssignments() {
    if (!confirm(t('confirmations.showAllResults'))) {
        return;
    }

    displayAllAssignments();
}

async function displayAllAssignments() {
    const container = document.getElementById('assignmentsList');
    container.innerHTML = `<div class="empty-message">${t('admin.loading')}</div>`;

    // Show container immediately with loading state
    document.getElementById('allAssignmentsContainer').style.display = 'block';
    document.getElementById('showResultsBtn').style.display = 'none';
    document.getElementById('individualAssignmentsContainer').style.display = 'none';

    try {
        // Always fetch fresh data from Firebase to ensure consistency
        const snapshot = await db.ref('sessions/' + currentSession + '/assignments').once('value');
        const assignments = snapshot.val();

        // Update global cache
        assignmentsData = assignments || {};

        if (!assignments || Object.keys(assignments).length === 0) {
            showNotification(t('notifications.noResultsYet'));
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
        showNotification(t('notifications.errorDisplayingResults'));
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
        // Always fetch fresh data from Firebase to ensure consistency
        const snapshot = await db.ref('sessions/' + currentSession + '/assignments').once('value');
        assignmentsData = snapshot.val() || {};

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
                        ${t('organizer.hide')}
                    </button>
                `;
            } else {
                item.innerHTML = `
                    <div class="individual-giver">${giver}</div>
                    <div class="individual-hidden">
                        <button onclick="revealIndividualAssignment(this)" class="vintage-button small">
                            ${t('organizer.reveal')}
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
        showNotification(t('notifications.assignmentNotFound'));
        return;
    }

    if (!confirm(t('confirmations.revealResult', { name: giver }))) {
        return;
    }

    item.innerHTML = `
        <div class="individual-giver">${giver}</div>
        <div class="individual-arrow">→</div>
        <div class="individual-receiver">${receiver}</div>
        <button onclick="hideIndividualAssignment(this)" class="vintage-button small secondary">
            ${t('organizer.hide')}
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
                ${t('organizer.reveal')}
            </button>
        </div>
    `;
    item.classList.remove('revealed');
}

// Delete session
async function deleteSession() {
    const sessionSnapshot = await db.ref('sessions/' + currentSession + '/name').once('value');
    const sessionName = sessionSnapshot.val() || '';

    if (!confirm(t('confirmations.deleteSession', { name: sessionName }))) {
        return;
    }

    // Double confirmation for safety
    if (!confirm(t('confirmations.finalConfirmDelete'))) {
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

        showNotification(t('notifications.sessionDeleted'));

        // Redirect to landing/admin page
        setTimeout(() => {
            window.location.href = getBaseUrl() + '?role=admin';
        }, 1000);
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification(t('notifications.errorDeletingSession'));
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
        showNotification(t('notifications.passwordMin4'));
        return;
    }

    if (password !== confirmPassword) {
        showNotification(t('notifications.passwordsNotMatch'));
        return;
    }

    try {
        const passwordHash = await hashPassword(password);
        await db.ref('admin/passwordHash').set(passwordHash);

        showNotification(t('notifications.passwordCreated'));

        // Auto-login after setup
        isAdminAuthenticated = true;
        sessionStorage.setItem('adminAuthenticated', 'true');
        showAdminDashboard();
    } catch (error) {
        console.error('Error setting up password:', error);
        showNotification(t('notifications.errorCreatingPassword'));
    }
}

// Admin login
async function adminLogin() {
    const password = document.getElementById('adminPassword').value;

    if (!password) {
        showNotification(t('notifications.enterPasswordPlease'));
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
            showNotification(t('notifications.incorrectPassword'));
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showNotification(t('notifications.errorLoggingIn'));
    }
}

// Admin logout
function adminLogout() {
    isAdminAuthenticated = false;
    sessionStorage.removeItem('adminAuthenticated');
    showAdminLogin();
    showNotification(t('notifications.loggedOut'));
}

// Change admin password
async function changeAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordChange').value;
    const confirmPassword = document.getElementById('confirmPasswordChange').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification(t('notifications.fillAllFields'));
        return;
    }

    if (newPassword.length < 4) {
        showNotification(t('notifications.passwordMin4'));
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification(t('notifications.newPasswordsNotMatch'));
        return;
    }

    try {
        // Verify current password
        const currentHash = await hashPassword(currentPassword);
        const snapshot = await db.ref('admin/passwordHash').once('value');
        const storedHash = snapshot.val();

        if (currentHash !== storedHash) {
            showNotification(t('notifications.currentPasswordIncorrect'));
            return;
        }

        // Set new password
        const newHash = await hashPassword(newPassword);
        await db.ref('admin/passwordHash').set(newHash);

        // Clear form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPasswordChange').value = '';
        document.getElementById('confirmPasswordChange').value = '';

        showNotification(t('notifications.passwordChanged'));
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification(t('notifications.errorChangingPassword'));
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
    document.getElementById('roleIndicator').innerHTML = `<span class="role-badge admin"></span> ${t('header.roleAdmin')}`;

    // Apply translations
    applyAdminTranslations();

    // Update URL
    window.history.pushState({}, '', getBaseUrl() + '?role=admin');

    loadAdminSessions();
}

// Load and display admin sessions from Firebase
async function loadAdminSessions() {
    const container = document.getElementById('sessionsListContainer');
    container.innerHTML = `<div class="empty-message">${t('admin.loading')}</div>`;

    try {
        // Get admin sessions from Firebase
        const adminSessionsSnapshot = await db.ref('admin/sessions').once('value');
        const adminSessions = adminSessionsSnapshot.val() || {};

        const sessionIds = Object.keys(adminSessions);

        if (sessionIds.length === 0) {
            container.innerHTML = `<div class="empty-message">${t('admin.noSessions')}</div>`;
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
            container.innerHTML = `<div class="empty-message">${t('admin.noSessions')}</div>`;
            return;
        }

        // Sort by creation date (newest first)
        validSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Render sessions
        container.innerHTML = '';
        validSessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';

            let statusText = t('admin.statusSetup');
            let statusClass = 'setup';
            if (session.status === 'drawing') {
                statusText = t('admin.statusDrawing');
                statusClass = 'drawing';
            } else if (session.status === 'completed') {
                statusText = t('admin.statusCompleted');
                statusClass = 'completed';
            }

            item.innerHTML = `
                <div class="session-item-info">
                    <div class="session-item-name">${session.name}</div>
                    <div class="session-item-meta">
                        <span class="session-status-badge ${statusClass}">${statusText}</span>
                        <span class="participant-count">${session.participantCount} ${t('admin.participant')}</span>
                    </div>
                </div>
                <div class="session-item-actions">
                    <button onclick="openSession('${session.id}', '${session.key}')" class="vintage-button primary">
                        ${t('admin.open')}
                    </button>
                    <button onclick="deleteSessionFromDashboard('${session.id}', '${session.name}')" class="vintage-button danger">
                        ${t('admin.delete')}
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading admin sessions:', error);
        container.innerHTML = `<div class="empty-message">${t('notifications.errorLoadingSessions')}</div>`;
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
    if (!confirm(t('confirmations.deleteFromDashboard', { name: sessionName }))) {
        return;
    }

    try {
        await db.ref('sessions/' + sessionId).remove();
        removeAdminSession(sessionId);
        showNotification(t('notifications.sessionDeleted'));
        loadAdminSessions(); // Refresh the list
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification(t('notifications.errorDeletingSession'));
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
    showNotification(t('notifications.linkCopied'));
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

document.addEventListener('DOMContentLoaded', async function() {
    // Load translations first
    await loadTranslations();

    // Apply initial translations to static HTML elements
    applyAdminTranslations();

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
                    showNotification(t('notifications.invalidOrganizerLink'));
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
