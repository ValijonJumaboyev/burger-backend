import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema({
    name: String,
    category: String,
    quantity: Number,
    unit: String,
    unitCost: Number,
    totalCost: Number
}, { timestamps: true });

export default mongoose.model('InventoryItem', InventoryItemSchema);