// Multi-User Secret Santa Application with Firebase

// Global State
let currentSession = null;
let currentRole = null; // 'organizer' or 'participant'
let currentUserName = null;
let participantsData = {};
let restrictionsData = {};

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
    const colors = ['#D4AF37', '#B8860B', '#8B0000', '#F5E6D3'];
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
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function generateAdminKey() {
    return Math.random().toString(36).substr(2, 15);
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        session: params.get('session'),
        role: params.get('role'),
        key: params.get('key')
    };
}

function hideAllSections() {
    document.getElementById('landingSection').style.display = 'none';
    document.getElementById('createSessionSection').style.display = 'none';
    document.getElementById('organizerSection').style.display = 'none';
    document.getElementById('participantSection').style.display = 'none';
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

        // Update URL
        const organizerUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}&role=organizer&key=${adminKey}`;
        window.history.pushState({}, '', organizerUrl);

        currentSession = sessionId;
        currentRole = 'organizer';
        currentUserName = organizerName;

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

        // Check for duplicate names
        const participants = sessionSnapshot.val().participants || {};
        const existingNames = Object.values(participants).map(p => p.name);

        if (existingNames.includes(userName)) {
            showNotification('هذا الاسم موجود بالفعل. الرجاء اختيار اسم آخر');
            return;
        }

        // Add participant
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
    const userName = document.getElementById('joinName').value.trim();
    const params = getUrlParams();

    if (!params.session) {
        showNotification('رابط الجلسة غير صحيح');
        return;
    }

    joinSession(params.session, userName);
}

// ============================================
// ORGANIZER VIEW
// ============================================

function initializeOrganizerView() {
    hideAllSections();
    document.getElementById('organizerSection').style.display = 'block';
    document.getElementById('roleIndicator').innerHTML = '👑 منظم';

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
        const participantUrl = `${window.location.origin}${window.location.pathname}?session=${currentSession}`;
        document.getElementById('sessionLink').value = participantUrl;
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
}

function updateOrganizerParticipantsList() {
    const list = document.getElementById('organizerParticipantsList');
    const count = document.getElementById('participantCount');

    list.innerHTML = '';
    const participants = Object.entries(participantsData);
    count.textContent = participants.length;

    if (participants.length === 0) {
        list.innerHTML = '<div class="empty-message">لا يوجد مشاركون حتى الآن. شارك الرابط مع عائلتك!</div>';
        return;
    }

    participants.forEach(([id, data]) => {
        const li = document.createElement('li');

        let statusBadge = '✓';
        let statusClass = 'joined';

        if (data.isExcluded) {
            statusBadge = '🚫';
            statusClass = 'excluded';
        } else if (data.hasDrawn) {
            statusBadge = '✓';
            statusClass = 'drawn';
        }

        li.innerHTML = `
            <span class="participant-info">
                <span class="status-badge ${statusClass}">${statusBadge}</span>
                <span class="participant-name">${data.name}</span>
            </span>
            <div class="participant-actions">
                <button class="toggle-exclude-btn ${data.isExcluded ? 'excluded' : ''}"
                        onclick="toggleExclusion('${id}')">
                    ${data.isExcluded ? 'تضمين' : 'استبعاد'}
                </button>
                <button class="remove-btn" onclick="removeParticipant('${id}')">حذف</button>
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
        container.innerHTML = '<p class="help-text">أضف مشاركين أولاً لتعيين القيود</p>';
        return;
    }

    participants.forEach(([id, data]) => {
        if (data.isExcluded) return; // Don't show restrictions for excluded participants

        const restrictionBox = document.createElement('div');
        restrictionBox.className = 'restriction-box';

        const participantNames = participants
            .filter(([otherId, _]) => otherId !== id && !participantsData[otherId].isExcluded)
            .map(([otherId, otherData]) => otherData.name);

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
            <div class="restriction-header">${data.name} لا يمكنه سحب:</div>
            <div class="restriction-options" id="restrictions-${data.name}">
                ${checkboxes || '<span class="no-options">لا توجد خيارات</span>'}
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

    document.getElementById('organizerProgressText').textContent = `${drawnCount} من ${total} سحبوا`;
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
    document.getElementById('roleIndicator').innerHTML = '👥 مشارك';
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
            // Participant needs to enter name
            hideAllSections();
            document.getElementById('landingSection').style.display = 'block';
        }
    } else if (isAdminCreate) {
        // Admin wants to create a new session
        hideAllSections();
        document.getElementById('createSessionSection').style.display = 'block';
    } else if (savedSession && savedRole) {
        // Restore from localStorage
        currentSession = savedSession;
        currentRole = savedRole;
        currentUserName = localStorage.getItem('currentUserName');

        if (currentRole === 'organizer') {
            const adminKey = localStorage.getItem('adminKey');
            const organizerUrl = `${window.location.origin}${window.location.pathname}?session=${currentSession}&role=organizer&key=${adminKey}`;
            window.history.pushState({}, '', organizerUrl);
            initializeOrganizerView();
        } else {
            const participantUrl = `${window.location.origin}${window.location.pathname}?session=${currentSession}`;
            window.history.pushState({}, '', participantUrl);
            initializeParticipantView();
        }
    } else {
        // Show landing page (participant join only)
        hideAllSections();
        document.getElementById('landingSection').style.display = 'block';
    }
});
