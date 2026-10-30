from fastapi.testclient import TestClient

from tests.integration.helpers import auth, booking_context, instant, login, register


def test_booking_persists_and_second_client_gets_conflict(client: TestClient):
    register(client, "ana@example.com", full_name="Ana López")
    register(client, "luis@example.com", full_name="Luis Pérez")
    token_ana = login(client, "ana@example.com")
    token_luis = login(client, "luis@example.com")
    context = booking_context(client)

    payload = {
        "barber_id": context["barber"]["id"],
        "service_id": context["service"]["id"],
        "start_at": context["slot"],
    }
    created = client.post("/appointments", json=payload, headers=auth(token_ana))
    assert created.status_code == 201, created.text
    appointment = created.json()
    assert appointment["status"] == "scheduled"
    assert appointment["client_name"] == "Ana López"
    assert instant(appointment["start_at"]) == instant(context["slot"])

    mine = client.get("/appointments/me", headers=auth(token_ana))
    assert mine.status_code == 200
    assert [item["id"] for item in mine.json()] == [appointment["id"]]

    taken = client.get(
        f"/barbers/{context['barber']['id']}/availability",
        params={"service_id": context["service"]["id"], "date": context["day"]},
    )
    remaining = [instant(slot) for slot in taken.json()["slots"]]
    assert instant(context["slot"]) not in remaining

    conflict = client.post("/appointments", json=payload, headers=auth(token_luis))
    assert conflict.status_code == 409

    forbidden = client.patch(
        f"/appointments/{appointment['id']}/cancel",
        headers=auth(token_luis),
    )
    assert forbidden.status_code == 403

    cancelled = client.patch(
        f"/appointments/{appointment['id']}/cancel",
        headers=auth(token_ana),
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    restored = client.get(
        f"/barbers/{context['barber']['id']}/availability",
        params={"service_id": context["service"]["id"], "date": context["day"]},
    )
    restored_slots = [instant(slot) for slot in restored.json()["slots"]]
    assert instant(context["slot"]) in restored_slots


def test_barber_cannot_book(client: TestClient):
    token = login(client, "barbero1@example.com", "barber-dev-pass")
    context = booking_context(client)
    response = client.post(
        "/appointments",
        json={
            "barber_id": context["barber"]["id"],
            "service_id": context["service"]["id"],
            "start_at": context["slot"],
        },
        headers=auth(token),
    )
    assert response.status_code == 403
