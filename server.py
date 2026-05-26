import asyncio
import json
from json import JSONDecodeError

import websockets
from websockets.exceptions import ConnectionClosed

# PERSISTENCIA Y DATOS TRANSACCIONALES SubGrupo 15

HOST = "127.0.0.1"
PORT = 8765

clients_in_memory_db = {}

async def send_to(websocket, data):
    await websocket.send(json.dumps(data, ensure_ascii=False))


async def transmit(data, exclude=None):
    disconnected = []

    for username, websocket in clients_in_memory_db.items():
        if username == exclude:
            continue

        try:
            await send_to(websocket, data)
        except ConnectionClosed:
            disconnected.append(username)

    for username in disconnected:
        clients_in_memory_db.pop(username, None)


async def send_users_to_all_clients():
    await transmit({
        "type": "users",
        "users": list(clients_in_memory_db.keys()),
    })


def private_room_name(user1, user2):
    users = sorted([user1, user2])
    return f"private:{users[0]}:{users[1]}"


async def process_general_message(websocket, data, username):
    text = data.get("text", "").strip()

    if not text:
        return True

    await transmit({
        "type": "general_message",
        "room": "general",
        "from": username,
        "text": text,
    })
    
    if text.lower() == "chao":
        await send_to(websocket, {
            "type": "system",
            "room": "general",
            "message": "Has abandonado el chat.",
        })

        await transmit({
            "type": "system",
            "room": "general",
            "message": f"{username} salió del chat",
        }, exclude=username)
        
        await send_users_to_all_clients()

        return False

    return True


async def process_private_message(websocket, data, username):
    target = data.get("target", "").strip()
    text = data.get("text", "").strip()

    if not target or not text:
        return

    if target not in clients_in_memory_db:
        await send_to(websocket, {
            "type": "error",
            "message": f"El usuario {target} no está conectado.",
        })
        return

    room = private_room_name(username, target)

    private_data = {
        "type": "private_message",
        "room": room,
        "from": username,
        "to": target,
        "text": text,
    }

    await send_to(clients_in_memory_db[target], private_data)
    await send_to(websocket, private_data)


async def process_messages(websocket, username):
    async for message in websocket:
        try:
            data = json.loads(message)
        except JSONDecodeError:
            await send_to(websocket, {
                "type": "error",
                "message": "El mensaje no es un JSON válido.",
            })
            continue

        message_type = data.get("type")

        if message_type == "general_message":
            should_continue = await process_general_message(websocket, data, username)

            if not should_continue:
                return True

        elif message_type == "private_message":
            await process_private_message(websocket, data, username)

        elif message_type == "leave":
            await send_to(websocket, {
                "type": "system",
                "room": "general",
                "message": "Has cerrado sesión.",
            })

            await transmit({
                "type": "system",
                "room": "general",
                "message": f"{username} salió del chat",
            }, exclude=username)

            return True

        else:
            await send_to(websocket, {
                "type": "error",
                "message": f"Tipo de mensaje no soportado: {message_type}",
            })

    return False


async def controller(websocket):

    username = None
    exit_already_notified = False

    try:
        try:
            initial_data = await websocket.recv()
            data = json.loads(initial_data)
        except JSONDecodeError:
            await send_to(websocket, {
                "type": "error",
                "message": "El login debe enviarse como JSON válido.",
            })
            return

        if data.get("type") != "login":
            await send_to(websocket, {
                "type": "error",
                "message": "Debe iniciar sesión primero.",
            })
            return

        username = data.get("username", "").strip()

        if not username:
            await send_to(websocket, {
                "type": "error",
                "message": "Nombre de usuario no válido.",
            })
            return

        if username in clients_in_memory_db:
            await send_to(websocket, {
                "type": "error",
                "message": "Ese usuario ya está conectado.",
            })
            return

        clients_in_memory_db[username] = websocket

        print(f"[+] Usuario conectado: {username}")
        print("Usuarios conectados:", list(clients_in_memory_db.keys()))

        await send_to(websocket, {
            "type": "login_success",
            "username": username,
            "users": list(clients_in_memory_db.keys()),
        })

        await send_users_to_all_clients()

        await transmit({
            "type": "system",
            "room": "general",
            "message": f"{username} se unió al chat general",
        }, exclude=username)

        exit_already_notified = await process_messages(websocket, username)

    except ConnectionClosed:
        pass

    finally:
        if username and username in clients_in_memory_db:
            del clients_in_memory_db[username]

            print(f"[-] Usuario desconectado: {username}")
            print("Usuarios conectados:", list(clients_in_memory_db.keys()))

            await send_users_to_all_clients()

            if not exit_already_notified:
                await transmit({
                    "type": "system",
                    "room": "general",
                    "message": f"{username} salió del chat",
                })


async def main():
    print(f"Servidor activo en ws://{HOST}:{PORT}")
    async with websockets.serve(controller, HOST, PORT):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
