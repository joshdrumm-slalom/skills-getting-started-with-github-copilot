from copy import deepcopy
import pytest
from fastapi.testclient import TestClient

from src import app as app_module

client = TestClient(app_module.app)

@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before each test to avoid state leakage."""
    original = deepcopy(app_module.activities)
    try:
        yield
    finally:
        # clear and repopulate
        app_module.activities.clear()
        app_module.activities.update(deepcopy(original))


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # expect some known activity present
    assert "Chess Club" in data


def test_signup_and_prevent_duplicate():
    email = "testuser@example.com"
    activity = "Chess Club"

    # sign up should succeed
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    assert "Signed up" in res.json().get("message", "")

    # second signup should be rejected (duplicate)
    res2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res2.status_code == 400


def test_remove_participant():
    # ensure a known participant exists
    activity = "Chess Club"
    participant = "michael@mergington.edu"

    # remove existing participant
    res = client.delete(f"/activities/{activity}/participants", params={"email": participant})
    assert res.status_code == 200
    assert "Removed" in res.json().get("message", "")

    # removing again should return 404
    res2 = client.delete(f"/activities/{activity}/participants", params={"email": participant})
    assert res2.status_code == 404


def test_remove_nonexistent_activity():
    res = client.delete("/activities/NoSuchActivity/participants", params={"email": "x@x.com"})
    assert res.status_code == 404
