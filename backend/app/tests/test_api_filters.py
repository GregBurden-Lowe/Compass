from datetime import datetime, timezone


def test_create_and_filter_complaint(client):
    payload = {
        "source": "Web",
        "received_at": datetime.now(timezone.utc).isoformat(),
        "description": "Policy wording unclear.",
        "category": "Coverage",
        "reason": "Unclear wording",
        "fca_complaint": True,
        "vulnerability_flag": False,
        "product": "Home",
        "scheme": "Standard",
        "broker": "ABC Broker",
        "insurer": "ABC Insurer",
        "policy_number": "HOME-123",
        "complainant": {"full_name": "John Smith", "email": "john@example.com"},
        "policy": {"policy_number": "HOME-123", "insurer": "ABC Insurer", "broker": "ABC Broker", "product": "Home", "scheme": "Standard"},
    }
    resp = client.post("/api/complaints", json=payload)
    assert resp.status_code == 201, resp.text
    list_resp = client.get("/api/complaints", params={"search": "HOME"})
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any("HOME-123" in (item.get("policy_number") or "") for item in items)

