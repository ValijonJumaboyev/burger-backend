import express from "express";
import Recipes from "../models/Recipes.js";  // Import your Recipe model

const router = express.Router();

// Get all recipes
router.get("/", async (req, res) => {
    try {
        const recipeItems = await Recipes.find().sort({ createdAt: -1 });
        res.status(200).json(recipeItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get exact recipe by ID
router.get("/:id", async (req, res) => {
    try {
        const recipeItemByID = await Recipes.findById(req.params.id);
        if (!recipeItemByID) {
            return res.status(404).json({ error: "Recipe not found" });
        }
        res.status(200).json(recipeItemByID);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post new recipe
router.post("/", async (req, res) => {
    try {
        const { productName, ingredients } = req.body;

        if (!productName || !ingredients || ingredients.length === 0) {
            return res.status(400).json({ error: "Product name and at least one ingredient are required" });
        }

        const recipe = new Recipes({ productName, ingredients });
        await recipe.save();

        res.status(201).json({ message: `Recipe created successfully: ${productName}`, recipe });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update (PATCH) recipe by ID
router.patch("/:id", async (req, res) => {
    try {
        const { productName, ingredients } = req.body;

        const updatedRecipe = await Recipes.findByIdAndUpdate(
            req.params.id,
            { productName, ingredients, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedRecipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }

        res.status(200).json({ message: "Recipe updated successfully", updatedRecipe });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete recipe by ID
router.delete("/:id", async (req, res) => {
    try {
        const deletedRecipe = await Recipes.findByIdAndDelete(req.params.id);

        if (!deletedRecipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }

        res.status(200).json({ message: `Recipe deleted: ${deletedRecipe.productName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
