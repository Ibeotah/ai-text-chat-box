import { useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import styles from "./QuestionForm.module.css";
import Spinner from "../components/Spinner/Spinner";
import { extractAnswerText } from "../utils/extractAnswerText";

// Show the "taking longer" notice after 20 seconds
const SLOW_RESPONSE_DELAY_MS = 20000;

// Stop waiting for the API after 240 seconds
const REQUEST_TIMEOUT_MS = 240000;

// TEST ONLY: remove or replace these before going live
const SAMPLE_QUESTIONS = [
  "What is the role of NGX Group?",
  "What is the difference between stocks and bonds?",
  "What services does NGX Group provide",
];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: REQUEST_TIMEOUT_MS,
});

type Document = {
  page_content: string;
  metadata: Record<string, unknown>;
};

type ExpanderProps = {
  title: string;
  content: string;
};

const Expander = ({ title, content }: ExpanderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExpander = () => {
    setIsOpen((isOpen) => !isOpen);
  };

  return (
    <article
      className={`${styles["expander"]} ${isOpen ? styles["expander-open"] : ""}`}>
      <button
        type='button'
        className={styles["expander-button"]}
        onClick={handleExpander}
        aria-expanded={isOpen}>
        <span>{title}</span>
        <span className={styles["expander-icon"]}>{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && <p className={styles["expander-content"]}>{content}</p>}
    </article>
  );
};

function QuestionForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQuestion = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  };

  // Fill the input only. The user still clicks "Ask".
  const handleSampleClick = (sample: string) => {
    setQuestion(sample);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    setIsLoading(true);
    setShowSlowNotice(false);
    setErrorMessage("");
    setAnswer("");
    setDocuments([]);

    const slowTimer = setTimeout(() => {
      setShowSlowNotice(true);
    }, SLOW_RESPONSE_DELAY_MS);

    try {
      const response = await api.post("/chat", {
        message: trimmedQuestion,
      });

      setAnswer(extractAnswerText(response.data.answer));
      setDocuments(response.data.documents ?? []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        setErrorMessage("The request took too long. Please try again.");
      } else {
        setErrorMessage("We could not get an answer. Please try again.");
      }
    } finally {
      clearTimeout(slowTimer);
      setShowSlowNotice(false);
      setIsLoading(false);
    }
  };

  return (
    <section className={styles["question-form"]}>
      <form className={styles["question-form-form"]} onSubmit={handleSubmit}>
        <label htmlFor='question'>Ask a question about stocks or bonds</label>

        <div className={styles["question-input-wrapper"]}>
          <input
            ref={inputRef}
            id='question'
            type='text'
            value={question}
            onChange={handleQuestion}
            placeholder='Type your question about stocks or bonds...'
            autoComplete='off'
          />

          <button
            type='submit'
            className={styles["submit-button"]}
            disabled={isLoading || !question.trim()}
            aria-busy={isLoading}>
            {isLoading ? (
              <>
                <Spinner />
                <span>Asking...</span>
              </>
            ) : (
              "Ask"
            )}
          </button>
        </div>

        {isLoading && showSlowNotice && (
          <div className={styles["slow-notice"]} role='status'>
            <span aria-hidden='true'>⏳</span>
            <p>
              Your answer is still being prepared. The system is searching the
              sources and saving the result, so this can take a little longer.
              Please keep this page open.
            </p>
          </div>
        )}

        {errorMessage && (
          <p className={styles["error-message"]} role='alert'>
            {errorMessage}
          </p>
        )}

        <div className={styles["sample-questions"]}>
          <span className={styles["sample-label"]}>Try a sample question:</span>

          <div className={styles["sample-list"]}>
            {SAMPLE_QUESTIONS.map((sample) => (
              <button
                key={sample}
                type='button'
                className={styles["sample-chip"]}
                onClick={() => handleSampleClick(sample)}
                disabled={isLoading}>
                {sample}
              </button>
            ))}
          </div>
        </div>
      </form>

      {answer && (
        <section
          className={`${styles["result-section"]} ${styles["answer-section"]}`}>
          <div className={styles["section-heading"]}>
            <span className={styles["section-label"]}>RESPONSE</span>
            <h2>Answer</h2>
          </div>

          <div className={styles["answer-card"]}>
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </section>
      )}

      {!answer?.startsWith("I couldn't find that information") &&
        documents.length > 0 && (
          <section
            className={`${styles["result-section"]} ${styles["documents-section"]}`}>
            <div className={styles["section-heading"]}>
              <span className={styles["section-label"]}>SOURCES</span>
              <h2>Documents</h2>
            </div>

            <div className={styles["documents-list"]}>
              {documents.map((document, index) => (
                <Expander
                  key={index}
                  title={
                    document.page_content.split(" ").slice(0, 5).join(" ") +
                    "..."
                  }
                  content={document.page_content}
                />
              ))}
            </div>
          </section>
        )}
    </section>
  );
}

export default QuestionForm;
