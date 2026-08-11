import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import fournisseurRoutes from './routes/fournisseurRoutes';
import clientRoutes from './routes/clientRoutes';
import { errorHandler, notFound } from './middleware/error';
import { testDbConnection } from './config/db';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Everience API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/clients', clientRoutes);

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
