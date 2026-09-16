package app.savoria.mom.utils

/**
 * Maps a material's `groupDescName` (material group / category from
 * Master Material, e.g. "FG Boiled Candy", "WIP Boiled Candy", "FG Sweet
 * Snack") to the production line group used to split the Goods Issue -
 * Goods Receipt page into sub tabs ("Hard Boiled Candy", "Extrusion",
 * "Gummy Candy", "Press Candy").
 *
 * NOTE: this is grouped by the material master group, NOT by BOM
 * `productType` (Loaf/Oval/Chips/.../Square) - that field describes the
 * confection's shape/PO type and doesn't line up with the PO's actual
 * production line grouping. Always resolve the line from the process
 * order's own material (`materialRepo.findByCode`), not from a raw
 * material/ingredient code.
 *
 * Matching is done by *keyword/substring* rather than an exact string,
 * because the same product family shows up under several prefixes in
 * Master Material depending on the material's stage - e.g. "FG Boiled
 * Candy" (finished good) vs "WIP Boiled Candy" / "SFG Boiled Candy"
 * (work-in-progress / semi-finished good). Matching on the shared
 * "boiled candy" substring means both FG and WIP materials for the same
 * product family land on the same tab without having to enumerate every
 * FG/WIP/SFG prefix combination Master Material uses.
 *
 * Confirmed mapping (2026-09-02, from Master Material export; WIP prefix
 * handling added 2026-09-03; WIP (HALB) group names re-confirmed against
 * a fresh Master Material export on 2026-09-03 - those use a different,
 * more abbreviated naming convention than FG and needed their own
 * keywords/tokens below (e.g. "Wrp. BC Loaf" / "Unwrp. BC Oval" instead
 * of "... Boiled Candy ...", "Extrd. Sweet Chips" instead of
 * "... Sweet Snack ...", "Unwrp.Pressed Tablet" instead of
 * "... Pressed Candy ..."; "SFG Cream" confirmed with user as Extrusion):
 *  - *boiled candy*      -> Hard Boiled Candy (covers "FG Boiled Candy", "WIP Boiled Candy", ...)
 *  - token "bc"          -> Hard Boiled Candy (covers WIP "Wrp. BC Loaf", "Unwrp. BC Oval", ...)
 *  - *sweet snack*       -> Extrusion         (covers "FG Sweet Snack (KRIZZI)", "WIP Sweet Snack", ...)
 *  - *baby/kid snack*    -> Extrusion         (covers "Baby/Kid Snack (MILNA)", "WIP Baby/Kid Snack", ...)
 *  - *extrd*             -> Extrusion         (covers WIP "Extrd. Savory Chips", "Extrd. Sweet Chips")
 *  - *sfg cream*         -> Extrusion         (covers WIP "SFG Cream")
 *  - *gummy*             -> Gummy Candy       (covers "FG Gummy", "WIP Gummy", "Bag Gummy", "Unwrp. Gummy", ...)
 *  - *pressed candy*     -> Press Candy       (FG naming; line currently
 *    not operating - all Pressed Candy items in master data are inactive
 *    today, so this tab is expected to be empty for now)
 *  - *pressed tablet*    -> Press Candy       (covers WIP "Unwrp.Pressed Tablet", "Wrp. Pressed Tablet")
 *
 * "bc" is matched as a whole token (split on non-letters), not a plain
 * substring, so it only fires on standalone "BC" (e.g. "Wrp. BC Loaf")
 * and won't accidentally match unrelated words that merely contain the
 * letters "bc".
 *
 * Unrecognized/blank groupDescName returns null so the caller can fall
 * back to the existing "show under every tab" behavior instead of hiding
 * data.
 *
 * Used by CommonDPSService.getMaterialUsage() to populate
 * MaterialUsageView.line for the Goods Issue - Goods Receipt page.
 */
object ProductionLineMapper {

    const val HARD_BOILED_CANDY = "Hard Boiled Candy"
    const val EXTRUSION = "Extrusion"
    const val GUMMY_CANDY = "Gummy Candy"
    const val PRESS_CANDY = "Press Candy"

    // Ordered list of (keyword to look for anywhere in groupDescName,
    // target line). Keywords must be lowercase - lookup below lowercases
    // the input. Order matters only if a groupDescName could ever match
    // more than one keyword; keep more specific keywords earlier if that
    // ever becomes a concern.
    private val keywordToLine: List<Pair<String, String>> = listOf(
        "boiled candy" to HARD_BOILED_CANDY,
        "sweet snack" to EXTRUSION,
        "baby/kid snack" to EXTRUSION,
        "extrd" to EXTRUSION,
        "sfg cream" to EXTRUSION,
        "gummy" to GUMMY_CANDY,
        "pressed candy" to PRESS_CANDY,
        "pressed tablet" to PRESS_CANDY,
    )

    // Keywords here must match as a whole token (the groupDescName split
    // on any non-letter character), not merely as a substring - "bc" is
    // short enough that plain substring matching would false-positive on
    // unrelated words.
    private val tokenToLine: List<Pair<String, String>> = listOf(
        "bc" to HARD_BOILED_CANDY,
    )

    fun mapToLine(groupDescName: String?): String? {
        val key = groupDescName?.trim()?.lowercase()
        if (key.isNullOrEmpty()) return null
        keywordToLine.firstOrNull { (keyword, _) -> key.contains(keyword) }?.let { return it.second }
        val tokens = key.split(Regex("[^a-z]+")).filter { it.isNotEmpty() }
        tokenToLine.firstOrNull { (token, _) -> tokens.contains(token) }?.let { return it.second }
        return null
    }
}