from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_google_genai import ChatGoogleGenerativeAI
from operator import itemgetter
from decouple import config

from src.qdrant import vector_store

model = ChatGoogleGenerativeAI(
    model="gemini-3.8-flash",
    google_api_key=config("GEMINI_API_KEY")
)

prompt_template = """
You are answering questions about NGX Group.

Answer the question using only the information provided in the context.

If the answer cannot be found in the context, say:
"I couldn't find that information in the provided content."

Do not invent or assume information.

Keep the answer concise and use bullet points where appropriate.

Context:
{context}

Question:
{question}

Answer:
"""

prompt = ChatPromptTemplate.from_template(prompt_template)

retriever = vector_store.as_retriever()



def create_chain():
    chain = (
        {
            "context": retriever,
            "question": RunnablePassthrough(),
        }
        | RunnableParallel(
            {
                "response": prompt | model,
                "context": itemgetter("context"),
            }
        )
    )

    return chain


def get_answer_and_docs(question: str):
    chain = create_chain()
    response = chain.invoke(question)
    answer = response["response"].content
    context = response["context"]
    return {
    "answer": answer,
    "context": context
}

# response = get_answer_and_docs("What is the primary role of NGX Group, and what services does it provide?")
# print(response)