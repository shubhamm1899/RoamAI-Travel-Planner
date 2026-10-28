from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class Activity(BaseModel):
    time_slot: str = Field(..., description="e.g., 09:00 AM - 11:30 AM or Morning")
    title: str = Field(..., description="Name of the activity or site")
    description: str = Field(..., description="Brief practical description and advice")
    location_name: str = Field(..., description="Name of neighborhood or venue")
    estimated_cost_usd: float = Field(..., description="Estimated cost in USD")
    travel_time_from_previous: Optional[str] = Field(None, description="e.g., 15 mins by metro")
    category: str = Field(..., description="attraction, dining, logistics, or leisure")

class DayPlan(BaseModel):
    day_number: int
    theme: str = Field(..., description="Theme for the day, e.g., Historic Old Town & Street Food")
    accommodation: Optional[str] = Field(None, description="Recommended area or hotel style")
    activities: List[Activity]
    day_summary: str = Field(..., description="Brief breakdown of logistics and tempo")

class ItineraryOutput(BaseModel):
    trip_title: str
    destination: str
    estimated_total_cost_usd: float
    overview: str
    days: List[DayPlan]

class TripGenerationRequest(BaseModel):
    destination: str
    start_date: date
    end_date: date
    budget_tier: str  # budget, moderate, luxury
    group_type: str   # solo, couple, group
    group_size: int = 1
    interests: List[str]
    pace_preference: str = "balanced"  # relaxed, balanced, packed

class RegenerateDayRequest(BaseModel):
    destination: str
    day_number: int
    existing_theme: str
    interests: List[str]
    feedback_notes: Optional[str] = None