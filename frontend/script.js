
const API_URL = "https://online-quiz-system-991.onrender.com";

let token = localStorage.getItem("token");
let currentUser = {};

try {
    currentUser = JSON.parse(localStorage.getItem("user") || "{}");
} catch {
    currentUser = {};
}

let quizzes = [];
let currentQuiz = null;
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let timerInterval = null;
let timeLeft = 0;
let quizFinished = false;

const get = id => document.getElementById(id);

function hideAllBoxes() {
    [
        "loginBox",
        "registerBox",
        "quizBox",
        "questionBox",
        "resultBox",
        "userDashboard",
        "adminBox"
    ].forEach(id => {
        const element = get(id);
        if (element) element.classList.add("hidden");
    });
}

function showBox(id) {
    hideAllBoxes();

    const element = get(id);
    if (element) element.classList.remove("hidden");
}

function setMessage(id, message) {
    const element = get(id);
    if (element) element.textContent = message;
}

async function apiRequest(path, options = {}) {
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed with status ${response.status}`
        );
    }

    return data;
}

function logout() {
    stopTimer();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    currentUser = {};
    currentQuiz = null;
    quizzes = [];
    selectedAnswer = null;

    showBox("loginBox");

    setMessage("loginMessage", "");
    setMessage("registerMessage", "");
    setMessage("adminMessage", "");
}

async function login(event) {
    if (event) event.preventDefault();

    const email = get("email")?.value.trim();
    const password = get("password")?.value;

    if (!email || !password) {
        setMessage("loginMessage", "Please enter email and password.");
        return;
    }

    setMessage("loginMessage", "Logging in...");

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (!data.token || !data.user) {
            throw new Error("Login response is incomplete.");
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(currentUser));

        setMessage("loginMessage", "");

        if (currentUser.role === "admin") {
            await showAdminDashboard();
        } else {
            await loadQuizzes();
        }
    } catch (error) {
        setMessage("loginMessage", error.message || "Login failed.");
    }
}

async function register(event) {
    if (event) event.preventDefault();

    const name = get("registerName")?.value.trim();
    const email = get("registerEmail")?.value.trim();
    const password = get("registerPassword")?.value;

    if (!name || !email || !password) {
        setMessage("registerMessage", "Please fill in all fields.");
        return;
    }

    if (password.length < 6) {
        setMessage(
            "registerMessage",
            "Password must be at least 6 characters."
        );
        return;
    }

    setMessage("registerMessage", "Creating your account...");

    try {
        const data = await apiRequest("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        setMessage(
            "loginMessage",
            data.message || "Account created successfully. Please log in."
        );

        setMessage("registerMessage", "");

        if (get("loginForm")) get("loginForm").reset();
        if (get("registerForm")) get("registerForm").reset();

        showBox("loginBox");
    } catch (error) {
        setMessage(
            "registerMessage",
            error.message || "Account creation failed."
        );
    }
}

async function loadQuizzes() {
    try {
        const data = await apiRequest("/api/quizzes");

        quizzes = Array.isArray(data) ? data : data.quizzes || [];

        showBox("quizBox");
        renderQuizzes();
    } catch (error) {
        showBox("quizBox");

        const list = get("quizList");
        if (list) {
            list.textContent =
                error.message || "Unable to load quizzes.";
        }
    }
}

function renderQuizzes() {
    const list = get("quizList");
    if (!list) return;

    list.replaceChildren();

    if (!quizzes.length) {
        list.textContent = "No quizzes available.";
        return;
    }

    quizzes.forEach((quiz, index) => {
        const card = document.createElement("div");
        card.className = "quiz-card";

        const title = document.createElement("h2");
        title.textContent = quiz.title || "Untitled Quiz";

        const duration = document.createElement("p");
        duration.textContent =
            `Duration: ${Number(quiz.duration || 10)} minutes`;

        const count = document.createElement("p");
        count.textContent =
            `Questions: ${(quiz.questions || []).length}`;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Start Quiz";
        button.addEventListener("click", () => startQuiz(index));

        card.append(title, duration, count, button);
        list.appendChild(card);
    });
}

function startQuiz(index) {
    currentQuiz = quizzes[index];

    if (!currentQuiz || !currentQuiz.questions?.length) {
        alert("This quiz has no questions.");
        return;
    }

    stopTimer();

    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    quizFinished = false;

    timeLeft = Math.max(
        1,
        Number(currentQuiz.duration || 10)
    ) * 60;

    showBox("questionBox");

    if (get("quizTitle")) {
        get("quizTitle").textContent =
            currentQuiz.title || "Quiz";
    }

    setMessage("questionMessage", "");
    showQuestion();
    startTimer();
}

function showQuestion() {
    if (!currentQuiz || quizFinished) return;

    const questionData = currentQuiz.questions[currentQuestion];

    if (!questionData) {
        finishQuiz();
        return;
    }

    selectedAnswer = null;

    if (get("questionNumber")) {
        get("questionNumber").textContent =
            `${currentQuestion + 1} / ${currentQuiz.questions.length}`;
    }

    if (get("question")) {
        get("question").textContent =
            questionData.question || "";
    }

    setMessage("questionMessage", "");

    const optionsContainer = get("options");
    if (!optionsContainer) return;

    optionsContainer.replaceChildren();

    const options = Array.isArray(questionData.options)
        ? questionData.options
        : [];

    options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option";

        const optionText =
            typeof option === "object" && option !== null
                ? option.text ?? option.option ?? option.label ?? ""
                : option;

        button.textContent = String(optionText);

        button.addEventListener("click", () => {
            if (quizFinished) return;

            optionsContainer.querySelectorAll(".option").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            selectedAnswer = {
                index,
                value: String(optionText).trim()
            };

            setMessage("questionMessage", "");
        });

        optionsContainer.appendChild(button);
    });
}

function startTimer() {
    stopTimer();
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (quizFinished) {
            stopTimer();
            return;
        }

        timeLeft = Math.max(0, timeLeft - 1);
        updateTimerDisplay();

        if (timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const timer = get("quizTimer");
    if (!timer) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function nextQuestion() {
    if (!currentQuiz || quizFinished) return;

    if (!selectedAnswer) {
        setMessage("questionMessage", "Please select an answer.");
        return;
    }

    const questionData = currentQuiz.questions[currentQuestion];
    const correct = questionData.answer;

    const correctValue =
        typeof correct === "object" && correct !== null
            ? correct.text ?? correct.option ?? correct.label ?? ""
            : correct;

    const chosenOption = questionData.options?.[selectedAnswer.index];

    const chosenValue =
        typeof chosenOption === "object" && chosenOption !== null
            ? chosenOption.text ?? chosenOption.option ?? chosenOption.label ?? ""
            : chosenOption;

    const correctIndex =
        typeof correct === "number"
            ? correct
            : typeof correctValue === "string" &&
              /^\d+$/.test(correctValue.trim())
                ? Number(correctValue)
                : -1;

    const isCorrect =
        (correctIndex >= 0 && selectedAnswer.index === correctIndex) ||
        String(selectedAnswer.value).trim().toLowerCase() ===
        String(correctValue).trim().toLowerCase() ||
        String(chosenValue).trim().toLowerCase() ===
        String(correctValue).trim().toLowerCase();

    if (isCorrect) {
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
    if (!currentQuiz || quizFinished) return;

    quizFinished = true;
    stopTimer();

    const total = currentQuiz.questions.length;
    const percentage = total
        ? Math.round((score / total) * 100)
        : 0;

    showBox("resultBox");

    if (get("result")) {
        get("result").textContent =
            `You scored ${score} out of ${total}. Percentage: ${percentage}%.`;
    }

    try {
        await apiRequest("/api/results", {
            method: "POST",
            body: JSON.stringify({
                quiz: currentQuiz._id || currentQuiz.id,
                score,
                totalQuestions: total,
                percentage
            })
        });
    } catch (error) {
        console.error("Could not save result:", error.message);

        if (get("result")) {
            get("result").textContent +=
                " Your result could not be saved to the server.";
        }
    }
}

function showQuizzes() {
    if (currentUser.role === "admin") {
        showAdminDashboard();
    } else {
        loadQuizzes();
    }
}

async function showDashboard() {
    try {
        const data = await apiRequest("/api/results/my-results");
        const results = Array.isArray(data) ? data : data.results || [];

        showBox("userDashboard");

        const container = get("userResults");
        if (!container) return;

        container.replaceChildren();

        if (!results.length) {
            container.textContent = "No quiz results yet.";
            return;
        }

        results.forEach(result => {
            const row = document.createElement("div");
            row.className = "result-card";

            const title = document.createElement("h3");
            title.textContent =
                result.quiz?.title || result.quizTitle || "Quiz";

            const scoreText = document.createElement("p");
            scoreText.textContent =
                `Score: ${result.score ?? 0}/${result.totalQuestions ?? 0}`;

            const percentage = document.createElement("p");
            percentage.textContent =
                `Percentage: ${result.percentage ?? 0}%`;

            const completed = document.createElement("p");
            completed.textContent = result.completedAt
                ? `Completed: ${new Date(result.completedAt).toLocaleString()}`
                : "";

            row.append(title, scoreText, percentage, completed);
            container.appendChild(row);
        });
    } catch (error) {
        alert(error.message || "Unable to load results.");
    }
}

/* ADMIN DASHBOARD */

async function showAdminDashboard() {
    if (currentUser.role !== "admin") {
        alert("Admin access required.");
        await loadQuizzes();
        return;
    }

    showBox("adminBox");

    await Promise.all([
        loadAdminQuizzes(),
        loadAdminResults(),
        loadAdminStats()
    ]);
}

async function loadAdminQuizzes() {
    try {
        const data = await apiRequest("/api/quizzes");
        quizzes = Array.isArray(data) ? data : data.quizzes || [];

        const container = get("adminQuizList");
        const filter = get("resultsQuizFilter");

        if (filter) {
            const previousValue = filter.value;
            filter.replaceChildren();

            const allOption = document.createElement("option");
            allOption.value = "";
            allOption.textContent = "All quizzes";
            filter.appendChild(allOption);

            quizzes.forEach(quiz => {
                const option = document.createElement("option");
                option.value = quiz._id || quiz.id;
                option.textContent = quiz.title || "Untitled Quiz";
                filter.appendChild(option);
            });

            filter.value = previousValue;
        }

        if (!container) return;

        container.replaceChildren();

        if (!quizzes.length) {
            container.textContent = "No quizzes have been created.";
            return;
        }

        quizzes.forEach(quiz => {
            const card = document.createElement("div");
            card.className = "admin-quiz-card";

            const title = document.createElement("h3");
            title.textContent = quiz.title || "Untitled Quiz";

            const details = document.createElement("p");
            details.textContent =
                `Duration: ${quiz.duration || 10} minutes | Questions: ${(quiz.questions || []).length}`;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete Quiz";
            deleteButton.addEventListener("click", () => {
                deleteQuiz(quiz._id || quiz.id);
            });

            card.append(title, details, deleteButton);
            container.appendChild(card);
        });
    } catch (error) {
        setMessage("adminMessage", error.message);
    }
}

async function createQuiz(event) {
    if (event) event.preventDefault();

    if (currentUser.role !== "admin") {
        setMessage("adminMessage", "Admin access required.");
        return;
    }

    const title = get("quizTitleInput")?.value.trim();
    const duration = Number(get("quizDurationInput")?.value);
    const questionText = get("newQuestion")?.value.trim();

    const options = [
        get("option1")?.value.trim(),
        get("option2")?.value.trim(),
        get("option3")?.value.trim(),
        get("option4")?.value.trim()
    ];

    const correctAnswerIndex = get("correctAnswer")?.value;

    if (
        !title ||
        !Number.isFinite(duration) ||
        duration < 1 ||
        !questionText ||
        options.some(option => !option) ||
        correctAnswerIndex === "" ||
        correctAnswerIndex === undefined
    ) {
        setMessage("adminMessage", "Please fill in all quiz fields.");
        return;
    }

    const answerIndex = Number(correctAnswerIndex);

    if (answerIndex < 0 || answerIndex >= options.length) {
        setMessage("adminMessage", "Please select the correct answer.");
        return;
    }

    const answer = options[answerIndex];

    setMessage("adminMessage", "Creating quiz...");

    try {
        await apiRequest("/api/quizzes", {
            method: "POST",
            body: JSON.stringify({
                title,
                duration,
                questions: [{
                    question: questionText,
                    options,
                    answer
                }]
            })
        });

        setMessage("adminMessage", "Quiz created successfully.");

        if (get("questionForm")) {
            get("questionForm").reset();
        }

        await loadAdminQuizzes();
        await loadAdminStats();
    } catch (error) {
        setMessage(
            "adminMessage",
            error.message || "Could not create quiz."
        );
    }
}

async function deleteQuiz(quizId) {
    if (!quizId || !confirm("Are you sure you want to delete this quiz?")) {
        return;
    }

    try {
        await apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}`, {
            method: "DELETE"
        });

        setMessage("adminMessage", "Quiz deleted successfully.");

        await loadAdminQuizzes();
        await loadAdminResults();
        await loadAdminStats();
    } catch (error) {
        setMessage("adminMessage", error.message || "Could not delete quiz.");
    }
}

async function loadAdminResults() {
    try {
        const data = await apiRequest("/api/results");
        const results = Array.isArray(data) ? data : data.results || [];

        const container = get("adminResultsList");
        if (!container) return;

        container.replaceChildren();

        const search = (get("resultsSearch")?.value || "").toLowerCase().trim();
        const quizFilter = get("resultsQuizFilter")?.value || "";
        const scoreFilter = get("resultsScoreFilter")?.value || "";

        const filtered = results.filter(result => {
            const userName = result.user?.name || result.userName || result.name || "";
            const email = result.user?.email || result.email || "";
            const quizId = result.quiz?._id || result.quizId || result.quiz || "";
            const percentage = Number(result.percentage || 0);

            const matchesSearch =
                `${userName} ${email}`.toLowerCase().includes(search);

            const matchesQuiz =
                !quizFilter || String(quizId) === String(quizFilter);

            let matchesScore = true;

            if (scoreFilter === "80") {
                matchesScore = percentage >= 80;
            } else if (scoreFilter === "40") {
                matchesScore = percentage >= 40 && percentage < 80;
            } else if (scoreFilter === "below40") {
                matchesScore = percentage < 40;
            }

            return matchesSearch && matchesQuiz && matchesScore;
        });

        if (!filtered.length) {
            container.textContent = "No results found.";
            return;
        }

        filtered.forEach(result => {
            const row = document.createElement("div");
            row.className = "admin-result-card";

            const student = document.createElement("p");
            student.textContent =
                `Student: ${result.user?.name || result.userName || result.name || "Unknown"}`;

            const email = document.createElement("p");
            email.textContent =
                `Email: ${result.user?.email || result.email || "Not available"}`;

            const quiz = document.createElement("p");
            quiz.textContent =
                `Quiz: ${result.quiz?.title || result.quizTitle || "Quiz"}`;

            const scoreText = document.createElement("p");
            scoreText.textContent =
                `Score: ${result.score ?? 0}/${result.totalQuestions ?? 0} (${result.percentage ?? 0}%)`;

            const completed = document.createElement("p");
            completed.textContent = result.completedAt
                ? `Completed: ${new Date(result.completedAt).toLocaleString()}`
                : "";

            row.append(student, email, quiz, scoreText, completed);
            container.appendChild(row);
        });
    } catch (error) {
        setMessage("adminMessage", error.message || "Could not load results.");
    }
}

async function loadAdminStats() {
    try {
        const stats = await apiRequest("/api/auth/stats");

        if (get("totalUsers")) {
            get("totalUsers").textContent = stats.totalUsers ?? 0;
        }

        if (get("totalQuizzes")) {
            get("totalQuizzes").textContent = stats.totalQuizzes ?? 0;
        }

        if (get("totalAttempts")) {
            get("totalAttempts").textContent = stats.totalAttempts ?? 0;
        }

        if (get("averageScore")) {
            get("averageScore").textContent =
                `${stats.averageScore ?? 0}%`;
        }
    } catch (error) {
        console.error("Admin statistics:", error.message);
    }
}

/* EVENT LISTENERS */

get("loginForm")?.addEventListener("submit", login);
get("registerForm")?.addEventListener("submit", register);
get("questionForm")?.addEventListener("submit", createQuiz);

get("showRegister")?.addEventListener("click", event => {
    event.preventDefault();
    setMessage("registerMessage", "");
    showBox("registerBox");
});

get("showLogin")?.addEventListener("click", event => {
    event.preventDefault();
    setMessage("loginMessage", "");
    showBox("loginBox");
});

get("nextButton")?.addEventListener("click", nextQuestion);
get("backToQuizzes")?.addEventListener("click", showQuizzes);
get("backToStudentQuizzes")?.addEventListener("click", loadQuizzes);
get("studentDashboardButton")?.addEventListener("click", showDashboard);

get("logoutButton")?.addEventListener("click", logout);
get("studentLogoutButton")?.addEventListener("click", logout);
get("adminLogoutButton")?.addEventListener("click", logout);

get("resultsSearch")?.addEventListener("input", loadAdminResults);
get("resultsQuizFilter")?.addEventListener("change", loadAdminResults);
get("resultsScoreFilter")?.addEventListener("change", loadAdminResults);

/* STARTUP */

async function startApp() {
    if (!token) {
        showBox("loginBox");
        return;
    }

    try {
        if (currentUser.role === "admin") {
            await showAdminDashboard();
        } else {
            await loadQuizzes();
        }
    } catch (error) {
        console.error("App startup:", error.message);
        showBox("loginBox");
    }
}

startApp();
