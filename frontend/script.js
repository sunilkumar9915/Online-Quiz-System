
const API_URL = "https://online-quiz-system-991.onrender.com";

let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user") || "{}");
let quizzes = [];
let currentQuiz = null;
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let timerInterval = null;
let timeLeft = 0;

const get = (id) => document.getElementById(id);

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
        throw new Error(data.message || `Request failed: ${response.status}`);
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

    showBox("loginBox");
    setMessage("loginMessage", "");
    setMessage("registerMessage", "");
}

async function login() {
    const email = get("email")?.value.trim();
    const password = get("password")?.value;
    const message = get("loginMessage");

    if (!email || !password) {
        setMessage("loginMessage", "Please enter email and password.");
        return;
    }

    if (message) message.textContent = "Logging in...";

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (!data.token || !data.user) {
            throw new Error("The server did not return a token and user.");
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(currentUser));

        if (currentUser.role === "admin") {
            await showAdminDashboard();
        } else {
            await loadQuizzes();
        }
    } catch (error) {
        setMessage("loginMessage", error.message || "Login failed.");
    }
}

async function register() {
    const name = get("registerName")?.value.trim();
    const email = get("registerEmail")?.value.trim();
    const password = get("registerPassword")?.value;

    if (!name || !email || !password) {
        setMessage("registerMessage", "Please fill in all fields.");
        return;
    }

    try {
        const data = await apiRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        setMessage(
            "registerMessage",
            data.message || "Registration successful. Please log in."
        );

        showBox("loginBox");
    } catch (error) {
        setMessage("registerMessage", error.message || "Registration failed.");
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
            list.textContent = error.message || "Unable to load quizzes.";
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
        duration.textContent = `Duration: ${quiz.duration || 10} minutes`;

        const count = document.createElement("p");
        count.textContent = `Questions: ${(quiz.questions || []).length}`;

        const button = document.createElement("button");
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

    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;

    timeLeft = Math.max(1, Number(currentQuiz.duration || 10)) * 60;

    showBox("questionBox");

    if (get("quizTitle")) {
        get("quizTitle").textContent = currentQuiz.title || "Quiz";
    }

    showQuestion();
    startTimer();
}

function showQuestion() {
    if (!currentQuiz) return;

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
        get("question").textContent = questionData.question || "";
    }

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
            typeof option === "object"
                ? option.text ?? option.option ?? option.label ?? ""
                : option;

        button.textContent = String(optionText);
        button.addEventListener("click", () => {
            optionsContainer.querySelectorAll(".option").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            selectedAnswer = {
                index,
                value: optionText
            };
        });

        optionsContainer.appendChild(button);
    });
}

function startTimer() {
    stopTimer();
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
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
    if (!currentQuiz) return;

    if (!selectedAnswer) {
        alert("Please select an answer.");
        return;
    }

    const questionData = currentQuiz.questions[currentQuestion];
    const correct = questionData.answer;

    const correctValue =
        typeof correct === "object"
            ? correct.text ?? correct.option ?? correct.label
            : correct;

    if (
        String(selectedAnswer.value).trim().toLowerCase() ===
        String(correctValue).trim().toLowerCase()
    ) {
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
    stopTimer();

    if (!currentQuiz) return;

    const total = currentQuiz.questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    showBox("resultBox");

    if (get("result")) {
        get("result").textContent =
            `You scored ${score} out of ${total}. Percentage: ${percentage}%.`;
    }

    try {
        await apiRequest("/api/results", {
            method: "POST",
            body: JSON.stringify({
                quizId: currentQuiz._id || currentQuiz.id,
                score,
                totalQuestions: total,
                percentage
            })
        });
    } catch (error) {
        console.error("Could not save result:", error.message);
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

            row.append(title, scoreText, percentage);
            container.appendChild(row);
        });
    } catch (error) {
        alert(error.message || "Unable to load dashboard.");
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

    await loadAdminQuizzes();
    await loadAdminResults();
    await loadAdminStats();
}

async function loadAdminQuizzes() {
    try {
        const data = await apiRequest("/api/quizzes");
        quizzes = Array.isArray(data) ? data : data.quizzes || [];

        const container = get("adminQuizList");
        const filter = get("resultsQuizFilter");

        if (filter) {
            filter.replaceChildren();

            const allOption = document.createElement("option");
            allOption.value = "";
            allOption.textContent = "All quizzes";
            filter.appendChild(allOption);

            quizzes.forEach(quiz => {
                const option = document.createElement("option");
                option.value = quiz._id || quiz.id;
                option.textContent = quiz.title;
                filter.appendChild(option);
            });
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
        alert("Admin access required.");
        return;
    }

    const title = get("quizTitleInput")?.value.trim();
    const duration = Number(get("quizDurationInput")?.value);
    const questionText = get("newQuestion")?.value.trim();
    const optionsText = get("newOptions")?.value.trim();
    const answer = get("correctAnswer")?.value.trim();

    if (!title || !duration || !questionText || !optionsText || !answer) {
        setMessage("adminMessage", "Please fill in all quiz and question fields.");
        return;
    }

    const options = optionsText
        .split(",")
        .map(option => option.trim())
        .filter(Boolean);

    if (options.length < 2) {
        setMessage("adminMessage", "Enter at least two options separated by commas.");
        return;
    }

    if (!options.some(option => option.toLowerCase() === answer.toLowerCase())) {
        setMessage("adminMessage", "The correct answer must match one of the options.");
        return;
    }

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

        if (get("quizTitleInput")) get("quizTitleInput").value = "";
        if (get("quizDurationInput")) get("quizDurationInput").value = "";
        if (get("newQuestion")) get("newQuestion").value = "";
        if (get("newOptions")) get("newOptions").value = "";
        if (get("correctAnswer")) get("correctAnswer").value = "";

        await loadAdminQuizzes();
        await loadAdminStats();
    } catch (error) {
        setMessage("adminMessage", error.message || "Could not create quiz.");
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

        setMessage("adminMessage", "Quiz deleted.");
        await loadAdminQuizzes();
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

        const search = (get("resultsSearch")?.value || "").toLowerCase();
        const quizFilter = get("resultsQuizFilter")?.value || "";
        const scoreFilter = get("resultsScoreFilter")?.value || "";

        const filtered = results.filter(result => {
            const userName =
                result.user?.name || result.userName || result.name || "";
            const email = result.user?.email || result.email || "";
            const quizId =
                result.quiz?._id || result.quizId || result.quiz?._id?.toString() || "";
            const percentage = Number(result.percentage || 0);

            const matchesSearch =
                `${userName} ${email}`.toLowerCase().includes(search);

            const matchesQuiz =
                !quizFilter || String(quizId) === String(quizFilter);

            let matchesScore = true;

            if (scoreFilter === "pass") matchesScore = percentage >= 40;
            if (scoreFilter === "fail") matchesScore = percentage < 40;

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

            const score = document.createElement("p");
            score.textContent =
                `Score: ${result.score ?? 0}/${result.totalQuestions ?? 0} (${result.percentage ?? 0}%)`;

            row.append(student, email, quiz, score);
            container.appendChild(row);
        });
    } catch (error) {
        setMessage("adminMessage", error.message || "Could not load results.");
    }
}

async function loadAdminStats() {
    try {
        const [quizData, resultData] = await Promise.all([
            apiRequest("/api/quizzes"),
            apiRequest("/api/results")
        ]);

        const adminQuizzes = Array.isArray(quizData)
            ? quizData
            : quizData.quizzes || [];

        const results = Array.isArray(resultData)
            ? resultData
            : resultData.results || [];

        if (get("totalQuizzes")) {
            get("totalQuizzes").textContent = adminQuizzes.length;
        }

        if (get("totalAttempts")) {
            get("totalAttempts").textContent = results.length;
        }

        if (get("totalUsers")) {
            const users = new Set(
                results.map(result =>
                    result.user?._id ||
                    result.userId ||
                    result.user?.email ||
                    result.email
                ).filter(Boolean)
            );

            get("totalUsers").textContent = users.size;
        }

        if (get("averageScore")) {
            const average = results.length
                ? Math.round(
                    results.reduce(
                        (sum, result) => sum + Number(result.percentage || 0),
                        0
                    ) / results.length
                )
                : 0;

            get("averageScore").textContent = `${average}%`;
        }
    } catch (error) {
        console.error("Admin statistics:", error.message);
    }
}

/* EVENT LISTENERS */

get("questionForm")?.addEventListener("submit", createQuiz);

get("resultsSearch")?.addEventListener("input", loadAdminResults);
get("resultsQuizFilter")?.addEventListener("change", loadAdminResults);
get("resultsScoreFilter")?.addEventListener("change", loadAdminResults);

/* STARTUP */

async function startApp() {
    if (!token) {
        showBox("loginBox");
        return;
    }

    if (currentUser.role === "admin") {
        await showAdminDashboard();
    } else {
        await loadQuizzes();
    }
}

startApp();
