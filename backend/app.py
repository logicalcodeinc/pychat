from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory state
channels = {"general": {"topic": "General discussion", "users": set()}}
users = {}  # sid -> {"username": str, "channel": str}


@app.route("/api/channels")
def get_channels():
    return jsonify(
        [
            {"name": name, "topic": info["topic"], "user_count": len(info["users"])}
            for name, info in channels.items()
        ]
    )


@app.route("/api/channels", methods=["POST"])
def create_channel():
    data = request.json
    name = data.get("name", "").strip().lower().replace(" ", "-")
    topic = data.get("topic", "")
    if not name:
        return jsonify({"error": "Channel name required"}), 400
    if name in channels:
        return jsonify({"error": "Channel already exists"}), 409
    channels[name] = {"topic": topic, "users": set()}
    socketio.emit("channel_created", {"name": name, "topic": topic, "user_count": 0})
    return jsonify({"name": name, "topic": topic}), 201


@socketio.on("connect")
def handle_connect():
    pass


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    user = users.pop(sid, None)
    if user:
        channel = user["channel"]
        if channel and channel in channels:
            channels[channel]["users"].discard(user["username"])
            leave_room(channel)
            emit(
                "message",
                {
                    "type": "system",
                    "text": f'{user["username"]} has left the channel',
                    "timestamp": datetime.now().isoformat(),
                },
                to=channel,
            )
            emit(
                "user_list",
                {"channel": channel, "users": sorted(channels[channel]["users"])},
                to=channel,
            )


@socketio.on("set_username")
def handle_set_username(data):
    username = data.get("username", "").strip()
    if not username:
        emit("error", {"message": "Username required"})
        return
    all_usernames = {u["username"] for u in users.values()}
    if username in all_usernames:
        emit("error", {"message": "Username already taken"})
        return
    users[request.sid] = {"username": username, "channel": None}
    emit("username_set", {"username": username})


@socketio.on("join_channel")
def handle_join_channel(data):
    sid = request.sid
    user = users.get(sid)
    if not user:
        emit("error", {"message": "Set a username first"})
        return
    channel_name = data.get("channel", "").strip().lower()
    if channel_name not in channels:
        emit("error", {"message": "Channel does not exist"})
        return

    # Leave current channel
    old_channel = user["channel"]
    if old_channel and old_channel in channels:
        channels[old_channel]["users"].discard(user["username"])
        leave_room(old_channel)
        emit(
            "message",
            {
                "type": "system",
                "text": f'{user["username"]} has left the channel',
                "timestamp": datetime.now().isoformat(),
            },
            to=old_channel,
        )
        emit(
            "user_list",
            {
                "channel": old_channel,
                "users": sorted(channels[old_channel]["users"]),
            },
            to=old_channel,
        )

    # Join new channel
    user["channel"] = channel_name
    channels[channel_name]["users"].add(user["username"])
    join_room(channel_name)
    emit(
        "message",
        {
            "type": "system",
            "text": f'{user["username"]} has joined the channel',
            "timestamp": datetime.now().isoformat(),
        },
        to=channel_name,
    )
    emit(
        "user_list",
        {
            "channel": channel_name,
            "users": sorted(channels[channel_name]["users"]),
        },
        to=channel_name,
    )
    emit(
        "joined_channel",
        {"channel": channel_name, "topic": channels[channel_name]["topic"]},
    )


@socketio.on("send_message")
def handle_send_message(data):
    sid = request.sid
    user = users.get(sid)
    if not user or not user["channel"]:
        emit("error", {"message": "Join a channel first"})
        return
    text = data.get("text", "").strip()
    if not text:
        return
    emit(
        "message",
        {
            "type": "chat",
            "username": user["username"],
            "text": text,
            "timestamp": datetime.now().isoformat(),
        },
        to=user["channel"],
    )


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
