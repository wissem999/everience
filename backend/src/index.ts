import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import fournisseurRoutes from './routes/fournisseurRoutes';
import clientRoutes from './routes/clientRoutes';
import bookingRoutes from './routes/bookingRoutes';
import commandeRoutes from './routes/commandeRoutes';
import settingsRoutes from './routes/settingsRoutes';
import packRoutes from './routes/packRoutes';
import inventaireRoutes from './routes/inventaireRoutes';
import { errorHandler, notFound } from './middleware/error';
import { testDbConnection } from './config/db';

dotenv.config();

const app = express();

app.use(helmet());

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: [frontendUrl, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requetes. Reessayez plus tard.' },
});
app.use(globalLimiter);

app.get('/', (_req, res) => {
  res.json({ message: 'Everience API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', productRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/commandes', commandeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/inventaire', inventaireRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await testDbConnection();
    app.listen(PORT, () => {
      console.log(`[server] Everience API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[db] Connection failed. Is XAMPP MySQL running? Did you import schema.sql?');
    console.error(err);
    process.exit(1);
  }
}

start();
