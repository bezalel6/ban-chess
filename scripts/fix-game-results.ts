/**
 * Migration script to fix game results in the database
 * Converts old descriptive results to standardized chess notation
 *
 * Run with: npx tsx scripts/fix-game-results.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixGameResults() {
  console.log("🔍 Searching for games with non-standard result notation...\n");

  try {
    // Find all games that don't have standardized notation
    const games = await prisma.game.findMany({
      where: {
        NOT: {
          OR: [{ result: "1-0" }, { result: "0-1" }, { result: "1/2-1/2" }],
        },
      },
      select: {
        id: true,
        result: true,
        resultReason: true,
      },
    });

    console.log(`Found ${games.length} games with non-standard results\n`);

    if (games.length === 0) {
      console.log("✅ All games already have standardized notation!");
      return;
    }

    let fixed = 0;

    for (const game of games) {
      console.log(`Game ${game.id}:`);
      console.log(`  Current result: "${game.result}"`);
      console.log(`  Current reason: "${game.resultReason || "unknown"}"`);

      // Determine the standardized result and reason
      let standardResult: string;
      let resultReason: string = game.resultReason || "unknown";

      const resultLower = game.result.toLowerCase();

      // Determine winner and reason from the text
      if (
        resultLower.includes("white wins") ||
        resultLower.includes("white won")
      ) {
        standardResult = "1-0";
      } else if (
        resultLower.includes("black wins") ||
        resultLower.includes("black won")
      ) {
        standardResult = "0-1";
      } else if (
        resultLower.includes("draw") ||
        resultLower.includes("stalemate")
      ) {
        standardResult = "1/2-1/2";
      } else {
        // Try to parse other formats
        console.log(`  ⚠️  Could not determine standard result, skipping`);
        continue;
      }

      // Determine reason if not already set correctly
      if (resultReason === "unknown" || !resultReason) {
        if (resultLower.includes("checkmate")) {
          resultReason = "checkmate";
        } else if (
          resultLower.includes("resignation") ||
          resultLower.includes("resigned")
        ) {
          resultReason = "resignation";
        } else if (
          resultLower.includes("time") ||
          resultLower.includes("timeout")
        ) {
          resultReason = "timeout";
        } else if (resultLower.includes("stalemate")) {
          resultReason = "stalemate";
        } else if (resultLower.includes("draw")) {
          resultReason = "draw";
        }
      }

      // Update the game
      try {
        await prisma.game.update({
          where: { id: game.id },
          data: {
            result: standardResult,
            resultReason: resultReason,
          },
        });

        console.log(
          `  ✅ Fixed: result="${standardResult}", reason="${resultReason}"\n`
        );
        fixed++;
      } catch (error) {
        console.log(
          `  ❌ Error updating: ${
            error instanceof Error ? error.message : String(error)
          }\n`
        );
      }
    }

    console.log(
      `\n✅ Migration complete! Fixed ${fixed}/${games.length} games`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixGameResults().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
