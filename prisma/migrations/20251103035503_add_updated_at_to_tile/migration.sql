-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DDayTile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "target_date" DATETIME NOT NULL,
    "coord_x" INTEGER NOT NULL,
    "coord_y" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DDayTile" ("color", "coord_x", "coord_y", "created_at", "id", "likes", "target_date", "title") SELECT "color", "coord_x", "coord_y", "created_at", "id", "likes", "target_date", "title" FROM "DDayTile";
DROP TABLE "DDayTile";
ALTER TABLE "new_DDayTile" RENAME TO "DDayTile";
CREATE UNIQUE INDEX "DDayTile_coord_x_coord_y_key" ON "DDayTile"("coord_x", "coord_y");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
