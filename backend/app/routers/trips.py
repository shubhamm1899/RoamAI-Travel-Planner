from fastapi import APIRouter, HTTPException
from app.schemas import TripGenerationRequest, ItineraryOutput, RegenerateDayRequest, DayPlan
from app.services.ai_planner import generate_itinerary, regenerate_single_day

router = APIRouter(prefix="/trips", tags=["Trips"])

@router.post("/generate", response_model=ItineraryOutput)
def create_itinerary_endpoint(payload: TripGenerationRequest):
    try:
        return generate_itinerary(payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/regenerate-day", response_model=DayPlan)
def regenerate_day_endpoint(payload: RegenerateDayRequest):
    try:
        return regenerate_single_day(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Day regeneration failed: {str(e)}")