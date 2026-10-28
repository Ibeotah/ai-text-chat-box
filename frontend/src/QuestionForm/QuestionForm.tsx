import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import styles from "./QuestionForm.module.css";
import Spinner from "../components/Spinner/Spinner";
import { extractAnswerText } from "../utils/extractAnswerText";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
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
    <article className={`${styles['expander']} ${isOpen ? styles['expander-open'] : ""}`}>
      <button
        type='button'
        className={styles['expander-button']}
        onClick={handleExpander}
        aria-expanded={isOpen}>
        <span>{title}</span>
        <span className={styles['expander-icon']}>{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && <p className={styles['expander-content']}>{content}</p>}
    </article>
  );
};

function QuestionForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuestion = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!question.trim()) return;

    setIsLoading(true);

    try {
      const response = await api.post("/chat", {
        message: question,
      });

       const cleanAnswer = extractAnswerText(response.data.answer);
      setAnswer(cleanAnswer);
      setDocuments(response.data.documents);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles['question-form']}>
      <form className={styles['question-form-form']} onSubmit={handleSubmit}>
        <label htmlFor='question'>Ask a question</label>

        <div className={styles['question-input-wrapper']}>
          <input
            id='question'
            type='text'
            value={question}
            onChange={handleQuestion}
            placeholder='Ask something about your knowledge base...'
            autoComplete='off'
          />

          <button
            type='submit'
            className={styles['submit-button']}
            disabled={isLoading || !question.trim()}>
            {isLoading ? <Spinner /> : "Ask"}
          </button>
        </div>
      </form>

      {answer && (
        <section className={`${styles['result-section']} ${styles['answer-section']}`}>
          <div className={styles['section-heading']}>
            <span className={styles['section-label']}>RESPONSE</span>
            <h2>Answer</h2>
          </div>

          <div className={styles['answer-card']}>
           <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section className={`${styles['result-section']} ${styles['documents-section']}`}>
          <div className={styles['section-heading']}>
            <span className={styles['section-label']}>SOURCES</span>
            <h2>Documents</h2>
          </div>

          <div className={styles['documents-list']}>
            {documents.map((document, index) => (
              <Expander
                key={index}
                title={
                  document.page_content.split(" ").slice(0, 5).join(" ") + "..."
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