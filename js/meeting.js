// meeting.js
// Handles detail view for a single meeting: Agenda, Attendance, Minutes, Decisions & Actions.

var currentMeeting = null;

document.addEventListener('DOMContentLoaded', function () {
    renderNavbar('meetings');

    // Get meeting ID from URL query string
    var params = new URLSearchParams(window.location.search);
    var meetingId = params.get('id');

    if (!meetingId) {
        document.querySelector('.container').innerHTML =
            '<div class="alert-box alert-danger">No meeting ID specified. <a href="meetings.html">Back to Meetings</a></div>';
        return;
    }

    loadCurrentMeeting(meetingId);

    if (!currentMeeting) {
        document.querySelector('.container').innerHTML =
            '<div class="alert-box alert-danger">Meeting not found. <a href="meetings.html">Back to Meetings</a></div>';
        return;
    }

    // Setup event listeners for forms
    var agendaForm = document.getElementById('agenda-form');
    if (agendaForm) agendaForm.addEventListener('submit', handleAddAgendaItem);

    var minutesForm = document.getElementById('minutes-form');
    if (minutesForm) minutesForm.addEventListener('submit', handleSaveMinutes);

    var decisionForm = document.getElementById('decision-form');
    if (decisionForm) decisionForm.addEventListener('submit', handleAddDecision);

    // Initial render of all tabs
    renderHeader();
    renderAgenda();
    renderAttendance();
    renderMinutes();
    renderDecisionsAndActions();
});

// Function to find and set currentMeeting from localStorage.
function loadCurrentMeeting(meetingId) {
    var meetings = loadData(STORAGE_KEYS.MEETINGS);
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === meetingId) {
            currentMeeting = meetings[i];
            // Ensure array structures exist
            if (!currentMeeting.agenda) currentMeeting.agenda = [];
            if (!currentMeeting.attendance) currentMeeting.attendance = [];
            if (typeof currentMeeting.minutes === 'undefined') currentMeeting.minutes = '';
            break;
        }
    }
}

// Function to switch visible tabs.
function switchTab(tabName) {
    var tabs = ['agenda', 'attendance', 'minutes', 'decisions'];
    var buttons = document.querySelectorAll('.tab-btn');

    for (var i = 0; i < tabs.length; i++) {
        var contentEl = document.getElementById('tab-' + tabs[i]);
        if (contentEl) {
            if (tabs[i] === tabName) {
                contentEl.classList.add('active');
            } else {
                contentEl.classList.remove('active');
            }
        }
    }

    // Update button active states
    for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('onclick').indexOf(tabName) !== -1) {
            buttons[j].classList.add('active');
        } else {
            buttons[j].classList.remove('active');
        }
    }
}

// Function to render meeting header information and status switcher.
function renderHeader() {
    var titleEl = document.getElementById('meeting-title-display');
    var metaEl = document.getElementById('meeting-meta-display');
    var statusContainer = document.getElementById('meeting-status-container');

    if (titleEl) titleEl.textContent = currentMeeting.title;
    if (metaEl) {
        metaEl.textContent = 'Date: ' + formatDate(currentMeeting.date) + ' at ' + currentMeeting.time + ' | Venue: ' + currentMeeting.venue;
    }

    if (statusContainer) {
        var statusSelectHtml = '' +
            '<span>Status: ' + getStatusBadge(currentMeeting.status) + '</span> ' +
            '<select id="meeting-status-change" class="form-control" style="width: auto; display: inline-block;" onchange="handleMeetingStatusChange(this.value)">' +
            '  <option value="Scheduled"' + (currentMeeting.status === 'Scheduled' ? ' selected' : '') + '>Scheduled</option>' +
            '  <option value="Completed"' + (currentMeeting.status === 'Completed' ? ' selected' : '') + '>Completed</option>' +
            '  <option value="Cancelled"' + (currentMeeting.status === 'Cancelled' ? ' selected' : '') + '>Cancelled</option>' +
            '</select>';
        statusContainer.innerHTML = statusSelectHtml;
    }
}

// Function to update current meeting's status.
function handleMeetingStatusChange(newStatus) {
    var meetings = loadData(STORAGE_KEYS.MEETINGS);
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === currentMeeting.id) {
            meetings[i].status = newStatus;
            currentMeeting.status = newStatus;
            break;
        }
    }
    saveData(STORAGE_KEYS.MEETINGS, meetings);
    renderHeader();
    if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        alert('Meeting marked as ' + newStatus + '. It will now appear on the Archive page as well.');
    }
}

// ==========================================
// TAB 1: AGENDA
// ==========================================

// Function to add an agenda item.
function handleAddAgendaItem(e) {
    e.preventDefault();
    var input = document.getElementById('agenda-text');
    var text = input.value.trim();
    if (!text) return;

    var newItem = {
        id: generateId(),
        text: text
    };

    currentMeeting.agenda.push(newItem);
    persistMeetingChanges();

    input.value = '';
    renderAgenda();
    renderDecisionsAndActions(); // updates dropdown
}

// Function to remove an agenda item.
function removeAgendaItem(agendaItemId) {
    currentMeeting.agenda = currentMeeting.agenda.filter(function (item) {
        return item.id !== agendaItemId;
    });
    persistMeetingChanges();
    renderAgenda();
    renderDecisionsAndActions();
}

// Function to render the agenda items table.
function renderAgenda() {
    var tbody = document.getElementById('agenda-table-body');
    if (!tbody) return;

    if (currentMeeting.agenda.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No agenda topics added yet. Add one above.</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < currentMeeting.agenda.length; i++) {
        var item = currentMeeting.agenda[i];
        html += '<tr>' +
            '<td><strong>#' + (i + 1) + '</strong></td>' +
            '<td>' + escapeHtml(item.text) + '</td>' +
            '<td><button onclick="removeAgendaItem(\'' + item.id + '\')" class="btn btn-danger btn-sm">Remove</button></td>' +
            '</tr>';
    }
    tbody.innerHTML = html;
}

// ==========================================
// TAB 2: ATTENDANCE
// ==========================================

// Function to render attendance list for all residents.
function renderAttendance() {
    var tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;

    var residents = loadData(STORAGE_KEYS.RESIDENTS);

    if (residents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No residents registered. <a href="meetings.html">Add residents here</a>.</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < residents.length; i++) {
        var res = residents[i];

        // Find existing attendance status if recorded
        var existingStatus = 'Present'; // default
        for (var j = 0; j < currentMeeting.attendance.length; j++) {
            if (currentMeeting.attendance[j].residentId === res.id) {
                existingStatus = currentMeeting.attendance[j].status;
                break;
            }
        }

        html += '<tr>' +
            '<td><strong>' + escapeHtml(res.name) + '</strong></td>' +
            '<td>' + escapeHtml(res.flat) + '</td>' +
            '<td>' +
            '  <select class="form-control attendance-select" data-resident-id="' + res.id + '" style="width: 160px;">' +
            '    <option value="Present"' + (existingStatus === 'Present' ? ' selected' : '') + '>Present</option>' +
            '    <option value="Absent"' + (existingStatus === 'Absent' ? ' selected' : '') + '>Absent</option>' +
            '    <option value="Apology"' + (existingStatus === 'Apology' ? ' selected' : '') + '>Apology</option>' +
            '  </select>' +
            '</td>' +
            '</tr>';
    }

    tbody.innerHTML = html;
}

// Function to save attendance selections.
function saveAttendance() {
    var selects = document.querySelectorAll('.attendance-select');
    var newAttendance = [];

    for (var i = 0; i < selects.length; i++) {
        var residentId = selects[i].getAttribute('data-resident-id');
        var status = selects[i].value;
        newAttendance.push({
            residentId: residentId,
            status: status
        });
    }

    currentMeeting.attendance = newAttendance;
    persistMeetingChanges();
    alert('Attendance saved successfully.');
}

// ==========================================
// TAB 3: MINUTES
// ==========================================

// Function to load minutes text into textarea.
function renderMinutes() {
    var textarea = document.getElementById('meeting-minutes');
    if (textarea) {
        textarea.value = currentMeeting.minutes || '';
    }
}

// Function to handle saving minutes.
function handleSaveMinutes(e) {
    e.preventDefault();
    var textarea = document.getElementById('meeting-minutes');
    currentMeeting.minutes = textarea.value.trim();
    persistMeetingChanges();
    alert('Meeting minutes saved successfully.');
}

// ==========================================
// TAB 4: DECISIONS & ACTIONS
// ==========================================

// Function to handle adding a decision.
function handleAddDecision(e) {
    e.preventDefault();
    var textInput = document.getElementById('decision-text');
    var agendaSelect = document.getElementById('decision-agenda-link');

    var text = textInput.value.trim();
    var agendaItemId = agendaSelect.value;

    if (!text) {
        alert('Please enter decision text.');
        return;
    }

    var decisions = loadData(STORAGE_KEYS.DECISIONS);
    var newDecision = {
        id: generateId(),
        meetingId: currentMeeting.id,
        text: text,
        agendaItemId: agendaItemId || null
    };

    decisions.push(newDecision);
    saveData(STORAGE_KEYS.DECISIONS, decisions);

    textInput.value = '';
    agendaSelect.value = '';
    renderDecisionsAndActions();
}

// Function to render decisions and their assigned actions.
function renderDecisionsAndActions() {
    // 1. Update the linked agenda dropdown in the decision form
    var agendaSelect = document.getElementById('decision-agenda-link');
    if (agendaSelect) {
        var optionsHtml = '<option value="">-- None / General --</option>';
        for (var a = 0; a < currentMeeting.agenda.length; a++) {
            var item = currentMeeting.agenda[a];
            optionsHtml += '<option value="' + item.id + '">#' + (a + 1) + ' - ' + escapeHtml(item.text) + '</option>';
        }
        agendaSelect.innerHTML = optionsHtml;
    }

    // 2. Render decision list
    var container = document.getElementById('decisions-list-container');
    if (!container) return;

    var decisions = loadData(STORAGE_KEYS.DECISIONS);
    var meetingDecisions = decisions.filter(function (d) {
        return d.meetingId === currentMeeting.id;
    });

    if (meetingDecisions.length === 0) {
        container.innerHTML = '<div class="card empty-state">No decisions recorded yet for this meeting. Record one above.</div>';
        return;
    }

    var residents = loadData(STORAGE_KEYS.RESIDENTS);
    var actions = loadData(STORAGE_KEYS.ACTIONS);

    var html = '';
    for (var i = 0; i < meetingDecisions.length; i++) {
        var dec = meetingDecisions[i];

        // Find linked agenda topic title
        var linkedTopicText = 'General / No topic linked';
        if (dec.agendaItemId) {
            for (var k = 0; k < currentMeeting.agenda.length; k++) {
                if (currentMeeting.agenda[k].id === dec.agendaItemId) {
                    linkedTopicText = '#' + (k + 1) + ' ' + currentMeeting.agenda[k].text;
                    break;
                }
            }
        }

        // Actions belonging to this decision
        var decActions = actions.filter(function (act) {
            return act.decisionId === dec.id;
        });

        html += '<div class="card">' +
            '  <div class="d-flex justify-between align-center mb-12">' +
            '    <div>' +
            '      <h4>Decision #' + (i + 1) + ': ' + escapeHtml(dec.text) + '</h4>' +
            '      <small class="text-muted">Linked Topic: ' + escapeHtml(linkedTopicText) + '</small>' +
            '    </div>' +
            '    <button onclick="deleteDecision(\'' + dec.id + '\')" class="btn btn-outline btn-sm">Delete Decision</button>' +
            '  </div>';

        // Action items table
        html += '  <h5 class="mt-12 mb-12">Assigned Action Items:</h5>';
        if (decActions.length === 0) {
            html += '  <p class="text-muted mb-12">No action items assigned to this decision yet.</p>';
        } else {
            html += '  <div class="table-responsive mb-12"><table>' +
                '    <thead>' +
                '      <tr>' +
                '        <th>Description</th>' +
                '        <th>Assigned To</th>' +
                '        <th>Due Date</th>' +
                '        <th>Status</th>' +
                '        <th>Update Status</th>' +
                '      </tr>' +
                '    </thead>' +
                '    <tbody>';

            for (var j = 0; j < decActions.length; j++) {
                var act = decActions[j];
                var residentName = 'Unassigned';
                for (var r = 0; r < residents.length; r++) {
                    if (residents[r].id === act.assignedTo) {
                        residentName = residents[r].name + ' (' + residents[r].flat + ')';
                        break;
                    }
                }

                var displayStatus = getActionDisplayStatus(act);

                html += '      <tr>' +
                    '        <td>' + escapeHtml(act.description) + '</td>' +
                    '        <td>' + escapeHtml(residentName) + '</td>' +
                    '        <td>' + formatDate(act.dueDate) + '</td>' +
                    '        <td>' + getStatusBadge(displayStatus) + '</td>' +
                    '        <td>' +
                    '          <select class="form-control" style="width: auto; display: inline-block;" onchange="updateActionStatus(\'' + act.id + '\', this.value)">' +
                    '            <option value="Pending"' + (act.status === 'Pending' ? ' selected' : '') + '>Pending</option>' +
                    '            <option value="In Progress"' + (act.status === 'In Progress' ? ' selected' : '') + '>In Progress</option>' +
                    '            <option value="Completed"' + (act.status === 'Completed' ? ' selected' : '') + '>Completed</option>' +
                    '          </select>' +
                    '        </td>' +
                    '      </tr>';
            }
            html += '    </tbody></table></div>';
        }

        // Add action form for this decision
        html += '  <div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; border: 1px dashed #74B4D9;">' +
            '    <strong style="font-size: 0.88rem; color: #10367D;">+ Assign New Action Item:</strong>' +
            '    <form onsubmit="handleAddAction(event, \'' + dec.id + '\')" class="mt-12">' +
            '      <div class="form-row">' +
            '        <div class="form-group" style="flex: 2;">' +
            '          <label>Action Description *</label>' +
            '          <input type="text" id="action-desc-' + dec.id + '" class="form-control" placeholder="e.g. Call electrician to replace wiring" required>' +
            '        </div>' +
            '        <div class="form-group">' +
            '          <label>Assign To *</label>' +
            '          <select id="action-resident-' + dec.id + '" class="form-control" required>' +
            '            <option value="">-- Choose Resident --</option>';

        for (var resIdx = 0; resIdx < residents.length; resIdx++) {
            var resident = residents[resIdx];
            html += '        <option value="' + resident.id + '">' + escapeHtml(resident.name) + ' (' + escapeHtml(resident.flat) + ')</option>';
        }

        html += '          </select>' +
            '        </div>' +
            '        <div class="form-group">' +
            '          <label>Due Date *</label>' +
            '          <input type="date" id="action-date-' + dec.id + '" class="form-control" required>' +
            '        </div>' +
            '      </div>' +
            '      <button type="submit" class="btn btn-primary btn-sm">+ Assign Action</button>' +
            '    </form>' +
            '  </div>' +
            '</div>';
    }

    container.innerHTML = html;
}

// Function to handle adding an action item to a decision.
// VALIDATION: Action due date cannot be before the meeting date!
function handleAddAction(e, decisionId) {
    e.preventDefault();

    var desc = document.getElementById('action-desc-' + decisionId).value.trim();
    var assignedTo = document.getElementById('action-resident-' + decisionId).value;
    var dueDate = document.getElementById('action-date-' + decisionId).value;

    if (!desc || !assignedTo || !dueDate) {
        alert('Please fill in all action item fields.');
        return;
    }

    // Validation: due date cannot be before meeting date
    if (dueDate < currentMeeting.date) {
        alert('Validation Error: Action due date (' + formatDate(dueDate) + ') cannot be earlier than the meeting date (' + formatDate(currentMeeting.date) + ').');
        return;
    }

    var actions = loadData(STORAGE_KEYS.ACTIONS);
    var newAction = {
        id: generateId(),
        decisionId: decisionId,
        meetingId: currentMeeting.id,
        description: desc,
        assignedTo: assignedTo,
        dueDate: dueDate,
        status: 'Pending' // Initial status is Pending; Overdue is never stored!
    };

    actions.push(newAction);
    saveData(STORAGE_KEYS.ACTIONS, actions);

    renderDecisionsAndActions();
}

// Function to update an action's status.
function updateActionStatus(actionId, newStatus) {
    var actions = loadData(STORAGE_KEYS.ACTIONS);
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].id === actionId) {
            actions[i].status = newStatus;
            break;
        }
    }
    saveData(STORAGE_KEYS.ACTIONS, actions);
    renderDecisionsAndActions();
}

// Function to delete a decision and its linked actions.
function deleteDecision(decisionId) {
    if (!confirm('Are you sure you want to delete this decision and all its assigned actions?')) return;

    var decisions = loadData(STORAGE_KEYS.DECISIONS);
    decisions = decisions.filter(function (d) {
        return d.id !== decisionId;
    });
    saveData(STORAGE_KEYS.DECISIONS, decisions);

    var actions = loadData(STORAGE_KEYS.ACTIONS);
    actions = actions.filter(function (a) {
        return a.decisionId !== decisionId;
    });
    saveData(STORAGE_KEYS.ACTIONS, actions);

    renderDecisionsAndActions();
}

// Helper function to persist changes in currentMeeting back to localStorage.
function persistMeetingChanges() {
    var meetings = loadData(STORAGE_KEYS.MEETINGS);
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === currentMeeting.id) {
            meetings[i] = currentMeeting;
            break;
        }
    }
    saveData(STORAGE_KEYS.MEETINGS, meetings);
}
