import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google import genai
from google.genai import types
from starlette.concurrency import run_in_threadpool
from app.models import TripRequest, ItineraryResponse, DayPlan, Activity, DailyBudgetBreakdown

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is missing. Set it in backend/.env")

client = genai.Client(
    api_key=api_key,
    http_options=types.HttpOptions(timeout=25_000)
)

MODELS_TO_TRY = ["gemini-3.8-flash", "gemini-3.6-flash"]

def _generate_sync(model_name: str, prompt: str) -> str:
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ItineraryResponse,
        ),
    )
    return response.text

def calculate_weighted_day_budgets(total_budget: float, total_days: int):
    """
    Weighting Logic:
    - Day 1 (Arrival): 0.7x weight (check-in, settling in)
    - Final Day (Departure): 0.8x weight (packing, check-out)
    - Middle Days (Peak Exploration): 1.2x weight (heavy sightseeing & admissions)
    """
    if total_days == 1:
        weights = [1.0]
    elif total_days == 2:
        weights = [0.9, 1.1]
    else:
        weights = [0.7] + [1.2] * (total_days - 2) + [0.8]

    total_weight = sum(weights)
    return [int((w / total_weight) * total_budget) for w in weights]

def get_curated_fallback(request: TripRequest, total_days: int) -> ItineraryResponse:
    interests_str = ", ".join(request.interests) if request.interests else "Cultural exploration"
    start_dt = datetime.strptime(request.start_date, "%Y-%m-%d")

    # Determine total budget in INR
    if request.budget_amount and request.budget_amount > 0:
        total_budget_val = float(request.budget_amount)
    else:
        tier_daily_base = 2500 if request.budget_tier == "budget" else 6000 if request.budget_tier == "moderate" else 15000
        total_budget_val = float(tier_daily_base * total_days)

    day_spends = calculate_weighted_day_budgets(total_budget_val, total_days)
    custom_places_list = [p.strip() for p in (request.must_visit_places or "").split(",") if p.strip()]

    themes = [
        ("Arrival, Heritage Landmarks & Street Markets", "Old Quarter Heritage Hub", "Cultural Plaza"),
        ("Deep Cultural Immersion & Artisanal Cuisine", "Historic Fortress Complex", "Craft Bazaar"),
        ("Scenic Panoramic Viewpoints & Sacred Sites", "Botanical Hilltop Sanctuary", "Waterfront Promenade"),
        ("Contemporary Art, Craft Workshops & Cafes", "Artisan Guild Village", "Lantern District"),
        ("Farewell Leisure, Souvenirs & Dining", "Old Market Arcade", "Rooftop Terrace"),
    ]

    generated_days = []
    for i in range(total_days):
        day_date = (start_dt + timedelta(days=i)).strftime("%Y-%m-%d")
        theme_title, default_morning, default_evening = themes[i % len(themes)]
        daily_target = day_spends[i]

        # 40% Food, 35% Activities/Tickets, 25% Local Transit
        food_est = int(daily_target * 0.40)
        tickets_est = int(daily_target * 0.35)
        transit_est = int(daily_target * 0.25)

        if custom_places_list:
            morning_spot = custom_places_list.pop(0)
            morning_desc = f"Dedicated visit to your priority wishlist spot: {morning_spot}."
        else:
            morning_spot = f"{request.destination} {default_morning}"
            morning_desc = f"Explore prominent local sights and architecture around {morning_spot}."

        generated_days.append(
            DayPlan(
                day_number=i + 1,
                date=day_date,
                theme=theme_title,
                morning=[
                    Activity(
                        time="09:00 AM",
                        title=morning_spot,
                        description=morning_desc,
                        location_name=morning_spot,
                        estimated_cost=f"₹{int(tickets_est * 0.65):,}",
                        category="culture"
                    )
                ],
                afternoon=[
                    Activity(
                        time="01:30 PM",
                        title="Authentic Regional Lunch & Walking Exploration",
                        description=f"Curated dining experience highlighting local cuisine suited to {request.budget_tier} travel.",
                        location_name="City Center",
                        estimated_cost=f"₹{int(food_est * 0.55):,}",
                        category="food"
                    )
                ],
                evening=[
                    Activity(
                        time="06:30 PM",
                        title=f"{default_evening} & Leisure Dinner",
                        description=f"Scenic evening atmosphere around {default_evening} followed by dinner and leisure.",
                        location_name=default_evening,
                        estimated_cost=f"₹{int(food_est * 0.45):,}",
                        category="entertainment"
                    )
                ],
                budget_breakdown=DailyBudgetBreakdown(
                    food_dining=f"₹{food_est:,}",
                    activities_tickets=f"₹{tickets_est:,}",
                    local_transit=f"₹{transit_est:,}",
                    total_day_spend=f"₹{daily_target:,}"
                ),
                transportation_tip=f"Allocated ₹{transit_est:,} for daily metro rides and auto-rickshaws."
            )
        )

    return ItineraryResponse(
        title=f"Expedition: {request.destination} ({total_days} Days)",
        destination=request.destination,
        summary=f"A weighted financial itinerary for {request.destination} centered around {interests_str}.",
        budget_summary=f"Total Budget: ₹{int(total_budget_val):,}. Distributed with lighter arrival/departure days and weighted peak exploration.",
        packing_tips=["Comfortable walking shoes", "Universal travel adapter", "Weather-appropriate clothing", "Cash & UPI for local vendors"],
        days=generated_days
    )

async def generate_itinerary_ai(request: TripRequest) -> ItineraryResponse:
    try:
        d1 = datetime.strptime(request.start_date, "%Y-%m-%d")
        d2 = datetime.strptime(request.end_date, "%Y-%m-%d")
        total_days = max(1, (d2 - d1).days + 1)
    except Exception:
        total_days = 3

    budget_context = f"Total Budget: ₹{int(request.budget_amount):,} INR" if request.budget_amount else f"Budget Level: {request.budget_tier} tier"
    must_visit_context = f"Must-Visit Places requested by user: {request.must_visit_places}" if request.must_visit_places else "No specific mandatory stops given"

    prompt = f"""
    Act as an elite travel architect and financial travel planner. Create an optimized day-by-day travel itinerary with realistic expense math.

    TRIP CONSTRAINTS:
    - Destination: {request.destination}
    - Start Date: {request.start_date}
    - End Date: {request.end_date}
    - Total Duration: Exactly {total_days} full days.
    - {budget_context}
    - {must_visit_context}
    - Party Type: {request.group_type}
    - Interests: {", ".join(request.interests) if request.interests else "General highlights"}
    - Pacing: {request.pace}

    FINANCIAL ALLOCATION LOGIC (STRICT):
    1. CURRENCY: All figures must be in Indian Rupees (₹ / INR).
    2. NON-FLAT WEIGHTING:
       - Day 1 (Arrival): Weight lower (~70% of average) because of airport/station arrival, check-in, and light evening activity.
       - Middle Days (Peak Sightseeing): Weight higher (~120% of average) for intensive paid admissions, guided tours, and special activities.
       - Final Day (Departure): Weight lower (~80% of average) for packing, souvenir buying, and return transit.
    3. DAILY BREAKDOWN ITEMIZATION:
       - For each day, provide `food_dining`, `activities_tickets`, `local_transit`, and `total_day_spend`.
       - Ensure `total_day_spend` equals the sum of food, tickets, and transit for that day.
    4. ACTIVITY COSTS: Individual activity `estimated_cost` must realistically match the category limits for that day (e.g. Free public gardens, paid heritage tickets ₹500–₹1,000, dinners ₹400–₹1,500).

    MUST-VISIT INTEGRATION:
    - If specific spots are provided in the wishlist, schedule them without transit backtracking.

    STRUCTURAL REQUIREMENT:
    - The `days` array MUST contain EXACTLY {total_days} DayPlan items.
    """

    for model_name in MODELS_TO_TRY:
        try:
            print(f"[RoamAI] Generating weighted {total_days}-day plan via {model_name}...")
            raw_text = await run_in_threadpool(_generate_sync, model_name, prompt)
            if raw_text:
                parsed = ItineraryResponse.model_validate_json(raw_text)
                if len(parsed.days) > 0:
                    return parsed
        except Exception as e:
            print(f"[RoamAI] {model_name} failed: {e}")

    return get_curated_fallback(request, total_days)