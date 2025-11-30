from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Any, Dict, Union
import os
import json
import re
import time
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path
import openai
import requests

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials missing.")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    print("Warning: OPENAI_API_KEY missing.")

# --- Pydantic Models ---

class TransactionQuery(BaseModel):
    query: str
    clientId: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    limit: Optional[int] = 100

class ChartRequest(BaseModel):
    query: Optional[str] = ""
    clientId: Optional[str] = None
    chartType: Optional[str] = 'bar'
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None

class EmailRequest(BaseModel):
    to: str
    subject: str
    transactionSummary: Any
    chartData: Optional[Any] = None

class RAGRequest(BaseModel):
    query: str
    matchThreshold: Optional[float] = 0.7
    matchCount: Optional[int] = 5
    enhanceWithContext: Optional[bool] = True

class WebSearchRequest(BaseModel):
    query: str
    maxResults: Optional[int] = 5

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False

class AgentRequest(BaseModel):
    query: str
    conversationId: Optional[str] = None
    userId: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

# --- Helper Functions ---

def classify_intent(query: str) -> str:
    lower_query = query.lower()
    
    # Check for web search FIRST (before doc_rag which also matches 'what', 'tutorial', 'guide', etc.)
    # Include weather, real-time info, and time-sensitive queries
    if (re.search(r'\b(web|google|latest|news|current|recent|breaking|real-time|realtime|look up|find online|internet)\b', lower_query) or
        re.search(r'\b(weather|temperature|forecast|climate)\b', lower_query) or
        re.search(r'\b(now|today|tonight|tomorrow|this week)\b.*\b(weather|temperature|news|events|happening)\b', lower_query) or
        re.search(r'\bwhat\'?s\s+(the\s+)?(weather|temperature|news|happening)\b', lower_query) or
        re.search(r'\bsearch\s+(the\s+)?web\b', lower_query) or
        re.search(r'\bweb\s+search\b', lower_query) or
        re.search(r'\bfrom\s+(the\s+)?web\b', lower_query) or
        re.search(r'\bgoogle\s+search\b', lower_query) or
        (re.search(r'\bsearch\b', lower_query) and re.search(r'\b(latest|news|online|internet)\b', lower_query)) or
        (re.search(r'\b(latest|recent|current)\b', lower_query) and re.search(r'\bnews\b', lower_query))):
        return "web"
    
    if re.search(r'\b(email|send|mail)\b', lower_query) and (re.search(r'\b(report|transaction|above)\b', lower_query) or '@' in lower_query):
        return "transaction_email"
    
    if re.search(r'\b(transaction|client|purchase|refund|payment)\b', lower_query):
        if re.search(r'\b(chart|plot|graph|visualize|trend)\b', lower_query):
            return "transaction_chart"
        return "transaction_query"
    
    if re.search(r'\b(chart|plot|graph|visualize|trend)\b', lower_query):
        return "chart"
    
    if re.search(r'\b(how|what|why|explain|documentation|docs|guide|tutorial)\b', lower_query):
        return "doc_rag"
    
    if re.search(r'\b(select|query|show|get|retrieve|find|search|top|merchants|revenue|transactions)\b', lower_query):
        return "sql"
    
    if re.search(r'\b(report|summary|analysis|breakdown)\b', lower_query):
        return "report"
    
    if re.search(r'\b(status|health|uptime|api|service)\b', lower_query):
        return "api_status"
    
    return "general"

# --- Core Logic Functions ---

async def logic_transaction_query(request: TransactionQuery):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    print(f"Transaction query received: {request}")
    
    query = supabase.table("transactions").select("*").order("tran_date", desc=True).limit(request.limit)

    if request.clientId:
        query = query.eq("client_id", request.clientId)
    if request.type:
        query = query.eq("type", request.type.upper())
    if request.status:
        query = query.eq("tran_status", request.status.upper())
    if request.dateFrom:
        query = query.gte("tran_date", request.dateFrom)
    if request.dateTo:
        query = query.lte("tran_date", request.dateTo)

    response = query.execute()
    transactions = response.data

    total_amount = sum(float(t["tran_amt"]) for t in transactions)
    approved_count = len([t for t in transactions if t["tran_status"] == "APPROVED"])
    declined_count = len([t for t in transactions if t["tran_status"] == "DECLINED"])

    summary = {
        "totalTransactions": len(transactions),
        "totalAmount": f"{total_amount:.2f}",
        "approvedCount": approved_count,
        "declinedCount": declined_count,
        "transactions": transactions,
    }

    voice_summary = f"Found {summary['totalTransactions']} transactions totaling ${summary['totalAmount']}. {approved_count} approved, {declined_count} declined."

    return {
        "success": True,
        "summary": summary,
        "voiceSummary": voice_summary,
        "query": request.query,
    }

async def logic_transaction_chart(request: ChartRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    print(f"Chart generation request: {request}")
    
    query = supabase.table("transactions").select("*").order("tran_date", desc=False) # Ascending for charts

    if request.clientId:
        query = query.eq("client_id", request.clientId)
    if request.dateFrom:
        query = query.gte("tran_date", request.dateFrom)
    if request.dateTo:
        query = query.lte("tran_date", request.dateTo)
        
    response = query.execute()
    transactions = response.data
    
    chart_type = request.chartType or 'bar'
    chart_data = {
        "type": chart_type,
        "data": {
            "labels": [],
            "datasets": []
        }
    }
    
    if chart_type == 'pie':
        status_counts = {}
        for t in transactions:
            status = t["tran_status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        chart_data["data"]["labels"] = list(status_counts.keys())
        chart_data["data"]["datasets"] = [{
            "label": "Transaction Status Distribution",
            "data": list(status_counts.values()),
            "color": "#8b5cf6"
        }]
    elif chart_type in ['line', 'bar']:
        date_groups = {}
        for t in transactions:
            date_obj = datetime.strptime(t["tran_date"], "%Y-%m-%d")
            formatted_date = f"{date_obj.month}/{date_obj.day}"
            date_groups[formatted_date] = date_groups.get(formatted_date, 0) + float(t["tran_amt"])
            
        sorted_dates = list(date_groups.keys()) # Already sorted by query order usually, but dict preserves insertion order in modern python
        
        chart_data["data"]["labels"] = sorted_dates
        chart_data["data"]["datasets"] = [{
            "label": "Transaction Amount",
            "data": [float(f"{date_groups[d]:.2f}") for d in sorted_dates],
            "color": "#8b5cf6"
        }]
        
    voice_summary = f"Generated {chart_type} chart showing {len(transactions)} transactions."
    
    return {
        "success": True,
        "chartData": chart_data,
        "voiceSummary": voice_summary,
        "transactionCount": len(transactions)
    }

async def logic_transaction_email(request: EmailRequest):
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not configured.")
        raise HTTPException(status_code=503, detail="Email service not configured")
        
    print(f"Email request to {request.to}")
    
    # Construct HTML (Simplified for brevity, but keeping structure)
    rows = ""
    for t in request.transactionSummary.get('transactions', [])[:20]:
        rows += f"""
          <tr>
            <td>{t.get('id')}</td>
            <td>{t.get('client_id')}</td>
            <td>{t.get('type')}</td>
            <td>${float(t.get('tran_amt', 0)):.2f}</td>
            <td>{t.get('tran_status')}</td>
            <td>{t.get('tran_date')}</td>
          </tr>
        """
        
    html_content = f"""
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {{ font-family: Arial, sans-serif; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }}
            th {{ background-color: #8b5cf6; color: white; }}
          </style>
        </head>
        <body>
            <h1>{request.subject}</h1>
            <p>Total Transactions: {request.transactionSummary.get('totalTransactions')}</p>
            <p>Total Amount: ${request.transactionSummary.get('totalAmount')}</p>
            <table>
                <thead>
                    <tr><th>ID</th><th>Client</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </body>
      </html>
    """
    
    payload = {
        "from": "Transaction Intelligence <onboarding@resend.dev>",
        "to": [request.to],
        "subject": request.subject,
        "html": html_content
    }
    
    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload
    )
    
    if not response.ok:
        error_data = response.json()
        print(f"Resend API error: {error_data}")
        raise HTTPException(status_code=response.status_code, detail=f"Failed to send email: {error_data}")
        
    result = response.json()
    return {
        "success": True,
        "message": "Email sent successfully",
        "emailId": result.get("id"),
        "voiceSummary": f"Transaction report sent to {request.to}"
    }

async def logic_rag_retrieval(request: RAGRequest):
    if not OPENAI_API_KEY or not supabase:
        raise HTTPException(status_code=500, detail="Configuration missing")
        
    # 1. Generate Embedding
    emb_response = openai.embeddings.create(
        model="text-embedding-ada-002",
        input=request.query
    )
    query_embedding = emb_response.data[0].embedding
    
    # 2. Search in Supabase
    rpc_response = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_threshold": request.matchThreshold,
            "match_count": request.matchCount,
        }
    ).execute()
    
    documents = rpc_response.data
    
    enhanced_response = None
    if request.enhanceWithContext and documents:
        context = "\n\n".join([f"[{i+1}] {doc['title']}\n{doc['content']}" for i, doc in enumerate(documents)])
        
        chat_completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Answer based on context."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.query}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        enhanced_response = chat_completion.choices[0].message.content

    return {
        "query": request.query,
        "documents": documents or [],
        "enhancedResponse": enhanced_response,
        "metadata": {
            "matchThreshold": request.matchThreshold,
            "matchCount": request.matchCount,
            "resultsFound": len(documents) if documents else 0
        }
    }

async def logic_web_search(request: WebSearchRequest):
    if not SERPER_API_KEY:
        raise HTTPException(status_code=500, detail="SERPER_API_KEY missing")

    # Serper API endpoint
    url = "https://google.serper.dev/search"
    
    # Build request payload
    payload = {
        "q": request.query,
        "num": request.maxResults or 5
    }
    
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        results = response.json()
        organic_results = results.get("organic", [])
        cleaned_results = []

        # Clean and format results
        for i, r in enumerate(organic_results[:request.maxResults], 1):
            cleaned_results.append({
                "title": r.get("title"),
                "url": r.get("link"),
                "snippet": r.get("snippet"),
                "position": i
            })

        final_answer = "I found the following information based on Google search."

        return {
            "query": request.query,
            "results": cleaned_results,
            "answer": final_answer,
            "metadata": {
                "engine": "Serper API (Google)",
                "resultsCount": len(cleaned_results),
                "timestamp": time.time()
            }
        }

    except requests.exceptions.RequestException as e:
        print("Serper API error:", e)
        raise HTTPException(status_code=500, detail=f"Web search failed: {str(e)}")

async def logic_openai_chat(request: ChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key missing")
        
    # Convert Pydantic models to dicts for OpenAI API
    messages_dicts = [{"role": m.role, "content": m.content} for m in request.messages]
    
    if request.stream:
        # Streaming not fully implemented in this simple port, falling back to normal
        pass

    response = openai.chat.completions.create(
        model=request.model,
        messages=messages_dicts,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    
    # Return full response object structure as expected by frontend
    return json.loads(response.model_dump_json())

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Nexa AI Backend is running", "version": "1.0", "assistant": "Nexa"}

@app.post("/transaction-query")
async def endpoint_transaction_query(request: TransactionQuery):
    return await logic_transaction_query(request)

@app.post("/transaction-chart")
async def endpoint_transaction_chart(request: ChartRequest):
    return await logic_transaction_chart(request)

@app.post("/transaction-email")
async def endpoint_transaction_email(request: EmailRequest):
    return await logic_transaction_email(request)

@app.post("/rag-retrieval")
async def endpoint_rag_retrieval(request: RAGRequest):
    return await logic_rag_retrieval(request)

@app.post("/web-search-tool")
async def endpoint_web_search(request: WebSearchRequest):
    return await logic_web_search(request)

@app.post("/openai-chat")
async def endpoint_openai_chat(request: ChatRequest):
    return await logic_openai_chat(request)

@app.post("/agent-orchestrator")
async def endpoint_agent_orchestrator(request: AgentRequest):
    start_time = time.time()
    steps = []
    
    steps.append({"name": "Intent Classification", "latency": 50, "timestamp": time.time() * 1000})
    intent = classify_intent(request.query)
    print(f"Detected intent: {intent}")
    
    response_data = {
        "content": "",
        "intent": intent,
        "sources": [],
        "citations": [],
        "metadata": {},
        "traceSteps": steps
    }
    
    try:
        if intent == "transaction_email":
            steps.append({"name": "Email Report", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', request.query)
            client_match = re.search(r'client\s*([a-zA-Z0-9_-]+)', request.query, re.IGNORECASE)

            email_to = email_match.group(0) if email_match else (request.metadata.get("email") or "user@example.com")
            client_id = client_match.group(1) if client_match else request.metadata.get("lastClientId")
            
            # 1. Get Data
            query_result = await logic_transaction_query(TransactionQuery(query=f"transactions for client {client_id}", clientId=client_id))
            
            # 2. Send Email
            email_result = await logic_transaction_email(EmailRequest(
                to=email_to,
                subject="Transaction Intelligence Report",
                transactionSummary=query_result["summary"]
            ))
            
            response_data["content"] = email_result["voiceSummary"]
            response_data["tableData"] = query_result["summary"]
            response_data["sources"] = ["DB", "EMAIL"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "transaction_query":
            steps.append({"name": "Transaction Query", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()

            client_match = re.search(r'client\s*([a-zA-Z0-9_-]+)', request.query, re.IGNORECASE)
            client_id = client_match.group(1) if client_match else None
            
            result = await logic_transaction_query(TransactionQuery(query=request.query, clientId=client_id))
            
            response_data["content"] = result["voiceSummary"]
            response_data["tableData"] = result["summary"]
            response_data["sources"] = ["DB"]
            response_data["metadata"]["lastClientId"] = client_id
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "transaction_chart":
            steps.append({"name": "Transaction Chart", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()

            client_match = re.search(r'client\s*([a-zA-Z0-9_-]+)', request.query, re.IGNORECASE)
            client_id = client_match.group(1) if client_match else None
            
            result = await logic_transaction_chart(ChartRequest(query=request.query, clientId=client_id))
            
            response_data["content"] = result["voiceSummary"]
            response_data["chartData"] = result["chartData"]
            response_data["sources"] = ["DB"]
            response_data["metadata"]["lastClientId"] = client_id
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "doc_rag":
            steps.append({"name": "RAG Agent", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            result = await logic_rag_retrieval(RAGRequest(query=request.query))
            
            response_data["content"] = result["enhancedResponse"] or "No documents found."
            response_data["citations"] = result["documents"]
            response_data["sources"] = ["VECTOR"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "chart":
            steps.append({"name": "Chart Generation", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            result = await logic_transaction_chart(ChartRequest(query=request.query, chartType="bar"))
            
            response_data["content"] = result["voiceSummary"]
            response_data["chartData"] = result["chartData"]
            response_data["sources"] = ["DB"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "web":
            steps.append({"name": "Web Search", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            result = await logic_web_search(WebSearchRequest(query=request.query))
            
            response_data["content"] = result["answer"]
            response_data["citations"] = result["results"]
            response_data["sources"] = ["WEB"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        else: # General
            steps.append({"name": "OpenAI Chat", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            chat_response = await logic_openai_chat(ChatRequest(
                messages=[
                    Message(role="system", content="You are a helpful AI assistant."),
                    Message(role="user", content=request.query)
                ]
            ))
            
            response_data["content"] = chat_response["choices"][0]["message"]["content"]
            response_data["sources"] = ["OPENAI"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        steps.append({"name": "Response Synthesis", "latency": 100, "timestamp": time.time() * 1000})
        total_latency = (time.time() - start_time) * 1000
        
        response_data["metadata"]["totalLatency"] = total_latency
        response_data["metadata"]["timestamp"] = time.time() * 1000
        
        # Save to Supabase messages if conversationId exists
        if request.conversationId and supabase:
            supabase.table("messages").insert({
                "conversation_id": request.conversationId,
                "role": "assistant",
                "content": response_data["content"],
                "retrieval_results": response_data["citations"],
                "latency_ms": total_latency
            }).execute()
            
        return response_data

    except Exception as e:
        print(f"Orchestrator error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
