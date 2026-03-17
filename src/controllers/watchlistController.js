import { prisma } from "../config/db.js";

const ALLOWED_STATUSES = ["PLANNED", "WATCHING", "WATCHED"];

const getWatchlist = async (req, res) => {
  const watchlistItems = await prisma.watchlistItem.findMany({
    where: { userId: req.user.id },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          overview: true,
          runtime: true,
          genres: true,
          releaseYear: true,
          posterUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    status: "success",
    data: {
      watchlistItems,
    },
  });
};

const addToWatchlist = async (req, res) => {
  const { movieId,  status, rating, notes } = req.body;
  const normalizedStatus = status ? String(status).toUpperCase() : "PLANNED";

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: "Status must be one of PLANNED, WATCHING, WATCHED",
    });
  }

  // Verify movie exists
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
  });

  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  // CHeck if already added
const existingInWatchlist = await prisma.watchlistItem.findUnique({
    where: {
        userId_movieId: {
            userId: req.user.id,
            movieId: movieId,
        },
    },
});

  if (existingInWatchlist) {
    return res.status(400).json({ error: "Movie already in the watchlist" });
  }

  const watchlistItem = await prisma.watchlistItem.create({
    data: {
      userId: req.user.id,
      movieId,
      status: normalizedStatus,
      rating,
      notes,
    },
  });

  res.status(201).json({
    status: "Success",
    data: {
      watchlistItem,
    },
  });
};

// update watchlist item - only owner can update their watchlist item
const updateWatchlistItem = async (req, res) => {
  const { status, rating, notes } = req.body;

  // Find watchlist item and verify ownership
  const watchlistItem = await prisma.watchlistItem.findUnique({
    where: { id: req.params.id },
  });

  if (!watchlistItem) {
    return res.status(404).json({ error: "Watchlist item not found" });
  }

  // Ensure only owner can update
  if (watchlistItem.userId !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Not allowed to update this watchlist item" });
  }

  // Build update data
  const updateData = {};
  if (status !== undefined) {
    const normalizedStatus = String(status).toUpperCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        error: "Status must be one of PLANNED, WATCHING, WATCHED",
      });
    }
    updateData.status = normalizedStatus;
  }
  if (rating !== undefined) updateData.rating = rating;
  if (notes !== undefined) updateData.notes = notes;
  updateData.updatedAt = new Date();

  // Update watchlist item
  const updatedItem = await prisma.watchlistItem.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.status(200).json({
    status: "success",
    data: {
      watchlistItem: updatedItem,
    },
  });
};



// Only the owner can remove an item from their watchlist
const removeFromWatchlist = async (req, res) => {
  // Find watchlist item and verify ownership
  const watchlistItem = await prisma.watchlistItem.findUnique({
    where: { id: req.params.id },
  });

  if (!watchlistItem) {
    return res.status(404).json({ error: "Watchlist item not found" });
  }

  // Ensure only owner can delete
  if (watchlistItem.userId !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Not allowed to update this watchlist item" });
  }

  await prisma.watchlistItem.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({
    status: "success",
    message: "Movie removed from watchlist",
  });
};

export { getWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistItem };
