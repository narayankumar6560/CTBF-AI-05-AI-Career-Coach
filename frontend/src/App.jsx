  
import { useState } from "react";
import {
  ArrowRight,
  ChartNoAxesCombined,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Target,
  UploadCloud,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  LoaderCircle,
  ShieldCheck,
  AlertTriangle,
  Menu as MenuIcon
} from "lucide-react";

import API from "./api/api";
const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getStreakStats = (dates) => {
  const completed = [...new Set(dates)].sort();
  const completedSet = new Set(completed);

  let currentStreak = 0;
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  // If today isn't complete yet, allow yesterday's streak to remain active.
  const checkDate = new Date(today);
  if (!completedSet.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (completedSet.has(getLocalDateKey(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  completed.forEach((key) => {
    const currentDate = new Date(`${key}T12:00:00`);

    if (previousDate) {
      const difference =
        (currentDate - previousDate) / (1000 * 60 * 60 * 24);

      runningStreak = difference === 1 ? runningStreak + 1 : 1;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = currentDate;
  });

  return {
    currentStreak,
    longestStreak,
    completedToday: completedSet.has(todayKey),
  };
};

function App() {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("Dashboard");

  const [roadmap, setRoadmap] = useState(null);
  const [courses, setCourses] = useState(null);

  const [interviewSession, setInterviewSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [interviewResults, setInterviewResults] = useState(null);
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Resume Credibility states
  const [credibilityReport, setCredibilityReport] = useState(null);
  const [credibilityLoading, setCredibilityLoading] = useState(false);

  // Daily Learning Streak (saved in this browser)
  const [learningDates, setLearningDates] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("skillbridge_learning_dates") || "[]"
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const streakStats = getStreakStats(learningDates);

  const markLearningDone = () => {
    const today = getLocalDateKey();

    if (learningDates.includes(today)) return;

    const updatedDates = [...learningDates, today];
    setLearningDates(updatedDates);

    try {
      localStorage.setItem(
        "skillbridge_learning_dates",
        JSON.stringify(updatedDates)
      );
    } catch (storageError) {
      console.error("Could not save learning streak:", storageError);
    }
  };

  // --------------------------------
  // RESUME AND JOB MATCHING
  // --------------------------------

  const analyzeResume = async (e) => {
    e.preventDefault();

    if (!file || !job.trim()) {
      setError("Please upload your resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = new FormData();
      data.append("resume", file);
      data.append("job_description", job);

      const response = await API.post("/analyze/match", data);

      setResult(response.data);
      setActive("Analysis");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not connect to backend. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // LEARNING ROADMAP
  // --------------------------------

  const generateRoadmap = async () => {
    try {
      const response = await API.post("/roadmap/", null, {
        params: { analysis_id: result.analysis_id }
      });

      setRoadmap(response.data);
      setActive("Roadmap");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to generate roadmap."
      );
    }
  };

  // --------------------------------
  // COURSE RECOMMENDATIONS
  // --------------------------------

  const getCourses = async () => {
    try {
      const response = await API.post("/courses/", null, {
        params: { analysis_id: result.analysis_id }
      });

      setCourses(response.data);
      setActive("Courses");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to get course recommendations."
      );
    }
  };

  // --------------------------------
  // START MOCK INTERVIEW
  // --------------------------------

  const startInterview = async () => {
    if (!result?.analysis_id) {
      setError("Please analyze your resume first.");
      setActive("Dashboard");
      return;
    }

    setInterviewLoading(true);
    setError("");
    setEvaluation(null);
    setInterviewResults(null);
    setAnswer("");

    try {
      const response = await API.post("/interview/start", null, {
        params: { analysis_id: result.analysis_id }
      });

      setInterviewSession(response.data.session_id);
      setQuestions(response.data.questions || []);
      setQuestionIndex(0);
      setActive("Mock Interview");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to start interview."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  // --------------------------------
  // SUBMIT INTERVIEW ANSWER
  // --------------------------------

  const submitInterviewAnswer = async () => {
    const current = questions[questionIndex];

    if (!answer.trim()) {
      setError("Please write your answer first.");
      return;
    }

    if (!current?.question_id || !interviewSession) {
      setError(
        "Interview question details are missing. Please start a new interview."
      );
      return;
    }

    setInterviewLoading(true);
    setError("");

    try {
      const response = await API.post("/interview/answer", null, {
        params: {
          session_id: interviewSession,
          question_id: current.question_id,
          answer: answer
        }
      });

      setEvaluation(response.data.evaluation);
      setAnswer("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to evaluate your answer."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  // --------------------------------
  // NEXT INTERVIEW QUESTION
  // --------------------------------

  const nextInterviewQuestion = async () => {
    setEvaluation(null);

    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1);
      return;
    }

    setInterviewLoading(true);

    try {
      const response = await API.get(
        `/interview/${interviewSession}/results`
      );

      setInterviewResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load interview results."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  // --------------------------------
  // RESUME CREDIBILITY ANALYZER
  // --------------------------------

  const analyzeCredibility = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Please upload your resume first.");
      return;
    }

    setCredibilityLoading(true);
    setError("");
    setCredibilityReport(null);

    try {
      const data = new FormData();
      data.append("resume", file);

      const response = await API.post(
        "/analyze/resume/credibility",
        data
      );

      setCredibilityReport(response.data.report);
      setActive("Resume Credibility");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Credibility analysis failed."
      );
    } finally {
      setCredibilityLoading(false);
    }
  };

  // --------------------------------
  // SIDEBAR MENU
  // --------------------------------

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Analysis", icon: ChartNoAxesCombined },
    { name: "Resume Credibility", icon: ShieldCheck },
    { name: "Roadmap", icon: Target },
    { name: "Courses", icon: GraduationCap },
    { name: "Mock Interview", icon: MessageSquare }
  ];

  // --------------------------------
  // MAIN UI
  // --------------------------------

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>

          <span>
            skillbridge<span className="brand-ai">.ai</span>
          </span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          {menu.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                active === item.name ? "selected" : ""
              }`}
              onClick={() => {
                setActive(item.name);
                setError("");
              }}
            >
              <item.icon size={19} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="help-card">
            <Sparkles size={19} />

            <strong>Your career journey</strong>

            <p>
              Small steps today. Better opportunities tomorrow.
            </p>
          </div>

          <p className="version">
            SKILLBRIDGE AI · VERSION 1.0
          </p>

        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="main">

        <header className="topbar">

          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{active}</strong>
          </div>

          <div className="top-right">
            <span className="status-dot"></span>
            <span>Career workspace</span>
            <div className="avatar">SB</div>
          </div>

        </header>

        <section className="content">

          {/* DASHBOARD */}

          {active === "Dashboard" && (
            <>

              <div className="welcome">

                <div>

                  <p className="eyebrow">
                    YOUR CAREER, YOUR DIRECTION
                  </p>

                  <h1>
                    Build a career that
                    <br />
                    <em>moves you forward.</em>
                  </h1>

                  <p className="welcome-text">
                    Understand your strengths, discover skill gaps,
                    and create a practical path towards your dream job.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={() =>
                      document.getElementById("analyzer").scrollIntoView({
                        behavior: "smooth"
                      })
                    }
                  >
                    Analyze my resume
                    <ArrowRight size={17} />
                  </button>

                </div>

                <div className="welcome-art">
                  <div className="art-circle">
                    <GraduationCap size={75} />
                  </div>

                  <div className="floating-card">
                    <CheckCircle2 size={17} />
                    Career growth starts here
                  </div>

                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✦</span>
                </div>

              </div>

              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR TOOLKIT</p>
                  <h2>Everything you need to grow</h2>
                </div>
              </div>

              <div className="feature-grid">

                <div className="feature-card">
                  <div className="feature-icon">
                    <FileText />
                  </div>
                  <h3>Resume Analysis</h3>
                  <p>
                    Compare your resume with a job description
                    and discover your match score.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon sage">
                    <Target />
                  </div>
                  <h3>Skill Gap Analysis</h3>
                  <p>
                    Identify missing skills and understand
                    what employers are looking for.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon amber">
                    <BookOpen />
                  </div>
                  <h3>Learning Roadmap</h3>
                  <p>
                    Get a structured 30-day plan to improve
                    your skills step by step.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <ShieldCheck />
                  </div>
                  <h3>Resume Credibility</h3>
                  <p>
                    Find unsupported claims, possible inconsistencies
                    and areas that need verification.
                  </p>
                </div>

              </div>

              {/* RESUME UPLOAD */}

              <section className="analyzer" id="analyzer">

                <div className="analyzer-heading">

                  <div>
                    <p className="eyebrow">LET'S GET STARTED</p>

                    <h2>Find your career match</h2>

                    <p>
                      Upload your resume and paste the job description
                      you are targeting.
                    </p>
                  </div>

                  <div className="analyzer-symbol">
                    <Sparkles size={27} />
                  </div>

                </div>

                <form onSubmit={analyzeResume}>

                  <label className="field-label">
                    YOUR RESUME
                  </label>

                  <label className="upload-box">

                    <UploadCloud size={30} />

                    <strong>
                      {file
                        ? file.name
                        : "Drop your resume here or browse"}
                    </strong>

                    <span>PDF or DOCX · Maximum 5 MB</span>

                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                    />

                  </label>

                  <label className="field-label job-label">
                    JOB DESCRIPTION
                  </label>

                  <textarea
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="Paste the job description here... Include required skills, responsibilities and qualifications."
                    rows={6}
                  />

                  {error && (
                    <p className="error-message">{error}</p>
                  )}

                  <button
                    className="primary-btn analyze-btn"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze my career fit
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                </form>
              </section>

            </>
          )}

          {/* RESUME ANALYSIS */}

          {active === "Analysis" && (
            <section className="result-section">

              <p className="eyebrow">YOUR RESULTS</p>

              <h1>
                Resume <em>analysis</em>
              </h1>

              {result ? (
                <>

                  <div className="score-card">

                    <div>
                      <p className="eyebrow">
                        RESUME–JOB SKILL MATCH
                      </p>

                      <div className="score">
                        {result.match_score}%
                      </div>

                      <p>Your skill overlap score</p>
                    </div>

                    <div className="score-ring">
                      {result.match_score}%
                    </div>

                  </div>

                  <div className="result-grid">

                    <div className="result-card">

                      <h3>
                        <CheckCircle2 />
                        Matched skills
                      </h3>

                      {(result.matched_skills || []).map((s, i) => (
                        <span className="skill-pill" key={i}>
                          {s}
                        </span>
                      ))}

                    </div>

                    <div className="result-card">

                      <h3>
                        <Target />
                        Skills to develop
                      </h3>

                      {(result.missing_skills || []).map((s, i) => (
                        <span className="skill-pill missing" key={i}>
                          {s}
                        </span>
                      ))}

                    </div>

                  </div>

                  <div className="result-card recommendation">

                    <h3>AI career recommendation</h3>

                    <p>
                      {result.gap_analysis?.overall_recommendation ||
                        "Review your missing skills and use the roadmap to plan your learning."}
                    </p>

                    <button
                      className="primary-btn"
                      onClick={generateRoadmap}
                    >
                      Generate my roadmap
                      <ArrowRight size={17} />
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={getCourses}
                    >
                      Find learning courses
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={startInterview}
                      disabled={interviewLoading}
                    >
                      {interviewLoading
                        ? "Starting..."
                        : "Start AI Mock Interview"}
                    </button>

                  </div>

                </>
              ) : (
                <p>Analyze your resume from the Dashboard first.</p>
              )}

            </section>
          )}

          {/* RESUME CREDIBILITY */}

          {active === "Resume Credibility" && (
            <section className="result-section">

              <p className="eyebrow">
                AI-POWERED RESUME VERIFICATION
              </p>

              <h1>
                Resume <em>credibility</em>
              </h1>

              <p className="welcome-text">
                Review resume claims, identify missing evidence
                and discover details that may need clarification.
              </p>

              {/* UPLOAD CARD */}

              <div className="result-card credibility-upload">

                <div className="feature-icon">
                  <ShieldCheck />
                </div>

                <h2>Check your resume claims</h2>

                <p>
                  Upload your PDF or DOCX resume to receive an
                  AI-powered credibility review.
                </p>

                <form onSubmit={analyzeCredibility}>

                  <label className="upload-box">

                    <UploadCloud size={30} />

                    <strong>
                      {file
                        ? file.name
                        : "Choose your resume"}
                    </strong>

                    <span>PDF or DOCX · Maximum 5 MB</span>

                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                    />

                  </label>

                  {error && (
                    <p className="error-message">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="primary-btn analyze-btn"
                    disabled={credibilityLoading}
                  >
                    {credibilityLoading ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        Analyzing claims...
                      </>
                    ) : (
                      <>
                        Analyze resume credibility
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                </form>

              </div>

              {/* CREDIBILITY RESULTS */}

              {credibilityReport && (
                <div className="credibility-results">

                  {/* SUMMARY */}

                  <div className="result-card">
                    <h3>
                      <ShieldCheck />
                      AI Review Summary
                    </h3>

                    <p>
                      {credibilityReport.overall_summary}
                    </p>
                  </div>

                  {/* CLAIMS */}

                  <div className="result-card">

                    <h3>
                      <AlertTriangle />
                      Claims requiring verification
                    </h3>

                    {(credibilityReport.claims || []).length > 0 ? (

                      credibilityReport.claims.map((claim, i) => (

                        <div className="roadmap-day" key={i}>

                          <span>
                            {claim.risk_level} RISK
                            {" · "}
                            {claim.category}
                          </span>

                          <h3>{claim.claim}</h3>

                          <p>
                            <strong>Evidence found:</strong>
                            {" "}
                            {claim.evidence_found}
                          </p>

                          <p>
                            <strong>Concern:</strong>
                            {" "}
                            {claim.concern}
                          </p>

                          <p>
                            <strong>Recommendation:</strong>
                            {" "}
                            {claim.recommendation}
                          </p>

                          <h4>Verification questions</h4>

                          <ul>
                            {(claim.verification_questions || []).map(
                              (question, j) => (
                                <li key={j}>{question}</li>
                              )
                            )}
                          </ul>

                        </div>

                      ))

                    ) : (
                      <p>
                        No claims requiring clarification were identified.
                      </p>
                    )}

                  </div>

                  {/* CONSISTENCY CHECKS */}

                  <div className="result-card">

                    <h3>
                      <AlertTriangle />
                      Consistency checks
                    </h3>

                    {(credibilityReport.consistency_checks || []).length > 0 ? (

                      credibilityReport.consistency_checks.map((item, i) => (

                        <div className="roadmap-day" key={i}>

                          <span>{item.risk_level} RISK</span>

                          <h3>{item.issue}</h3>

                          <p>{item.explanation}</p>

                        </div>

                      ))

                    ) : (
                      <p>
                        No potential inconsistencies were identified.
                      </p>
                    )}

                  </div>

                  {/* POSITIVE OBSERVATIONS */}

                  <div className="result-card">

                    <h3>
                      <CheckCircle2 />
                      Positive observations
                    </h3>

                    {(credibilityReport.positive_observations || []).length > 0 ? (

                      <ul>
                        {credibilityReport.positive_observations.map(
                          (item, i) => (
                            <li key={i}>{item}</li>
                          )
                        )}
                      </ul>

                    ) : (
                      <p>No positive observations returned.</p>
                    )}

                  </div>

                  {/* DISCLAIMER */}

                  <div className="credibility-disclaimer">
                    <ShieldCheck size={19} />

                    <p>
                      {credibilityReport.disclaimer ||
                        "These findings identify claims for verification. They do not establish dishonesty."}
                    </p>
                  </div>

                </div>
              )}

            </section>
          )}

          {/* ROADMAP */}

          {active === "Roadmap" && (
            <section className="result-section">

              <p className="eyebrow">YOUR LEARNING PLAN</p>

              <h1>
                30-day <em>roadmap</em>
              </h1>

              {/* DAILY LEARNING STREAK */}
              <div className="streak-card">
                <div className="streak-top">
                  <div>
                    <p className="eyebrow">BUILD YOUR LEARNING HABIT</p>
                    <h2>Daily Learning Streak</h2>
                    <p className="streak-subtitle">
                      Consistency today creates opportunities tomorrow.
                    </p>
                  </div>
                  <div className="streak-flame" aria-hidden="true">🔥</div>
                </div>

                <div className="streak-stats">
                  <div>
                    <strong>{streakStats.currentStreak}</strong>
                    <span>Current streak</span>
                  </div>
                  <div>
                    <strong>{streakStats.longestStreak}</strong>
                    <span>Longest streak</span>
                  </div>
                  <div>
                    <strong>{learningDates.length}</strong>
                    <span>Total learning days</span>
                  </div>
                </div>

                <p className="streak-week-label">YOUR LAST 7 DAYS</p>
                <div className="streak-week">
                  {Array.from({ length: 7 }, (_, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - index));
                    const dateKey = getLocalDateKey(date);
                    const completed = learningDates.includes(dateKey);

                    return (
                      <div className="streak-day" key={dateKey}>
                        <div className={`streak-day-box ${completed ? "completed" : ""}`}>
                          {completed ? "✓" : "·"}
                        </div>
                        <span>
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={`streak-button ${streakStats.completedToday ? "done" : ""}`}
                  onClick={markLearningDone}
                  disabled={streakStats.completedToday}
                >
                  {streakStats.completedToday
                    ? "✓ Learning completed today"
                    : "🔥 Mark today's learning complete"}
                </button>

                <p className="streak-note">
                  Complete at least one learning task every day to maintain your streak.
                </p>
              </div>

              {roadmap ? (

                <div className="result-card">

                  {(Array.isArray(roadmap.roadmap)
                    ? roadmap.roadmap
                    : Array.isArray(roadmap.roadmap?.roadmap)
                      ? roadmap.roadmap.roadmap
                      : []
                  ).map((day, i) => (

                    <div className="roadmap-day" key={i}>

                      <span>DAY {day.day}</span>

                      <h3>{day.topic}</h3>

                      <p>
                        {Array.isArray(day.tasks)
                          ? day.tasks.join(" · ")
                          : day.tasks}
                      </p>

                      {day.resource && (
                        <a
                          className="resource"
                          href={day.resource}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open learning resource ↗
                        </a>
                      )}

                    </div>

                  ))}

                </div>

              ) : (
                <p>Generate your roadmap from the Analysis page.</p>
              )}

            </section>
          )}

          {/* COURSES */}

          {active === "Courses" && (
            <section className="result-section">

              <p className="eyebrow">
                INDUSTRY-ALIGNED LEARNING
              </p>

              <h1>
                Recommended <em>courses</em>
              </h1>

              {courses ? (

                <div className="course-grid">

                  {(Array.isArray(courses.recommendations)
                    ? courses.recommendations
                    : Array.isArray(courses.recommendations?.recommendations)
                      ? courses.recommendations.recommendations
                      : []
                  ).map((course, i) => (

                    <div className="result-card rated-course" key={i}>

                      <span className="course-platform">
                        {course.platform}
                      </span>

                      <h3>{course.course_name}</h3>

                      <p>{course.description}</p>

                      <p>
                        <strong>Skill:</strong> {course.skill}
                      </p>

                      <p>
                        <strong>Cost:</strong> {course.cost}
                      </p>

                      <div className="industry-rating">

                        <div className="rating-top">

                          <div>
                            <span className="rating-label">
                              INDUSTRY RELEVANCE
                            </span>

                            <div className="rating-number">
                              {Number(
                                course.industry_relevance_rating ?? 0
                              ).toFixed(1)}

                              <span>/5 ★</span>
                            </div>
                          </div>

                          <span className="rating-category">
                            {course.rating_category || "Not rated"}
                          </span>

                        </div>

                        <div className="rating-disclaimer">
                          AI-estimated rating · Confidence:
                          {" "}
                          {course.rating_confidence || "Not specified"}
                        </div>

                        {course.rating_breakdown && (

                          <div className="rating-breakdown">

                            {[
                              ["Industry recognition", "industry_recognition"],
                              ["Job-role relevance", "job_role_relevance"],
                              ["Provider credibility", "provider_credibility"],
                              ["Practical assessment", "practical_assessment"],
                              ["Employer relevance", "employer_relevance"]
                            ].map(([label, key]) => (

                              <div className="rating-row" key={key}>
                                <span>{label}</span>
                                <strong>
                                  {course.rating_breakdown[key] ?? "—"}/5
                                </strong>
                              </div>

                            ))}

                          </div>
                        )}

                        <p className="rating-explanation">
                          {course.rating_explanation ||
                            "No rating explanation provided."}
                        </p>

                      </div>

                      {course.url && (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Explore course
                          <ArrowRight size={15} />
                        </a>
                      )}

                    </div>

                  ))}

                </div>

              ) : (
                <p>Get course recommendations from the Analysis page.</p>
              )}

            </section>
          )}

          {/* MOCK INTERVIEW */}

          {active === "Mock Interview" && (
            <section className="result-section">

              <p className="eyebrow">PRACTICE WITH AI</p>

              <h1>
                Mock <em>interview</em>
              </h1>

              {error && (
                <p className="error-message">{error}</p>
              )}

              {!questions.length && !interviewResults && (

                <div className="result-card interview-intro">

                  <MessageSquare size={35} />

                  <h2>Prepare with confidence</h2>

                  <p>
                    Generate five job-specific interview questions
                    and receive AI feedback on every answer.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={startInterview}
                    disabled={interviewLoading}
                  >
                    {interviewLoading
                      ? "Generating questions..."
                      : "Generate Mock Interview Questions"}

                    <ArrowRight size={17} />
                  </button>

                  {!result && (
                    <p>Analyze your resume first to begin.</p>
                  )}

                </div>
              )}

              {questions.length > 0 && !interviewResults && (

                <div className="result-card interview-card">

                  <div className="interview-progress">
                    QUESTION {questionIndex + 1} OF {questions.length}
                  </div>

                  <div className="progress-track">
                    <div
                      style={{
                        width: `${
                          ((questionIndex + 1) / questions.length) * 100
                        }%`
                      }}
                    />
                  </div>

                  <h2>
                    {questions[questionIndex]?.question}
                  </h2>

                  <p className="interview-meta">
                    {questions[questionIndex]?.difficulty || "Medium"}

                    {questions[questionIndex]?.topic
                      ? ` · ${questions[questionIndex].topic}`
                      : ""}
                  </p>

                  {!evaluation && (
                    <>

                      <label className="field-label">
                        YOUR ANSWER
                      </label>

                      <textarea
                        rows={7}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Write your answer here. Explain your approach and give examples..."
                      />

                      <button
                        className="primary-btn interview-submit"
                        onClick={submitInterviewAnswer}
                        disabled={interviewLoading}
                      >
                        {interviewLoading
                          ? "Evaluating..."
                          : "Submit answer"}

                        <ArrowRight size={17} />
                      </button>

                    </>
                  )}

                  {evaluation && (

                    <div className="evaluation-panel">

                      <div className="evaluation-score">
                        <span>AI SCORE</span>
                        <strong>{evaluation.score}/10</strong>
                      </div>

                      <h3>Feedback</h3>
                      <p>{evaluation.feedback}</p>

                      <h3>What you did well</h3>

                      <p>
                        {Array.isArray(evaluation.strengths)
                          ? evaluation.strengths.join(" · ")
                          : evaluation.strengths}
                      </p>

                      <h3>Areas to improve</h3>

                      <p>
                        {Array.isArray(evaluation.improvements)
                          ? evaluation.improvements.join(" · ")
                          : evaluation.improvements}
                      </p>

                      {evaluation.ideal_answer && (
                        <>
                          <h3>Example of a strong answer</h3>
                          <p>{evaluation.ideal_answer}</p>
                        </>
                      )}

                      <button
                        className="primary-btn"
                        onClick={nextInterviewQuestion}
                        disabled={interviewLoading}
                      >
                        {questionIndex + 1 === questions.length
                          ? "View final results"
                          : "Next question"}

                        <ArrowRight size={17} />
                      </button>

                    </div>
                  )}

                </div>
              )}

              {interviewResults && (

                <div className="result-card interview-card">

                  <p className="eyebrow">INTERVIEW COMPLETED</p>

                  <h2>Your interview performance</h2>

                  <div className="score">
                    {interviewResults.average_score}/10
                  </div>

                  <p>
                    Average score across
                    {" "}
                    {interviewResults.answered_questions}
                    {" "}
                    answered questions.
                  </p>

                  <div className="interview-results-list">

                    {(interviewResults.results || []).map((item, i) => (

                      <div className="roadmap-day" key={item.question_id}>

                        <span>
                          QUESTION {i + 1} · SCORE {item.score}/10
                        </span>

                        <h3>{item.question}</h3>

                        <p>
                          {item.feedback?.feedback ||
                            "Answer submitted and evaluated."}
                        </p>

                      </div>

                    ))}

                  </div>

                  <button
                    className="primary-btn"
                    onClick={startInterview}
                  >
                    Start another interview
                    <ArrowRight size={17} />
                  </button>

                </div>
              )}

            </section>
          )}

        </section>

        <footer>
          © 2026 SkillBridge AI
          <span>Designed for your next opportunity.</span>
        </footer>

      </main>
    </div>
  );
}

export default App;

