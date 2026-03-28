from api import app

def test_health():
    with app.test_client() as client:
        response = client.get('/health')
        print(f"Status: {response.status_code}")
        print(f"Response: {response.get_json()}")

if __name__ == "__main__":
    test_health()
