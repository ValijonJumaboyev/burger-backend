import express from "express";
import Order from "../models/Orders.js";
import InventoryItems from "../models/InventoryItems.js";
import Recipe from "../models/Recipes.js";

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

        // 🔁 Conversion rules
        const UNIT_CONVERSIONS = {
            pcs: { pcs: 1 },
            slice: { g: 20 },   // 1 slice cheese = 20g
            slices: { g: 20 },
            leaf: { g: 10 },    // 1 cabbage leaf = 10g
            leaves: { g: 10 },
            spoon: { g: 5 },    // 1 spoon = 5g (adjustable!)
            spoons: { g: 5 },
            g: { g: 1, kg: 0.001 },
            kg: { g: 1000 },
            mg: { g: 0.001 },
            ml: { ml: 1, L: 0.001 },
            L: { ml: 1000 }
        };

        function convertQuantity(qty, fromUnit, toUnit) {
            fromUnit = fromUnit?.toLowerCase();
            toUnit = toUnit?.toLowerCase();

            if (!fromUnit || !toUnit) throw new Error("Missing unit for conversion");

            // same units
            if (fromUnit === toUnit) return qty;

            // lookup conversion
            if (UNIT_CONVERSIONS[fromUnit] && UNIT_CONVERSIONS[fromUnit][toUnit]) {
                return qty * UNIT_CONVERSIONS[fromUnit][toUnit];
            }

            throw new Error(`No conversion rule from ${fromUnit} → ${toUnit}`);
        }

        // 1️⃣ Fetch the order
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // 2️⃣ Already paid check
        if (order.status === "paid") {
            return res.status(400).json({ error: "Order already paid" });
        }

        const inventoryUpdates = [];

        // 3️⃣ Process each order item
        for (const orderItem of order.items) {
            const { name, quantity: orderQuantity } = orderItem;
            if (!name || !orderQuantity) {
                return res.status(400).json({
                    error: `Invalid order item: ${JSON.stringify(orderItem)}`
                });
            }

            const cleanName = name.trim();

            // 🔎 Step A: Look for recipe
            const recipe = await Recipe.findOne({
                productName: { $regex: `^${cleanName}$`, $options: "i" }
            });

            if (recipe) {
                console.log(`Recipe found for ${cleanName}. Checking ingredients...`);

                for (const ing of recipe.ingredients) {
                    const requiredQtyRecipeUnit = ing.quantity * orderQuantity;

                    const inventoryItem = await InventoryItems.findOne({
                        name: { $regex: `^${ing.name}$`, $options: "i" }
                    });

                    if (!inventoryItem) {
                        return res.status(400).json({
                            error: `Ingredient not found in inventory: ${ing.name}`
                        });
                    }

                    // 🔁 Convert recipe qty → inventory unit
                    let requiredQty;
                    try {
                        requiredQty = convertQuantity(requiredQtyRecipeUnit, ing.unit, inventoryItem.unit || "pcs");
                    } catch (err) {
                        return res.status(400).json({
                            error: `Unit mismatch for ${ing.name}: ${err.message}`
                        });
                    }

                    if (inventoryItem.quantity < requiredQty) {
                        return res.status(400).json({
                            error: `Not enough stock for ${ing.name}. Required: ${requiredQty} ${inventoryItem.unit}, Available: ${inventoryItem.quantity} ${inventoryItem.unit}`
                        });
                    }

                    inventoryUpdates.push({
                        item: inventoryItem,
                        newQty: inventoryItem.quantity - requiredQty
                    });
                }
            } else {
                // 🔎 Step B: Fallback to single inventory item
                const inventoryItem = await InventoryItems.findOne({
                    name: { $regex: `^${cleanName}$`, $options: "i" }
                });

                if (!inventoryItem) {
                    return res.status(400).json({
                        error: `Inventory item not found: ${cleanName}`
                    });
                }

                if (inventoryItem.quantity < orderQuantity) {
                    return res.status(400).json({
                        error: `Not enough stock for ${cleanName}. Required: ${orderQuantity}, Available: ${inventoryItem.quantity}`
                    });
                }

                inventoryUpdates.push({
                    item: inventoryItem,
                    newQty: inventoryItem.quantity - orderQuantity
                });
            }
        }

        // 4️⃣ Apply all updates
        for (const upd of inventoryUpdates) {
            upd.item.quantity = upd.newQty;
            upd.item.totalCost = upd.item.quantity * upd.item.unitCost;
            await upd.item.save();
            console.log(`Inventory updated for ${upd.item.name}: → ${upd.newQty} ${upd.item.unit}`);
        }

        // 5️⃣ Mark order as paid
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
