// meetings.js
// Handles meeting scheduling, listing active meetings, and managing residents.

document.addEventListener('DOMContentLoaded', function () {
    // Render the shared top navbar
    renderNavbar('meetings');

    // Attach event listeners
    var meetingForm = document.getElementById('meeting-form');
    if (meetingForm) {
        meetingForm.addEventListener('submit', handleAddMeeting);
    }

    var residentForm = document.getElementById('resident-form');
    if (residentForm) {
        residentForm.addEventListener('submit', handleAddResident);
    }

    // Initial render of lists
    renderMeetingsList();
    renderResidentsList();
});

// Function to handle scheduling a new meeting.
function handleAddMeeting(e) {
    e.preventDefault();

    var title = document.getElementById('meeting-title').value.trim();
    var date = document.getElementById('meeting-date').value;
    var time = document.getElementById('meeting-time').value;
    var venue = document.getElementById('meeting-venue').value.trim();
    var status = document.getElementById('meeting-status').value;

    // Validation: make sure no fields are empty
    if (!title || !date || !time || !venue) {
        alert('Please fill in all required meeting fields.');
        return;
    }

    var meetings = loadData(STORAGE_KEYS.MEETINGS);

    var newMeeting = {
        id: generateId(),
        title: title,
        date: date,
        time: time,
        venue: venue,
        status: status,
        agenda: [],
        attendance: [],
        minutes: ""
    };

    meetings.push(newMeeting);
    saveData(STORAGE_KEYS.MEETINGS, meetings);

    // Reset form and re-render
    document.getElementById('meeting-form').reset();
    document.getElementById('meeting-status').value = 'Scheduled';
    renderMeetingsList();

    alert('Meeting scheduled successfully.');
}

// Function to render the list of upcoming/active meetings.
function renderMeetingsList() {
    var tbody = document.getElementById('meetings-table-body');
    var countSpan = document.getElementById('meeting-count');
    if (!tbody) return;

    var allMeetings = loadData(STORAGE_KEYS.MEETINGS);

    // Display active/scheduled meetings (Completed and Cancelled go to archive)
    var activeMeetings = allMeetings.filter(function (m) {
        return m.status === 'Scheduled';
    });

    if (countSpan) {
        countSpan.textContent = activeMeetings.length + ' scheduled meeting(s)';
    }

    if (activeMeetings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No scheduled meetings found. Schedule one above.</td></tr>';
        return;
    }

    // Sort meetings chronologically by date and time
    activeMeetings.sort(function (a, b) {
        var dateA = a.date + ' ' + a.time;
        var dateB = b.date + ' ' + b.time;
        return dateA.localeCompare(dateB);
    });

    var rowsHtml = '';
    for (var i = 0; i < activeMeetings.length; i++) {
        var m = activeMeetings[i];
        rowsHtml += '<tr>' +
            '<td><strong>' + escapeHtml(m.title) + '</strong></td>' +
            '<td>' + formatDate(m.date) + '</td>' +
            '<td>' + m.time + '</td>' +
            '<td>' + escapeHtml(m.venue) + '</td>' +
            '<td>' + getStatusBadge(m.status) + '</td>' +
            '<td>' +
            '  <a href="meeting.html?id=' + encodeURIComponent(m.id) + '" class="btn btn-primary btn-sm">Open Meeting</a> ' +
            '  <button onclick="markMeetingStatus(\'' + m.id + '\', \'Completed\')" class="btn btn-success btn-sm">Complete</button> ' +
            '  <button onclick="markMeetingStatus(\'' + m.id + '\', \'Cancelled\')" class="btn btn-outline btn-sm">Cancel</button>' +
            '</td>' +
            '</tr>';
    }

    tbody.innerHTML = rowsHtml;
}

// Function to quickly change meeting status (e.g. Complete or Cancel).
function markMeetingStatus(meetingId, newStatus) {
    var confirmMsg = 'Are you sure you want to mark this meeting as ' + newStatus + '? It will move to the Archive.';
    if (!confirm(confirmMsg)) return;

    var meetings = loadData(STORAGE_KEYS.MEETINGS);
    for (var i = 0; i < meetings.length; i++) {
        if (meetings[i].id === meetingId) {
            meetings[i].status = newStatus;
            break;
        }
    }
    saveData(STORAGE_KEYS.MEETINGS, meetings);
    renderMeetingsList();
}

// Function to handle adding a new resident to the directory.
function handleAddResident(e) {
    e.preventDefault();

    var name = document.getElementById('resident-name').value.trim();
    var flat = document.getElementById('resident-flat').value.trim();

    if (!name || !flat) {
        alert('Please provide both the resident name and flat number.');
        return;
    }

    var residents = loadData(STORAGE_KEYS.RESIDENTS);

    var newResident = {
        id: generateId(),
        name: name,
        flat: flat
    };

    residents.push(newResident);
    saveData(STORAGE_KEYS.RESIDENTS, residents);

    document.getElementById('resident-form').reset();
    renderResidentsList();
    alert('Resident added successfully.');
}

// Function to render the list of residents in the table.
function renderResidentsList() {
    var tbody = document.getElementById('residents-table-body');
    if (!tbody) return;

    var residents = loadData(STORAGE_KEYS.RESIDENTS);
    var actions = loadData(STORAGE_KEYS.ACTIONS);

    if (residents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No residents registered yet. Add one above.</td></tr>';
        return;
    }

    var rowsHtml = '';
    for (var i = 0; i < residents.length; i++) {
        var res = residents[i];

        // Count how many actions are assigned to this resident
        var assignedCount = 0;
        for (var j = 0; j < actions.length; j++) {
            if (actions[j].assignedTo === res.id) {
                assignedCount++;
            }
        }

        rowsHtml += '<tr>' +
            '<td><strong>' + escapeHtml(res.name) + '</strong></td>' +
            '<td>' + escapeHtml(res.flat) + '</td>' +
            '<td>' + assignedCount + ' item(s)</td>' +
            '<td>' +
            '  <button onclick="deleteResident(\'' + res.id + '\')" class="btn btn-danger btn-sm">Delete</button>' +
            '</td>' +
            '</tr>';
    }

    tbody.innerHTML = rowsHtml;
}

// Function to delete a resident.
// RULE: Block deleting a resident who has assigned actions!
function deleteResident(residentId) {
    var actions = loadData(STORAGE_KEYS.ACTIONS);

    // Check if this resident has any assigned actions
    var assignedCount = 0;
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].assignedTo === residentId) {
            assignedCount++;
        }
    }

    if (assignedCount > 0) {
        alert('Notice: Deletion Blocked. This resident has ' + assignedCount + ' assigned action item(s). You cannot delete a resident with assigned actions.');
        return;
    }

    if (!confirm('Are you sure you want to remove this resident?')) {
        return;
    }

    var residents = loadData(STORAGE_KEYS.RESIDENTS);
    var updatedResidents = residents.filter(function (r) {
        return r.id !== residentId;
    });

    saveData(STORAGE_KEYS.RESIDENTS, updatedResidents);
    renderResidentsList();
}
