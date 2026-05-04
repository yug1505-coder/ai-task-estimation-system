# Project Structure

## AI Task Estimation System - Organized Architecture

```
ai-task-estimation-system/
├── frontend/                    # Frontend Application
│   ├── index.html              # Main HTML file
│   ├── script.js               # Frontend JavaScript logic
│   ├── style.css               # Frontend styling
│   └── [assets/]               # (Optional) Images, fonts, etc.
│
├── backend/                     # Backend API & Server
│   ├── server.js               # Express server entry point
│   ├── db.js                   # Database configuration
│   ├── queries.js              # Database queries
│   ├── package.json            # Backend dependencies
│   ├── .env                    # Environment variables (git-ignored)
│   ├── models/                 # Data models
│   │   ├── Task.js             # Task model
│   │   └── User.js             # User model
│   ├── node_modules/           # Backend dependencies (git-ignored)
│   ├── local-db.json           # Local database file
│   └── [routes/]               # (Optional) API route handlers
│
├── database/                    # Database Documentation
│   └── queries_reference.sql   # SQL queries reference
│
├── report/                      # Project Report/Documentation
│   ├── main.tex                # Main LaTeX file
│   ├── references.bib          # Bibliography
│   ├── chapters/               # Report chapters
│   └── images/                 # Report images
│
├── package.json                # Root project configuration
├── README.md                   # Project documentation
└── .gitignore                  # Git ignore rules
```

## Directory Purposes

### Frontend (`/frontend`)
- Contains all client-side code and assets
- Communicates with backend API at `http://localhost:3000`
- Served via HTTP (development) or static hosting (production)

### Backend (`/backend`)
- Node.js/Express API server
- Handles business logic, authentication, and data processing
- Connects to database (local JSON or MongoDB)
- Runs on port 3000

### Database (`/database`)
- SQL queries reference for database operations
- Schema documentation

### Report (`/report`)
- LaTeX-based project documentation
- Academic/professional report writing

## Running the Project

### Development Mode
```bash
npm run backend:dev      # Start backend with nodemon
npm run frontend:dev     # Start frontend dev server
```

### Production Mode
```bash
npm start               # Start backend server
```

## Key Technologies

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js, Mongoose/MongoDB
- **Database**: MongoDB or JSON-based local DB
- **Documentation**: LaTeX
