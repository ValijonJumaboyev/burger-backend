import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from "cors"
import inventoryRoutes from "./routes/inventory.js"
import orders from "./routes/orders.js"

dotenv.config()

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors())
app.use("/api/inventory", inventoryRoutes)
app.use("/api/orders", orders)

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 MongoDB connected'))
    .catch(err => console.error('🔴 MongoDB error:', err));

app.get('/', (req, res) => {
    res.send('Burger Backend API is live!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});
