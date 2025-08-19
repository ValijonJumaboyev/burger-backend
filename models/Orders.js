import express from "express";
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    items: [
        {
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
            name: String,
            quantity: Number,
            price: Number,
            total: Number
        }
    ],
    customer: { type: String, default: "Guest" },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    totalAmount: Number
});

const Order = mongoose.model("Order", orderSchema);
export default Order