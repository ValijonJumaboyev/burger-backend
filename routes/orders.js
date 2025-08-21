import express from "express";
import Order from "../models/Orders.js";
import InventoryItems from "../models/InventoryItems.js";

const router = express.Router();

// Create order
router.post("/", async (req, res) => {
    try {
        const { items, customer } = req.body;

        // Calculate total amount of the order
        const totalAmount = items.reduce((acc, item) => acc + item.total, 0);

        // Save the order to DB
        const order = new Order({ items, customer, totalAmount });
        await order.save();

        console.log(`Order ${order._id} saved for customer: ${customer}`);

        // Update inventory for each item in the order
        for (const orderItem of items) {
            const { name, quantity: orderQuantity } = orderItem;

            // Find inventory item by name
            const inventoryItem = await InventoryItems.findOne({ name });
            if (!inventoryItem) {
                console.warn("Inventory item not found for:", name);
                continue;
            }

            const oldQuantity = inventoryItem.quantity;
            inventoryItem.quantity = Math.max(0, oldQuantity - orderQuantity);
            inventoryItem.totalCost = inventoryItem.quantity * inventoryItem.unitCost;

            await inventoryItem.save();
        }

        res.status(201).json({ message: "Order created successfully", order });
    } catch (err) {
        console.error("Error creating order:", err);
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
