import express from "express";
import Inventory from "../models/InventoryItems.js";
import Order from "../models/Orders.js";

const router = express.Router();



// Create new order
router.post("/", async (req, res) => {
    try {
        const { items } = req.body; // items = [{ name: "Bread", quantity: 2 }, ...]

        // Save order
        const newOrder = new Order({ items });
        await newOrder.save();

        // Decrement inventory for each item
        for (const item of items) {
            await Inventory.updateOne(
                { name: item.name },
                { $inc: { quantity: -item.quantity } }
            );
        }

        res.status(201).json({ message: "Order created, inventory updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});


// --- Get All Items ---
router.get("/", async (req, res) => {
    try {
        const items = await Inventory.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get One Item ---
router.get("/:id", async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ error: "Item not found" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Update Item (Edit Modal) ---
router.patch("/:id", async (req, res) => {
    try {
        const { name, category, unit, quantity, unitCost } = req.body;
        const totalCost = quantity * unitCost;

        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            { name, category, unit, quantity, unitCost, totalCost },
            { new: true }
        );

        if (!item) return res.status(404).json({ error: "Item not found" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Decrement Quantity ---
router.patch("/:id/decrement", async (req, res) => {
    try {
        const { amount } = req.body;
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ error: "Item not found" });

        item.quantity = Math.max(0, item.quantity - amount); // no negative qty
        item.totalCost = item.quantity * item.unitCost;
        await item.save();

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Delete Item ---
router.delete("/:id", async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: "Item deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
