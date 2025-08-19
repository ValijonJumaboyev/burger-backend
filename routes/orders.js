import express from "express";
import Order from "../models/Orders.js";

const router = express.Router();

// Create order
router.post("/", async (req, res) => {
    try {
        const { items, customer } = req.body;
        const totalAmount = items.reduce((acc, i) => acc + i.total, 0);
        const order = new Order({ items, customer, totalAmount });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all orders
router.get("/", async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});

// Get one order
router.get("/:id", async (req, res) => {
    const order = await Order.findById(req.params.id);
    res.json(order);
});

// Update order
router.patch("/:id", async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(order);
});

// Delete order
router.delete("/:id", async (req, res) => {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted" });
});

export default router;
