import { NextResponse } from "next/server";

// Serves ERC-721 metadata for the RowDawgs membership pass, matching the
// ChessDawgs scheme: the contract's tokenURI resolves to `/nft/<id>.json`, and
// this returns `{ name, image, ... }`. Self-contained (no external backend) and
// origin-relative, so it works on whatever domain serves the app. To use real
// per-token art instead, repoint the NFT base URI to your own host — the
// contract's setBaseURI is retroactive.
export const dynamic = "force-dynamic";

export function GET(request: Request, { params }: { params: { token: string } }) {
  const id = params.token.replace(/\.json$/i, "");
  const tokenId = Number(id);
  const origin = new URL(request.url).origin;

  const metadata = {
    name: Number.isFinite(tokenId) ? `Row Dawgs Pass #${tokenId}` : "Row Dawgs Pass",
    description:
      "Membership pass for RowDawgs — wagered five-in-a-row in the Deputy Dawgs ecosystem. Holding a pass is your seat at the board.",
    image: `${origin}/assets/nft-pass.svg`,
    external_url: origin,
    ...(Number.isFinite(tokenId) ? { tokenId } : {}),
    attributes: [
      { trait_type: "Collection", value: "Row Dawgs" },
      { trait_type: "Type", value: "Membership Pass" },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
}
