
const API_URL = "http://localhost:5000";

let token = localStorage.getItem("token");
let user = null;

try {
    user = JSON.parse(localStorage.getItem("user"));
} catch {
    user = null;
}

let quizzes = [];
let currentQuiz = null;
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let answers = [];
let timerInterval;
let timeLeft = 0;
let resultSubmitted = false;
let allAdminResults = [];

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const quizBox = document.getElementById("quizBox");
const userDashboard = document.getElementById("userDashboard");
const adminBox = document.getElementById("adminBox");
const questionBox = document.getElementById("questionBox");
const resultBox = document.getElementById("resultBox");

function showRegister() {
    loginBox.classList.add("hidden");
    registerBox.classList.remove("hidden");
}

function showLogin() {
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
}

async function register() {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const message = document.getElementById("registerMessage");

    if (!name || !email || !password.trim()) {
        message.textContent = "Please fill all fields";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message || "Registration failed";
            return;
        }

        message.textContent = "Account created successfully";

        document.getElementById("registerName").value = "";
        document.getElementById("registerEmail").value = "";
        document.getElementById("registerPassword").value = "";

        setTimeout(showLogin, 1000);
    } catch {
        message.textContent = "Server is not running";
    }
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    if (!email || !password) {
        message.textContent = "Please enter email and password";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message || "Login failed";
            return;
        }

        token = data.token;
        user = data.user;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        loginBox.classList.add("hidden");
        registerBox.classList.add("hidden");
        quizBox.classList.remove("hidden");

        if (user.role === "admin") {
            adminBox.classList.remove("hidden");
            await Promise.all([
                loadAdminStats(),
                loadAdminQuizzes(),
                loadAdminResults()
            ]);
        } else {
            adminBox.classList.add("hidden");
        }

        await loadQuizzes();
    } catch {
        message.textContent = "Server is not running";
    }
}

async function loadQuizzes() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/api/quizzes`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to load quizzes");
            return;
        }

        quizzes = Array.isArray(data) ? data : [];

        const quizList = document.getElementById("quizList");
        quizList.innerHTML = "";

        if (!quizzes.length) {
            quizList.textContent = "No quizzes available.";
            return;
        }

        quizzes.forEach(quiz => {
            const div = document.createElement("div");
            div.className = "quiz-card";

            const title = document.createElement("h3");
            title.textContent = quiz.title;

            const duration = document.createElement("p");
            duration.textContent = `Duration: ${quiz.duration} minutes`;

            const questions = document.createElement("p");
            questions.textContent = `Questions: ${(quiz.questions || []).length}`;

            const button = document.createElement("button");
            button.textContent = "Start Quiz";
            button.onclick = () => startQuiz(quiz._id);

            div.append(title, duration, questions, button);
            quizList.appendChild(div);
        });
    } catch {
        console.log("Unable to load quizzes");
    }
}

async function loadAdminQuizzes() {
    if (!token || !user || user.role !== "admin") return;

    try {
        const response = await fetch(`${API_URL}/api/quizzes`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) return;

        const adminQuizList = document.getElementById("adminQuizList");
        adminQuizList.innerHTML = "";

        if (!Array.isArray(data) || !data.length) {
            adminQuizList.textContent = "No quizzes created yet.";
            return;
        }

        data.forEach(quiz => {
            const div = document.createElement("div");
            div.className = "quiz-card";

            const title = document.createElement("h3");
            title.textContent = quiz.title;

            const duration = document.createElement("p");
            duration.textContent = `Duration: ${quiz.duration} minutes`;

            const questions = document.createElement("p");
            questions.textContent = `Questions: ${(quiz.questions || []).length}`;

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.onclick = () => editQuiz(quiz._id);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deleteQuiz(quiz._id);

            div.append(title, duration, questions, editButton, deleteButton);
            adminQuizList.appendChild(div);
        });
    } catch {
        console.log("Unable to load admin quizzes");
    }
}

async function loadAdminStats() {
    if (!token || !user || user.role !== "admin") return;

    try {
        const response = await fetch(`${API_URL}/api/auth/stats`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.log("Unable to load admin stats");
            return;
        }

        document.getElementById("totalUsers").textContent = data.totalUsers ?? 0;
        document.getElementById("totalQuizzes").textContent = data.totalQuizzes ?? 0;
        document.getElementById("totalAttempts").textContent = data.totalAttempts ?? 0;
        document.getElementById("averageScore").textContent = `${data.averageScore ?? 0}%`;
    } catch {
        console.log("Unable to load admin stats");
    }
}

async function loadAdminResults() {
    if (!token || !user || user.role !== "admin") return;

    const resultsList = document.getElementById("adminResultsList");
    if (!resultsList) return;

    resultsList.textContent = "Loading results...";

    try {
        const response = await fetch(`${API_URL}/api/results`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            resultsList.textContent = data.message || "Unable to load results";
            return;
        }

        allAdminResults = Array.isArray(data) ? data : [];

        populateQuizFilter();
        attachResultFilterEvents();
        renderAdminResults();
    } catch {
        resultsList.textContent = "Unable to load student results.";
    }
}

function populateQuizFilter() {
    const quizFilter = document.getElementById("resultsQuizFilter");
    if (!quizFilter) return;

    const previousValue = quizFilter.value;
    const uniqueQuizzes = new Map();

    allAdminResults.forEach(result => {
        const quiz = result.quiz;

        if (quiz && typeof quiz === "object" && quiz._id) {
            uniqueQuizzes.set(String(quiz._id), quiz.title || "Untitled Quiz");
        }
    });

    quizFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All Quizzes";
    quizFilter.appendChild(allOption);

    uniqueQuizzes.forEach((title, id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = title;
        quizFilter.appendChild(option);
    });

    if ([...quizFilter.options].some(option => option.value === previousValue)) {
        quizFilter.value = previousValue;
    }
}

function attachResultFilterEvents() {
    const searchInput = document.getElementById("resultsSearch");
    const quizFilter = document.getElementById("resultsQuizFilter");
    const scoreFilter = document.getElementById("resultsScoreFilter");

    if (searchInput && searchInput.dataset.bound !== "true") {
        searchInput.addEventListener("input", renderAdminResults);
        searchInput.dataset.bound = "true";
    }

    if (quizFilter && quizFilter.dataset.bound !== "true") {
        quizFilter.addEventListener("change", renderAdminResults);
        quizFilter.dataset.bound = "true";
    }

    if (scoreFilter && scoreFilter.dataset.bound !== "true") {
        scoreFilter.addEventListener("change", renderAdminResults);
        scoreFilter.dataset.bound = "true";
    }
}

function renderAdminResults() {
    const resultsList = document.getElementById("adminResultsList");
    const searchInput = document.getElementById("resultsSearch");
    const quizFilter = document.getElementById("resultsQuizFilter");
    const scoreFilter = document.getElementById("resultsScoreFilter");

    if (!resultsList) return;

    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedQuiz = quizFilter ? quizFilter.value : "";
    const selectedScore = scoreFilter ? scoreFilter.value : "";

    const filteredResults = allAdminResults.filter(result => {
        const student = result.user && typeof result.user === "object"
            ? result.user
            : {};

        const quiz = result.quiz && typeof result.quiz === "object"
            ? result.quiz
            : {};

        const name = String(student.name || "");
        const email = String(student.email || "");
        const title = String(quiz.title || "");
        const percentage = Number(result.percentage ?? 0);

        const matchesSearch =
            name.toLowerCase().includes(search) ||
            email.toLowerCase().includes(search) ||
            title.toLowerCase().includes(search);

        const matchesQuiz =
            !selectedQuiz || String(quiz._id || "") === selectedQuiz;

        let matchesScore = true;

        if (selectedScore === "high") {
            matchesScore = percentage >= 80;
        } else if (selectedScore === "medium") {
            matchesScore = percentage >= 40 && percentage < 80;
        } else if (selectedScore === "low") {
            matchesScore = percentage < 40;
        }

        return matchesSearch && matchesQuiz && matchesScore;
    });

    resultsList.innerHTML = "";

    const count = document.createElement("p");
    count.className = "results-count";
    count.textContent = `Showing ${filteredResults.length} of ${allAdminResults.length} attempts`;
    resultsList.appendChild(count);

    if (!filteredResults.length) {
        const empty = document.createElement("p");
        empty.textContent = "No matching results found.";
        resultsList.appendChild(empty);
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "results-table-wrapper";

    const table = document.createElement("table");
    table.className = "results-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
        "Student",
        "Email",
        "Quiz",
        "Score",
        "Percentage",
        "Completed"
    ].forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    filteredResults.forEach(result => {
        const row = document.createElement("tr");

        const student = result.user && typeof result.user === "object"
            ? result.user
            : {};

        const quiz = result.quiz && typeof result.quiz === "object"
            ? result.quiz
            : {};

        const date = result.completedAt
            ? new Date(result.completedAt).toLocaleString()
            : "N/A";

        const percentageValue = Number(result.percentage ?? 0);

        const values = [
            student.name || "Unknown Student",
            student.email || "N/A",
            quiz.title || "Quiz",
            `${result.score ?? 0} / ${result.totalQuestions ?? 0}`,
            `${percentageValue}%`,
            date
        ];

        values.forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);

            if (index === 4) {
                const badge = document.createElement("span");
                badge.className = "score-badge";

                if (percentageValue >= 80) {
                    badge.classList.add("score-high");
                } else if (percentageValue >= 40) {
                    badge.classList.add("score-medium");
                } else {
                    badge.classList.add("score-low");
                }

                badge.textContent = `${percentageValue}%`;
                cell.textContent = "";
                cell.appendChild(badge);
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.append(thead, tbody);
    wrapper.appendChild(table);
    resultsList.appendChild(wrapper);
}

async function editQuiz(id) {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const quiz = await response.json();

        if (!response.ok) {
            alert(quiz.message || "Unable to load quiz");
            return;
        }

        const newTitle = prompt("Enter Quiz Title", quiz.title);
        if (newTitle === null) return;

        const newDuration = prompt("Enter Duration in minutes", quiz.duration);
        if (newDuration === null) return;

        if (
            !newTitle.trim() ||
            !Number.isFinite(Number(newDuration)) ||
            Number(newDuration) <= 0
        ) {
            alert("Please enter a valid title and duration");
            return;
        }

        const updatedQuiz = {
            title: newTitle.trim(),
            duration: Number(newDuration),
            questions: quiz.questions
        };

        const updateResponse = await fetch(`${API_URL}/api/quizzes/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updatedQuiz)
        });

        const data = await updateResponse.json();

        if (!updateResponse.ok) {
            alert(data.message || "Unable to update quiz");
            return;
        }

        alert("Quiz updated successfully");

        await Promise.all([
            loadQuizzes(),
            loadAdminQuizzes(),
            loadAdminStats()
        ]);
    } catch {
        alert("Unable to update quiz");
    }
}

async function deleteQuiz(id) {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to delete quiz");
            return;
        }

        alert("Quiz deleted successfully");

        await Promise.all([
            loadQuizzes(),
            loadAdminQuizzes(),
            loadAdminStats()
        ]);
    } catch {
        alert("Unable to delete quiz");
    }
}

function addQuestion() {
    const questionForm = document.getElementById("questionForm");
    const questionCount = questionForm.querySelectorAll(".question-item").length + 1;
    const div = document.createElement("div");

    div.className = "question-item";

    div.innerHTML = `
        <h3>Question ${questionCount}</h3>
        <input type="text" class="questionInput" placeholder="Enter Question">
        <input type="text" class="optionInput" placeholder="Option 1">
        <input type="text" class="optionInput" placeholder="Option 2">
        <input type="text" class="optionInput" placeholder="Option 3">
        <input type="text" class="optionInput" placeholder="Option 4">
        <select class="answerInput">
            <option value="">Select Correct Answer</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
            <option value="3">Option 3</option>
            <option value="4">Option 4</option>
        </select>
        <button type="button" onclick="removeQuestion(this)">Remove Question</button>
    `;

    questionForm.appendChild(div);
}

function removeQuestion(button) {
    button.parentElement.remove();

    document.querySelectorAll(".question-item").forEach((item, index) => {
        item.querySelector("h3").textContent = `Question ${index + 1}`;
    });
}

function resetQuestionForm() {
    document.getElementById("questionForm").innerHTML = `
        <div class="question-item">
            <h3>Question 1</h3>
            <input type="text" class="questionInput" placeholder="Enter Question">
            <input type="text" class="optionInput" placeholder="Option 1">
            <input type="text" class="optionInput" placeholder="Option 2">
            <input type="text" class="optionInput" placeholder="Option 3">
            <input type="text" class="optionInput" placeholder="Option 4">
            <select class="answerInput">
                <option value="">Select Correct Answer</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
                <option value="4">Option 4</option>
            </select>
        </div>
    `;
}

async function createQuiz() {
    if (!token || !user || user.role !== "admin") {
        alert("Admin access required");
        return;
    }

    const title = document.getElementById("quizTitleInput").value.trim();
    const duration = Number(document.getElementById("quizDurationInput").value);
    const questionItems = document.querySelectorAll(".question-item");
    const message = document.getElementById("adminMessage");

    if (!title || !duration || duration <= 0) {
        message.textContent = "Please enter a valid quiz title and duration";
        return;
    }

    if (!questionItems.length) {
        message.textContent = "Please add at least one question";
        return;
    }

    const questions = [];

    for (const item of questionItems) {
        const question = item.querySelector(".questionInput").value.trim();

        const options = Array.from(
            item.querySelectorAll(".optionInput")
        ).map(input => input.value.trim());

        const answerValue = item.querySelector(".answerInput").value;

        if (!question || options.some(option => !option) || !answerValue) {
            message.textContent = "Please complete all questions";
            return;
        }

        questions.push({
            question,
            options,
            answer: options[Number(answerValue) - 1]
        });
    }

    try {
        const response = await fetch(`${API_URL}/api/quizzes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title, duration, questions })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message || "Unable to create quiz";
            return;
        }

        message.textContent = "Quiz created successfully";

        document.getElementById("quizTitleInput").value = "";
        document.getElementById("quizDurationInput").value = "";

        resetQuestionForm();

        await Promise.all([
            loadQuizzes(),
            loadAdminQuizzes(),
            loadAdminStats()
        ]);
    } catch {
        message.textContent = "Unable to create quiz";
    }
}

async function startQuiz(id) {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const quiz = await response.json();

        if (!response.ok) {
            alert(quiz.message || "Unable to start quiz");
            return;
        }

        if (!quiz.questions || !quiz.questions.length) {
            alert("This quiz has no questions.");
            return;
        }

        currentQuiz = quiz;
        currentQuestion = 0;
        score = 0;
        selectedAnswer = null;
        answers = Array(quiz.questions.length).fill(null);
        resultSubmitted = false;

        quizBox.classList.add("hidden");
        adminBox.classList.add("hidden");
        userDashboard.classList.add("hidden");
        resultBox.classList.add("hidden");
        questionBox.classList.remove("hidden");

        document.getElementById("quizTitle").textContent = quiz.title;

        startTimer();
        showQuestion();
    } catch {
        alert("Unable to start quiz");
    }
}

function startTimer() {
    clearInterval(timerInterval);

    timeLeft = Number(currentQuiz.duration) * 60;
    updateTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showResult();
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timer = document.getElementById("timer");

    if (timer) {
        timer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
}

function showQuestion() {
    const question = currentQuiz.questions[currentQuestion];

    selectedAnswer = answers[currentQuestion] ?? null;

    document.getElementById("questionNumber").textContent =
        `${currentQuestion + 1} / ${currentQuiz.questions.length}`;

    document.getElementById("question").textContent = question.question;

    const optionsBox = document.getElementById("options");
    optionsBox.innerHTML = "";

    question.options.forEach(option => {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = option;
        button.className = "option-button";

        if (selectedAnswer === option) {
            button.classList.add("selected");
        }

        button.onclick = () => selectOption(option, button);
        optionsBox.appendChild(button);
    });

    const backButton = document.getElementById("backButton");
    const nextButton = document.getElementById("nextButton");

    if (backButton) {
        backButton.disabled = currentQuestion === 0;
    }

    if (nextButton) {
        nextButton.textContent =
            currentQuestion === currentQuiz.questions.length - 1
                ? "Finish Quiz"
                : "Next →";
    }
}

function selectOption(answer, button) {
    if (resultSubmitted) return;

    selectedAnswer = answer;
    answers[currentQuestion] = answer;

    document.querySelectorAll(".option-button").forEach(item => {
        item.classList.remove("selected");
    });

    button.classList.add("selected");
}

function nextQuestion() {
    if (resultSubmitted || !currentQuiz) return;

    if (selectedAnswer === null) {
        alert("Please select an answer");
        return;
    }

    answers[currentQuestion] = selectedAnswer;

    if (currentQuestion === currentQuiz.questions.length - 1) {
        showResult();
        return;
    }

    currentQuestion++;
    showQuestion();
}

function previousQuestion() {
    if (resultSubmitted || !currentQuiz) return;

    if (selectedAnswer !== null) {
        answers[currentQuestion] = selectedAnswer;
    }

    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
}

function getAnswerSummary() {
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    currentQuiz.questions.forEach((question, index) => {
        const answer = answers[index];

        if (answer === null || answer === undefined) {
            unanswered++;
        } else if (answer === question.answer) {
            correctAnswers++;
        } else {
            wrongAnswers++;
        }
    });

    return { correctAnswers, wrongAnswers, unanswered };
}

async function saveResult() {
    if (!token || !user || !currentQuiz) return false;

    const total = currentQuiz.questions.length;
    const percentage = Math.round((score / total) * 100);

    try {
        const response = await fetch(`${API_URL}/api/results`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                quiz: currentQuiz._id,
                score,
                totalQuestions: total,
                percentage
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Result save error:", data.message);
            return false;
        }

        return true;
    } catch {
        console.error("Unable to save result");
        return false;
    }
}

async function showResult() {
    if (resultSubmitted || !currentQuiz) return;

    resultSubmitted = true;
    clearInterval(timerInterval);

    if (selectedAnswer !== null) {
        answers[currentQuestion] = selectedAnswer;
    }

    const summary = getAnswerSummary();
    score = summary.correctAnswers;

    const total = currentQuiz.questions.length;
    const percentage = Math.round((score / total) * 100);

    let message;

    if (percentage >= 80) {
        message = "Excellent Performance! 🏆";
    } else if (percentage >= 60) {
        message = "Good Job! 👍";
    } else if (percentage >= 40) {
        message = "Keep Practicing! 💪";
    } else {
        message = "Better Luck Next Time! 📚";
    }

    questionBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    const resultElement = document.getElementById("result");

    function renderResult(status) {
        resultElement.innerHTML = `
            <strong>${message}</strong>
            <br><br>
            You scored <strong>${score}</strong> out of <strong>${total}</strong>
            <br><br>
            Percentage: <strong>${percentage}%</strong>
            <br><br>
            <span style="color:#16a34a">Correct Answers: <strong>${summary.correctAnswers}</strong></span>
            <br><br>
            <span style="color:#dc2626">Wrong Answers: <strong>${summary.wrongAnswers}</strong></span>
            <br><br>
            <span style="color:#d97706">Unanswered Questions: <strong>${summary.unanswered}</strong></span>
            <br><br>
            ${status}
        `;
    }

    renderResult("Saving result...");

    const saved = await saveResult();

    if (saved) {
        renderResult('<span style="color:#16a34a">Result saved successfully</span>');

        if (user && user.role === "admin") {
            await Promise.all([
                loadAdminStats(),
                loadAdminResults()
            ]);
        }
    } else {
        renderResult('<span style="color:#dc2626">Result could not be saved. Please contact the administrator.</span>');
    }
}

async function showDashboard() {
    clearInterval(timerInterval);

    quizBox.classList.add("hidden");
    adminBox.classList.add("hidden");
    questionBox.classList.add("hidden");
    resultBox.classList.add("hidden");

    userDashboard.classList.remove("hidden");

    await loadMyResults();
}

async function loadMyResults() {
    const resultsList = document.getElementById("myResultsList");
    resultsList.innerHTML = "Loading results...";

    if (!token) {
        resultsList.textContent = "Please login first.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/results/my-results`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            resultsList.textContent = data.message || "Unable to load results";
            return;
        }

        if (!Array.isArray(data) || !data.length) {
            resultsList.textContent = "Complete a quiz to see your results here.";
            return;
        }

        resultsList.innerHTML = "";

        data.forEach(result => {
            const div = document.createElement("div");
            div.className = "result-card";

            const heading = document.createElement("h3");
            heading.textContent = result.quiz?.title || "Quiz";

            const scoreText = document.createElement("p");
            scoreText.textContent =
                `Score: ${result.score ?? 0} / ${result.totalQuestions ?? 0}`;

            const percentage = document.createElement("p");
            percentage.textContent = `Percentage: ${result.percentage ?? 0}%`;

            const completed = document.createElement("p");
            completed.textContent = `Completed: ${
                result.completedAt
                    ? new Date(result.completedAt).toLocaleString()
                    : "N/A"
            }`;

            div.append(heading, scoreText, percentage, completed);
            resultsList.appendChild(div);
        });
    } catch {
        resultsList.textContent = "Unable to load quiz results.";
    }
}

function showQuizzes() {
    clearInterval(timerInterval);

    userDashboard.classList.add("hidden");
    resultBox.classList.add("hidden");
    questionBox.classList.add("hidden");
    quizBox.classList.remove("hidden");

    if (user && user.role === "admin") {
        adminBox.classList.remove("hidden");

        loadAdminStats();
        loadAdminQuizzes();
        loadAdminResults();
    } else {
        adminBox.classList.add("hidden");
    }

    loadQuizzes();
}

function logout() {
    clearInterval(timerInterval);

    token = null;
    user = null;
    currentQuiz = null;
    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    answers = [];
    resultSubmitted = false;
    allAdminResults = [];

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    quizBox.classList.add("hidden");
    userDashboard.classList.add("hidden");
    adminBox.classList.add("hidden");
    questionBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginMessage").textContent = "";
}

if (token && user) {
    loginBox.classList.add("hidden");
    registerBox.classList.add("hidden");
    quizBox.classList.remove("hidden");

    if (user.role === "admin") {
        adminBox.classList.remove("hidden");

        loadAdminStats();
        loadAdminQuizzes();
        loadAdminResults();
    } else {
        adminBox.classList.add("hidden");
    }

    loadQuizzes();
} else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    token = null;
    user = null;
}
