# Character Chat API

A Node.js API for managing AI character chats, built with Express, Prisma, and Supabase. This application provides user authentication, character management, and chat functionality with support for multiple conversations.

## Features

- 🔐 **User Authentication**
  - Email/password signup and login
  - JWT-based authentication
  - Password reset and email verification
  - Role-based access control

- 🤖 **Character Management**
  - Create and manage AI characters with custom prompts
  - Public/private character visibility
  - Character ownership and permissions

- 💬 **Chat Functionality**
  - Create and manage multiple conversations
  - Message history and persistence
  - Conversation context management

- 🛡️ **Security**
  - Secure password hashing
  - CSRF protection
  - Rate limiting
  - Input validation

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, Supabase Auth
- **API Documentation**: OpenAPI/Swagger (TBD)
- **Containerization**: Docker (TBD)

## Prerequisites

- Node.js 16+
- npm or yarn
- PostgreSQL database
- Supabase account (for authentication)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ch
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/character_chat?schema=public"
   DIRECT_URL="postgresql://user:password@localhost:5432/character_chat?schema=public"
   
   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1d
   
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Client URL for CORS
   CLIENT_URL=http://localhost:3001
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## API Endpoints

### Authentication

- `POST /auth/signup` - Register a new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/reset-password` - Request password reset
- `POST /auth/verify-email` - Verify email address

### Characters

- `POST /create_bot` - Create a new character
- `GET /characters` - List all public characters (or user's private characters)
- `GET /characters/:id` - Get character details
- `PUT /characters/:id` - Update character
- `DELETE /characters/:id` - Delete character

### Conversations

- `POST /new_chat` - Start a new conversation with a character
- `GET /conversations` - List user's conversations
- `GET /conversations/:id` - Get conversation details
- `POST /conversations/:id/messages` - Send a message in a conversation
- `GET /conversations/:id/messages` - Get conversation messages

## Database Schema

### Main Entities

1. **User**
   - Authentication and profile information
   - Relationships to characters and conversations

2. **Character**
   - Name and prompt for the AI character
   - Privacy settings (public/private)
   - Owner relationship

3. **Conversation**
   - Links a user to a character
   - Contains message history

4. **Message**
   - Content and metadata for each message in a conversation
   - Role-based (user/assistant)

## Development

### Project Structure

```
src/
├── api/                 # API routes and controllers
│   ├── chat.js         # Chat logic
│   └── chatRoutes.js   # Chat-related routes
├── auth/               # Authentication logic
│   ├── authController.js
│   ├── authMiddleware.js
│   ├── config.js
│   ├── errorHandler.js
│   ├── routes.js
│   └── validation.js
└── server.js           # Application entry point
```

### Environment Variables

See `.env.example` for all required environment variables.

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Docker

A `Dockerfile` and `docker-compose.yml` will be provided in a future update for containerized deployment.

### Production

1. Set `NODE_ENV=production` in your environment variables
2. Ensure all required environment variables are set
3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "character-chat-api"
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ using Node.js and Express
- Authentication powered by Supabase
- Database management with Prisma ORM
