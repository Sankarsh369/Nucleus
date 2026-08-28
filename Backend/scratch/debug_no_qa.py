from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

payload = {
    "text": (
        f"# Unique request id: {uuid.uuid4().hex}\n"
        "def dummy_api_check_no_qa():\n"
        "    return False\n"
    )
}
response = client.post("/compress", json=payload)
print("STATUS CODE:", response.status_code)
print("RESPONSE JSON:", response.json())
