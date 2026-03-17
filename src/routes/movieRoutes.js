import express from "express";
import { listMovies } from "../controllers/movieController.js";

const router = express.Router();

router.get("/", listMovies);
router.get("/movies", listMovies);

export default router;
