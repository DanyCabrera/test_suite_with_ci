from fastapi.testclient import TestClient

from tests.integration.helpers import auth, login, register


def test_register_login_and_me(client: TestClient):
    created = register(client, "ana@example.com")
    assert created["role"] == "client"
    assert created["email"] == "ana@example.com"

    response = client.post(
        "/auth/login",
        json={"email": "ana@example.com", "password": "secreto123"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "client"

    me = client.get("/auth/me", headers=auth(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "ana@example.com"

    duplicate = client.post(
        "/auth/register",
        json={
            "email": "ana@example.com",
            "password": "secreto123",
            "full_name": "Ana López",
            "phone": "5551234567",
        },
    )
    assert duplicate.status_code == 409

    wrong = client.post(
        "/auth/login",
        json={"email": "ana@example.com", "password": "clave-mala"},
    )
    assert wrong.status_code == 401
    assert login(client, "ana@example.com")
