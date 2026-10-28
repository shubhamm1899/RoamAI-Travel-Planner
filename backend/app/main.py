from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.models import TripRequest, ItineraryResponse
from app.services.ai_service import generate_itinerary_ai

app = FastAPI(
    title="RoamAI Engine",
    version="1.0.0",
    description="FastAPI service for personalized AI travel itinerary generation",
)

# Allow requests from Vite frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", status_code=status.HTTP_200_OK)
def health_check():
    return {
        "status": "online",
        "service": "RoamAI Engine",
        "model": "gemini-3.8-flash"
    }

@app.post(
    "/api/trips/generate",
    response_model=ItineraryResponse,
    status_code=status.HTTP_200_OK
)
async def generate_trip(request: TripRequest):
    try:
        itinerary = await generate_itinerary_ai(request)
        return itinerary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate itinerary: {str(e)}"
        )