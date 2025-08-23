import mongoose from "mongoose";

const RecipeSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        unique: true,   // Unique per client DB
        trim: true,
    },
    ingredients: [
        {
            name: {
                type: String,
                required: true,  // Must match inventory item name
                trim: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 0.0001,     // Supports fractional (e.g., 0.5 slice, 0.25L)
            },
            unit: {
                type: String,
                default: "pcs",  // pcs, g, ml, slice, etc.
                trim: true,
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Auto-update timestamps
RecipeSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model("Recipe", RecipeSchema);
