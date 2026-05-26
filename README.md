# Chat WebSocket en Python

Servidor de chat en tiempo real desarrollado en Python usando WebSockets.

Permite:

- Conectar múltiples usuarios
- Enviar mensajes al chat general
- Enviar mensajes privados
- Ver usuarios conectados
- Salir del chat

## Requisitos

- Python 3.10 o superior
- pip

## Instalación

### 1. Clonar el proyecto

```bash
git clone <url-del-repositorio>
cd <nombre-del-proyecto>
```

### 2. Crear entorno virtual

#### Windows

```bash
python -m venv venv
```

Activar el entorno virtual:

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
python3 -m venv venv
```

Activar el entorno virtual:

```bash
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

## Ejecutar el proyecto

```bash
python server.py
```

El servidor se ejecutará en:

```bash
ws://127.0.0.1:8765
```

## Formato de mensajes

### Login

```json
{
  "type": "login",
  "username": "usuario1"
}
```

### Mensaje general

```json
{
  "type": "general_message",
  "text": "Hola a todos"
}
```

### Mensaje privado

```json
{
  "type": "private_message",
  "target": "usuario2",
  "text": "Hola, este es un mensaje privado"
}
```

### Salir del chat

```json
{
  "type": "leave"
}
```

También puedes salir enviando un mensaje general con el texto:

```txt
chao
```

## Archivo requirements.txt

El proyecto necesita la dependencia:

```txt
websockets
```

Si el archivo `requirements.txt` no existe, créalo con este contenido:

```txt
websockets
```

## Notas

No subas el entorno virtual al repositorio.

Agrega esto al archivo `.gitignore`:

```gitignore
venv/
__pycache__/
*.pyc
```
