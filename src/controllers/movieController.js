import { prisma } from "../config/db.js";

const listMovies = async (_req, res) => {
  const movies = await prisma.movie.findMany({
    orderBy: { releaseYear: "desc" },
    select: {
      id: true,
      title: true,
      overview: true,
      runtime: true,
      genres: true,
      releaseYear: true,
      posterUrl: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      movies,
    },
  });
};

export { listMovies };
