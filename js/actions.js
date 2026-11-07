// actions.js
// Handles displaying and filtering all community action items across all meetings.

document.addEventListener('DOMContentLoaded', function () {
    renderNavbar('actions');

    var filterSelect = document.getElementById('status-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', renderActionsTable);
    }

    renderActionsTable();
});

// Function to render the actions table with filtering.
function renderActionsTable() {
    var tbody = document.getElementById('actions-table-body');
    var statsDiv = document.getElementById('action-stats-summary');
    var filterSelect = document.getElementById('status-filter');
    if (!tbody) return;

    var selectedFilter = filterSelect ? filterSelect.value : 'ALL';

    var actions = loadData(STORAGE_KEYS.ACTIONS);
    var meetings = loadData(STORAGE_KEYS.MEETINGS);
    var residents = loadData(STORAGE_KEYS.RESIDENTS);

    // Build quick lookup maps for meetings and residents
    var meetingMap = {};
    for (var m = 0; m < meetings.length; m++) {
        meetingMap[meetings[m].id] = meetings[m];
    }

    var residentMap = {};
    for (var r = 0; r < residents.length; r++) {
        residentMap[residents[r].id] = residents[r];
    }

    // Filter actions according to dropdown selection
    var filtered = actions.filter(function (action) {
        var displayStatus = getActionDisplayStatus(action);

        if (selectedFilter === 'ALL') return true;
        if (selectedFilter === 'Overdue') return displayStatus === 'Overdue';
        return action.status === selectedFilter;
    });

    if (statsDiv) {
        statsDiv.textContent = 'Showing ' + filtered.length + ' of ' + actions.length + ' total action(s)';
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No action items found for the selected filter.</td></tr>';
        return;
    }

    // Sort by due date (soonest / overdue first)
    filtered.sort(function (a, b) {
        return a.dueDate.localeCompare(b.dueDate);
    });

    var rowsHtml = '';
    for (var i = 0; i < filtered.length; i++) {
        var act = filtered[i];
        var meeting = meetingMap[act.meetingId];
        var resident = residentMap[act.assignedTo];

        var meetingTitle = meeting ? meeting.title : 'Unknown Meeting';
        var meetingLink = meeting ? '<a href="meeting.html?id=' + encodeURIComponent(meeting.id) + '">' + escapeHtml(meetingTitle) + '</a>' : 'Unknown';
        if (meeting && (meeting.status === 'Completed' || meeting.status === 'Cancelled')) {
            meetingLink += ' <small class="text-muted">(' + meeting.status + ')</small>';
        }

        var residentDisplay = resident ? (escapeHtml(resident.name) + ' (' + escapeHtml(resident.flat) + ')') : 'Unassigned';
        var displayStatus = getActionDisplayStatus(act);

        rowsHtml += '<tr>' +
            '<td><strong>' + escapeHtml(act.description) + '</strong></td>' +
            '<td>' + meetingLink + '</td>' +
            '<td>' + residentDisplay + '</td>' +
            '<td>' + formatDate(act.dueDate) + '</td>' +
            '<td>' + getStatusBadge(displayStatus) + '</td>' +
            '<td>' +
            '  <select class="form-control" style="width: 140px; display: inline-block;" onchange="changeActionStatus(\'' + act.id + '\', this.value)">' +
            '    <option value="Pending"' + (act.status === 'Pending' ? ' selected' : '') + '>Pending</option>' +
            '    <option value="In Progress"' + (act.status === 'In Progress' ? ' selected' : '') + '>In Progress</option>' +
            '    <option value="Completed"' + (act.status === 'Completed' ? ' selected' : '') + '>Completed</option>' +
            '  </select>' +
            '</td>' +
            '</tr>';
    }

    tbody.innerHTML = rowsHtml;
}

// Function to handle changing an action item's status.
// Note: Allowed even if the parent meeting is archived!
function changeActionStatus(actionId, newStatus) {
    var actions = loadData(STORAGE_KEYS.ACTIONS);
    for (var i = 0; i < actions.length; i++) {
        if (actions[i].id === actionId) {
            actions[i].status = newStatus;
            break;
        }
    }
    saveData(STORAGE_KEYS.ACTIONS, actions);
    renderActionsTable();
}
