📄 DocSummarizer
An AI-powered document summarizer that extracts text from PDFs and DOCX files, generates concise summaries using Groq LLM, and enables interactive Q&A over your documents. Built with a full-stack architecture featuring React, Express, and a Python AI service.

🚀 Features
Document Upload — Upload PDF or DOCX files for instant summarization
Text Summarization — Paste plain text and get AI-generated summaries
Two Summary Formats — Choose between Bullet Points or Paragraph format
Multi-Language — Generate summaries in English, Hindi, Spanish, French, and more
Document Q&A — Ask questions about your uploaded documents and get AI-powered answers
Share Summaries — Generate shareable links for anyone to view a summary (no login required)
Summary History — View all your past summaries with paginated history
Dark/Light Theme — Toggle between themes for comfortable reading
Authentication — Secure JWT-based login and registration
Rate Limiting — API protection against abuse
Swagger Docs — Interactive API documentation at /api/docs
🏗️ Architecture
text

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │──────▶│   Backend    │──────▶│  AI Service  │
│  React+Vite  │       │  Express.js  │       │  Flask+Chroma│
│  TailwindCSS │       │  MongoDB     │       │  Vector DB   │
│  Port: 5173  │       │  Port: 5000  │       │  Port: 8000  │
└──────────────┘       └──────────────┘       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Groq API    │
                       │  (LLM)       │
                       └──────────────┘
🛠️ Tech Stack
Frontend
Tech
Purpose
React 19	UI framework
Vite	Build tool & dev server
Tailwind CSS 4	Styling
Lucide React	Icons
Axios	HTTP client
Sonner	Toast notifications
React Router	Client-side routing

Backend
Tech
Purpose
Express.js	API server
MongoDB + Mongoose	Database
JWT	Authentication
bcryptjs	Password hashing
Groq API (LLaMA 3)	AI summarization
pdf-parse	PDF text extraction
mammoth	DOCX text extraction
Swagger	API documentation
express-rate-limit	Rate limiting

AI Service
Tech
Purpose
Flask	Python API server
ChromaDB	Vector database
OpenAI SDK	Embeddings
mem0ai	Memory management

📁 Project Structure
text

doc-summarizer/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── swagger.js             # Swagger config
│   ├── controllers/
│   │   ├── authCtrl.js            # Auth (register/login)
│   │   ├── summarizeCtrl.js       # Summarization logic
│   │   ├── historyCtrl.js         # History CRUD + pagination
│   │   └── qaCtrl.js              # Q&A controller
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   ├── asyncHandler.js        # Async error wrapper
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── notFound.js            # 404 handler
│   │   ├── rateLimiter.js         # API rate limiting
│   │   └── upload.js              # Multer file upload
│   ├── models/
│   │   ├── User.js                # User schema
│   │   ├── Summary.js             # Summary schema
│   │   ├── StoredDocument.js      # Document storage schema
│   │   └── DocumentQA.js          # Q&A schema
│   ├── routes/
│   │   ├── auth.js                # /api/auth
│   │   ├── summarize.js           # /api/summarize
│   │   ├── history.js             # /api/history
│   │   └── qa.js                  # /api/qa
│   ├── utils/
│   │   ├── AppError.js            # Custom error class
│   │   └── contentHash.js         # Content hashing utility
│   ├── server.js                  # Entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── logo.png
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── HomePage.jsx       # Upload & summarize
│   │   │   │   ├── HistoryPage.jsx    # Paginated history
│   │   │   │   ├── SharePage.jsx      # Public shared view
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── NotFoundPage.jsx
│   │   │   ├── SummaryCard.jsx        # Summary display card
│   │   │   ├── UploadBox.jsx          # File upload component
│   │   │   ├── FormatToggle.jsx       # Bullets/Paragraph toggle
│   │   │   ├── LanguageSelector.jsx   # Language dropdown
│   │   │   ├── DocumentQAPanel.jsx    # Q&A chat panel
│   │   │   ├── Navbar.jsx             # Navigation bar
│   │   │   └── ProtectedRoute.jsx     # Auth guard
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Auth state
│   │   │   └── ThemeContext.jsx        # Dark/light theme
│   │   ├── lib/
│   │   │   └── utils.js
│   │   ├── App.jsx                    # Routes & layout
│   │   ├── main.jsx                   # Entry point
│   │   └── index.css                  # Global styles
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── ai-service/
    ├── app.py                         # Flask app entry
    ├── main.py                        # Routes & logic
    ├── config.py                      # Configuration
    ├── services/
    │   ├── vector_store.py            # ChromaDB operations
    │   ├── embeddings.py              # Embedding generation
    │   ├── chunker.py                 # Text chunking
    │   ├── memory.py                  # mem0 integration
    │   └── config.py                  # Service config
    ├── chroma_db/                     # Vector DB storage
    └── requirements.txt
⚡ Getting Started
Prerequisites
Node.js 18+
Python 3.10+
MongoDB (local or Atlas)
Groq API Key (get one here)
1. Clone the Repository
bash

git clone https://github.com/TameshwariSahu/doc-summarizer.git
cd doc-summarizer
2. Backend Setup
bash

cd backend
npm install
Create a .env file in the backend/ folder:

env

PORT=5000
MONGO_URI=mongodb://localhost:27017/docsummarizer
JWT_SECRET=your_jwt_secret_here
GROQ_API_KEY=your_groq_api_key_here
AI_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
Start the backend:

bash

npm run dev
3. AI Service Setup
bash

cd ai-service
pip install -r requirements.txt
Create a .env file in the ai-service/ folder:

env

OPENAI_API_KEY=your_openai_api_key_here
Start the AI service:

bash

python app.py
4. Frontend Setup
bash

cd frontend
npm install
Create a .env file in the frontend/ folder:

env

VITE_API_URL=http://localhost:5000/api
Start the frontend:

bash

npm run dev
🌐 API Endpoints
Auth
Method
Endpoint
Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Login and get JWT token

Summarize
Method
Endpoint
Description
POST	/api/summarize/file	Upload & summarize a PDF/DOCX
POST	/api/summarize/text	Summarize plain text

History
Method
Endpoint
Description
GET	/api/history?page=1&limit=10	Get paginated summaries
GET	/api/history/:id	Get single summary
DELETE	/api/history/:id	Delete a summary
GET	/api/history/share/:id	Get shared summary (public)

Q&A
Method
Endpoint
Description
POST	/api/qa/ask	Ask a question about a document

Docs
Method
Endpoint
Description
GET	/api/docs	Swagger API documentation

🔒 Security Features
JWT Authentication — Secure token-based auth
Password Hashing — bcryptjs with salt
Rate Limiting — Prevents API abuse
CORS Protection — Restricted origins
Input Validation — File type & size checks
Protected Routes — Auth middleware on sensitive endpoints
🚀 Deployment
Frontend — Vercel
bash

cd frontend
vercel --prod
Set env var: VITE_API_URL=https://your-backend.onrender.com/api

Backend — Render
Connect GitHub repo
Root directory: backend
Build: npm install
Start: node server.js
Add all environment variables
AI Service — Render
Root directory: ai-service
Build: pip install -r requirements.txt
Start: python app.py
Database — MongoDB Atlas
Create free M0 cluster
Whitelist IP: 0.0.0.0/0
Use connection string as MONGO_URI
👤 Author
Tameshwari Sahu

GitHub: @TameshwariSahu
📄 License
This project is licensed under the ISC License.
