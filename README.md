# Community Meeting and Decision Tracker

A simple and lightweight web application designed for community associations to manage meetings, record decisions, and track action items.

## Key Features

- Meeting Scheduling: Schedule meetings with details like title, date, time, venue, and status.
- Agendas and Minutes: Create agenda items and document official meeting minutes.
- Attendance Tracking: Record member attendance as Present, Absent, or Apology.
- Decisions and Action Items: Record decisions and assign action items with due dates to residents.
- Dashboard and Reminders: View summary statistics, upcoming meetings, and overdue action alerts.
- Meeting Archive: Access and search past meetings by title or month.
- Local Storage Persistence: All data is saved directly in your web browser with no server or database needed.

## Project Structure

- index.html: Dashboard with summary metrics and reminders.
- meetings.html: Meeting scheduling, meeting list, and resident management.
- meeting.html: Detailed meeting view for agendas, attendance, minutes, and decisions.
- actions.html: Master list of all action items with status updates.
- archive.html: Searchable archive of completed and cancelled meetings.
- css/style.css: Shared styles and layout for the application.
- js/: JavaScript files for application logic and browser storage.

## How to Run

1. Clone or download the repository.
2. Open index.html in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
3. Click "Load Sample Data" on the dashboard to quickly explore the application.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla ES6)
- Browser LocalStorage API
