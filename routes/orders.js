import express from "express";
import Order from "../models/Orders.js";
import InventoryItems from "../models/InventoryItems.js";

const router = express.Router();

// Create order (inventory not updated yet)
router.post("/", async (req, res) => {
    try {
        const { items, customer } = req.body;

        // Calculate total amount
        const totalAmount = items.reduce((acc, item) => acc + item.total, 0);

        // Save the order
        const order = new Order({ items, customer, totalAmount });
        await order.save();

        console.log(`Order ${order._id} created for customer: ${customer}`);

        res.status(201).json({ message: "Order created successfully", order });
    } catch (err) {
        console.error("Error creating order:", err);
        res.status(400).json({ error: err.message });
    }
});

// Mark order as paid and update inventory
router.patch("/:id/pay", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        if (order.status === "paid") {
            return res.status(400).json({ error: "Order already paid" });
        }

        console.log("Paying order:", order._id);
        console.log("Order items:", order.items);

        // Update inventory
        for (const orderItem of order.items) {
            const { name, quantity: orderQuantity } = orderItem;

            // Case-insensitive lookup
            const inventoryItem = await InventoryItems.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
            if (!inventoryItem) {
                console.warn("Inventory item not found for:", name);
                continue;
            }

            const oldQuantity = inventoryItem.quantity;
            inventoryItem.quantity = Math.max(0, oldQuantity - orderQuantity);
            inventoryItem.totalCost = inventoryItem.quantity * inventoryItem.unitCost;
            await inventoryItem.save();

            console.log(`Inventory updated for ${inventoryItem.name}: ${oldQuantity} → ${inventoryItem.quantity}`);
        }

        // Mark order as paid
        order.status = "paid";
        await order.save();

        res.json({ message: "Order paid and inventory updated", order });
    } catch (err) {
        console.error("Error paying order:", err);
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

// Update order (general updates, not payment)
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
