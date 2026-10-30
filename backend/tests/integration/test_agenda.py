from fastapi.testclient import TestClient

from tests.integration.helpers import auth, booking_context, login, register


def test_agenda_is_scoped_by_role(client: TestClient):
    register(client, "ana@example.com", full_name="Ana López")
    token_ana = login(client, "ana@example.com")
    context = booking_context(client)
    created = client.post(
        "/appointments",
        json={
            "barber_id": context["barber"]["id"],
            "service_id": context["service"]["id"],
            "start_at": context["slot"],
        },
        headers=auth(token_ana),
    )
    assert created.status_code == 201, created.text
    appointment_id = created.json()["id"]
    barber_id = context["barber"]["id"]

    other = login(client, "barbero2@example.com", "barber-dev-pass")
    denied = client.get(
        "/appointments",
        params={"date": context["day"], "barber_id": barber_id},
        headers=auth(other),
    )
    assert denied.status_code == 403

    own_agenda = client.get(
        "/appointments",
        params={"date": context["day"]},
        headers=auth(other),
    )
    assert own_agenda.status_code == 200
    assert appointment_id not in [item["id"] for item in own_agenda.json()]

    owner = login(client, "barbero1@example.com", "barber-dev-pass")
    agenda = client.get(
        "/appointments",
        params={"date": context["day"]},
        headers=auth(owner),
    )
    assert agenda.status_code == 200
    assert appointment_id in [item["id"] for item in agenda.json()]

    admin = login(client, "admin@example.com", "admin-dev-pass")
    all_rows = client.get(
        "/appointments",
        params={"date": context["day"]},
        headers=auth(admin),
    )
    assert all_rows.status_code == 200
    assert appointment_id in [item["id"] for item in all_rows.json()]

    completed = client.patch(
        f"/appointments/{appointment_id}/complete",
        headers=auth(owner),
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
