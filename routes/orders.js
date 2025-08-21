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
        console.log("PATCH /orders/:id/pay called with ID:", req.params.id);

        // 1️⃣ Fetch the order
        const order = await Order.findById(req.params.id);
        if (!order) {
            console.log("Order not found");
            return res.status(404).json({ error: "Order not found" });
        }

        console.log("Order fetched:", order);
        console.log("Number of items in order:", order.items.length);

        // 2️⃣ Check if already paid
        if (order.status === "paid") {
            console.log("Order already paid");
            return res.status(400).json({ error: "Order already paid" });
        }

        // 3️⃣ Loop through each order item
        for (const orderItem of order.items) {
            try {
                console.log("Processing order item:", orderItem);

                const { name, quantity: orderQuantity } = orderItem;
                if (!name || !orderQuantity) {
                    console.warn("Invalid order item (missing name or quantity):", orderItem);
                    continue;
                }

                // Trim name to remove hidden spaces
                const cleanName = name.trim();

                // Case-insensitive lookup in InventoryItems
                const inventoryItem = await InventoryItems.findOne({
                    name: { $regex: `^${cleanName}$`, $options: "i" }
                });

                if (!inventoryItem) {
                    console.warn("Inventory item not found for:", cleanName);
                    continue;
                }

                console.log(`Found inventory item: ${inventoryItem.name}, current quantity: ${inventoryItem.quantity}`);

                // Decrement quantity safely
                const oldQuantity = inventoryItem.quantity;
                inventoryItem.quantity = Math.max(0, oldQuantity - orderQuantity);
                inventoryItem.totalCost = inventoryItem.quantity * inventoryItem.unitCost;

                // Save inventory update
                await inventoryItem.save();
                console.log(`Inventory updated for ${inventoryItem.name}: ${oldQuantity} → ${inventoryItem.quantity}`);
            } catch (itemErr) {
                console.error("Error processing order item:", orderItem, itemErr);
            }
        }

        // 4️⃣ Mark order as paid
        order.status = "paid";
        await order.save();
        console.log("Order marked as paid");

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
