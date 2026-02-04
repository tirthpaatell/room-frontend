// ====== CONFIG ======
const BACKEND_URL = "YOUR_BACKEND_URL"; 
// Example: https://msgparty-backend.onrender.com

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const roomId = params.get("room");
const passFromUrl = params.get("pass") || "";

if (!roomId) location.href = "./index.html";

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const safe = (s) => (s || "").toString().replace(/[<>]/g, "");

// ====== USERNAME ======
let username = localStorage.getItem("msgparty_name");
if (!username) {
  username = "User" + Math.floor(Math.random() * 900 + 100);
  localStorage.setItem("msgparty_name", username);
}

// ====== UI INIT ======
$("roomIdPill").textContent = `Room: ${roomId}`;
$("mePill").textContent = `You: ${username}`;

// ====== SOCKET ======
const socket = io(BACKEND_URL, {
  transports: ["websocket"],
});

// ====== JOIN FLOW (password optional) ======
let roomPassword = passFromUrl;

const joinRoom = () => {
  socket.emit("join_room", {
    roomId,
    username,
    password: roomPassword || "",
  });
};

joinRoom();

// ====== PASSWORD DIALOG ======
socket.on("room_requires_password", () => {
  const dlg = $("passDialog");
  dlg.showModal();

  $("passGoBtn").onclick = () => {
    roomPassword = $("passInput").value.trim();
    dlg.close();
    joinRoom();
  };
});

socket.on("wrong_password", () => {
  alert("Wrong password. Try again.");
  $("passDialog").showModal();
});

// ====== ROOM EVENTS ======
socket.on("joined", ({ users }) => {
  renderUsers(users);
  addSys(`You joined the room`);
});

socket.on("user_joined", ({ username }) => {
  addSys(`${username} joined`);
});

socket.on("user_left", ({ username }) => {
  addSys(`${username} left`);
});

// ====== USERS LIST ======
socket.on("users_update", ({ users }) => {
  renderUsers(users);
});

function renderUsers(users) {
  $("onlineCount").textContent = `${users.length} people`;
  $("users").innerHTML = "";

  users.forEach((u) => {
    const div = document.createElement("div");
    div.className = "user";
    div.innerHTML = `
      <div class="avatar">${safe(u).slice(0,1).toUpperCase()}</div>
      <div>
        <div style="font-weight:800;">${safe(u)}</div>
        <div style="color:rgba(148,163,184,.75); font-size:12px;">online</div>
      </div>
    `;
    $("users").appendChild(div);
  });
}

// ====== CHAT UI ======
function addSys(text) {
  const el = document.createElement("div");
  el.className = "sysmsg";
  el.textContent = text;
  $("chat").appendChild(el);
  $("chat").scrollTop = $("chat").scrollHeight;
}

function addMsg({ username: from, message, time, isMe }) {
  const el = document.createElement("div");
  el.className = "msg" + (isMe ? " me" : "");

  el.innerHTML = `
    <div class="meta">
      <span class="name">${safe(from)}</span>
      <span class="time">${formatTime(time)}</span>
    </div>
    <div class="text">${safe(message)}</div>
  `;

  $("chat").appendChild(el);
  $("chat").scrollTop = $("chat").scrollHeight;
}

// ====== SEND MESSAGE ======
function send() {
  const message = $("msg").value.trim();
  if (!message) return;

  socket.emit("send_message", {
    roomId,
    username,
    message,
  });

  $("msg").value = "";
}

$("sendBtn").addEventListener("click", send);
$("msg").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

// ====== RECEIVE MESSAGE ======
socket.on("receive_message", (data) => {
  addMsg({
    username: data.username,
    message: data.message,
    time: data.time,
    isMe: data.username === username,
  });
});

// ====== COPY LINK ======
$("copyLinkBtn").addEventListener("click", async () => {
  const link = `${location.origin}/room.html?room=${encodeURIComponent(roomId)}`;
  await navigator.clipboard.writeText(link);
  $("copyLinkBtn").textContent = "Copied!";
  setTimeout(() => ($("copyLinkBtn").textContent = "Copy link"), 1200);
});

// ====== LEAVE ======
$("leaveBtn").addEventListener("click", () => {
  location.href = "./index.html";
});