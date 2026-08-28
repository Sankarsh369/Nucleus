import pytest
import anyio
import httpx
from app.main import app

@pytest.mark.anyio
async def test_concurrent_compression_requests():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        async def make_request(i):
            payload = {
                "text": f"Distinct paragraph {i} text to compress.\n\nThis is duplicate.\n\nThis is duplicate."
            }
            response = await client.post("/compress", json=payload)
            assert response.status_code == 200
            res = response.json()
            assert "compressed_text" in res
            assert "run_id" in res
            return res
            
        # Execute 10 requests concurrently
        results = []
        async with anyio.create_task_group() as tg:
            for i in range(10):
                tg.start_soon(make_request, i)
