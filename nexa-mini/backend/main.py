from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
import random

app = FastAPI(title="Nexa Mini API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    text: str
    user_id: Optional[str] = "guest"

class AgentResponse(BaseModel):
    answer: str
    thinking_process: List[str]
    confidence: float
    timestamp: float

@app.get("/")
async def root():
    return {"message": "Welcome to Nexa Mini API", "status": "online"}

@app.get("/stats")
async def get_stats():
    return {
        "active_users": random.randint(10, 50),
        "total_queries": random.randint(1000, 5000),
        "api_latency": f"{random.randint(20, 150)}ms",
        "system_load": "Stable"
    }

@app.post("/query", response_model=AgentResponse)
async def process_query(request: QueryRequest):
    # Simulate thinking process
    thinking_steps = [
        "Analyzing user intent...",
        "Searching local knowledge base...",
        "Evaluating relevant context chunks...",
        "Synthesizing final response..."
    ]
    
    # Simulate a small delay for "thinking"
    time.sleep(1) 
    
    responses = [
        f"I've analyzed your query about '{request.text}'. Based on my training data, this appears to be a request for general information which I can handle locally.",
        f"Processing your request regarding '{request.text}'. I've retrieved several relevant documents and generated a summary for you.",
        f"Interesting question! Regarding '{request.text}', the current system state indicates optimal performance."
    ]
    
    return AgentResponse(
        answer=random.choice(responses),
        thinking_process=thinking_steps,
        confidence=round(random.uniform(0.85, 0.99), 2),
        timestamp=time.time()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
