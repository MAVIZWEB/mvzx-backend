1. Add environment variables in Render (use ones you gave exactly). Ensure LIVE=true for production.
2. Run prisma migrate deploy (or push) on Render deploy hook.
3. Ensure ADMIN_PRIVATE_KEY is secure.
4. Build and start server.
