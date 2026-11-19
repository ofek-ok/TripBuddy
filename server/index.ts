import dotenv from 'dotenv';
import { app } from './app';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TripBuddy Backend API running on http://localhost:${PORT} (Neon PostgreSQL)`);
});
