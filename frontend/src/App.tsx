

import logo from "./assets/hero.png";
import "./App.css";
import QuestionForm from "./QuestionForm/QuestionForm";

function App() {
  return (
    <main className='app'>
      <section className='app-container'>
        <header className='app-header'>
          <img src={logo} className='app-logo' alt='Fullstack RAG logo' />

          <div className='app-intro'>
            <span className='app-badge'>AI KNOWLEDGE ASSISTANT</span>

            <h1>Fullstack-RAG</h1>

            <p>
              Ask questions and get answers grounded in your knowledge base.
            </p>
          </div>
        </header>

        <QuestionForm />
      </section>
    </main>
  );
}

export default App;
