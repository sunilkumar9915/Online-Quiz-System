const API_URL = "https://online-quiz-system-991.onrender.com";

let token = localStorage.getItem("token");
let quizzes = [];
let currentQuiz = null;
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let timerInterval = null;
let timeLeft = 0;

const loginBox = document.getElementById("loginBox");
const quizBox = document.getElementById("quizBox");
const questionBox = document.getElementById("questionBox");
const resultBox = document.getElementById("resultBox");

async function apiRequest(endpoint, options = {}) {
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const loginMessage = document.getElementById("loginMessage");

    if (!email || !password) {
        loginMessage.textContent = "Please enter email and password";
        return;
    }

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        token = data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(data.user));

        loginBox.classList.add("hidden");
        loginMessage.textContent = "";

        await loadQuizzes();
    } catch (error) {
        loginMessage.textContent = error.message;
    }
}

async function signup() {
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const loginMessage = document.getElementById("loginMessage");

    if (!name || !email || !password) {
        loginMessage.textContent = "Please fill in all fields";
        return;
    }

    try {
        const data = await apiRequest("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        loginMessage.textContent = data.message || "Registration successful. Please log in.";
    } catch (error) {
        loginMessage.textContent = error.message;
    }
}

async function loadQuizzes() {
    try {
        const data = await apiRequest("/api/quizzes");

        quizzes = Array.isArray(data) ? data : data.quizzes || [];

        quizBox.classList.remove("hidden");
        questionBox.classList.add("hidden");
        resultBox.classList.add("hidden");

        const quizList = document.getElementById("quizList");
        quizList.innerHTML = "";

        if (quizzes.length === 0) {
            quizList.textContent = "No quizzes available";
            return;
        }

        quizzes.forEach((quiz, index) => {
            const card = document.createElement("div");
            card.className = "quiz-card";

            const title = document.createElement("h2");
            title.textContent = quiz.title;

            const duration = document.createElement("p");
            duration.textContent = `Duration: ${quiz.duration} minutes`;

            const count = document.createElement("p");
            count.textContent = `Questions: ${(quiz.questions || []).length}`;

            const startButton = document.createElement("button");
            startButton.textContent = "Start Quiz";
            startButton.addEventListener("click", () => startQuiz(index));

            card.append(title, duration, count, startButton);
            quizList.appendChild(card);
        });
    } catch (error) {
        alert(error.message);
    }
}

function startQuiz(index) {
    currentQuiz = quizzes[index];

    if (!currentQuiz || !Array.isArray(currentQuiz.questions) ||
        currentQuiz.questions.length === 0) {
        alert("This quiz has no questions.");
        return;
    }

    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;

    clearInterval(timerInterval);

    quizBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    questionBox.classList.remove("hidden");

    document.getElementById("quizTitle").textContent = currentQuiz.title;
    document.getElementById("quizDuration").textContent = currentQuiz.duration;

    timeLeft = Number(currentQuiz.duration || 10) * 60;
    startTimer();
    showQuestion();
}

function startTimer() {
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    let timer = document.getElementById("timer");

    if (!timer) {
        timer = document.createElement("p");
        timer.id = "timer";
        questionBox.insertBefore(timer, questionBox.firstChild);
    }

    const minutes = Math.floor(Math.max(0, timeLeft) / 60);
    const seconds = Math.max(0, timeLeft) % 60;

    timer.textContent =
        `Time Left: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showQuestion() {
    const questionData = currentQuiz.questions[currentQuestion];

    selectedAnswer = null;

    document.getElementById("questionNumber").textContent =
        `${currentQuestion + 1} / ${currentQuiz.questions.length}`;

    document.getElementById("question").textContent = questionData.question;

    const optionsContainer = document.getElementById("options");
    optionsContainer.innerHTML = "";

    const choices = Array.isArray(questionData.options)
        ? questionData.options
        : [];

    choices.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option";

        const optionText = typeof option === "string"
            ? option
            : option.text ?? option.option ?? option.value ?? "";

        button.textContent = optionText;

        button.addEventListener("click", () => {
            optionsContainer.querySelectorAll(".option").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            selectedAnswer = option;
        });

        optionsContainer.appendChild(button);
    });

    const nextButton = questionBox.querySelector("button[onclick='nextQuestion()']");

    if (nextButton) {
        nextButton.textContent =
            currentQuestion === currentQuiz.questions.length - 1
                ? "Submit Quiz"
                : "Next";
    }
}

function isCorrectAnswer(selected, correct) {
    const selectedValue = typeof selected === "string"
        ? selected
        : selected.text ?? selected.option ?? selected.value;

    const correctValue = typeof correct === "string"
        ? correct
        : correct?.text ?? correct?.option ?? correct?.value;

    return String(selectedValue).trim().toLowerCase() ===
        String(correctValue).trim().toLowerCase();
}

function nextQuestion() {
    if (selectedAnswer === null) {
        alert("Please select an answer");
        return;
    }

    const questionData = currentQuiz.questions[currentQuestion];

    if (isCorrectAnswer(selectedAnswer, questionData.answer)) {
        score++;
    }

    currentQuestion++;

    if (currentQuestion < currentQuiz.questions.length) {
        showQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    clearInterval(timerInterval);

    questionBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    const total = currentQuiz.questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    document.getElementById("result").textContent =
        `You scored ${score} out of ${total}. Percentage: ${percentage}%`;

    try {
        await apiRequest("/api/results", {
            method: "POST",
            body: JSON.stringify({
                quizId: currentQuiz._id,
                score,
                totalQuestions: total,
                percentage
            })
        });
    } catch (error) {
        console.error("Unable to save quiz result:", error.message);
    }
}

async function showQuizzes() {
    clearInterval(timerInterval);

    resultBox.classList.add("hidden");
    questionBox.classList.add("hidden");
    quizBox.classList.remove("hidden");

    await loadQuizzes();
}

function logout() {
    clearInterval(timerInterval);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    quizzes = [];
    currentQuiz = null;
    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;

    quizBox.classList.add("hidden");
    questionBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    loginBox.classList.remove("hidden");

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginMessage").textContent = "";
}

async function loadMyResults() {
    try {
        return await apiRequest("/api/results/my-results");
    } catch (error) {
        alert(error.message);
        return [];
    }
}

async function loadStats() {
    try {
        return await apiRequest("/api/auth/stats");
    } catch (error) {
        alert(error.message);
        return null;
    }
}

if (token) {
    loginBox.classList.add("hidden");
    loadQuizzes();
}
