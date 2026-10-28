const API_URL = "https://online-quiz-system-991.onrender.com";

let token = localStorage.getItem("token");
let quizzes = [];
let currentQuiz = null;
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let timerInterval = null;
let timeLeft = 0;
let answers = [];
let isFinishing = false;

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const quizBox = document.getElementById("quizBox");
const questionBox = document.getElementById("questionBox");
const resultBox = document.getElementById("resultBox");
const userDashboard = document.getElementById("userDashboard");
const adminBox = document.getElementById("adminBox");

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
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}

function hideAllBoxes() {
    [loginBox, registerBox, quizBox, questionBox, resultBox, userDashboard, adminBox]
        .filter(Boolean)
        .forEach(box => box.classList.add("hidden"));
}

function showLogin() {
    hideAllBoxes();
    loginBox.classList.remove("hidden");
}

function showRegister() {
    hideAllBoxes();
    registerBox.classList.remove("hidden");
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    if (!email || !password) {
        message.textContent = "Please enter email and password.";
        return;
    }

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (!data.token) {
            throw new Error("Login response did not contain a token.");
        }

        token = data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(data.user || {}));
        message.textContent = "";

        await loadQuizzes();
    } catch (error) {
        message.textContent = error.message;
    }
}

async function register() {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const message = document.getElementById("registerMessage");

    if (!name || !email || !password) {
        message.textContent = "Please fill in all fields.";
        return;
    }

    try {
        const data = await apiRequest("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        message.textContent = data.message || "Account created. Please log in.";
    } catch (error) {
        message.textContent = error.message;
    }
}

async function loadQuizzes() {
    try {
        const data = await apiRequest("/api/quizzes");
        quizzes = Array.isArray(data) ? data : (data.quizzes || []);

        hideAllBoxes();
        quizBox.classList.remove("hidden");

        const quizList = document.getElementById("quizList");
        quizList.replaceChildren();

        if (!quizzes.length) {
            quizList.textContent = "No quizzes available.";
            return;
        }

        quizzes.forEach((quiz, index) => {
            const card = document.createElement("div");
            card.className = "quiz-card";

            const title = document.createElement("h2");
            title.textContent = quiz.title || "Untitled Quiz";

            const duration = document.createElement("p");
            duration.textContent = `Duration: ${Number(quiz.duration) || 10} minutes`;

            const count = document.createElement("p");
            count.textContent = `Questions: ${Array.isArray(quiz.questions) ? quiz.questions.length : 0}`;

            const startButton = document.createElement("button");
            startButton.type = "button";
            startButton.textContent = "Start Quiz";
            startButton.addEventListener("click", () => startQuiz(index));

            card.append(title, duration, count, startButton);
            quizList.appendChild(card);
        });
    } catch (error) {
        alert(error.message);

        if (error.message.toLowerCase().includes("token")) {
            logout();
        }
    }
}

function startQuiz(index) {
    currentQuiz = quizzes[index];

    if (!currentQuiz || !Array.isArray(currentQuiz.questions) || currentQuiz.questions.length === 0) {
        alert("This quiz has no questions. Please check the quiz data in the database.");
        return;
    }

    const invalidQuestion = currentQuiz.questions.find(item =>
        !item || typeof item.question !== "string" ||
        !Array.isArray(item.options) || item.options.length === 0
    );

    if (invalidQuestion) {
        alert("A question or its options are missing in this quiz. Please correct the quiz data.");
        return;
    }

    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    answers = new Array(currentQuiz.questions.length).fill(null);
    isFinishing = false;

    clearInterval(timerInterval);

    hideAllBoxes();
    questionBox.classList.remove("hidden");

    document.getElementById("quizTitle").textContent = currentQuiz.title || "Quiz";
    document.getElementById("quizDuration").textContent = String(Number(currentQuiz.duration) || 10);

    timeLeft = Math.max(1, Number(currentQuiz.duration) || 10) * 60;

    showQuestion();
    startTimer();
}

function startTimer() {
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timer = document.getElementById("timer");
    if (!timer) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showQuestion() {
    const questionData = currentQuiz?.questions?.[currentQuestion];

    if (!questionData) {
        alert("Question data is missing.");
        return;
    }

    selectedAnswer = answers[currentQuestion];

    document.getElementById("questionNumber").textContent =
        `${currentQuestion + 1} / ${currentQuiz.questions.length}`;

    document.getElementById("question").textContent = questionData.question;

    const optionsContainer = document.getElementById("options");
    optionsContainer.replaceChildren();

    questionData.options.forEach((option, index) => {
        const optionText = typeof option === "string"
            ? option
            : option?.text ?? option?.option ?? option?.value ?? "";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "option";
        button.textContent = String(optionText);
        button.classList.toggle("selected", selectedAnswer === index);

        button.addEventListener("click", () => {
            selectedAnswer = index;
            answers[currentQuestion] = index;

            optionsContainer.querySelectorAll(".option").forEach(item =>
                item.classList.remove("selected")
            );

            button.classList.add("selected");
        });

        optionsContainer.appendChild(button);
    });

    const backButton = document.getElementById("backButton");
    const nextButton = document.getElementById("nextButton");

    backButton.disabled = currentQuestion === 0;
    nextButton.textContent =
        currentQuestion === currentQuiz.questions.length - 1 ? "Submit Quiz" : "Next →";
}

function previousQuestion() {
    if (currentQuestion <= 0) return;

    currentQuestion--;
    showQuestion();
}

function nextQuestion() {
    if (selectedAnswer === null) {
        alert("Please select an answer.");
        return;
    }

    if (currentQuestion < currentQuiz.questions.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        finishQuiz();
    }
}

function isCorrectAnswerForQuestion(questionData, selectedIndex) {
    const selectedOption = questionData.options[selectedIndex];

    const selectedValue = typeof selectedOption === "string"
        ? selectedOption
        : selectedOption?.text ?? selectedOption?.option ?? selectedOption?.value ?? "";

    const correctValue = typeof questionData.answer === "string"
        ? questionData.answer
        : questionData.answer?.text ?? questionData.answer?.option ?? questionData.answer?.value ?? "";

    const selectedText = String(selectedValue).trim().toLowerCase();
    const correctText = String(correctValue).trim().toLowerCase();

    if (selectedText === correctText) return true;

    const correctIndex = questionData.options.findIndex(option => {
        const value = typeof option === "string"
            ? option
            : option?.text ?? option?.option ?? option?.value ?? "";

        return String(value).trim().toLowerCase() === correctText;
    });

    if (correctIndex !== -1) return correctIndex === selectedIndex;

    if (/^[1-4]$/.test(correctText)) {
        return selectedIndex === Number(correctText) - 1;
    }

    return false;
}

async function finishQuiz() {
    if (!currentQuiz || isFinishing) return;

    isFinishing = true;
    clearInterval(timerInterval);

    score = 0;

    currentQuiz.questions.forEach((questionData, index) => {
        if (answers[index] !== null && isCorrectAnswerForQuestion(questionData, answers[index])) {
            score++;
        }
    });

    hideAllBoxes();
    resultBox.classList.remove("hidden");

    const total = currentQuiz.questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const resultElement = document.getElementById("result");

    resultElement.textContent =
        `You scored ${score} out of ${total}. Percentage: ${percentage}%. Saving result...`;

    try {
        await apiRequest("/api/results", {
            method: "POST",
            body: JSON.stringify({
                quiz: currentQuiz._id,
                score,
                totalQuestions: total,
                percentage
            })
        });

        resultElement.textContent =
            `You scored ${score} out of ${total}. Percentage: ${percentage}%. Result saved successfully.`;
    } catch (error) {
        console.error("Unable to save quiz result:", error.message);

        resultElement.textContent =
            `You scored ${score} out of ${total}. Percentage: ${percentage}%. Result could not be saved: ${error.message}`;
    } finally {
        isFinishing = false;
    }
}

async function showQuizzes() {
    clearInterval(timerInterval);
    isFinishing = false;
    await loadQuizzes();
}

async function showDashboard() {
    clearInterval(timerInterval);

    hideAllBoxes();
    userDashboard.classList.remove("hidden");

    const container = document.getElementById("myResultsList");
    container.textContent = "Loading results...";

    try {
        const data = await apiRequest("/api/results/my-results");
        const results = Array.isArray(data) ? data : (data.results || []);

        container.replaceChildren();

        if (!results.length) {
            container.textContent = "No quiz results available yet.";
            return;
        }

        results.forEach(item => {
            const row = document.createElement("div");
            row.className = "quiz-card";

            const title = document.createElement("h3");
            title.textContent = item.quiz?.title || item.quizTitle || "Quiz";

            const scoreText = document.createElement("p");
            scoreText.textContent =
                `Score: ${item.score ?? 0}/${item.totalQuestions ?? 0} (${item.percentage ?? 0}%)`;

            row.append(title, scoreText);
            container.appendChild(row);
        });
    } catch (error) {
        container.textContent = error.message;
    }
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
    answers = [];
    isFinishing = false;

    hideAllBoxes();
    loginBox.classList.remove("hidden");

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginMessage").textContent = "";
}

if (token) {
    hideAllBoxes();
    loadQuizzes();
}