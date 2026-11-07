/* ==========================================================================
   js/storage.js - Community Meeting Decision Tracker
   LocalStorage helpers, ID generator, entity loaders/savers, and deletion guard.
   Strictly Vanilla JavaScript: no frameworks, no classes, no ES modules.
   All functions are commented in simple English for a first-year college viva.
   ========================================================================== */

// Storage keys used across the application to save data in the browser
var STORAGE_KEY_RESIDENTS = 'cmdt_residents';
var STORAGE_KEY_MEETINGS = 'cmdt_meetings';
var STORAGE_KEY_DECISIONS = 'cmdt_decisions';
var STORAGE_KEY_ACTIONS = 'cmdt_actions';

// Backward compatibility map for any code referencing STORAGE_KEYS
var STORAGE_KEYS = {
    RESIDENTS: STORAGE_KEY_RESIDENTS,
    MEETINGS: STORAGE_KEY_MEETINGS,
    DECISIONS: STORAGE_KEY_DECISIONS,
    ACTIONS: STORAGE_KEY_ACTIONS
};

// Internal counter to prevent ID collisions when generateId is called repeatedly
var _idCounter = 0;

/**
 * Helper function to safely read data from browser localStorage.
 * If the key does not exist or has broken JSON, it returns the defaultValue.
 *
 * @param {string} key - The key name stored in localStorage.
 * @param {*} defaultValue - The default value to return if nothing is found.
 * @returns {*} The parsed JavaScript object, array, or the defaultValue.
 */
function storageGet(key, defaultValue) {
    if (typeof defaultValue === 'undefined') {
        defaultValue = null;
    }
    try {
        if (typeof localStorage === 'undefined' || localStorage === null) {
            return defaultValue;
        }
        var rawData = localStorage.getItem(key);
        if (rawData === null || rawData === undefined) {
            return defaultValue;
        }
        return JSON.parse(rawData);
    } catch (error) {
        console.warn('storageGet failed for key "' + key + '":', error);
        return defaultValue;
    }
}

/**
 * Helper function to save any JavaScript data into browser localStorage as JSON.
 *
 * @param {string} key - The key name under which to store the data.
 * @param {*} value - The JavaScript object, array, or value to save.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
function storageSet(key, value) {
    try {
        if (typeof localStorage === 'undefined' || localStorage === null) {
            return false;
        }
        var serializedData = JSON.stringify(value);
        localStorage.setItem(key, serializedData);
        return true;
    } catch (error) {
        console.error('storageSet failed for key "' + key + '":', error);
        return false;
    }
}

/**
 * Helper function to delete a specific key from browser localStorage.
 *
 * @param {string} key - The key name to remove from storage.
 * @returns {boolean} True if removal succeeded, false otherwise.
 */
function storageRemove(key) {
    try {
        if (typeof localStorage === 'undefined' || localStorage === null) {
            return false;
        }
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('storageRemove failed for key "' + key + '":', error);
        return false;
    }
}

/**
 * Generates a unique, collision-safe identifier with an optional prefix.
 * Example outputs: "meet_1730912345678_1_a9f3b2" or "res_1730912345678_2_bc3d4e".
 * Uses a timestamp, an auto-increment counter, and random characters.
 *
 * @param {string} [prefix='id_'] - The prefix to prepend (e.g. 'meet_', 'res_', 'act_').
 * @returns {string} A unique identifier string.
 */
function generateId(prefix) {
    var cleanPrefix = 'id_';
    if (typeof prefix === 'string' && prefix.length > 0) {
        cleanPrefix = prefix.charAt(prefix.length - 1) === '_' ? prefix : prefix + '_';
    }
    _idCounter = (_idCounter + 1) % 100000;
    var timestamp = Date.now();
    var randomSuffix = Math.random().toString(36).substring(2, 8);
    return cleanPrefix + timestamp + '_' + _idCounter + '_' + randomSuffix;
}

/**
 * Loads all resident records from browser localStorage.
 * Always returns an array, even if storage is empty.
 *
 * @returns {Array<Object>} List of residents [{ id, name, flat }].
 */
function loadResidents() {
    var residents = storageGet(STORAGE_KEY_RESIDENTS, []);
    return Array.isArray(residents) ? residents : [];
}

/**
 * Saves the list of residents to browser localStorage.
 *
 * @param {Array<Object>} residents - Array of resident objects to store.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
function saveResidents(residents) {
    if (!Array.isArray(residents)) {
        residents = [];
    }
    return storageSet(STORAGE_KEY_RESIDENTS, residents);
}

/**
 * Loads all meeting records from browser localStorage.
 * Ensures nested agenda and attendance arrays are properly initialized.
 *
 * @returns {Array<Object>} List of meeting objects.
 */
function loadMeetings() {
    var meetings = storageGet(STORAGE_KEY_MEETINGS, []);
    if (!Array.isArray(meetings)) {
        return [];
    }
    // Make sure each meeting has safe default arrays for agenda and attendance
    for (var i = 0; i < meetings.length; i++) {
        var m = meetings[i];
        if (!Array.isArray(m.agenda)) {
            m.agenda = [];
        }
        if (!Array.isArray(m.attendance)) {
            m.attendance = [];
        }
        if (typeof m.minutes !== 'string') {
            m.minutes = '';
        }
    }
    return meetings;
}

/**
 * Saves the list of meetings to browser localStorage.
 *
 * @param {Array<Object>} meetings - Array of meeting objects to store.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
function saveMeetings(meetings) {
    if (!Array.isArray(meetings)) {
        meetings = [];
    }
    return storageSet(STORAGE_KEY_MEETINGS, meetings);
}

/**
 * Loads all decisions from browser localStorage.
 * Always returns an array.
 *
 * @returns {Array<Object>} List of decision objects [{ id, meetingId, text, agendaItemId }].
 */
function loadDecisions() {
    var decisions = storageGet(STORAGE_KEY_DECISIONS, []);
    return Array.isArray(decisions) ? decisions : [];
}

/**
 * Saves the list of decisions to browser localStorage.
 *
 * @param {Array<Object>} decisions - Array of decision objects to store.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
function saveDecisions(decisions) {
    if (!Array.isArray(decisions)) {
        decisions = [];
    }
    return storageSet(STORAGE_KEY_DECISIONS, decisions);
}

/**
 * Loads all action items from browser localStorage.
 * Invariant Rule: "Overdue" is strictly dynamic and NEVER stored.
 * If any legacy data has status "Overdue", it is sanitized to "Pending".
 *
 * @returns {Array<Object>} List of action objects [{ id, decisionId, meetingId, description, assignedTo, dueDate, status }].
 */
function loadActions() {
    var actions = storageGet(STORAGE_KEY_ACTIONS, []);
    if (!Array.isArray(actions)) {
        return [];
    }
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].status === 'Overdue') {
            actions[i].status = 'Pending';
        }
    }
    return actions;
}

/**
 * Saves the list of actions to browser localStorage.
 * Invariant Rule: sanitizes status so "Overdue" is never written to localStorage.
 *
 * @param {Array<Object>} actions - Array of action objects to store.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
function saveActions(actions) {
    if (!Array.isArray(actions)) {
        actions = [];
    }
    // Prevent accidental "Overdue" status from being stored
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].status === 'Overdue') {
            actions[i].status = 'Pending';
        }
    }
    return storageSet(STORAGE_KEY_ACTIONS, actions);
}

/**
 * Referential integrity check: checks whether a resident can be safely deleted.
 * A resident CANNOT be deleted if they are assigned to ANY action item.
 *
 * @param {string} residentId - The ID of the resident to check.
 * @returns {boolean} True if safe to delete (no actions assigned), false if assigned to actions.
 */
function canDeleteResident(residentId) {
    if (!residentId || typeof residentId !== 'string') {
        return false;
    }
    var cleanId = residentId.trim();
    if (cleanId.length === 0) {
        return false;
    }
    var actions = loadActions();
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].assignedTo === cleanId) {
            return false; // Resident is assigned to an action; deletion is blocked
        }
    }
    return true; // No actions assigned to this resident; safe to delete
}

/**
 * Finds all action items currently assigned to a given resident.
 * Used to display helpful messages showing why a resident cannot be deleted.
 *
 * @param {string} residentId - The resident ID.
 * @returns {Array<Object>} Array of actions assigned to this resident.
 */
function getAssignedActionsForResident(residentId) {
    if (!residentId || typeof residentId !== 'string') {
        return [];
    }
    var cleanId = residentId.trim();
    var actions = loadActions();
    var assigned = [];
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].assignedTo === cleanId) {
            assigned.push(actions[i]);
        }
    }
    return assigned;
}

/**
 * Finds a meeting by its unique ID.
 *
 * @param {string} meetingId - The ID of the meeting to find.
 * @returns {Object|null} The meeting object, or null if not found.
 */
function getMeetingById(meetingId) {
    if (!meetingId) return null;
    var meetings = loadMeetings();
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === meetingId) {
            return meetings[i];
        }
    }
    return null;
}

/**
 * Finds a resident by their unique ID.
 *
 * @param {string} residentId - The ID of the resident to find.
 * @returns {Object|null} The resident object, or null if not found.
 */
function getResidentById(residentId) {
    if (!residentId) return null;
    var residents = loadResidents();
    for (var i = 0; i < residents.length; i++) {
        if (residents[i].id === residentId) {
            return residents[i];
        }
    }
    return null;
}

/**
 * Finds a decision by its unique ID.
 *
 * @param {string} decisionId - The ID of the decision to find.
 * @returns {Object|null} The decision object, or null if not found.
 */
function getDecisionById(decisionId) {
    if (!decisionId) return null;
    var decisions = loadDecisions();
    for (var i = 0; i < decisions.length; i++) {
        if (decisions[i].id === decisionId) {
            return decisions[i];
        }
    }
    return null;
}

/**
 * Finds an action by its unique ID.
 *
 * @param {string} actionId - The ID of the action to find.
 * @returns {Object|null} The action object, or null if not found.
 */
function getActionById(actionId) {
    if (!actionId) return null;
    var actions = loadActions();
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].id === actionId) {
            return actions[i];
        }
    }
    return null;
}

/**
 * Finds all decisions recorded for a specific meeting.
 *
 * @param {string} meetingId - The ID of the meeting.
 * @returns {Array<Object>} List of decisions belonging to the meeting.
 */
function getDecisionsForMeeting(meetingId) {
    if (!meetingId) return [];
    var decisions = loadDecisions();
    var results = [];
    for (var i = 0; i < decisions.length; i++) {
        if (decisions[i].meetingId === meetingId) {
            results.push(decisions[i]);
        }
    }
    return results;
}

/**
 * Finds all actions created under a specific meeting.
 *
 * @param {string} meetingId - The ID of the meeting.
 * @returns {Array<Object>} List of actions belonging to the meeting.
 */
function getActionsForMeeting(meetingId) {
    if (!meetingId) return [];
    var actions = loadActions();
    var results = [];
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].meetingId === meetingId) {
            results.push(actions[i]);
        }
    }
    return results;
}

/**
 * Resets all 4 application data collections to empty arrays.
 *
 * @returns {boolean} True if all collections were reset.
 */
function clearAllStorage() {
    var ok1 = saveResidents([]);
    var ok2 = saveMeetings([]);
    var ok3 = saveDecisions([]);
    var ok4 = saveActions([]);
    return ok1 && ok2 && ok3 && ok4;
}

// Backward compatibility wrapper for generic data loading
function loadData(key) {
    return storageGet(key, []);
}

// Backward compatibility wrapper for generic data saving
function saveData(key, data) {
    return storageSet(key, data);
}

// Attach all functions to global scope (window in browser, global in Node/harness)
if (typeof window !== 'undefined') {
    window.STORAGE_KEY_RESIDENTS = STORAGE_KEY_RESIDENTS;
    window.STORAGE_KEY_MEETINGS = STORAGE_KEY_MEETINGS;
    window.STORAGE_KEY_DECISIONS = STORAGE_KEY_DECISIONS;
    window.STORAGE_KEY_ACTIONS = STORAGE_KEY_ACTIONS;
    window.STORAGE_KEYS = STORAGE_KEYS;
    window.storageGet = storageGet;
    window.storageSet = storageSet;
    window.storageRemove = storageRemove;
    window.generateId = generateId;
    window.loadResidents = loadResidents;
    window.saveResidents = saveResidents;
    window.loadMeetings = loadMeetings;
    window.saveMeetings = saveMeetings;
    window.loadDecisions = loadDecisions;
    window.saveDecisions = saveDecisions;
    window.loadActions = loadActions;
    window.saveActions = saveActions;
    window.canDeleteResident = canDeleteResident;
    window.getAssignedActionsForResident = getAssignedActionsForResident;
    window.getMeetingById = getMeetingById;
    window.getResidentById = getResidentById;
    window.getDecisionById = getDecisionById;
    window.getActionById = getActionById;
    window.getDecisionsForMeeting = getDecisionsForMeeting;
    window.getActionsForMeeting = getActionsForMeeting;
    window.clearAllStorage = clearAllStorage;
    window.loadData = loadData;
    window.saveData = saveData;
}

// Conditional export for Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEY_RESIDENTS: STORAGE_KEY_RESIDENTS,
        STORAGE_KEY_MEETINGS: STORAGE_KEY_MEETINGS,
        STORAGE_KEY_DECISIONS: STORAGE_KEY_DECISIONS,
        STORAGE_KEY_ACTIONS: STORAGE_KEY_ACTIONS,
        STORAGE_KEYS: STORAGE_KEYS,
        storageGet: storageGet,
        storageSet: storageSet,
        storageRemove: storageRemove,
        generateId: generateId,
        loadResidents: loadResidents,
        saveResidents: saveResidents,
        loadMeetings: loadMeetings,
        saveMeetings: saveMeetings,
        loadDecisions: loadDecisions,
        saveDecisions: saveDecisions,
        loadActions: loadActions,
        saveActions: saveActions,
        canDeleteResident: canDeleteResident,
        getAssignedActionsForResident: getAssignedActionsForResident,
        getMeetingById: getMeetingById,
        getResidentById: getResidentById,
        getDecisionById: getDecisionById,
        getActionById: getActionById,
        getDecisionsForMeeting: getDecisionsForMeeting,
        getActionsForMeeting: getActionsForMeeting,
        clearAllStorage: clearAllStorage,
        loadData: loadData,
        saveData: saveData
    };
}
