// archive.js
// Handles displaying, searching, and filtering archived (Completed and Cancelled) meetings.

document.addEventListener('DOMContentLoaded', function () {
    renderNavbar('archive');

    var searchInput = document.getElementById('search-title');
    if (searchInput) {
        searchInput.addEventListener('input', renderArchiveTable);
    }

    var monthFilter = document.getElementById('filter-month');
    if (monthFilter) {
        monthFilter.addEventListener('change', renderArchiveTable);
    }

    renderArchiveTable();
});

// Function to render the archived meetings table.
function renderArchiveTable() {
    var tbody = document.getElementById('archive-table-body');
    var countDisplay = document.getElementById('archive-count-display');
    if (!tbody) return;

    var searchTitle = (document.getElementById('search-title').value || '').trim().toLowerCase();
    var monthFilter = (document.getElementById('filter-month').value || '').trim();

    var allMeetings = loadData(STORAGE_KEYS.MEETINGS);

    // Filter only Completed and Cancelled meetings
    var archived = allMeetings.filter(function (m) {
        var isArchivedStatus = (m.status === 'Completed' || m.status === 'Cancelled');
        if (!isArchivedStatus) return false;

        // Search by title
        if (searchTitle && m.title.toLowerCase().indexOf(searchTitle) === -1) {
            return false;
        }

        // Filter by month (YYYY-MM)
        if (monthFilter && !m.date.startsWith(monthFilter)) {
            return false;
        }

        return true;
    });

    if (countDisplay) {
        countDisplay.textContent = archived.length + ' archived meeting(s)';
    }

    if (archived.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No archived meetings match your search or filter criteria.</td></tr>';
        return;
    }

    // Sort by date descending (most recent first)
    archived.sort(function (a, b) {
        return (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time);
    });

    var rowsHtml = '';
    for (var i = 0; i < archived.length; i++) {
        var m = archived[i];

        rowsHtml += '<tr>' +
            '<td><strong>' + escapeHtml(m.title) + '</strong></td>' +
            '<td>' + formatDate(m.date) + '</td>' +
            '<td>' + m.time + '</td>' +
            '<td>' + escapeHtml(m.venue) + '</td>' +
            '<td>' + getStatusBadge(m.status) + '</td>' +
            '<td>' +
            '  <button onclick="viewArchivedRecord(\'' + m.id + '\')" class="btn btn-primary btn-sm">View Record</button> ' +
            '  <a href="meeting.html?id=' + encodeURIComponent(m.id) + '" class="btn btn-outline btn-sm">Full Page</a>' +
            '</td>' +
            '</tr>';
    }

    tbody.innerHTML = rowsHtml;
}

// Function to reset search and filter inputs.
function resetFilters() {
    var searchInput = document.getElementById('search-title');
    var monthFilter = document.getElementById('filter-month');
    if (searchInput) searchInput.value = '';
    if (monthFilter) monthFilter.value = '';
    renderArchiveTable();
}

// Function to show read-only details of an archived meeting.
function viewArchivedRecord(meetingId) {
    var allMeetings = loadData(STORAGE_KEYS.MEETINGS);
    var meeting = null;
    for (var i = 0; i < allMeetings.length; i++) {
        if (allMeetings[i].id === meetingId) {
            meeting = allMeetings[i];
            break;
        }
    }

    if (!meeting) return;

    var detailCard = document.getElementById('archive-detail-card');
    var detailTitle = document.getElementById('archive-detail-title');
    var detailContent = document.getElementById('archive-detail-content');

    detailTitle.innerHTML = 'Archived Record: ' + escapeHtml(meeting.title) + ' ' + getStatusBadge(meeting.status);

    var residents = loadData(STORAGE_KEYS.RESIDENTS);
    var decisions = loadData(STORAGE_KEYS.DECISIONS);
    var actions = loadData(STORAGE_KEYS.ACTIONS);

    var residentMap = {};
    for (var r = 0; r < residents.length; r++) {
        residentMap[residents[r].id] = residents[r];
    }

    var meetingDecisions = decisions.filter(function (d) { return d.meetingId === meeting.id; });
    var meetingActions = actions.filter(function (a) { return a.meetingId === meeting.id; });

    var html = '' +
        '<div class="mb-12">' +
        '  <p><strong>Date and Time:</strong> ' + formatDate(meeting.date) + ' at ' + meeting.time + '</p>' +
        '  <p><strong>Venue:</strong> ' + escapeHtml(meeting.venue) + '</p>' +
        '</div>' +
        '<hr style="border: 0; border-top: 1px solid #EBEBEB; margin: 16px 0;">' +
        '<h4>Agenda Topics:</h4>';

    if (!meeting.agenda || meeting.agenda.length === 0) {
        html += '<p class="text-muted">No agenda topics recorded.</p>';
    } else {
        html += '<ol style="padding-left: 20px; margin: 8px 0;">';
        for (var a = 0; a < meeting.agenda.length; a++) {
            html += '<li>' + escapeHtml(meeting.agenda[a].text) + '</li>';
        }
        html += '</ol>';
    }

    html += '<h4 class="mt-12">Official Minutes:</h4>';
    if (!meeting.minutes) {
        html += '<p class="text-muted">No minutes recorded for this meeting.</p>';
    } else {
        html += '<div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; border: 1px solid #EBEBEB; margin: 8px 0;">' +
            escapeHtml(meeting.minutes).replace(/\n/g, '<br>') +
            '</div>';
    }

    html += '<h4 class="mt-12">Decisions and Outcomes:</h4>';
    if (meetingDecisions.length === 0) {
        html += '<p class="text-muted">No decisions recorded.</p>';
    } else {
        html += '<ul style="padding-left: 20px; margin: 8px 0;">';
        for (var d = 0; d < meetingDecisions.length; d++) {
            var dec = meetingDecisions[d];
            var decActs = meetingActions.filter(function (act) { return act.decisionId === dec.id; });
            html += '<li class="mb-12"><strong>Decision:</strong> ' + escapeHtml(dec.text);
            if (decActs.length > 0) {
                html += '<ul style="margin-top: 6px;">';
                for (var da = 0; da < decActs.length; da++) {
                    var act = decActs[da];
                    var res = residentMap[act.assignedTo];
                    var resName = res ? res.name + ' (' + res.flat + ')' : 'Unassigned';
                    var dispStatus = getActionDisplayStatus(act);
                    html += '<li>Action: ' + escapeHtml(act.description) + ' - Assigned to ' + escapeHtml(resName) + ' (Due: ' + formatDate(act.dueDate) + ') ' + getStatusBadge(dispStatus) + '</li>';
                }
                html += '</ul>';
            }
            html += '</li>';
        }
        html += '</ul>';
    }

    detailContent.innerHTML = html;
    detailCard.style.display = 'block';
    detailCard.scrollIntoView({ behavior: 'smooth' });
}

// Function to close the detail section.
function closeArchiveDetail() {
    var detailCard = document.getElementById('archive-detail-card');
    if (detailCard) {
        detailCard.style.display = 'none';
    }
}
