-- CreateTable
CREATE TABLE "DDayTile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "target_date" DATETIME NOT NULL,
    "coord_x" INTEGER NOT NULL,
    "coord_y" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DDayTile_coord_x_coord_y_key" ON "DDayTile"("coord_x", "coord_y");
