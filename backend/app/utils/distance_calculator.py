import math
import re
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app import models

# RetailSphere Central Operations & Manufacturing Facility (Ettumanoor, Kottayam)
HUB_LAT = 9.6698
HUB_LON = 76.5623
HUB_ADDRESS = "RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala 686631"

# Kerala & South India Reference City/Pincode Coordinate Map (Clean fallback lookup)
KNOWN_COORDINATES = {
    "kottayam": (9.5916, 76.5222),
    "ettumanoor": (9.6698, 76.5623),
    "pala": (9.7099, 76.6836),
    "changanassery": (9.4449, 76.5385),
    "ernakulam": (9.9816, 76.2999),
    "kochi": (9.9312, 76.2673),
    "aluva": (10.1076, 76.3516),
    "thrissur": (10.5276, 76.2144),
    "alappuzha": (9.4981, 76.3388),
    "kollam": (8.8932, 76.6141),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "kozhikode": (11.2588, 75.7804),
    "calicut": (11.2588, 75.7804),
    "palakkad": (10.7867, 76.6548),
    "malappuram": (11.0510, 76.0711),
    "kannur": (11.8745, 75.3704),
    "kasaragod": (12.5102, 74.9852),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "coimbatore": (11.0168, 76.9558),
    "chennai": (13.0827, 80.2707),
    "madurai": (9.9252, 78.1198)
}


def _extract_coordinates_from_text(text: str) -> Optional[Tuple[float, float]]:
    """Tries to match known locations from address text."""
    if not text:
        return None
    lower = text.lower()
    for name, coords in KNOWN_COORDINATES.items():
        if name in lower:
            return coords
    
    # Try 6-digit Indian PIN code heuristic for Kerala/nearby
    pin_match = re.search(r'\b(6\d{5})\b', text)
    if pin_match:
        pin = int(pin_match.group(1))
        # 686xxx = Kottayam district
        if 686000 <= pin <= 686999:
            return (9.59 + (pin % 100) * 0.003, 76.52 + (pin % 100) * 0.003)
        # 682xxx/683xxx = Ernakulam/Kochi
        elif 682000 <= pin <= 683999:
            return (9.98 + (pin % 100) * 0.003, 76.30 + (pin % 100) * 0.003)
        # 695xxx = Thiruvananthapuram
        elif 695000 <= pin <= 695999:
            return (8.52 + (pin % 100) * 0.003, 76.93 + (pin % 100) * 0.003)
        # 680xxx = Thrissur
        elif 680000 <= pin <= 680999:
            return (10.52 + (pin % 100) * 0.003, 76.21 + (pin % 100) * 0.003)
        # 688xxx = Alappuzha
        elif 688000 <= pin <= 688999:
            return (9.49 + (pin % 100) * 0.003, 76.33 + (pin % 100) * 0.003)
    
    return None


def calculate_haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates geodesic distance in kilometers."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371.0  # Earth's radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def estimate_road_distance_km(origin_address: str, destination_address: str) -> float:
    """
    Estimates realistic road/driving distance in km between two addresses.
    Uses realistic road curvature multiplier (1.35x) over geodesic line.
    """
    origin_coords = _extract_coordinates_from_text(origin_address) or (HUB_LAT, HUB_LON)
    dest_coords = _extract_coordinates_from_text(destination_address) or (HUB_LAT + 0.15, HUB_LON + 0.12)

    straight_line = calculate_haversine_distance(origin_coords, dest_coords)
    if straight_line < 1.0:
        return 4.5  # Local urban minimum
    
    # 1.35 road winding curvature factor
    road_km = straight_line * 1.35
    return round(max(road_km, 3.0), 1)


def compute_transportation_charge(
    db: Session,
    origin_address: str,
    destination_address: str,
    service_type: str = "STANDARD_DELIVERY"
) -> dict:
    """
    Calculates distance and final transportation charge based on the active TransportationRateCard.
    Charge = Base Charge + (Distance km * Rate per km)
    """
    distance_km = estimate_road_distance_km(origin_address, destination_address)

    # Fetch active rate card for service_type or fallback to default
    rate_card = db.query(models.TransportationRateCard).filter(
        models.TransportationRateCard.service_type == service_type,
        models.TransportationRateCard.is_active == True
    ).first()

    if not rate_card:
        # Check standard delivery fallback
        rate_card = db.query(models.TransportationRateCard).filter(
            models.TransportationRateCard.is_active == True
        ).first()

    base_charge = float(rate_card.base_charge) if rate_card else 100.0
    rate_per_km = float(rate_card.rate_per_km) if rate_card else 15.0
    min_charge = float(rate_card.min_charge) if rate_card else 100.0

    calculated_charge = base_charge + (distance_km * rate_per_km)
    final_charge = max(calculated_charge, min_charge)

    return {
        "origin": origin_address,
        "destination": destination_address,
        "distance_km": distance_km,
        "base_charge": base_charge,
        "rate_per_km": rate_per_km,
        "calculated_charge": round(final_charge, 2),
        "service_type": service_type
    }
