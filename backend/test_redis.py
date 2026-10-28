from decouple import config
from redis import Redis

def test_redis_connection():
    try:
        print("Attempting to connect to Redis...")
        # Load Redis URL from your .env file via python-decouple
        redis_url = config("REDIS_URL")
        print(f"Using Redis URL: {redis_url[:15]}... [hidden]")
        
        # Initialize Redis client
        r = Redis.from_url(redis_url, decode_responses=True)
        
        # 1. Test Ping
        ping_res = r.ping()
        print(f"Ping successful! Response: {ping_res}")
        
        # 2. Test Set & Get operations
        r.set("connection_test", "Redis is working perfectly!")
        val = r.get("connection_test")
        print(f"Test key-value check -> Retrieved: '{val}'")
        
        print("\n✅ Redis connection and basic operations passed successfully!")
        
    except Exception as e:
        print(f"\n❌ Redis connection failed with error:")
        print(e)

if __name__ == "__main__":
    test_redis_connection()

