# LinkedIn Saved Post Together

A lightweight full-stack app for saving, organizing, and revisiting LinkedIn posts. Users can paste a LinkedIn post URL, save it into a chosen group, mark important posts as reminders, and browse saved content by group and date.

## Features

- Save LinkedIn post links
- Extract post metadata such as author, text, and media
- Organize posts into groups like:
  - Work
  - Personal
  - General
- Mark posts as reminders with a bell/flag button
- View saved posts grouped by date
- Local JSON-based storage for easy setup and demo use
- Responsive UI with Tailwind CSS

## Tech Stack

- Frontend: HTML, JavaScript, Tailwind CSS
- Backend: Node.js, Express
- Storage: JSON file (`posts.json`)
- Scraping: Node-based fetch/scraping flow used by the backend

## Project Structure

```text
.
├── index.html
├── script.js
├── index.js
├── posts.json
├── package.json
├── README.md
└── .gitignore
```

## Installation

1. Clone the repository

```bash
git clone <your-repo-url>
cd linkedin_saved_post_together
```

2. Install dependencies

```bash
npm install
```

3. Start the backend server

```bash
node index.js
```

4. Open the app in the browser

Open `index.html` in your browser.

> The app expects the backend server to be running on `http://localhost:3000`.

## Usage

1. Paste a LinkedIn post URL into the input box.
2. Choose a group from the dropdown (`All Groups`, `Work`, `Personal`).
3. Click the Save button.
4. Saved posts appear in the list.
5. Use the reminder button to mark important posts.
6. Filter by group or browse saved posts by date.

## Notes

- This project is designed as a local personal project and stores saved data in `posts.json`.
- It is ideal for learning full-stack app flow, browser + server communication, and simple data organization.
- If you want to upgrade it for production, the next steps would be to move to a real database and deploy the backend.

## Future Improvements

- Add user authentication
- Replace local JSON storage with MongoDB or PostgreSQL
- Add search and tag filtering
- Create a proper dashboard with edit/delete actions
- Improve scraping reliability for different LinkedIn page layouts

## License

This project is for educational and personal use.

## Author

Created for organizing saved LinkedIn content in a simple, efficient way.
