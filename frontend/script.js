let socket;
let currentUsername = "";
let currentRoom = "general";
let privateTarget = null;
let connectedUsers = [];

const messagesByRoom = {
  general: [],
};

function login() {
  const ipInput = document.getElementById("serverIp");
  const portInput = document.getElementById("serverPort");
  const usernameInput = document.getElementById("username");

  const serverIp = ipInput.value.trim();
  const serverPort = portInput.value.trim();
  const username = usernameInput.value.trim();

  if (!serverIp) {
    alert("Ingrese la IP del servidor");
    return;
  }

  if (!serverPort) {
    alert("Ingrese el puerto del servidor");
    return;
  }

  if (!username) {
    alert("Ingrese un nombre de usuario");
    return;
  }

  currentUsername = username;

  const socketUrl = `ws://${serverIp}:${serverPort}`;

  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    socket.send(
      JSON.stringify({
        type: "login",
        username,
      }),
    );
  };

  socket.onmessage = (event) => {
    console.log(event);
    const data = JSON.parse(event.data);

    if (data.type === "login_success") {
      connectedUsers = data.users || [];

      document.getElementById("loginView").classList.add("hidden");
      document.getElementById("appView").classList.remove("hidden");

      document.getElementById("currentUser").textContent = currentUsername;
      document.getElementById("profileAvatar").textContent =
        initials(currentUsername);

      addSystemMessage("general", `Conectado correctamente a ${socketUrl}.`);
      updateUsers(connectedUsers);
      goToGeneral();
    }

    if (data.type === "users") {
      connectedUsers = data.users || [];
      updateUsers(connectedUsers);
    }

    if (data.type === "general_message") {
      addMessage("general", data.from, data.text, false);
    }

    if (data.type === "private_message") {
      const room = getPrivateRoom(
        data.from === currentUsername ? data.to : data.from,
      );

      addMessage(room, data.from, data.text, true);

      if (currentRoom !== room) {
        markPrivateNotification(data.from);
      }
    }

    if (data.type === "system") {
      addSystemMessage(data.room || "general", data.message);
    }

    if (data.type === "error") {
      addSystemMessage(currentRoom, "Error: " + data.message);
    }
  };

  socket.onclose = () => {
    addSystemMessage(currentRoom, "Conexión cerrada.");
  };

  socket.onerror = () => {
    alert(`No se pudo conectar con el servidor ${socketUrl}`);
  };
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text) return;

  if (currentRoom === "general") {
    socket.send(
      JSON.stringify({
        type: "general_message",
        text,
      }),
    );
  } else {
    socket.send(
      JSON.stringify({
        type: "private_message",
        target: privateTarget,
        text,
      }),
    );
  }

  input.value = "";
}

function updateUsers(users) {
  const total = users.length;

  document.getElementById("usersCount").textContent = `${total} usuarios`;
  document.getElementById("sidebarCount").textContent = `(${total})`;
  document.getElementById("generalCounter").textContent = total;

  renderSidebarUsers(users);
  renderUsersPanel(users);
}

function renderSidebarUsers(users) {
  const container = document.getElementById("sidebarUsers");
  container.innerHTML = "";

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "sidebar-user";

    item.innerHTML = `
      <div class="mini-avatar">${initials(user)}</div>
      <span>${user}${user === currentUsername ? " (Tú)" : ""}</span>
      <b></b>
    `;

    container.appendChild(item);
  });
}

function renderUsersPanel(users) {
  const container = document.getElementById("usersList");
  container.innerHTML = "";

  users
    .filter((user) => user !== currentUsername)
    .forEach((user) => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.id = `user-card-${safeId(user)}`;

      card.innerHTML = `
        <div class="mini-avatar">${initials(user)}</div>
        <div class="user-info">
          <strong>${user}</strong>
          <span>● En línea</span>
        </div>
        <button onclick="openPrivateChat('${escapeJs(user)}')">Chatear</button>
      `;

      container.appendChild(card);
    });
}

function openPrivateChat(user) {
  privateTarget = user;
  currentRoom = getPrivateRoom(user);

  if (!messagesByRoom[currentRoom]) {
    messagesByRoom[currentRoom] = [];
  }

  document.getElementById("roomIcon").textContent = "";
  document.getElementById("roomTitle").textContent = `Chat privado con ${user}`;
  document.getElementById("roomSubtitle").textContent =
    "Conversación privada entre dos usuarios";
  document.getElementById("backToGeneralBtn").classList.remove("hidden");

  document.getElementById("generalBtn").classList.remove("active");

  const card = document.getElementById(`user-card-${safeId(user)}`);
  if (card) card.classList.remove("notify");

  renderMessages();
}

function goToGeneral() {
  currentRoom = "general";
  privateTarget = null;

  document.getElementById("roomIcon").textContent = "";
  document.getElementById("roomTitle").textContent = "Chat General";
  document.getElementById("roomSubtitle").textContent =
    "Conversación pública para todos los usuarios conectados";
  document.getElementById("backToGeneralBtn").classList.add("hidden");

  document.getElementById("generalBtn").classList.add("active");

  renderMessages();
}

function addMessage(room, sender, text, isPrivate) {
  if (!messagesByRoom[room]) {
    messagesByRoom[room] = [];
  }

  messagesByRoom[room].push({
    kind: "message",
    sender,
    text,
    isPrivate,
    time: getTime(),
  });

  if (currentRoom === room) {
    renderMessages();
  }
}

function addSystemMessage(room, text) {
  if (!messagesByRoom[room]) {
    messagesByRoom[room] = [];
  }

  messagesByRoom[room].push({
    kind: "system",
    text,
    time: getTime(),
  });

  if (currentRoom === room) {
    renderMessages();
  }
}

function renderMessages() {
  const container = document.getElementById("messages");
  container.innerHTML = "";

  const messages = messagesByRoom[currentRoom] || [];

  if (messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent =
      currentRoom === "general"
        ? "Aún no hay mensajes en el chat general."
        : "Aún no hay mensajes privados.";
    container.appendChild(empty);
    return;
  }

  messages.forEach((msg) => {
    const div = document.createElement("div");

    if (msg.kind === "system") {
      div.className = "system-message";
      div.innerHTML = `
        <div>
          <strong>${msg.text}</strong>
          <small>${msg.time}</small>
        </div>
      `;
    } else {
      div.className = "chat-message";

      div.innerHTML = `
        <div class="message-avatar">${initials(msg.sender)}</div>
        <div>
          <div class="message-header">
            <strong>${msg.sender}</strong>
            <small>${msg.time}</small>
          </div>
          <p>${escapeHtml(msg.text)}</p>
        </div>
      `;
    }

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

// Utilidades

function markPrivateNotification(user) {
  const card = document.getElementById(`user-card-${safeId(user)}`);
  if (card) {
    card.classList.add("notify");
  }
}

function logout() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "leave" }));
    socket.close();
  }

  location.reload();
}

function handleEnter(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

function getPrivateRoom(user) {
  return [currentUsername, user].sort().join("__");
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeJs(text) {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

document.addEventListener("DOMContentLoaded", () => {
  const ipInput = document.getElementById("serverIp");
  const portInput = document.getElementById("serverPort");
  const preview = document.getElementById("serverPreview");

  function updatePreview() {
    const ip = ipInput.value.trim() || "127.0.0.1";
    const port = portInput.value.trim() || "8765";
    preview.textContent = `Servidor: ws://${ip}:${port}`;
  }

  ipInput.addEventListener("input", updatePreview);
  portInput.addEventListener("input", updatePreview);
});
