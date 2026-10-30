import { useState } from "react";
import {
  ArrowRight, BriefcaseBusiness, ChartNoAxesCombined,
  FileText, GraduationCap, LayoutDashboard, Menu,
  Sparkles, Target, UploadCloud, X, CheckCircle2,
  BookOpen, MessageSquare, LoaderCircle
} from "lucide-react";
import API from "./api/api";

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
      setError(err.response?.data?.detail || "Could not connect to backend. Check that your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async () => {
    try {
      const response = await API.post("/roadmap/", null, {
        params: { analysis_id: result.analysis_id }
      });
      setRoadmap(response.data);
      setActive("Roadmap");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate roadmap.");
    }
  };

  const getCourses = async () => {
    try {
      const response = await API.post("/courses/", null, {
        params: { analysis_id: result.analysis_id }
      });
      setCourses(response.data);
      setActive("Courses");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to get course recommendations.");
    }
  };

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
      setError(err.response?.data?.detail || "Unable to start interview.");
    } finally {
      setInterviewLoading(false);
    }
  };

  const submitInterviewAnswer = async () => {
    const current = questions[questionIndex];

    if (!answer.trim()) {
      setError("Please write your answer first.");
      return;
    }

    if (!current?.question_id || !interviewSession) {
      setError("Interview question details are missing. Please start a new interview.");
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
      setError(err.response?.data?.detail || "Unable to evaluate your answer.");
    } finally {
      setInterviewLoading(false);
    }
  };

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
      setError(err.response?.data?.detail || "Unable to load interview results.");
    } finally {
      setInterviewLoading(false);
    }
  };

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Analysis", icon: ChartNoAxesCombined },
    { name: "Roadmap", icon: Target },
    { name: "Courses", icon: GraduationCap },
    { name: "Mock Interview", icon: MessageSquare },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={22}/></div>
          <span>skillbridge<span className="brand-ai">.ai</span></span>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav>
          {menu.map((item) => (
            <button key={item.name}
              className={`nav-item ${active === item.name ? "selected" : ""}`}
              onClick={() => setActive(item.name)}>
              <item.icon size={19}/>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={19}/>
            <strong>Your career journey</strong>
            <p>Small steps today. Better opportunities tomorrow.</p>
          </div>
          <p className="version">SKILLBRIDGE AI · VERSION 1.0</p>
        </div>
      </aside>

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
          {active === "Dashboard" && (
            <>
              <div className="welcome">
                <div>
                  <p className="eyebrow">YOUR CAREER, YOUR DIRECTION</p>
                  <h1>Build a career that<br/><em>moves you forward.</em></h1>
                  <p className="welcome-text">
                    Understand your strengths, discover skill gaps, and create
                    a practical path towards your dream job.
                  </p>
                  <button className="primary-btn"
                    onClick={() => document.getElementById("analyzer").scrollIntoView({behavior:"smooth"})}>
                    Analyze my resume <ArrowRight size={17}/>
                  </button>
                </div>
                <div className="welcome-art">
                  <div className="art-circle"><GraduationCap size={75}/></div>
                  <div className="floating-card"><CheckCircle2 size={17}/> Career growth starts here</div>
                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✦</span>
                </div>
              </div>

              <div className="section-heading">
                <div><p className="eyebrow">YOUR TOOLKIT</p><h2>Everything you need to grow</h2></div>
              </div>

              <div className="feature-grid">
                <div className="feature-card">
                  <div className="feature-icon"><FileText/></div>
                  <h3>Resume Analysis</h3>
                  <p>Compare your resume with a job description and discover your match score.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon sage"><Target/></div>
                  <h3>Skill Gap Analysis</h3>
                  <p>Identify missing skills and understand what employers are looking for.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon amber"><BookOpen/></div>
                  <h3>Learning Roadmap</h3>
                  <p>Get a structured 30-day plan to improve your skills step by step.</p>
                </div>
              </div>

              <section className="analyzer" id="analyzer">
                <div className="analyzer-heading">
                  <div>
                    <p className="eyebrow">LET'S GET STARTED</p>
                    <h2>Find your career match</h2>
                    <p>Upload your resume and paste the job description you are targeting.</p>
                  </div>
                  <div className="analyzer-symbol"><Sparkles size={27}/></div>
                </div>

                <form onSubmit={analyzeResume}>
                  <label className="field-label">YOUR RESUME</label>
                  <label className="upload-box">
                    <UploadCloud size={30}/>
                    <strong>{file ? file.name : "Drop your resume here or browse"}</strong>
                    <span>PDF or DOCX · Maximum 5 MB</span>
                    <input type="file" accept=".pdf,.docx"
                      onChange={(e) => setFile(e.target.files[0])}/>
                  </label>

                  <label className="field-label job-label">JOB DESCRIPTION</label>
                  <textarea value={job} onChange={(e) => setJob(e.target.value)}
                    placeholder="Paste the job description here... Include required skills, responsibilities and qualifications."
                    rows={6}/>

                  {error && <p className="error-message">{error}</p>}

                  <button className="primary-btn analyze-btn" type="submit" disabled={loading}>
                    {loading ? <><LoaderCircle className="spin" size={18}/> Analyzing...</> :
                      <>Analyze my career fit <ArrowRight size={17}/></>}
                  </button>
                </form>
              </section>
            </>
          )}

          {active === "Analysis" && (
            <section className="result-section">
              <p className="eyebrow">YOUR RESULTS</p>
              <h1>Resume <em>analysis</em></h1>
              {result ? <>
                <div className="score-card">
                  <div><p className="eyebrow">RESUME–JOB SKILL MATCH</p><div className="score">{result.match_score}%</div><p>Your skill overlap score</p></div>
                  <div className="score-ring">{result.match_score}%</div>
                </div>
                <div className="result-grid">
                  <div className="result-card"><h3><CheckCircle2/> Matched skills</h3>
                    {(result.matched_skills || []).map((s,i)=><span className="skill-pill" key={i}>{s}</span>)}
                  </div>
                  <div className="result-card"><h3><Target/> Skills to develop</h3>
                    {(result.missing_skills || []).map((s,i)=><span className="skill-pill missing" key={i}>{s}</span>)}
                  </div>
                </div>
                <div className="result-card recommendation">
                  <h3>AI career recommendation</h3>
                  <p>{result.gap_analysis?.overall_recommendation || "Review your missing skills and use the roadmap to plan your learning."}</p>
                  <button className="primary-btn" onClick={generateRoadmap}>Generate my roadmap <ArrowRight size={17}/></button>
                  <button className="secondary-btn" onClick={getCourses}>Find learning courses</button>
                  <button className="secondary-btn" onClick={startInterview} disabled={interviewLoading}>
                    {interviewLoading ? "Starting..." : "Start AI Mock Interview"}
                  </button>
                </div>
              </> : <p>Analyze your resume from the Dashboard first.</p>}
            </section>
          )}

          {active === "Roadmap" && (
            <section className="result-section">
              <p className="eyebrow">YOUR LEARNING PLAN</p><h1>30-day <em>roadmap</em></h1>
              {roadmap ? <div className="result-card">
                {(Array.isArray(roadmap.roadmap)
                  ? roadmap.roadmap
                  : Array.isArray(roadmap.roadmap?.roadmap)
                    ? roadmap.roadmap.roadmap
                    : []).map((day,i)=><div className="roadmap-day" key={i}>
                  <span>DAY {day.day}</span><h3>{day.topic}</h3>
                  <p>{Array.isArray(day.tasks) ? day.tasks.join(" · ") : day.tasks}</p>
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
                </div>)}
              </div> : <p>Generate your roadmap from the Analysis page.</p>}
            </section>
          )}

          {active === "Courses" && (
            <section className="result-section">
              <p className="eyebrow">INDUSTRY-ALIGNED LEARNING</p>
              <h1>Recommended <em>courses</em></h1>
              {courses ? (
                <div className="course-grid">
                  {(Array.isArray(courses.recommendations)
                    ? courses.recommendations
                    : Array.isArray(courses.recommendations?.recommendations)
                      ? courses.recommendations.recommendations
                      : []).map((course, i) => (
                    <div className="result-card rated-course" key={i}>
                      <span className="course-platform">{course.platform}</span>
                      <h3>{course.course_name}</h3>
                      <p>{course.description}</p>
                      <p><strong>Skill:</strong> {course.skill}</p>
                      <p><strong>Cost:</strong> {course.cost}</p>

                      <div className="industry-rating">
                        <div className="rating-top">
                          <div>
                            <span className="rating-label">INDUSTRY RELEVANCE</span>
                            <div className="rating-number">
                              {Number(course.industry_relevance_rating ?? 0).toFixed(1)}
                              <span>/5 ★</span>
                            </div>
                          </div>
                          <span className="rating-category">
                            {course.rating_category || "Not rated"}
                          </span>
                        </div>

                        <div className="rating-disclaimer">
                          AI-estimated rating · Confidence: {course.rating_confidence || "Not specified"}
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
                                <strong>{course.rating_breakdown[key] ?? "—"}/5</strong>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="rating-explanation">
                          {course.rating_explanation || "No rating explanation provided."}
                        </p>
                      </div>

                      {course.url && (
                        <a href={course.url} target="_blank" rel="noreferrer">
                          Explore course <ArrowRight size={15}/>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p>Get course recommendations from the Analysis page.</p>}
            </section>
          )}

          {active === "Mock Interview" && (
            <section className="result-section">
              <p className="eyebrow">PRACTICE WITH AI</p>
              <h1>Mock <em>interview</em></h1>

              {error && <p className="error-message">{error}</p>}

              {!questions.length && !interviewResults && (
                <div className="result-card interview-intro">
                  <MessageSquare size={35}/>
                  <h2>Prepare with confidence</h2>
                  <p>Generate five job-specific interview questions and receive AI feedback on every answer.</p>
                  <button className="primary-btn" onClick={startInterview} disabled={interviewLoading}>
                    {interviewLoading ? "Generating questions..." : "Generate Mock Interview Questions"}
                    <ArrowRight size={17}/>
                  </button>
                  {!result && <p>Analyze your resume first to begin.</p>}
                </div>
              )}

              {questions.length > 0 && !interviewResults && (
                <div className="result-card interview-card">
                  <div className="interview-progress">
                    QUESTION {questionIndex + 1} OF {questions.length}
                  </div>
                  <div className="progress-track">
                    <div style={{width: `${((questionIndex + 1) / questions.length) * 100}%`}} />
                  </div>

                  <h2>{questions[questionIndex]?.question}</h2>
                  <p className="interview-meta">
                    {questions[questionIndex]?.difficulty || "Medium"}
                    {questions[questionIndex]?.topic ? ` · ${questions[questionIndex].topic}` : ""}
                  </p>

                  {!evaluation && (
                    <>
                      <label className="field-label">YOUR ANSWER</label>
                      <textarea
                        rows={7}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Write your answer here. Explain your approach and give examples..."
                      />
                      <button className="primary-btn interview-submit"
                        onClick={submitInterviewAnswer} disabled={interviewLoading}>
                        {interviewLoading ? "Evaluating..." : "Submit answer"}
                        <ArrowRight size={17}/>
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
                      <p>{Array.isArray(evaluation.strengths) ? evaluation.strengths.join(" · ") : evaluation.strengths}</p>
                      <h3>Areas to improve</h3>
                      <p>{Array.isArray(evaluation.improvements) ? evaluation.improvements.join(" · ") : evaluation.improvements}</p>
                      {evaluation.ideal_answer && (
                        <>
                          <h3>Example of a strong answer</h3>
                          <p>{evaluation.ideal_answer}</p>
                        </>
                      )}
                      <button className="primary-btn" onClick={nextInterviewQuestion} disabled={interviewLoading}>
                        {questionIndex + 1 === questions.length ? "View final results" : "Next question"}
                        <ArrowRight size={17}/>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {interviewResults && (
                <div className="result-card interview-card">
                  <p className="eyebrow">INTERVIEW COMPLETED</p>
                  <h2>Your interview performance</h2>
                  <div className="score">{interviewResults.average_score}/10</div>
                  <p>Average score across {interviewResults.answered_questions} answered questions.</p>
                  <div className="interview-results-list">
                    {(interviewResults.results || []).map((item, i) => (
                      <div className="roadmap-day" key={item.question_id}>
                        <span>QUESTION {i + 1} · SCORE {item.score}/10</span>
                        <h3>{item.question}</h3>
                        <p>{item.feedback?.feedback || "Answer submitted and evaluated."}</p>
                      </div>
                    ))}
                  </div>
                  <button className="primary-btn" onClick={startInterview}>
                    Start another interview <ArrowRight size={17}/>
                  </button>
                </div>
              )}
            </section>
          )}
        </section>

        <footer>© 2026 SkillBridge AI <span>Designed for your next opportunity.</span></footer>
      </main>
    </div>
  );
}

export default App;
