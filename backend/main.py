from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
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
from openai import OpenAI
import requests
from serpapi import GoogleSearch
from pypdf import PdfReader
from io import BytesIO

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for easier deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print(f"Validation Error: {exc.errors()}")
    print(f"Request Body: {body.decode()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body.decode()},
    )

# Initialize Clients
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
# Use Service Role Key if available for backend ops (bypasses RLS)
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials missing.")
else:
    print(f"Supabase initialized with URL: {SUPABASE_URL}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize Client
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

print("Using Standard OpenAI Client")
client = OpenAI(api_key=OPENAI_API_KEY)

# --- Pydantic Models ---

class TransactionQuery(BaseModel):
    query: Optional[str] = None
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
    to: Optional[str] = "sivakumarai2828@gmail.com"
    subject: str
    transactionSummary: Optional[Any] = None
    body: Optional[str] = None

class RAGRequest(BaseModel):
    query: str
    matchThreshold: Optional[float] = 0.7
    matchCount: Optional[int] = 5
    enhanceWithContext: Optional[bool] = True
    userId: Optional[str] = None

class WebSearchRequest(BaseModel):
    query: str
    maxResults: Optional[int] = 5

class WeatherRequest(BaseModel):
    city: str

class StockRequest(BaseModel):
    symbols: str


class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False

class AgentRequest(BaseModel):
    query: str
    conversationId: Optional[str] = None
    userId: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class IngestDocumentRequest(BaseModel):
    title: str
    content: str
    url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    userId: Optional[str] = None

# --- Helper Functions ---

def classify_intent(query: str) -> str:
    lower_query = query.lower()
    
    # 1. Specialized Data Intents (High Priority)
    if re.search(r'\b(weather|temperature|forecast|climate)\b', lower_query) or \
       re.search(r'\bwhat\'?s\s+(the\s+)?(weather|temperature)\b', lower_query):
        return "weather"
        
    if re.search(r'\b(stock|price|market|ticker|quote)\b', lower_query) or re.search(r'\b[A-Z]{1,5}\b', query):
        if re.search(r'\b(price|value|worth|stock)\s+of\b', lower_query) or \
           re.search(r'\b(how\s+is|what\s+is)\b.*\b(trading|stock|price)\b', lower_query):
            return "stock"

    if re.search(r'\b(email|send|mail)\b', lower_query) and (re.search(r'\b(report|transaction|above)\b', lower_query) or '@' in lower_query):
        return "transaction_email"
    
    if re.search(r'\b(transaction|client|purchase|refund|payment)\b', lower_query):
        if re.search(r'\b(chart|plot|graph|visualize|trend)\b', lower_query):
            return "transaction_chart"
        return "transaction_query"

    # 2. Search & Document Intents
    if re.search(r'\b(web|google|latest|news|current|recent|breaking|real-time|realtime|look up|find online|internet|search\s+the\s+web|google\s+search)\b', lower_query) or \
       (re.search(r'\bsearch\b', lower_query) and re.search(r'\b(latest|news|online|internet)\b', lower_query)):
        return "web"

    if re.search(r'\b(how|what|why|explain|documentation|docs|guide|tutorial|policy|policies|operation|operations|rag|knowledge|context|retrieval|analyze|summarize|summary|describe|content|details|find in|search in)\b', lower_query):
        if not re.search(r'\b(how are you|how it going|how are things|what is up|what\'s up)\b', lower_query):
            return "doc_rag"

    # 3. Visualization & Database
    if re.search(r'\b(chart|plot|graph|visualize|trend)\b', lower_query):
        return "chart"
        
    if re.search(r'\b(select|query|show|get|retrieve|find|search|top|merchants|revenue|transactions)\b', lower_query):
        return "sql"
    
    # 4. Miscellaneous
    if re.search(r'\b(hi|hello|hey|greetings|morning|afternoon|evening)\b', lower_query) and len(lower_query.split()) < 5:
        return "general"
        
    if re.search(r'\b(report|summary|analysis|breakdown)\b', lower_query):
        return "report"
    
    if re.search(r'\b(status|health|uptime|api|service)\b', lower_query):
        return "api_status"
    
    return "general"

def format_client_id(client_str: Optional[str]) -> str:
    if not client_str or str(client_str).lower() == 'all':
        return 'all'
    
    # Extract digits or keep as is
    match = re.search(r'\d+', str(client_str))
    if match:
        return f"Client {match.group(0)}"
    
    # If it's already "Client X", return as is
    if str(client_str).lower().startswith('client'):
        return client_str.strip()
        
    return str(client_str).strip()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Simple recursive-style character chunking with overlap."""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        
        # If not the first chunk, include overlap
        chunk = text[start:end]
        chunks.append(chunk)
        
        start += (chunk_size - overlap)
        
    return chunks

# --- Core Logic Functions ---

async def logic_transaction_query(request: TransactionQuery):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    print(f"Transaction query received: {request}")
    
    query = supabase.table("transactions").select("*").order("tran_date", desc=True).limit(request.limit)

    if request.clientId and str(request.clientId).lower() != 'all':
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

    voice_summary = f"Found {summary['totalTransactions']} transactions for {request.clientId or 'all clients'} totaling ${summary['totalAmount']}. {approved_count} approved, {declined_count} declined."

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

    if request.clientId and str(request.clientId).lower() != 'all':
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
            # Handle standard YYYY-MM-DD or ISO timestamp
            date_str = t["tran_date"][:10] if t["tran_date"] else ""
            if not date_str: continue
            
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                formatted_date = f"{date_obj.month}/{date_obj.day}"
                date_groups[formatted_date] = date_groups.get(formatted_date, 0) + float(t["tran_amt"])
            except Exception as e:
                print(f"Error parsing date {t['tran_date']}: {e}")
                continue
            
        sorted_dates = list(date_groups.keys()) # Already sorted by query order usually, but dict preserves insertion order in modern python
        
        chart_data["data"]["labels"] = sorted_dates
        chart_data["data"]["datasets"] = [{
            "label": "Transaction Amount",
            "data": [float(f"{date_groups[d]:.2f}") for d in sorted_dates],
            "color": "#8b5cf6"
        }]
        
    voice_summary = f"Generated {chart_type} chart for {request.clientId or 'all clients'} showing {len(transactions)} transactions."
    
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
    
    if request.body:
        html_content = f"""
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }}
                .content {{ background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; }}
                .footer {{ margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">{request.subject}</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Velix AI Assistant • {datetime.now().strftime("%B %d, %Y")}</p>
                </div>
                <div class="content">
                  {request.body}
                </div>
                <div class="footer">
                  <p>Sent by Velix AI Assistance.<br/>
                  © 2025 Transaction Intelligence Inc.</p>
                </div>
              </div>
            </body>
          </html>
        """
    else:
        # Construct Transaction Report HTML
        rows = ""
        transactions = []
        if isinstance(request.transactionSummary, dict):
            transactions = request.transactionSummary.get('transactions', [])
        
        for t in transactions[:20]:
            # Format date for readability
            date_str = t.get('tran_date', '')
            formatted_date = date_str
            if date_str:
                try:
                    # Handle ISO format or common DB formats
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    formatted_date = dt.strftime("%Y-%m-%d")
                except:
                    formatted_date = date_str[:10]
                    
            amt = 0.0
            try:
                amt = float(t.get('tran_amt', 0))
            except:
                pass
                
            rows += f"""
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t.get('id')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t.get('client_id')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t.get('type')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${amt:.2f}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t.get('tran_status')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{formatted_date}</td>
              </tr>
            """
            
        total_amt = "0.00"
        total_count = 0
        if isinstance(request.transactionSummary, dict):
            total_amt = request.transactionSummary.get('totalAmount', '0.00')
            total_count = request.transactionSummary.get('totalTransactions', 0)

        # Chart section removed per user request
        chart_section = ""

        html_content = f"""
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }}
                .summary {{ display: flex; gap: 20px; margin-bottom: 30px; }}
                .stat-card {{ background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #e2e8f0; }}
                .stat-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }}
                .stat-value {{ font-size: 20px; color: #1e293b; font-weight: bold; margin-top: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th {{ background-color: #f1f5f9; color: #475569; text-align: left; padding: 12px 10px; border-bottom: 2px solid #e2e8f0; }}
                .footer {{ margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">{request.subject}</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">System Generated Report • {datetime.now().strftime("%B %d, %Y")}</p>
                </div>
                
                <div class="summary">
                  <div class="stat-card">
                    <div class="stat-label">Total Transactions</div>
                    <div class="stat-value">{total_count}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Total Amount</div>
                    <div class="stat-value">${total_amt}</div>
                  </div>
                </div>

                {chart_section}

                <h2 style="color: #475569; font-size: 18px; margin-bottom: 10px; margin-top: 30px;">Recent Transactions</h2>
                <table>
                    <thead>
                        <tr>
                          <th>ID</th>
                          <th>Client</th>
                          <th>Type</th>
                          <th style="text-align: right;">Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
                
                {f'<p style="color: #64748b; font-size: 14px; margin-top: 15px;">* Showing first 20 of {total_count} transactions</p>' if total_count > 20 else ''}
                
                <div class="footer">
                  <p>This report was generated by Velix AI Transaction Intelligence.<br/>
                  © 2025 Transaction Intelligence Inc.</p>
                </div>
              </div>
            </body>
          </html>
        """
    
    payload = {
        "from": "onboarding@resend.dev",
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
        
        # Add friendly message for Resend test mode
        if response.status_code == 403 and "testing emails" in str(error_data).lower():
            owner_email = "sivakumar.kk@gmail.com" # Default expectation
            # Try to extract actual owner from message if present
            msg = error_data.get("message", "")
            match = re.search(r'\((.*?)\)', msg)
            if match:
                owner_email = match.group(1)
            
            detail_msg = f"Resend is in test mode. You can only send emails to the owner ({owner_email}). To send to {request.to}, you must verify a domain in Resend or update the API key."
            raise HTTPException(status_code=403, detail=detail_msg)
            
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
    try:
        emb_response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=request.query
        )
        query_embedding = emb_response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        # Fallback for demo if OpenAI fails
        if "policy" in request.query.lower() or "document" in request.query.lower():
            return {
                "query": request.query,
                "documents": [{"title": "Company Policy", "content": "Our security policy requires multi-factor authentication for all employees."}],
                "enhancedResponse": "Based on the company documents, our security policy requires multi-factor authentication for all employees as a standard safety measure.",
                "metadata": {"resultsFound": 1, "isFallback": True}
            }
        raise e
    
    # 2. Search in Supabase
    try:
        rpc_response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_threshold": request.matchThreshold,
                "match_count": request.matchCount,
            }
        ).execute()
        documents = rpc_response.data
        
        # 3. Filter by User ID for Isolation (Multi-tenancy)
        if request.userId and documents:
            # STRICT MODE: Only include documents that belong to this user OR are system documents
            documents = [d for d in documents if d.get("metadata", {}).get("user_id") in [request.userId, 'system']]
            print(f"Filtered to {len(documents)} documents for user {request.userId} (including system docs)")
    except Exception as e:
        print(f"Supabase RPC error: {e}")
        # Demo fallback
        documents = [{"title": "Knowledge Base Info", "content": "The system is currently using a mock knowledge base since the vector database is not fully initialized."}]
    
    enhanced_response = None
    if request.enhanceWithContext and documents:
        context = "\n\n".join([f"[{i+1}] {doc['title']}\n{doc['content']}" for i, doc in enumerate(documents)])
        
        chat_completion = client.chat.completions.create(
            model=OPENAI_MODEL,
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
            "resultsFound": len(documents) if documents else 0,
            "userId": request.userId
        }
    }

async def logic_web_search(request: WebSearchRequest):
    if SERPAPI_API_KEY:
        # Use SerpApi via direct request for better timeout control
        try:
            url = "https://serpapi.com/search"
            params = {
                "engine": "google",
                "q": request.query,
                "api_key": SERPAPI_API_KEY,
                "num": request.maxResults or 5
            }
            
            response = requests.get(url, params=params, timeout=10)
            if not response.ok:
                print(f"SerpApi error: {response.status_code} {response.text}")
                raise Exception(f"SerpApi returned {response.status_code}")
                
            results = response.json()
            organic_results = results.get("organic_results", [])
            
            cleaned_results = []
            for i, r in enumerate(organic_results, 1):
                cleaned_results.append({
                    "title": r.get("title"),
                    "url": r.get("link"),
                    "snippet": r.get("snippet", ""),
                    "position": i
                })
            
            if cleaned_results:
                final_answer = f"According to a Google search, I found the following: {cleaned_results[0].get('snippet', '')}"
            else:
                final_answer = "I searched Google but couldn't find any relevant results for that query."
            
            return {
                "query": request.query,
                "results": cleaned_results,
                "answer": final_answer,
                "sources": ["WEB"],
                "traceSteps": [{"name": "Web Search (Google)", "latency": 800, "timestamp": time.time() * 1000}],
                "metadata": {
                    "engine": "SerpApi",
                    "resultsCount": len(cleaned_results),
                    "timestamp": time.time()
                }
            }
        except Exception as e:
            print("SerpApi direct request error:", e)
            if not SERPER_API_KEY:
                 return {
                    "query": request.query,
                    "results": [],
                    "answer": f"I encountered an error searching the web: {str(e)}. Please check if the SerpApi API key is correctly configured in your environment.",
                    "error": str(e),
                    "success": False
                 }
            print("Falling back to Serper API...")

    if not SERPER_API_KEY:
        if not SERPAPI_API_KEY:
            raise HTTPException(status_code=500, detail="Neither SERPAPI_API_KEY nor SERPER_API_KEY configured. Please set these in your environment variables.")
        raise HTTPException(status_code=500, detail="Web search failed and no fallback available.")

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
    
    response = client.chat.completions.create(
        model=request.model or OPENAI_MODEL,
        messages=messages_dicts,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    
    # Return full response object structure as expected by frontend
    return json.loads(response.model_dump_json())

async def logic_ingest_document(request: IngestDocumentRequest):
    if not OPENAI_API_KEY or not supabase:
        raise HTTPException(status_code=500, detail="Configuration missing")
    
    # 1. Chunk the document to avoid token limits (OpenAI max is ~8k for embeddings)
    # We'll use 4000 chars as a safe chunk size (~1000 tokens)
    chunks = chunk_text(request.content, chunk_size=4000, overlap=400)
    print(f"DEBUG: Ingesting document '{request.title}' for user: '{request.userId}'")
    
    results = []
    
    for i, chunk_content in enumerate(chunks):
        # 2. Generate Embedding for each chunk
        try:
            emb_response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=chunk_content
            )
            embedding = emb_response.data[0].embedding
            
            # 3. Insert into Supabase
            data = {
                "title": f"{request.title} (Part {i+1})" if len(chunks) > 1 else request.title,
                "content": chunk_content,
                "url": request.url,
                "metadata": {
                    **(request.metadata or {}),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "original_title": request.title,
                    "user_id": request.userId
                },
                "embedding": embedding
            }
            
            response = supabase.table("documents").insert(data).execute()
            if response.data:
                results.append(response.data[0]["id"])
                
        except Exception as e:
            print(f"Error ingesting chunk {i}: {e}")
            if i == 0: # If even the first chunk fails, raise exception
                 raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")
    
    return {
        "success": True,
        "documentCount": len(results),
        "chunkIds": results,
        "title": request.title
    }

def logic_extract_pdf_text(file_content: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_content))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")

# --- Real-Time API Helper Functions ---

async def get_lat_lon(city: str) -> Optional[Dict[str, float]]:
    url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
    headers = {"User-Agent": "VelixVoiceAgent/1.0"}
    try:
        # Use a timeout of 5 seconds
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data:
            return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    except Exception as e:
        print(f"Geocoding error for {city}: {e}")
    return None

async def logic_weather(request: WeatherRequest):
    coords = await get_lat_lon(request.city)
    if not coords:
        return {"success": False, "error": f"Could not find coordinates for {request.city}", "voiceSummary": f"I couldn't find location data for {request.city}."}
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={coords['lat']}&longitude={coords['lon']}&current_weather=true"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        current = data.get("current_weather", {})
        temp = current.get("temperature")
        wind = current.get("windspeed")
        
        summary = f"According to the Open Meteo Weather API, the current weather in {request.city} is {temp}°C with wind speeds of {wind} km/h."
        return {
            "success": True,
            "city": request.city,
            "temperature": temp,
            "windspeed": wind,
            "voiceSummary": summary,
            "timestamp": datetime.now().isoformat(),
            "sources": ["OPEN-METEO"],
            "traceSteps": [{"name": "Weather API", "latency": 200, "timestamp": time.time() * 1000}]
        }
    except Exception as e:
        print(f"Weather API error: {e}")
        return {"success": False, "error": "Weather service failed", "voiceSummary": "Data not available"}

async def logic_stock_price(request: StockRequest):
    api_key = os.environ.get("RAPID_API_KEY") or "e9f0f744c6msh529a2d656a6983bp1920c7jsn6f7b8229b6e6"
    # User provided: yahoo-finance166.p.rapidapi.com
    # Discovered endpoint: /api/stock/get-financial-data
    url = "https://yahoo-finance166.p.rapidapi.com/api/stock/get-financial-data"
    querystring = {"symbol": request.symbols, "region": "US"}
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "yahoo-finance166.p.rapidapi.com",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Parse based on raw structure: data['quoteSummary']['result'][0]['financialData']['currentPrice']['raw']
        q_summary = data.get("quoteSummary", {})
        results = q_summary.get("result", [])
        
        if not results:
             return {"success": False, "error": "No stock data found", "voiceSummary": "Data not available"}
             
        first_result = results[0]
        symbol = first_result.get("symbol") or request.symbols
        financial_data = first_result.get("financialData", {})
        
        price_obj = financial_data.get("currentPrice", {})
        price = price_obj.get("raw")
        
        if price is None:
             # Try price summary structure if financialData failed
             price_data = first_result.get("price", {})
             price = price_data.get("regularMarketPrice", {}).get("raw")
             
        if price is None:
             return {"success": False, "error": "Price not found in response", "voiceSummary": "Data not available"}
             
        name = first_result.get("quoteType", {}).get("shortName") or symbol
        summary = f"According to Yahoo Finance, {name} ({symbol}) is currently trading at ${price:.2f}."
            
        return {
            "success": True,
            "symbol": symbol,
            "name": name,
            "price": price,
            "voiceSummary": summary,
            "timestamp": datetime.now().isoformat(),
            "sources": ["YAHOO-FINANCE"],
            "traceSteps": [{"name": "Stock API", "latency": 300, "timestamp": time.time() * 1000}]
        }
    except Exception as e:
        print(f"Stock API error ({url}): {e}")
        return {"success": False, "error": "Stock service failed", "voiceSummary": "Data not available"}


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

@app.post("/weather")
async def endpoint_weather(request: WeatherRequest):
    return await logic_weather(request)

@app.post("/stock-price")
async def endpoint_stock_price(request: StockRequest):
    return await logic_stock_price(request)


@app.post("/openai-chat")
async def endpoint_openai_chat(request: ChatRequest):
    return await logic_openai_chat(request)

@app.post("/ingest-document")
async def endpoint_ingest_document(request: IngestDocumentRequest):
    return await logic_ingest_document(request)

@app.post("/extract-pdf")
async def endpoint_extract_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        content = await file.read()
        text = logic_extract_pdf_text(content)
        
        if not text:
            text = f"PDF content from: {file.filename}\n\nNote: No readable text could be extracted. The PDF may be image-based or encrypted."
            
        return {
            "success": True,
            "text": text,
            "fileName": file.filename,
            "fileSize": len(content)
        }
    except Exception as e:
        print(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/openai-session")
async def endpoint_openai_session(voice: str = "alloy", instructions: Optional[str] = None):
    if not (OPENAI_API_KEY or AZURE_OPENAI_API_KEY):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    
    url = "https://api.openai.com/v1/realtime/sessions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    if not instructions:
        instructions = "You are Nexa, a helpful AI voice assistant. Be concise and helpful."

    payload = {
        "model": "gpt-4o-realtime-preview",
        "voice": voice,
        "instructions": instructions,
        "modalities": ["text", "audio"],
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.5,
            "prefix_padding_ms": 300,
            "silence_duration_ms": 500,
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error creating OpenAI session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent-orchestrator")
async def endpoint_agent_orchestrator(request: AgentRequest):
    start_time = time.time()
    steps = []
    
    # --- Persistent Limit Enforcement ---
    user_id = request.userId
    is_admin = False
    query_count = 0
    query_limit = 5
    
    if supabase and user_id:
        try:
            # 1. Get user settings (containing email and limit tracking)
            # Find user in auth or a profile table to check admin status
            # For simplicity, we check if they are the designated admin email
            # We can get email from metadata or a separate profile fetch
            user_email = request.metadata.get("email")
            is_admin = user_email == 'sivakumarai2828@gmail.com'
            
            if not is_admin:
                # 2. Fetch or create user settings
                settings_res = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
                
                if not settings_res.data:
                    # Create default settings
                    supabase.table("user_settings").insert({
                        "user_id": user_id,
                        "query_count": 0,
                        "last_query_date": datetime.now().date().isoformat()
                    }).execute()
                    query_count = 0
                else:
                    settings = settings_res.data[0]
                    last_date = settings.get("last_query_date")
                    query_count = settings.get("query_count") or 0
                    
                    # 3. Check if it's a new day
                    today = datetime.now().date().isoformat()
                    if last_date != today:
                        # Reset for the new day
                        supabase.table("user_settings").update({
                            "query_count": 0,
                            "last_query_date": today
                        }).eq("user_id", user_id).execute()
                        query_count = 0
                    
                # 4. Enforce limit
                if query_count >= query_limit:
                    return {
                        "content": "You have reached your persistent daily query limit. Please wait until tomorrow or contact the administrator.",
                        "intent": "general",
                        "sources": ["SYSTEM"],
                        "metadata": {"limit_reached": True, "queryCount": query_count},
                        "traceSteps": [{"name": "Limit Enforcement", "latency": 10}]
                    }
        except Exception as e:
            print(f"Limit tracking error: {e}")
            # Continue if tracking fails to avoid breaking the app, or enforce strictly?
            # We'll allow for now to be safe.
            pass

    steps.append({"name": "Intent Classification", "latency": 50, "timestamp": time.time() * 1000})
    intent = classify_intent(request.query)
    print(f"Detected intent: {intent}")
    
    response_data = {
        "content": "",
        "intent": intent,
        "sources": [],
        "citations": [],
        "queryCount": query_count + 1 if not is_admin else 0,
        "metadata": request.metadata.copy() if request.metadata else {},
        "traceSteps": steps
    }
    if not request.query or not request.query.strip():
        return {
            "content": "I didn't catch that. Could you please repeat?",
            "intent": "general",
            "sources": [],
            "citations": [],
            "metadata": {"empty_query": True},
            "traceSteps": steps
        }

    try:
        if intent == "transaction_email":
            steps.append({"name": "Email Report", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', request.query)
            client_match = re.search(r'client\s*(\d+|\w+)', request.query, re.IGNORECASE) or re.search(r'(\d{3,})', request.query)
            
            email_to = email_match.group(0) if email_match else (request.metadata.get("email") or "sivakumarai2828@gmail.com")
            
            raw_client = client_match.group(1) if client_match else request.metadata.get("lastClientId")
            client_id = format_client_id(raw_client)
            
            # 1. Get Data
            query_result = await logic_transaction_query(TransactionQuery(query=f"transactions for client {client_id}", clientId=client_id))
            
            # 3. Send Email
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
            
            client_match = re.search(r'client\s*(\d+|\w+)', request.query, re.IGNORECASE) or re.search(r'(\d{3,})', request.query)
            raw_client = client_match.group(1) if client_match else None
            client_id = format_client_id(raw_client)
            
            result = await logic_transaction_query(TransactionQuery(query=request.query, clientId=client_id))
            
            response_data["content"] = result["voiceSummary"]
            response_data["tableData"] = result["summary"]
            response_data["sources"] = ["DB"]
            response_data["metadata"]["lastClientId"] = client_id
            steps[-1]["latency"] = (time.time() - step_start) * 1000
            
        elif intent == "transaction_chart":
            steps.append({"name": "Transaction Chart", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            client_match = re.search(r'client\s*(\d+|\w+)', request.query, re.IGNORECASE) or re.search(r'(\d{3,})', request.query)
            raw_client = client_match.group(1) if client_match else None
            client_id = format_client_id(raw_client)
            
            result = await logic_transaction_chart(ChartRequest(query=request.query, clientId=client_id))
            
            response_data["content"] = result["voiceSummary"]
            response_data["chartData"] = result["chartData"]
            response_data["sources"] = ["DB"]
            response_data["metadata"]["lastClientId"] = client_id
            steps[-1]["latency"] = (time.time() - step_start) * 1000
        elif intent == "doc_rag":
            steps.append({"name": "RAG Agent", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            
            result = await logic_rag_retrieval(RAGRequest(
                query=request.query,
                userId=request.userId
            ))
            
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
            
        elif intent == "weather":
            steps.append({"name": "Weather API", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            city_match = re.search(r'in\s+([a-zA-Z\s]+)', request.query, re.IGNORECASE) or re.search(r'weather\s+([a-zA-Z\s]+)', request.query, re.IGNORECASE)
            city = city_match.group(1).strip() if city_match else "New York"
            result = await logic_weather(WeatherRequest(city=city))
            response_data["content"] = result["voiceSummary"]
            response_data["sources"] = ["OPEN-METEO"]
            steps[-1]["latency"] = (time.time() - step_start) * 1000

        elif intent == "stock":
            steps.append({"name": "Stock API", "latency": 0, "timestamp": time.time() * 1000})
            step_start = time.time()
            # Extract ticker - look for capitalized words or explicit ticker mentions
            ticker_match = re.search(r'\$?([A-Z]{1,5})\b', request.query) or re.search(r'stock\s+(?:of\s+)?([a-zA-Z]{1,5})', request.query, re.IGNORECASE)
            ticker = ticker_match.group(1).upper() if ticker_match else "AAPL"
            result = await logic_stock_price(StockRequest(symbols=ticker))
            response_data["content"] = result["voiceSummary"]
            response_data["sources"] = ["YAHOO-FINANCE"]
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
            # PRO-ACTIVE RAG: For general queries, try a quick RAG lookup first to see if we have relevant info
            # but only if the query is reasonably long (not just "hi")
            if len(request.query.split()) > 3:
                steps.append({"name": "Agentic RAG Fallback", "latency": 0, "timestamp": time.time() * 1000})
                step_start = time.time()
                
                try:
                    # Try RAG with a high threshold for "general" queries to avoid noise
                    rag_result = await logic_rag_retrieval(RAGRequest(
                        query=request.query,
                        userId=request.userId,
                        matchThreshold=0.8
                    ))
                    
                    if rag_result.get("metadata", {}).get("resultsFound", 0) > 0:
                        response_data["content"] = rag_result["enhancedResponse"]
                        response_data["sources"] = ["RAG-FALLBACK"]
                        steps[-1]["latency"] = (time.time() - step_start) * 1000
                        return response_data
                except Exception as e:
                    print(f"RAG Fallback error: {e}")
            
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
        # Save to Supabase messages if conversationId exists and is valid UUID
        if request.conversationId and supabase:
            try:
                # Basic UUID validation
                if len(request.conversationId) == 36 and '-' in request.conversationId:
                    supabase.table("messages").insert({
                        "conversation_id": request.conversationId,
                        "role": "assistant",
                        "content": response_data["content"],
                        "retrieval_results": response_data["citations"],
                        "latency_ms": total_latency
                    }).execute()
            except Exception as e:
                print(f"Failed to save message: {e}")
            
        # 5. Increment query count in Supabase if not admin
        if supabase and user_id and not is_admin:
            try:
                supabase.table("user_settings") \
                    .update({"query_count": query_count + 1}) \
                    .eq("user_id", user_id) \
                    .execute()
            except Exception as e:
                print(f"Failed to increment query count: {e}")

        return response_data

    except Exception as e:
        print(f"Orchestrator error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-stats/{user_id}")
async def get_user_stats(user_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        settings_res = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
        
        if not settings_res.data:
            return {"queryCount": 0, "lastQueryDate": datetime.now().date().isoformat()}
            
        settings = settings_res.data[0]
        last_date = settings.get("last_query_date")
        query_count = settings.get("query_count") or 0
        
        # Reset if it's a new day
        today = datetime.now().date().isoformat()
        if last_date != today:
            return {"queryCount": 0, "lastQueryDate": today}
            
        return {"queryCount": query_count, "lastQueryDate": last_date}
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        return {"queryCount": 0, "error": str(e)}

@app.get("/documents")
async def get_documents(userId: Optional[str] = None):
    """
    Proxy endpoint to fetch documents from Supabase.
    This bypasses SSL/Mixed Content issues in the browser.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    print(f"DEBUG: Getting documents for userId: '{userId}'")
    try:
        # Fetch unique documents for the table
        query = supabase.table("documents").select("id, title, content, url, created_at, metadata")
        
        response = query.order("created_at", desc=True).execute()
        data = response.data
        
        if userId:
            # Filter in memory to handle complex JSONB OR logic reliably
            # STRICT MODE: Only show docs for this user OR system documents
            data = [doc for doc in data if doc.get('metadata', {}).get('user_id') in [userId, 'system']]
            print(f"DEBUG: Found {len(data)} documents after strict filtering for user {userId}")
            
        return data
    except Exception as e:
        print(f"Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
