from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class TripRequest(BaseModel):
    destination: str = Field(..., description="Target destination city or region")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD")
    end_date: str = Field(..., description="End date in YYYY-MM-DD")
    budget_amount: Optional[float] = Field(None, description="Actual total budget amount in INR (₹)")
    budget_tier: Literal["budget", "moderate", "luxury"] = "moderate"
    must_visit_places: Optional[str] = Field(None, description="Specific custom spots or activities the user wants to visit")
    group_type: Literal["solo", "couple", "group"] = "solo"
    interests: List[str] = Field(default_factory=list, description="List of user interests")
    pace: Literal["relaxed", "moderate", "fast-paced"] = "moderate"

class Activity(BaseModel):
    time: str = Field(..., description="Time window, e.g., 09:00 AM or Morning")
    title: str = Field(..., description="Activity name")
    description: str = Field(..., description="Details and actionable advice")
    location_name: str = Field(..., description="Specific place, venue, or neighborhood")
    estimated_cost: str = Field(..., description="Estimated cost in INR, e.g., '₹500' or 'Free'")
    category: Literal["culture", "food", "nature", "transport", "shopping", "entertainment"]

class DailyBudgetBreakdown(BaseModel):
    food_dining: str = Field(..., description="Estimated spend on meals/snacks in INR, e.g., '₹1,200'")
    activities_tickets: str = Field(..., description="Estimated spend on entry fees/activities in INR, e.g., '₹800'")
    local_transit: str = Field(..., description="Estimated spend on metro/cabs/auto-rickshaws in INR, e.g., '₹500'")
    total_day_spend: str = Field(..., description="Total estimated daily spend, e.g., '₹2,500'")

class DayPlan(BaseModel):
    day_number: int = Field(..., description="Day number (1, 2, 3...)")
    date: str = Field(..., description="Calculated date for the day")
    theme: str = Field(..., description="Theme for the day")
    morning: List[Activity]
    afternoon: List[Activity]
    evening: List[Activity]
    budget_breakdown: DailyBudgetBreakdown
    transportation_tip: str

class ItineraryResponse(BaseModel):
    title: str
    destination: str
    summary: str
    budget_summary: str = Field(..., description="Detailed budget summary in INR (₹)")
    packing_tips: List[str]
    days: List[DayPlan]