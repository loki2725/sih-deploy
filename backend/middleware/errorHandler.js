import multer from "multer";

export const errorHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size must be 25MB or less." });
    }

    return res.status(400).json({ error: error.message });
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Internal server error",
  });
};
