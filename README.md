# Online Quiz System

An Online Quiz System developed using HTML, CSS, JavaScript, Node.js, Express.js, and MongoDB. The application allows students to attempt quizzes online and enables administrators to manage quizzes and view student results.

## Features

- User registration and login
- Secure authentication using JSON Web Tokens (JWT)
- Role-based access for administrators and students
- Create and manage quizzes
- Multiple-choice questions
- Quiz timer
- Automatic score calculation
- Student result tracking
- Admin dashboard for managing quizzes and reviewing results
- Responsive user interface

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- REST API

### Database
- MongoDB
- Mongoose

### Authentication and Security
- JSON Web Token (JWT)
- bcryptjs for password hashing

## Project Structure

```text
Online-Quiz-System/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/sunilkumar9915/Online-Quiz-System.git
cd Online-Quiz-System
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` folder and add your own configuration:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
```

Use the exact environment variable names expected by your backend code. Never upload your `.env` file or real credentials to GitHub.

### 4. Start the backend

```bash
npm start
```

The backend should run on the port configured in your environment variables.

### 5. Run the frontend

Open `frontend/index.html` in your browser or use the VS Code Live Server extension if your frontend setup supports it.

Make sure the frontend API URL matches the backend address.

## How It Works

1. Users register or log in.
2. The system authenticates users.
3. Students select an available quiz.
4. Students answer questions within the allowed time.
5. The system calculates the score and displays the result.
6. Administrators manage quizzes and review student results.

## Future Enhancements

- Add more question types.
- Improve the reporting and analytics dashboard.
- Add quiz categories and difficulty levels.
- Deploy the application to a cloud hosting platform.

## Author

**Sunil Kumar**

GitHub: [sunilkumar9915](https://github.com/sunilkumar9915)

## License

This project is available for educational and learning purposes.
