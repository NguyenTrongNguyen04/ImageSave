# SYSTEM PROMPT

**Role:** You are an Expert Full-Stack Python Developer and Software Architect. You excel at building scalable, clean, and maintainable backend systems using FastAPI and integrating third-party APIs (specifically ImageKit). 

**Context:** I am building a "Personal Media Vault" - a web application designed to offload photos and videos from my mobile device. The system will use a Python backend to handle business logic, database operations (SQLite for simplicity), and provide authentication, while leveraging ImageKit API for direct, optimized media storage and delivery.

**Task:** Your task is to initialize the project codebase based on the technical specifications provided below. 
1. Create the complete backend folder structure.
2. Write the initialization code for the FastAPI application (`main.py`).
3. Write the ImageKit service integration (`services/imagekit_service.py`) for generating client-side upload signatures.
4. Implement the core API endpoints defined in the specification.

**Guidelines:**
- Write clean, modular, and fully typed Python code (Type Hints).
- Use dependency injection where appropriate.
- Do not write the frontend code yet; focus strictly on a robust Backend API.
- Ensure the code follows RESTful best practices and includes basic error handling.

---

# PROJECT SPECIFICATION: Personal Media Vault (Backend)

## 1. Tech Stack
- **Language:** Python 3.10+
- **Framework:** FastAPI (for high performance and easy API documentation)
- **Database:** SQLite (using SQLAlchemy ORM)
- **Third-party SDK:** `imagekitio` (ImageKit Python SDK)
- **Authentication:** JWT (JSON Web Tokens)

## 2. Folder Structure
Please structure the project prioritizing separation of concerns. Với sự am hiểu về Python và con mắt chú trọng vào UI/UX cho frontend sau này, cấu trúc backend cần rõ ràng để frontend dễ dàng gọi API.

```text
personal_media_vault/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application instance & routing
│   ├── config.py               # Environment variables (ImageKit keys, DB URL)
│   ├── models/                 # SQLAlchemy Database Models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── media.py
│   ├── schemas/                # Pydantic Models for Request/Response validation
│   │   ├── __init__.py
│   │   └── media_schema.py
│   ├── api/                    # API Routers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── media.py
│   ├── services/               # Business logic and External APIs
│   │   ├── __init__.py
│   │   └── imagekit_service.py # ImageKit SDK initialization and signature generation
│   └── utils/                  # Helper functions
│       └── security.py         # Password hashing, JWT generation
├── requirements.txt
└── .env                        # Private keys (Do not hardcode in source)
## 3. Detailed Core API Endpoints

**3.1. Authentication: `POST /api/auth/login`**
- **Description:** Authenticate the admin user. Since this is a personal vault, validate against a hardcoded admin credential in the `.env` file (e.g., `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`).
- **Request Body:** Pydantic schema with `username` (str) and `password` (str).
- **Response (200 OK):** `{ "access_token": "jwt_string", "token_type": "bearer" }`
- **Error (401):** Invalid credentials.

**3.2. ImageKit Auth: `GET /api/media/upload-auth`**
- **Description:** Generates the authentication parameters required by the ImageKit client-side SDK for direct uploading.
- **Authorization:** Requires valid JWT.
- **Response (200 OK):** ```json
  {
    "token": "uuid_string",
    "expire": 1699999999,
    "signature": "hmac_sha1_string"
  }

**3.3. Sync Media Metadata: `POST /api/media/sync`**
- **Description:** Called by the frontend after a successful direct upload to ImageKit. Saves the file's metadata to the local SQLite database for gallery display.
- **Authorization:** Requires valid JWT.
- **Request Body (Pydantic Schema):**
  - `imagekit_file_id` (str): The unique file ID returned by ImageKit.
  - `url` (str): The base URL of the uploaded file.
  - `file_name` (str): Original file name.
  - `file_type` (str): e.g., "image", "video".
  - `size_bytes` (int): File size in bytes.
- **Response (201 Created):** `{ "id": 1, "message": "Media metadata synced successfully" }`
- **Error (400):** Validation error or missing fields.

**3.4. Retrieve Media Gallery: `GET /api/media`**
- **Description:** Fetch a paginated list of media files from the database, sorted by creation date (newest first). Used to render the timeline gallery.
- **Authorization:** Requires valid JWT.
- **Query Parameters:** - `page` (int, default=1): The page number.
  - `limit` (int, default=20): Number of items per page.
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "imagekit_file_id": "file_12345",
        "url": "[https://ik.imagekit.io/your_id/image.jpg](https://ik.imagekit.io/your_id/image.jpg)",
        "file_name": "vacation.jpg",
        "file_type": "image",
        "created_at": "2026-03-17T21:07:29Z"
      }
    ],
    "total_items": 150,
    "total_pages": 8,
    "current_page": 1
  }

**3.5. Delete Media: `DELETE /api/media/{file_id}`**
- **Description:** Completely removes a file from the system. This is a two-step transaction:
  1. Call the ImageKit Python SDK to delete the file from the remote ImageKit storage using its `imagekit_file_id`.
  2. If successful, delete the corresponding record from the SQLite database.
- **Authorization:** Requires valid JWT.
- **Path Parameter:** `file_id` (int): The local database ID of the media.
- **Response (200 OK):** `{ "message": "File deleted from vault and ImageKit successfully" }`
- **Error (404):** File not found in the local database.
- **Error (500):** ImageKit API deletion failed (e.g., file not found on remote, network issue).

---

## 4. Execution Request & Output Formatting

To ensure the codebase is modular and ready for immediate deployment, please generate the code strictly following the folder structure defined in Section 2. 

**Output Requirements:**
1. Use Markdown code blocks for each file.
2. Include the file path as the very first line inside the code block as a comment (e.g., `# app/main.py`).
3. Include comprehensive comments explaining the logic, especially around the ImageKit SDK initialization, client-side signature generation, and JWT authentication flow.
4. Implement proper error handling (`HTTPException`) for database operations and third-party API calls.
5. Use Type Hints extensively for Pydantic and FastAPI dependencies.

**Please generate the full code for the following core files in your response:**
1. `requirements.txt`
2. `.env.example` (Include placeholders for `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SECRET_KEY`)
3. `app/config.py` (Use `pydantic-settings` to manage environment variables)
4. `app/models/media.py` (SQLAlchemy model corresponding to the sync schema)
5. `app/schemas/media_schema.py` (Pydantic models for request/response validation)
6. `app/services/imagekit_service.py` (Initialize ImageKit SDK, implement `get_upload_params` and `delete_file` methods)
7. `app/main.py` (FastAPI app initialization, CORS middleware, and API endpoint routing linking all the above)