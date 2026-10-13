from slowapi import Limiter
from slowapi.util import get_remote_address

# Railway runs several workers; this protects each worker from bursts. For a
# shared global limit, configure a Redis-backed limiter before multi-instance deployment.
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
