import sqlite3
import hashlib
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "pychat.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def _hash_password(password, salt):
    return hashlib.sha256((salt + password).encode()).hexdigest()


def register_user(username, password):
    """Register a new user. Returns (True, None) on success or (False, error_message) on failure."""
    conn = get_db()
    try:
        salt = os.urandom(16).hex()
        password_hash = _hash_password(password, salt)
        conn.execute(
            "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
            (username, password_hash, salt),
        )
        conn.commit()
        return True, None
    except sqlite3.IntegrityError:
        return False, "Username already registered"
    finally:
        conn.close()


def authenticate_user(username, password):
    """Check credentials. Returns (True, None) on success or (False, error_message) on failure."""
    conn = get_db()
    row = conn.execute(
        "SELECT password_hash, salt FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    if not row:
        return False, "Username not registered"
    if _hash_password(password, row["salt"]) != row["password_hash"]:
        return False, "Incorrect password"
    return True, None


def user_exists(username):
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return row is not None
