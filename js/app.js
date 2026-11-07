/* ==========================================================================
   js/app.js - Community Meeting Decision Tracker
   Shared utilities, navigation shell, dynamic overdue engine, and demo controls.
   Strictly Vanilla JavaScript: no frameworks, no classes, no ES modules.
   All functions are commented in simple English for a first-year college viva.
   ========================================================================== */

// In Node.js test environments, normalize timezone to UTC to align with ISO date strings
if (typeof process !== 'undefined' && process.env && !process.env.TZ) {
    process.env.TZ = 'UTC';
}

/**
 * Returns today's calendar date as a formatted "YYYY-MM-DD" string in local time.
 * Using local time prevents off-by-one date bugs with HTML5 date inputs.
 *
 * @returns {string} Today's date string, e.g. "2026-11-20".
 */
function getTodayString() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

/**
 * Adds or subtracts a number of days from a "YYYY-MM-DD" date string.
 *
 * @param {string} dateStr - The base date string in "YYYY-MM-DD" format.
 * @param {number} days - Number of days to add (positive) or subtract (negative).
 * @returns {string} The resulting date string in "YYYY-MM-DD" format.
 */
function addDaysToDateString(dateStr, days) {
    if (!dateStr || typeof dateStr !== 'string') {
        return getTodayString();
    }
    var parts = dateStr.split('-');
    if (parts.length !== 3) {
        return getTodayString();
    }
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    var d = new Date(year, month, day);
    d.setDate(d.getDate() + Number(days || 0));

    var resYear = d.getFullYear();
    var resMonth = String(d.getMonth() + 1).padStart(2, '0');
    var resDay = String(d.getDate()).padStart(2, '0');
    return resYear + '-' + resMonth + '-' + resDay;
}

/**
 * Formats a "YYYY-MM-DD" date string into a friendly readable format like "Nov 20, 2026".
 *
 * @param {string} dateStr - The date string in "YYYY-MM-DD" format.
 * @returns {string} Formatted date string, or "-" if empty or invalid.
 */
function formatDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '-';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var monthIndex = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    var year = parts[0];
    if (monthIndex < 0 || monthIndex > 11) return dateStr;
    return months[monthIndex] + ' ' + day + ', ' + year;
}

/**
 * Formats a 24-hour time string "18:30" into a 12-hour format like "6:30 PM".
 *
 * @param {string} timeStr - Time string in "HH:MM" format.
 * @returns {string} Formatted 12-hour time string, or original string if invalid.
 */
function formatTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return '-';
    var parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    var hours = parseInt(parts[0], 10);
    var minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    var ampm = hours >= 12 ? 'PM' : 'AM';
    var displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;
    return displayHours + ':' + minutes + ' ' + ampm;
}

/**
 * Checks whether a given "YYYY-MM-DD" date string is strictly before today.
 *
 * @param {string} dateStr - The date string to check.
 * @returns {boolean} True if the date is in the past, false otherwise.
 */
function isDatePast(dateStr) {
    if (!dateStr) return false;
    return dateStr < getTodayString();
}

/**
 * Checks whether a given "YYYY-MM-DD" date is within the next N days (including today).
 *
 * @param {string} dateStr - The date string to check.
 * @param {number} days - The number of days in the window.
 * @returns {boolean} True if the date falls between today and today + days.
 */
function isDateWithinNextDays(dateStr, days) {
    if (!dateStr) return false;
    var today = getTodayString();
    if (dateStr < today) return false;
    var maxDate = addDaysToDateString(today, days || 0);
    return dateStr <= maxDate;
}

/**
 * DYNAMIC OVERDUE ENGINE
 * Computes whether an action is overdue dynamically at display time.
 * VIVA INVARIANT: "Overdue" is NEVER stored in localStorage.
 * An action is overdue ONLY IF: status is NOT 'Completed' AND dueDate < today.
 *
 * @param {Object} action - The action object { status, dueDate, ... }.
 * @returns {boolean} True if overdue, false otherwise.
 */
function isActionOverdue(action) {
    if (!action || typeof action !== 'object') return false;
    if (!action.dueDate || !action.status) return false;
    // Completed actions are never overdue, even if completed after the deadline
    if (action.status === 'Completed') return false;
    // Check if the due date has already passed
    var today = getTodayString();
    return action.dueDate < today;
}

/**
 * Checks whether an action item is due soon (by default within the next 3 days).
 * Overdue actions and completed actions are excluded.
 *
 * @param {Object} action - The action object { status, dueDate, ... }.
 * @param {number} [days=3] - Reminder window in days.
 * @returns {boolean} True if due soon, false otherwise.
 */
function isActionDueSoon(action, days) {
    if (!action || typeof action !== 'object') return false;
    if (!action.dueDate || !action.status) return false;
    if (action.status === 'Completed') return false;

    var numDays = typeof days === 'number' ? days : 3;
    var today = getTodayString();
    var maxDate = addDaysToDateString(today, numDays);

    // Must be today or future up to maxDate (strictly not overdue)
    return action.dueDate >= today && action.dueDate <= maxDate;
}

/**
 * Checks whether a meeting is scheduled and occurs in the upcoming window (default 7 days).
 * Completed or Cancelled meetings are strictly excluded.
 *
 * @param {Object} meeting - The meeting object { status, date, ... }.
 * @param {number} [days=7] - Window in days.
 * @returns {boolean} True if upcoming and scheduled, false otherwise.
 */
function isMeetingUpcoming(meeting, days) {
    if (!meeting || typeof meeting !== 'object') return false;
    if (!meeting.date || meeting.status !== 'Scheduled') return false;

    var today = getTodayString();
    if (meeting.date < today) return false;

    if (typeof days === 'number') {
        var maxDate = addDaysToDateString(today, days);
        return meeting.date <= maxDate;
    }

    return true;
}

/**
 * Generates standardized HTML markup for a colored status badge.
 * Badges:
 * - Overdue: red (.badge-red)
 * - Pending / In Progress: yellow (.badge-yellow)
 * - Completed: green (.badge-green)
 * - Cancelled: grey (.badge-grey)
 * - Scheduled: blue (.badge-blue)
 *
 * @param {string} type - "action" or "meeting".
 * @param {string} status - The status text.
 * @param {boolean} [isOverdue=false] - Whether action is overdue.
 * @returns {string} Safe HTML string of badge.
 */
function getStatusBadgeHtml(type, status, isOverdue) {
    if (type === 'action') {
        if (isOverdue) {
            return '<span class="badge badge-red">Overdue</span>';
        }
        if (status === 'Completed') {
            return '<span class="badge badge-green">Completed</span>';
        }
        if (status === 'In Progress') {
            return '<span class="badge badge-yellow">In Progress</span>';
        }
        if (status === 'Pending') {
            return '<span class="badge badge-yellow">Pending</span>';
        }
        return '<span class="badge badge-grey">' + escapeHtml(status || 'Unknown') + '</span>';
    }

    if (type === 'meeting') {
        if (status === 'Completed') {
            return '<span class="badge badge-green">Completed</span>';
        }
        if (status === 'Cancelled') {
            return '<span class="badge badge-grey">Cancelled</span>';
        }
        if (status === 'Scheduled') {
            return '<span class="badge badge-blue">Scheduled</span>';
        }
        return '<span class="badge badge-grey">' + escapeHtml(status || 'Unknown') + '</span>';
    }

    // Direct status fallback when type is omitted or matches status directly
    if (status === 'Overdue' || isOverdue) {
        return '<span class="badge badge-red">Overdue</span>';
    }
    if (status === 'Completed') {
        return '<span class="badge badge-green">Completed</span>';
    }
    if (status === 'Pending' || status === 'In Progress') {
        return '<span class="badge badge-yellow">' + escapeHtml(status) + '</span>';
    }
    if (status === 'Scheduled') {
        return '<span class="badge badge-blue">Scheduled</span>';
    }
    if (status === 'Cancelled') {
        return '<span class="badge badge-grey">Cancelled</span>';
    }

    return '<span class="badge badge-grey">' + escapeHtml(status || 'Unknown') + '</span>';
}

/**
 * Backward compatibility alias for single-parameter getStatusBadge calls.
 *
 * @param {string} status - Status name.
 * @returns {string} HTML markup for badge.
 */
function getStatusBadge(status) {
    if (status === 'Overdue') {
        return getStatusBadgeHtml('action', 'Pending', true);
    }
    return getStatusBadgeHtml('action', status, false);
}

/**
 * Escapes special HTML characters to prevent XSS injection attacks.
 *
 * @param {string} text - Raw string.
 * @returns {string} Sanitized HTML-safe string.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Validates that an action due date is not earlier than the meeting date.
 *
 * @param {string} meetingDate - Meeting date in YYYY-MM-DD format.
 * @param {string} actionDueDate - Action due date in YYYY-MM-DD format.
 * @returns {Object} Object with { valid: boolean, message: string }.
 */
function validateActionDueDate(meetingDate, actionDueDate) {
    if (!meetingDate || !actionDueDate) {
        return { valid: false, message: 'Both meeting date and action due date are required.' };
    }
    if (actionDueDate < meetingDate) {
        return {
            valid: false,
            message: 'Action due date (' + actionDueDate + ') cannot be earlier than meeting date (' + meetingDate + ').'
        };
    }
    return { valid: true, message: '' };
}

/**
 * Extracts a query parameter value from the browser URL (e.g. "?id=123").
 *
 * @param {string} paramName - Name of the query parameter.
 * @returns {string|null} Parameter value or null if not found.
 */
function getUrlParam(paramName) {
    if (typeof window === 'undefined' || !window.location) return null;
    var search = window.location.search;
    if (!search) return null;
    var params = new URLSearchParams(search);
    return params.get(paramName);
}

/**
 * Renders the top navigation bar into #navbar-container and returns the HTML string.
 * Highlights the active page link and includes sample/reset controls.
 *
 * @param {string} activePage - Name of current page: 'dashboard', 'meetings', 'actions', 'archive'.
 * @returns {string} The generated HTML string.
 */
function renderNavbar(activePage) {
    var container = typeof document !== 'undefined' ? document.getElementById('navbar-container') : null;

    var navHtml = '' +
        '<nav class="navbar top-nav" aria-label="Main Navigation">' +
        '  <a href="index.html" class="brand brand-link">Community Tracker</a>' +
        '  <ul class="nav-links nav-menu">' +
        '    <li><a href="index.html" class="nav-link' + (activePage === 'dashboard' ? ' active' : '') + '">Dashboard</a></li>' +
        '    <li><a href="meetings.html" class="nav-link' + (activePage === 'meetings' ? ' active' : '') + '">Meetings</a></li>' +
        '    <li><a href="actions.html" class="nav-link' + (activePage === 'actions' ? ' active' : '') + '">Actions</a></li>' +
        '    <li><a href="archive.html" class="nav-link' + (activePage === 'archive' ? ' active' : '') + '">Archive</a></li>' +
        '  </ul>' +
        '  <div class="nav-demo-controls">' +
        '    <button type="button" id="btn-load-sample" class="btn btn-sm btn-outline" onclick="loadSampleData()">Load sample data</button>' +
        '    <button type="button" id="btn-clear-data" class="btn btn-sm btn-danger-outline" onclick="clearAllData()">Clear all data</button>' +
        '  </div>' +
        '</nav>';

    if (container) {
        container.innerHTML = navHtml;
    }
    return navHtml;
}

/**
 * Seeds canonical sample data into localStorage for demonstration and viva testing.
 * Seeds 3 residents, 2 meetings, decisions, and actions covering overdue, due soon, and completed.
 */
function loadSampleData() {
    var today = getTodayString();
    var pastDate10 = addDaysToDateString(today, -10);
    var pastDate5 = addDaysToDateString(today, -5);
    var futureDate2 = addDaysToDateString(today, 2);
    var futureDate5 = addDaysToDateString(today, 5);

    // 1. Three Residents
    var sampleResidents = [
        { id: 'res_sample_1', name: 'Alice Johnson', flat: 'A-101' },
        { id: 'res_sample_2', name: 'Bob Smith', flat: 'B-202' },
        { id: 'res_sample_3', name: 'Carol White', flat: 'C-303' }
    ];

    // 2. Two Meetings (1 Completed, 1 Scheduled)
    var sampleMeetings = [
        {
            id: 'mtg_sample_1',
            title: 'Quarterly Society General Meeting',
            date: pastDate10,
            time: '18:00',
            venue: 'Community Clubhouse',
            status: 'Completed',
            agenda: [
                { id: 'agn_s1_1', text: 'Financial audit report' },
                { id: 'agn_s1_2', text: 'Garden landscaping tender' }
            ],
            attendance: [
                { residentId: 'res_sample_1', status: 'Present' },
                { residentId: 'res_sample_2', status: 'Present' },
                { residentId: 'res_sample_3', status: 'Apology' }
            ],
            minutes: 'Approved financial audit report without objections. Agreed to commission ABC Landscaping.'
        },
        {
            id: 'mtg_sample_2',
            title: 'Security and CCTV Review',
            date: futureDate5,
            time: '19:30',
            venue: 'Main Gate Office',
            status: 'Scheduled',
            agenda: [
                { id: 'agn_s2_1', text: 'Review camera coverage blindspots' },
                { id: 'agn_s2_2', text: 'Select new vendor for gate barrier' }
            ],
            attendance: [],
            minutes: ''
        }
    ];

    // 3. Decisions linked to Completed Meeting
    var sampleDecisions = [
        {
            id: 'dec_sample_1',
            meetingId: 'mtg_sample_1',
            text: 'Sign agreement with ABC Landscaping for garden trimming',
            agendaItemId: 'agn_s1_2'
        },
        {
            id: 'dec_sample_2',
            meetingId: 'mtg_sample_1',
            text: 'Publish audited financial statement on notice board',
            agendaItemId: 'agn_s1_1'
        }
    ];

    // 4. Actions covering: Overdue (past date + Pending), Due Soon (next 2 days), and Completed
    var sampleActions = [
        {
            id: 'act_sample_1',
            decisionId: 'dec_sample_1',
            meetingId: 'mtg_sample_1',
            description: 'Sign contract with ABC Landscaping',
            assignedTo: 'res_sample_1',
            dueDate: pastDate5, // Past date -> Dynamic OVERDUE!
            status: 'Pending'
        },
        {
            id: 'act_sample_2',
            decisionId: 'dec_sample_2',
            meetingId: 'mtg_sample_1',
            description: 'Print and pin balance sheet to club notice board',
            assignedTo: 'res_sample_2',
            dueDate: futureDate2, // Next 2 days -> Dynamic DUE SOON!
            status: 'In Progress'
        },
        {
            id: 'act_sample_3',
            decisionId: 'dec_sample_1',
            meetingId: 'mtg_sample_1',
            description: 'Send advance deposit cheque to contractor',
            assignedTo: 'res_sample_3',
            dueDate: pastDate5,
            status: 'Completed' // Past date but Completed -> NOT overdue!
        }
    ];

    // Save to storage using storage.js helpers
    if (typeof saveResidents === 'function') saveResidents(sampleResidents);
    if (typeof saveMeetings === 'function') saveMeetings(sampleMeetings);
    if (typeof saveDecisions === 'function') saveDecisions(sampleDecisions);
    if (typeof saveActions === 'function') saveActions(sampleActions);

    if (typeof window !== 'undefined' && window.alert && typeof window.location !== 'undefined' && window.location.reload) {
        window.alert('Sample data loaded successfully! (3 residents, 2 meetings, decisions, and actions)');
        window.location.reload();
    }
}

/**
 * Resets all application data from localStorage.
 * Prompts for confirmation when run interactively in browser.
 */
function clearAllData() {
    var confirmed = true;
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Are you sure you want to clear all data? This cannot be undone.');
    }
    if (!confirmed) return;

    if (typeof clearAllStorage === 'function') {
        clearAllStorage();
    } else {
        if (typeof storageRemove === 'function') {
            storageRemove('cmdt_residents');
            storageRemove('cmdt_meetings');
            storageRemove('cmdt_decisions');
            storageRemove('cmdt_actions');
        } else if (typeof localStorage !== 'undefined' && localStorage) {
            localStorage.removeItem('cmdt_residents');
            localStorage.removeItem('cmdt_meetings');
            localStorage.removeItem('cmdt_decisions');
            localStorage.removeItem('cmdt_actions');
            localStorage.removeItem('residents');
            localStorage.removeItem('meetings');
            localStorage.removeItem('decisions');
            localStorage.removeItem('actions');
        }
    }

    if (typeof window !== 'undefined' && window.alert && typeof window.location !== 'undefined' && window.location.reload) {
        window.alert('All data has been cleared.');
        window.location.reload();
    }
}

/**
 * Displays a dismissible feedback alert banner inside a DOM container.
 *
 * @param {string} containerId - Element ID to render the alert into.
 * @param {string} message - Message text.
 * @param {string} [type='info'] - Alert type: 'success', 'danger', 'warning', 'info'.
 */
function showAlert(containerId, message, type) {
    if (typeof document === 'undefined') return;
    var container = document.getElementById(containerId);
    if (!container) return;
    var alertType = type || 'info';
    var alertClass = 'alert alert-' + alertType;
    container.innerHTML = '' +
        '<div class="' + alertClass + '" role="alert">' +
        '  <span>' + escapeHtml(message) + '</span>' +
        '  <button type="button" class="alert-close" aria-label="Close" onclick="clearAlert(\'' + containerId + '\')">&times;</button>' +
        '</div>';
}

/**
 * Clears any active alert inside a DOM container.
 *
 * @param {string} containerId - Element ID to clear.
 */
function clearAlert(containerId) {
    if (typeof document === 'undefined') return;
    var container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Helper to get a resident object from an array of residents.
 *
 * @param {Array<Object>} residents - List of residents.
 * @param {string} residentId - Target resident ID.
 * @returns {Object|null} Resident object or null.
 */
function getResidentById(residents, residentId) {
    if (!Array.isArray(residents) || !residentId) return null;
    for (var i = 0; i < residents.length; i++) {
        if (residents[i].id === residentId) {
            return residents[i];
        }
    }
    return null;
}

/**
 * Helper to get formatted resident display name ("Alice Johnson (A-101)").
 *
 * @param {Array<Object>} residents - List of residents.
 * @param {string} residentId - Target resident ID.
 * @returns {string} Formatted name or "Unassigned".
 */
function getResidentName(residents, residentId) {
    var resident = getResidentById(residents, residentId);
    if (!resident) return 'Unassigned';
    return resident.name + (resident.flat ? ' (' + resident.flat + ')' : '');
}

/**
 * Helper to get a meeting object from an array of meetings.
 *
 * @param {Array<Object>} meetings - List of meetings.
 * @param {string} meetingId - Target meeting ID.
 * @returns {Object|null} Meeting object or null.
 */
function getMeetingById(meetings, meetingId) {
    if (!Array.isArray(meetings) || !meetingId) return null;
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === meetingId) {
            return meetings[i];
        }
    }
    return null;
}

/**
 * Initializes and renders the Dashboard metric counters and reminders on index.html.
 */
function initDashboard() {
    if (typeof document === 'undefined') return;

    var meetings = typeof loadMeetings === 'function' ? loadMeetings() : (typeof loadData === 'function' ? loadData('cmdt_meetings') : []);
    var actions = typeof loadActions === 'function' ? loadActions() : (typeof loadData === 'function' ? loadData('cmdt_actions') : []);
    var residents = typeof loadResidents === 'function' ? loadResidents() : (typeof loadData === 'function' ? loadData('cmdt_residents') : []);

    // Build lookup maps for fast access
    var residentMap = {};
    for (var r = 0; r < residents.length; r++) {
        residentMap[residents[r].id] = residents[r];
    }

    var meetingMap = {};
    for (var m = 0; m < meetings.length; m++) {
        meetingMap[meetings[m].id] = meetings[m];
    }

    // 1. Calculate Summary Counts
    var upcomingCount = 0;
    for (var i = 0; i < meetings.length; i++) {
        if (isMeetingUpcoming(meetings[i], 7)) {
            upcomingCount++;
        }
    }

    var openCount = 0;
    var overdueCount = 0;
    var completedCount = 0;

    var overdueList = [];
    var dueSoonList = [];

    for (var j = 0; j < actions.length; j++) {
        var act = actions[j];
        if (act.status === 'Completed') {
            completedCount++;
        } else {
            openCount++;
            if (isActionOverdue(act)) {
                overdueCount++;
                overdueList.push(act);
            } else if (isActionDueSoon(act, 3)) {
                dueSoonList.push(act);
            }
        }
    }

    // Update count labels on cards
    var elUpcoming = document.getElementById('count-upcoming');
    var elOpen = document.getElementById('count-open');
    var elOverdue = document.getElementById('count-overdue');
    var elCompleted = document.getElementById('count-completed');

    if (elUpcoming) elUpcoming.textContent = upcomingCount;
    if (elOpen) elOpen.textContent = openCount;
    if (elOverdue) elOverdue.textContent = overdueCount;
    if (elCompleted) elCompleted.textContent = completedCount;

    // 2. Render Overdue Actions Reminder
    var overdueContainer = document.getElementById('overdue-container');
    if (overdueContainer) {
        if (overdueList.length === 0) {
            overdueContainer.innerHTML = '<div class="alert alert-info">No overdue action items.</div>';
        } else {
            var oHtml = '<div class="alert alert-danger flex-col">' +
                '<strong>Action Items Overdue (' + overdueList.length + '):</strong>' +
                '<div class="table-responsive mt-3"><table>' +
                '  <thead><tr><th>Description</th><th>Meeting</th><th>Assigned Resident</th><th>Due Date</th><th>Status</th></tr></thead>' +
                '  <tbody>';
            for (var o = 0; o < overdueList.length; o++) {
                var oAct = overdueList[o];
                var oMeet = meetingMap[oAct.meetingId];
                var oRes = residentMap[oAct.assignedTo];
                var oMeetName = oMeet ? oMeet.title : 'N/A';
                var oResName = oRes ? (oRes.name + ' (' + oRes.flat + ')') : 'Unassigned';

                oHtml += '<tr class="row-overdue">' +
                    '<td><strong>' + escapeHtml(oAct.description) + '</strong></td>' +
                    '<td><a href="meeting.html?id=' + encodeURIComponent(oAct.meetingId) + '">' + escapeHtml(oMeetName) + '</a></td>' +
                    '<td>' + escapeHtml(oResName) + '</td>' +
                    '<td>' + formatDate(oAct.dueDate) + '</td>' +
                    '<td>' + getStatusBadgeHtml('action', oAct.status, true) + '</td>' +
                    '</tr>';
            }
            oHtml += '  </tbody></table></div></div>';
            overdueContainer.innerHTML = oHtml;
        }
    }

    // 3. Render Due in Next 3 Days Reminder
    var dueSoonContainer = document.getElementById('due-soon-container');
    if (dueSoonContainer) {
        if (dueSoonList.length === 0) {
            dueSoonContainer.innerHTML = '<div class="alert alert-info">No pending actions due within the next 3 days.</div>';
        } else {
            var sHtml = '<div class="alert alert-warning flex-col">' +
                '<strong>Action Items Due in Next 3 Days (' + dueSoonList.length + '):</strong>' +
                '<div class="table-responsive mt-3"><table>' +
                '  <thead><tr><th>Description</th><th>Meeting</th><th>Assigned Resident</th><th>Due Date</th><th>Status</th></tr></thead>' +
                '  <tbody>';
            for (var s = 0; s < dueSoonList.length; s++) {
                var sAct = dueSoonList[s];
                var sMeet = meetingMap[sAct.meetingId];
                var sRes = residentMap[sAct.assignedTo];
                var sMeetName = sMeet ? sMeet.title : 'N/A';
                var sResName = sRes ? (sRes.name + ' (' + sRes.flat + ')') : 'Unassigned';

                sHtml += '<tr>' +
                    '<td><strong>' + escapeHtml(sAct.description) + '</strong></td>' +
                    '<td><a href="meeting.html?id=' + encodeURIComponent(sAct.meetingId) + '">' + escapeHtml(sMeetName) + '</a></td>' +
                    '<td>' + escapeHtml(sResName) + '</td>' +
                    '<td>' + formatDate(sAct.dueDate) + '</td>' +
                    '<td>' + getStatusBadgeHtml('action', sAct.status, false) + '</td>' +
                    '</tr>';
            }
            sHtml += '  </tbody></table></div></div>';
            dueSoonContainer.innerHTML = sHtml;
        }
    }

    // 4. Render Upcoming Meetings in Next 7 Days
    var upcomingMeetingsContainer = document.getElementById('upcoming-meetings-container');
    if (upcomingMeetingsContainer) {
        var soonMeetings = meetings.filter(function (m) {
            return isMeetingUpcoming(m, 7);
        });

        if (soonMeetings.length === 0) {
            upcomingMeetingsContainer.innerHTML = '<div class="empty-state">No meetings scheduled in the next 7 days.</div>';
        } else {
            soonMeetings.sort(function (a, b) {
                return (a.date + ' ' + (a.time || '')).localeCompare(b.date + ' ' + (b.time || ''));
            });

            var mHtml = '<div class="table-responsive"><table>' +
                '  <thead><tr><th>Meeting Title</th><th>Date</th><th>Time</th><th>Venue</th><th>Action</th></tr></thead>' +
                '  <tbody>';
            for (var k = 0; k < soonMeetings.length; k++) {
                var sm = soonMeetings[k];
                mHtml += '<tr>' +
                    '<td><strong>' + escapeHtml(sm.title) + '</strong></td>' +
                    '<td>' + formatDate(sm.date) + '</td>' +
                    '<td>' + (sm.time ? formatTime(sm.time) : '-') + '</td>' +
                    '<td>' + escapeHtml(sm.venue) + '</td>' +
                    '<td><a href="meeting.html?id=' + encodeURIComponent(sm.id) + '" class="btn btn-primary btn-sm">View Meeting</a></td>' +
                    '</tr>';
            }
            mHtml += '  </tbody></table></div>';
            upcomingMeetingsContainer.innerHTML = mHtml;
        }
    }
}

// Bind to window object for browser access
if (typeof window !== 'undefined') {
    window.getTodayString = getTodayString;
    window.addDaysToDateString = addDaysToDateString;
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.isDatePast = isDatePast;
    window.isDateWithinNextDays = isDateWithinNextDays;
    window.isActionOverdue = isActionOverdue;
    window.isActionDueSoon = isActionDueSoon;
    window.isMeetingUpcoming = isMeetingUpcoming;
    window.getStatusBadgeHtml = getStatusBadgeHtml;
    window.getStatusBadge = getStatusBadge;
    window.escapeHtml = escapeHtml;
    window.validateActionDueDate = validateActionDueDate;
    window.getUrlParam = getUrlParam;
    window.renderNavbar = renderNavbar;
    window.loadSampleData = loadSampleData;
    window.clearAllData = clearAllData;
    window.showAlert = showAlert;
    window.clearAlert = clearAlert;
    window.getResidentById = getResidentById;
    window.getResidentName = getResidentName;
    window.getMeetingById = getMeetingById;
    window.initDashboard = initDashboard;
}

// Conditional export for Node.js test environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getTodayString: getTodayString,
        addDaysToDateString: addDaysToDateString,
        formatDate: formatDate,
        formatTime: formatTime,
        isDatePast: isDatePast,
        isDateWithinNextDays: isDateWithinNextDays,
        isActionOverdue: isActionOverdue,
        isActionDueSoon: isActionDueSoon,
        isMeetingUpcoming: isMeetingUpcoming,
        getStatusBadgeHtml: getStatusBadgeHtml,
        getStatusBadge: getStatusBadge,
        escapeHtml: escapeHtml,
        validateActionDueDate: validateActionDueDate,
        getUrlParam: getUrlParam,
        renderNavbar: renderNavbar,
        loadSampleData: loadSampleData,
        clearAllData: clearAllData,
        showAlert: showAlert,
        clearAlert: clearAlert,
        getResidentById: getResidentById,
        getResidentName: getResidentName,
        getMeetingById: getMeetingById,
        initDashboard: initDashboard
    };
}
