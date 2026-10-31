# Online Quiz System

A full-stack web application that allows students to register, log in, attempt online quizzes, and view their results. Administrators can create and manage quizzes and monitor student performance.

## Live Demo

- **Frontend:** https://frolicking-douhua-958620.netlify.app/
- **Backend API:** https://online-quiz-system-991.onrender.com

## Features

### Student
- Student registration and login
- Secure authentication using JWT
- View available quizzes
- Attempt quizzes with a countdown timer
- Automatic score and percentage calculation
- View previous quiz results

### Admin
- Admin login and dashboard
- Create and manage quizzes
- Add questions and multiple-choice options
- Set quiz duration
- View student results and performance

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and layout |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend framework |
| MongoDB | Database |
| Mongoose | Database modeling |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Netlify | Frontend deployment |
| Render | Backend deployment |

## Project Structure

```text
Online-Quiz-System/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sunilkumar9915/Online-Quiz-System.git
```

### 2. Open the Project

```bash
cd Online-Quiz-System
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Use your own MongoDB connection string and JWT secret. Never upload your actual `.env` file or credentials to GitHub.

### 5. Start the Backend

```bash
npm run dev
```

The backend will run at:

`http://localhost:5000`

## Screenshots

Add your project screenshots here:

- Login and Registration Page
- Student Dashboard
- Quiz Interface
- Quiz Result Page
- Admin Dashboard

## Future Enhancements

- More quiz categories
- Question randomization
- Improved performance analytics
- Enhanced security and validation

## Author

**Sunil Kumar**

GitHub: https://github.com/sunilkumar9915

## License

This project is developed for academic and educational purposes.