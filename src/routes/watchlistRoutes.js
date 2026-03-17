import express from "express";
import {  addToWatchlist, removeFromWatchlist, updateWatchlistItem} from "../controllers/watchlistController.js";
 
import {authMiddleware} from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequests.js";
import { addToWatchListSchema } from "../validators/watchListValidators.js";

const router = express.Router();

router.use(authMiddleware)

router.post("/", validateRequest(addToWatchListSchema), addToWatchlist)

router.put("/:id", updateWatchlistItem)

router.delete("/:id", removeFromWatchlist)
 

export default router;