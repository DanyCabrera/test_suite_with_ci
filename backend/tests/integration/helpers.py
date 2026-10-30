from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.services.availability import next_open_day


def register(
    client: TestClient,
    email: str,
    full_name: str = "Ana López",
    password: str = "secreto123",
) -> dict:
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
            "phone": "5551234567",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str, password: str = "secreto123") -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def booking_context(client: TestClient) -> dict:
    services = client.get("/services")
    assert services.status_code == 200
    service = next(item for item in services.json() if item["duration_minutes"] == 30)
    barbers = client.get("/barbers")
    assert barbers.status_code == 200
    barber = next(item for item in barbers.json() if item["email"] == "barbero1@example.com")
    day = next_open_day().isoformat()
    availability = client.get(
        f"/barbers/{barber['id']}/availability",
        params={"service_id": service["id"], "date": day},
    )
    assert availability.status_code == 200, availability.text
    slots = availability.json()["slots"]
    assert slots
    return {"service": service, "barber": barber, "day": day, "slot": slots[0]}


def instant(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized).astimezone(timezone.utc)
