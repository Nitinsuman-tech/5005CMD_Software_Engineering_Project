import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { SPECIES_DATA } from "../data/speciesData";
import "./SpeciesQuiz.css";





function pickDistractors(all, excludeIdx, count) {
  const pool = all
    .map((s, i) => ({ name: s.commonName, i }))
    .filter(({ i }) => i !== excludeIdx);

  
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(({ name }) => name);
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(species) {
  const order = shuffled(species.map((_, i) => i)); 
  return order.map((realIdx) => {
    const correct = species[realIdx].commonName;
    const distractors = pickDistractors(species, realIdx, 2);
    const options = shuffled([correct, ...distractors]);
    return {
      species: species[realIdx],
      correct,
      options,
    };
  });
}




const STATE = {
  READY: "ready",
  QUESTION: "question",
  FEEDBACK: "feedback", 
  RESULTS: "results",
  SUBMITTING: "submitting",
  SUBMITTED: "submitted",
};

export default function SpeciesQuiz() {
  const { user, userData, schoolId } = useAuth();
  const navigate = useNavigate();

  
  const [quiz, setQuiz] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState(STATE.READY);

  
  const [chosenAnswer, setChosenAnswer] = useState(null); 
  const [isCorrect, setIsCorrect] = useState(false);

  
  const [submitError, setSubmitError] = useState("");

  // Build quiz on mount
  useEffect(() => {
    setQuiz(buildQuiz(SPECIES_DATA));
  }, []);

  const totalQuestions = SPECIES_DATA.length; // 15
  const currentQ = quiz[currentIdx];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const startQuiz = () => {
    setQuiz(buildQuiz(SPECIES_DATA)); // fresh randomisation each attempt
    setCurrentIdx(0);
    setScore(0);
    setChosenAnswer(null);
    setState(STATE.QUESTION);
  };

  const handleAnswer = useCallback((answer) => {
    if (state !== STATE.QUESTION) return; // lock out double-clicks
    const correct = currentQ.correct;
    const right = answer === correct;
    setChosenAnswer(answer);
    setIsCorrect(right);
    if (right) setScore((s) => s + 1);
    setState(STATE.FEEDBACK);

    // Auto-advance after 1.2 s
    setTimeout(() => {
      const next = currentIdx + 1;
      if (next >= totalQuestions) {
        setState(STATE.RESULTS);
      } else {
        setCurrentIdx(next);
        setChosenAnswer(null);
        setState(STATE.QUESTION);
      }
    }, 1200);
  }, [state, currentIdx, currentQ, totalQuestions]);

  const handleSubmit = async () => {
    setState(STATE.SUBMITTING);
    setSubmitError("");

    try {
      const studentName = userData?.displayName || user.email;

      await addDoc(collection(db, "quiz_results"), {
        studentId: user.uid,
        studentName,
        studentEmail: userData?.displayName || user.email,
        schoolId: schoolId || null,
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        timestamp: serverTimestamp(),
      });

      setState(STATE.SUBMITTED);
    } catch (err) {
      console.error("Quiz submit error:", err);
      setSubmitError("Failed to save your results. Please try again.");
      setState(STATE.RESULTS);
    }
  };

  
  const getPct = () => Math.round((score / totalQuestions) * 100);

  const getGrade = () => {
    const pct = getPct();
    if (pct === 100) return { label: "Perfect! 🏆", color: "#2E7D32" };
    if (pct >= 80) return { label: "Excellent! 🌟", color: "#1565c0" };
    if (pct >= 60) return { label: "Good effort! 👍", color: "#e65100" };
    return { label: "Keep studying! 📚", color: "#6a1b9a" };
  };

  const getButtonClass = (option) => {
    if (state !== STATE.FEEDBACK) return "quiz-option-btn";
    if (option === currentQ?.correct) return "quiz-option-btn quiz-option-correct";
    if (option === chosenAnswer && !isCorrect) return "quiz-option-btn quiz-option-wrong";
    return "quiz-option-btn quiz-option-neutral";
  };

  
  return (
    <div className="quiz-page">
      
      <button
        className="quiz-back-btn"
        onClick={() => navigate("/student")}
      >
        ← Back to Dashboard
      </button>

      
      {state === STATE.READY && (
        <div className="quiz-card quiz-card-center">
          <div className="quiz-hero-emoji">🦎</div>
          <h2 className="quiz-title">Species ID Quiz</h2>
          <p className="quiz-subtitle">
            Test your knowledge of Indonesia's 15 endemic endangered species.
            Identify each animal by its image and choose the correct name.
          </p>
          <div className="quiz-rules">
            <div className="quiz-rule">📸 15 species images</div>
            <div className="quiz-rule">🔘 3 choices per question</div>
            <div className="quiz-rule">⚡ Instant feedback</div>
            <div className="quiz-rule">📊 Results saved for your teacher</div>
          </div>
          <button className="quiz-start-btn" onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      )}

      
      {(state === STATE.QUESTION || state === STATE.FEEDBACK) && currentQ && (
        <div className="quiz-card">
          
          <div className="quiz-progress-bar-track">
            <div
              className="quiz-progress-bar-fill"
              style={{ width: `${((currentIdx) / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="quiz-progress-text">
            <span>Question {currentIdx + 1} of {totalQuestions}</span>
            <span>Score: <strong>{score}</strong></span>
          </div>

          
          <div className="quiz-species-display">
            <div className="quiz-species-emoji">{currentQ.species.emoji}</div>
            <div className="quiz-species-info">
              <span className="quiz-species-hint">
                📍 {currentQ.species.island}
              </span>
              <span
                className="quiz-iucn-badge"
                data-status={currentQ.species.iucnCode}
              >
                {currentQ.species.conservationStatus}
              </span>
            </div>
          </div>

          <p className="quiz-question-text">What is this species?</p>

          
          <div className="quiz-options">
            {currentQ.options.map((option) => (
              <button
                key={option}
                className={getButtonClass(option)}
                onClick={() => handleAnswer(option)}
                disabled={state === STATE.FEEDBACK}
              >
                {state === STATE.FEEDBACK && option === currentQ.correct && (
                  <span className="quiz-option-icon">✓ </span>
                )}
                {state === STATE.FEEDBACK && option === chosenAnswer && !isCorrect && (
                  <span className="quiz-option-icon">✗ </span>
                )}
                {option}
              </button>
            ))}
          </div>

          
          {state === STATE.FEEDBACK && (
            <div className={`quiz-feedback-bar ${isCorrect ? "quiz-feedback-correct" : "quiz-feedback-wrong"}`}>
              {isCorrect
                ? `✅ Correct! That's the ${currentQ.correct}.`
                : `❌ It was the ${currentQ.correct}.`}
            </div>
          )}
        </div>
      )}

      
      {(state === STATE.RESULTS || state === STATE.SUBMITTING || state === STATE.SUBMITTED) && (
        <div className="quiz-card quiz-card-center">
          <div className="quiz-results-emoji">🎓</div>
          <h2 className="quiz-title">Quiz Complete!</h2>

          <div className="quiz-score-display">
            <span className="quiz-score-number" style={{ color: getGrade().color }}>
              {score}<span className="quiz-score-denom">/{totalQuestions}</span>
            </span>
            <span className="quiz-score-pct">{getPct()}%</span>
          </div>

          <p className="quiz-grade-label" style={{ color: getGrade().color }}>
            {getGrade().label}
          </p>

          
          <div className="quiz-score-bar-track">
            <div
              className="quiz-score-bar-fill"
              style={{
                width: `${getPct()}%`,
                background: getGrade().color,
              }}
            />
          </div>

          {submitError && (
            <p className="quiz-submit-error">{submitError}</p>
          )}

          {state === STATE.SUBMITTED ? (
            <div className="quiz-submitted-msg">
              ✅ Results saved! Your teacher can now see your score.
              <button className="quiz-retry-btn" onClick={startQuiz} style={{ marginTop: "16px" }}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="quiz-results-actions">
              <button
                className="quiz-submit-btn"
                onClick={handleSubmit}
                disabled={state === STATE.SUBMITTING}
              >
                {state === STATE.SUBMITTING ? "Saving..." : "Submit Results"}
              </button>
              <button className="quiz-retry-btn" onClick={startQuiz}>
                Retry Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
